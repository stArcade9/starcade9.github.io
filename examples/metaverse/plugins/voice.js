// voice.js — WebRTC voice chat as a plugin (web; push-to-talk).
//
// A full peer-to-peer mesh: each participant opens an RTCPeerConnection to every
// other participant and exchanges mic audio. Signaling (SDP offer/answer + ICE
// candidates) rides the cart's existing relay — ctx.sendRelay('voice', …) out,
// onNetMessage('voice') in — so no extra server endpoint is needed (the server
// exempts 'voice' from the chat rate-limit since ICE legitimately bursts).
//
// Glare-free: for any pair, the peer with the smaller sessionId is the offerer;
// the other only answers. Talking is gated by push-to-talk (hold the key) or an
// unmute toggle — default is muted so there's no hot mic.
//
// Browser-only by nature (RTCPeerConnection + getUserMedia). On non-DOM hosts
// (Godot/QuickJS) or in tests it no-ops cleanly; the deps are injectable so the
// signaling state machine is testable without a real browser. See docs/METAVERSE.md.

import { Panel, Button } from '../core/ui.js';

export function voicePlugin(opts = {}) {
  const PTT_KEY = opts.pttKey || 'KeyV';
  const ICE = opts.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];
  // Injectable browser deps (default to real globals when present).
  const RTC = opts.rtc || (typeof RTCPeerConnection !== 'undefined' ? RTCPeerConnection : null);
  const getMedia =
    opts.getMedia ||
    (typeof navigator !== 'undefined' && navigator.mediaDevices
      ? c => navigator.mediaDevices.getUserMedia(c)
      : null);
  const makeAudio =
    opts.makeAudio ||
    (typeof document !== 'undefined' && document.createElement
      ? () => document.createElement('audio')
      : null);

  const peers = new Map(); // id -> { pc, audio }
  let ctxRef = null;
  let stream = null;
  let joined = false;
  let muted = true;
  let ptt = false;
  let status = 'off'; // off | unsupported | connecting | live | muted

  const supported = () => !!(RTC && getMedia);
  const mySid = () => {
    const r = ctxRef && ctxRef.room && ctxRef.room();
    return r && r.sessionId;
  };
  const isOfferer = id => {
    const me = mySid();
    return me != null && String(me) < String(id);
  };
  function setTalking(on) {
    if (stream && stream.getAudioTracks) stream.getAudioTracks().forEach(t => (t.enabled = on));
  }

  function signal(to, kind, payload) {
    if (ctxRef) ctxRef.sendRelay('voice', { to, kind, payload });
  }

  function ensurePeer(id, mayOffer) {
    if (!joined || !supported()) return null;
    let entry = peers.get(id);
    if (entry) return entry;
    const pc = new RTC({ iceServers: ICE });
    const audio = makeAudio ? makeAudio() : null;
    entry = { pc, audio };
    peers.set(id, entry);
    if (stream && stream.getTracks) stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.onicecandidate = e => {
      if (e && e.candidate) signal(id, 'ice', e.candidate);
    };
    pc.ontrack = e => {
      if (audio && e && e.streams && e.streams[0]) {
        audio.srcObject = e.streams[0];
        audio.autoplay = true;
        if (audio.play) {
          try {
            audio.play();
          } catch (_) {
            /* autoplay may be blocked until a gesture */
          }
        }
      }
    };
    if (mayOffer && isOfferer(id)) makeOffer(id, pc);
    return entry;
  }

  async function makeOffer(id, pc) {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signal(id, 'offer', offer);
    } catch (_) {
      /* ignore */
    }
  }

  async function onSignal(from, kind, payload) {
    if (!joined || !supported()) return;
    const entry = peers.get(from) || ensurePeer(from, false);
    if (!entry) return;
    const pc = entry.pc;
    try {
      if (kind === 'offer') {
        await pc.setRemoteDescription(payload);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signal(from, 'answer', answer);
      } else if (kind === 'answer') {
        await pc.setRemoteDescription(payload);
      } else if (kind === 'ice') {
        await pc.addIceCandidate(payload);
      }
    } catch (_) {
      /* ignore */
    }
  }

  function closePeer(id) {
    const e = peers.get(id);
    if (e) {
      try {
        e.pc.close();
      } catch (_) {
        /* ignore */
      }
      if (e.audio) {
        try {
          e.audio.srcObject = null;
        } catch (_) {
          /* ignore */
        }
      }
    }
    peers.delete(id);
  }

  async function join() {
    if (joined) return;
    if (!supported()) {
      status = 'unsupported';
      return;
    }
    status = 'connecting';
    try {
      stream = await getMedia({ audio: true, video: false });
    } catch (_) {
      stream = null;
      status = 'unsupported'; // mic denied / unavailable
      return;
    }
    joined = true;
    muted = true;
    setTalking(false);
    status = 'muted';
    if (ctxRef) ctxRef.others.forEach((_o, id) => ensurePeer(id, true));
  }

  function leave() {
    for (const id of [...peers.keys()]) closePeer(id);
    if (stream && stream.getTracks) stream.getTracks().forEach(t => t.stop && t.stop());
    stream = null;
    joined = false;
    status = 'off';
  }

  return {
    id: 'voice',
    // exposed for tests / programmatic control
    _join: join,
    _leave: leave,

    init(ctx) {
      ctxRef = ctx;
      if (!supported()) status = 'unsupported';
    },

    update(_dt, ctx) {
      ctxRef = ctx;
      ptt = !!(ctx.input && ctx.input.key && !ctx.typing && ctx.input.key(PTT_KEY));
      if (joined) {
        const talking = !muted || ptt;
        setTalking(talking);
        status = talking ? 'live' : 'muted';
      }
    },

    onNetMessage(evt, ctx) {
      ctxRef = ctx;
      if (evt && evt.type === 'voice' && evt.msg && evt.msg.to === mySid()) {
        onSignal(evt.from, evt.msg.kind, evt.msg.payload);
      }
    },

    onPeerJoin(id, _info, ctx) {
      ctxRef = ctx;
      if (joined) ensurePeer(id, true);
    },
    onPeerLeave(id, _info, ctx) {
      ctxRef = ctx;
      closePeer(id);
    },

    renderUI(ctx) {
      ctxRef = ctx;
      const label = !supported()
        ? 'MIC n/a'
        : !joined
          ? 'MIC: off'
          : status === 'live'
            ? 'MIC ● live'
            : 'MIC: muted';
      return Panel({ x: 8, y: 44, anchor: 'tr', bg: 0x00000000 }, [
        Button({
          id: 'voice',
          label,
          onTap: () => {
            if (!supported()) return;
            if (!joined) join();
            else muted = !muted;
          },
        }),
      ]);
    },
  };
}
