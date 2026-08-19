// Focused test for the voice plugin's signaling state machine, with injected
// RTCPeerConnection / getUserMedia / audio mocks (no real browser). Covers:
// offerer vs answerer roles, inbound offer→answer, ICE in/out, peer cleanup,
// and push-to-talk gating the mic track. Run: node voice.test.mjs

import { voicePlugin } from './plugins/voice.js';

const assert = (c, m) => {
  if (!c) {
    console.error('FAIL voice:', m);
    process.exit(1);
  }
};
const flush = () => new Promise(r => setTimeout(r, 0));

// --- mocks ------------------------------------------------------------------
function makeTrack() {
  return {
    kind: 'audio',
    enabled: true,
    stopped: false,
    stop() {
      this.stopped = true;
    },
  };
}
function makeStream() {
  const tracks = [makeTrack()];
  return { getAudioTracks: () => tracks, getTracks: () => tracks };
}
const allPCs = [];
class FakePC {
  constructor(cfg) {
    this.cfg = cfg;
    this.added = [];
    this.local = null;
    this.remote = null;
    this.ice = [];
    this.closed = false;
    allPCs.push(this);
  }
  addTrack(t) {
    this.added.push(t);
  }
  async createOffer() {
    return { type: 'offer', sdp: 'OFFER' };
  }
  async createAnswer() {
    return { type: 'answer', sdp: 'ANSWER' };
  }
  async setLocalDescription(d) {
    this.local = d;
  }
  async setRemoteDescription(d) {
    this.remote = d;
  }
  async addIceCandidate(c) {
    this.ice.push(c);
  }
  close() {
    this.closed = true;
  }
}

function harness(sid, others) {
  const sent = [];
  const state = { keyHeld: false, stream: null };
  const ctx = {
    room: () => ({ sessionId: sid }),
    others,
    sendRelay: (type, msg) => sent.push({ type, msg }),
    input: { key: () => state.keyHeld },
    typing: false,
    theme: { btnBg: 0, btnBgActive: 0, btnFg: 0, pad: 4, lineH: 12, panelBg: 0 },
  };
  const plug = voicePlugin({
    rtc: FakePC,
    getMedia: async () => {
      state.stream = makeStream();
      return state.stream;
    },
    makeAudio: () => ({ play() {} }),
  });
  plug.init(ctx);
  return { plug, ctx, sent, state, setKey: v => (state.keyHeld = v) };
}

// --- offerer: our id < peer id → we send the offer on join ------------------
{
  allPCs.length = 0;
  const others = new Map([['zzz', {}]]);
  const { plug, ctx, sent } = harness('aaa', others);
  await plug._join();
  await flush();
  await flush();
  assert(allPCs.length === 1, 'a peer connection was created on join');
  assert(allPCs[0].added.length === 1, 'local mic track added to the connection');
  const offer = sent.find(s => s.type === 'voice' && s.msg.kind === 'offer' && s.msg.to === 'zzz');
  assert(offer, 'offerer (lower id) sends an SDP offer to the peer');

  // Outbound ICE is relayed.
  allPCs[0].onicecandidate({ candidate: { candidate: 'cand-1' } });
  assert(
    sent.some(s => s.type === 'voice' && s.msg.kind === 'ice' && s.msg.to === 'zzz'),
    'local ICE candidates are relayed to the peer'
  );

  // Inbound answer is applied.
  plug.onNetMessage(
    { from: 'zzz', type: 'voice', msg: { to: 'aaa', kind: 'answer', payload: { type: 'answer' } } },
    ctx
  );
  await flush();
  assert(
    allPCs[0].remote && allPCs[0].remote.type === 'answer',
    'answer set as remote description'
  );
}

// --- answerer: our id > peer id → no offer; we answer an inbound offer ------
{
  allPCs.length = 0;
  const others = new Map([['aaa', {}]]);
  const { plug, ctx, sent } = harness('zzz', others);
  await plug._join();
  await flush();
  await flush();
  assert(
    !sent.some(s => s.msg && s.msg.kind === 'offer'),
    'answerer (higher id) does not send an offer'
  );

  // Receiving an offer → set remote, create + send answer.
  plug.onNetMessage(
    { from: 'aaa', type: 'voice', msg: { to: 'zzz', kind: 'offer', payload: { type: 'offer' } } },
    ctx
  );
  await flush();
  await flush();
  const ans = sent.find(s => s.type === 'voice' && s.msg.kind === 'answer' && s.msg.to === 'aaa');
  assert(ans, 'answerer replies with an SDP answer');
  const pc = allPCs.find(p => p.remote && p.remote.type === 'offer');
  assert(pc && pc.local && pc.local.type === 'answer', 'answer set as local description');

  // Inbound ICE is added.
  plug.onNetMessage(
    { from: 'aaa', type: 'voice', msg: { to: 'zzz', kind: 'ice', payload: { candidate: 'x' } } },
    ctx
  );
  await flush();
  assert(pc.ice.length === 1, 'inbound ICE candidate added to the connection');

  // A voice message addressed to someone else is ignored.
  const before = pc.ice.length;
  plug.onNetMessage(
    { from: 'aaa', type: 'voice', msg: { to: 'other', kind: 'ice', payload: { candidate: 'y' } } },
    ctx
  );
  await flush();
  assert(pc.ice.length === before, 'voice messages addressed to others are ignored');

  // Peer leaving closes the connection.
  plug.onPeerLeave('aaa', {}, ctx);
  assert(pc.closed, 'peer leaving closes its connection');
}

// --- push-to-talk gates the mic track --------------------------------------
{
  allPCs.length = 0;
  const { plug, ctx, state, setKey } = harness('aaa', new Map());
  await plug._join(); // joined, muted by default
  await flush();
  const track = state.stream.getAudioTracks()[0];

  plug.update(0.016, ctx);
  assert(track.enabled === false, 'muted + key up → mic disabled');

  setKey(true);
  plug.update(0.016, ctx);
  assert(track.enabled === true, 'holding PTT enables the mic');

  setKey(false);
  plug.update(0.016, ctx);
  assert(track.enabled === false, 'releasing PTT disables the mic');

  setKey(true);
  ctx.typing = true;
  plug.update(0.016, ctx);
  assert(track.enabled === false, 'PTT is ignored while typing in chat');
}

console.log('PASS voice: offer/answer roles, ICE in/out, addressed-routing, peer cleanup, PTT');
process.exit(0);
