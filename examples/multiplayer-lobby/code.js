// multiplayer-lobby — the Phase 1 nova64.net demo.
//
// Sign in (guest by default), join the shared "state" room, and move a dot with
// the arrow keys. Open a second browser tab to watch positions sync in realtime.
//
// Needs the server running:  cd server && pnpm start   (ws://localhost:2567)
// Override the URL with globalThis.__NOVA64_NET_URL.
//
// See docs/MULTIPLAYER_AND_AUTH_DESIGN.md. Web is wired today; Godot follows in
// Phase 2; RetroArch has no in-core sockets (the cart degrades to a notice).

let room = null;
let me = null;
let myX = 320;
let myY = 200;
let status = 'starting';
const others = new Map(); // sessionId -> { x, y, name }

const SPEED = 140; // px/s

function netReady() {
  return !!(nova64.net && nova64.net.isSupported && nova64.net.isSupported());
}

// Default to the SAME host the page was served from (port 2567), so loading the
// console from localhost vs a LAN/WSL IP both reach the matching server without
// a localhost-forwarding mismatch. Override with globalThis.__NOVA64_NET_URL.
function defaultNetUrl() {
  try {
    if (typeof location !== 'undefined' && location.hostname) {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      return proto + '://' + location.hostname + ':2567';
    }
  } catch (_) {
    /* ignore */
  }
  return 'ws://localhost:2567';
}

// init() is intentionally NOT async and never blocks on the network — the cart
// must render and accept input on the very first frame. The connection runs in
// the background and just adds the other players once it's ready.
export function init() {
  status = 'starting';
  others.clear();
  room = null;
  me = null;
  myX = 320;
  myY = 200;
  connectAsync();
}

async function connectAsync() {
  if (!netReady()) {
    status = 'offline (no net on this host)';
    return;
  }
  try {
    // Guest identity by default. Swap for nova64.auth.signIn('google') once a
    // Supabase client is configured via nova64.auth.configure({ client }).
    if (nova64.auth && nova64.auth.signIn) {
      me = await nova64.auth.signIn('guest', {
        name: 'Player-' + Math.floor(Math.random() * 1000),
      });
    }

    status = 'connecting...';
    const url = globalThis.__NOVA64_NET_URL || defaultNetUrl();
    await nova64.net.connect({ url });
    room = await nova64.net.joinOrCreate('state', { name: (me && me.displayName) || 'Player' });
    status = 'connected';

    room.onPlayerAdd((p, id) => {
      if (id !== room.sessionId) others.set(id, { x: p.x, y: p.y, name: p.name });
    });
    room.onPlayerChange((p, id) => {
      if (id !== room.sessionId) others.set(id, { x: p.x, y: p.y, name: p.name });
    });
    room.onPlayerRemove(id => others.delete(id));
    room.onLeave(() => {
      status = 'disconnected';
      room = null;
    });
    room.onError(code => {
      status = 'error ' + code;
    });
    // announce our starting position so others see us immediately
    room.send('pos', { x: Math.round(myX), y: Math.round(myY) });
  } catch (e) {
    room = null;
    status = 'offline (server not reachable)';
  }
}

function down(...codes) {
  const k = nova64.input && (nova64.input.key || nova64.input.isKeyPressed);
  if (typeof k !== 'function') return false;
  return codes.some(c => k.call(nova64.input, c));
}

export function update(dt) {
  if (nova64.net && nova64.net._tick) nova64.net._tick(dt); // no-op on web, pumps native transports

  // Move the local dot regardless of connection state — input must always work.
  let dx = 0;
  let dy = 0;
  if (down('ArrowLeft', 'KeyA')) dx -= SPEED * dt;
  if (down('ArrowRight', 'KeyD')) dx += SPEED * dt;
  if (down('ArrowUp', 'KeyW')) dy -= SPEED * dt;
  if (down('ArrowDown', 'KeyS')) dy += SPEED * dt;

  if (dx || dy) {
    myX = Math.max(10, Math.min(630, myX + dx));
    myY = Math.max(40, Math.min(350, myY + dy));
    if (room) room.send('pos', { x: Math.round(myX), y: Math.round(myY) }); // sync only when connected
  }
}

function col(r, g, b, a = 255) {
  return nova64.draw.rgba8 ? nova64.draw.rgba8(r, g, b, a) : (r << 16) | (g << 8) | b;
}

function avatar(x, y, label, c) {
  nova64.draw.rectfill(x - 6, y - 6, 12, 12, c);
  nova64.draw.print(label, x - 12, y - 20, c);
}

export function draw() {
  if (nova64.draw.cls) nova64.draw.cls(col(11, 11, 22));
  else nova64.draw.rectfill(0, 0, 640, 360, col(11, 11, 22));

  nova64.draw.print('NOVA64 NET  -  lobby [' + status + ']', 8, 8, col(102, 255, 204));

  others.forEach((o, id) => avatar(o.x, o.y, o.name || id.slice(0, 4), col(70, 150, 255)));
  avatar(myX, myY, (me && me.displayName) || 'me', col(255, 200, 60));

  nova64.draw.print('Arrow keys / WASD to move', 8, 330, col(120, 140, 200));
  nova64.draw.print('Open a 2nd tab to see realtime sync', 8, 344, col(120, 140, 200));
}
