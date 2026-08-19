// nova64.net — realtime multiplayer over Colyseus.
//
// Web backend: wraps colyseus.js directly (browser WebSocket transport). Godot
// gets the same API over a host WebSocket bridge in a later phase; RetroArch has
// no in-core sockets (see docs/MULTIPLAYER_AND_AUTH_DESIGN.md).
//
// Cart usage:
//   await nova64.net.connect({ url, token: nova64.auth.token() });
//   const room = await nova64.net.joinOrCreate('state', { name: 'IO' });
//   room.onPlayerAdd((p, id) => spawn(id, p));
//   room.onPlayerChange((p, id) => move(id, p.x, p.y));
//   room.onPlayerRemove(id => despawn(id));
//   room.send('move', { dx, dy });
//   room.onMessage('event', e => ...);
//
// The token comes from nova64.auth (optional — the dev server allows guests).

// colyseus.js is imported LAZILY (inside connect) rather than at module top so a
// dependency-resolution hiccup (e.g. a stale vite dep-optimize cache) can never
// crash engine init — nova64.net just reports unsupported and carts degrade.
let _Client = null;
async function loadClient() {
  if (_Client) return _Client;
  const mod = await import('colyseus.js');
  _Client = mod.Client || (mod.default && mod.default.Client);
  patchSeatReservation(_Client);
  return _Client;
}

// colyseus.js tops out at 0.16.x (no 0.17 client exists), but our server runs
// colyseus 0.17 so it can serve the native Godot SDK on one backend. 0.17 changed
// the matchmaking seat-reservation response from nested `{ room: {...}, sessionId }`
// to flat `{ name, roomId, processId, sessionId }`. The 0.16 client reads
// `response.room.*`, so we re-nest the flat shape before it parses. publicAddress
// is intentionally omitted — buildEndpoint then falls back to the connection host.
function patchSeatReservation(Client) {
  const proto = Client && Client.prototype;
  if (!proto || proto.__nova64SeatPatched) return;
  const orig = proto.consumeSeatReservation;
  proto.consumeSeatReservation = function (response, rootSchema, reuse) {
    if (response && !response.room && response.name) {
      response.room = {
        name: response.name,
        roomId: response.roomId,
        processId: response.processId,
        publicAddress: response.publicAddress,
      };
    }
    return orig.call(this, response, rootSchema, reuse);
  };
  proto.__nova64SeatPatched = true;
}

const DEFAULT_URL = 'ws://localhost:2567';

// Wrap a colyseus.js Room in a stable, version-agnostic facade. Player add/
// change/remove are derived by diffing the `players` map on each state change,
// so we don't depend on a specific colyseus schema-callback API.
function makeRoomFacade(room) {
  const known = new Set();
  const addCbs = [];
  const changeCbs = [];
  const removeCbs = [];

  room.onStateChange(() => {
    const players = room.state && room.state.players;
    if (!players || typeof players.forEach !== 'function') return;
    const seen = new Set();
    players.forEach((p, id) => {
      seen.add(id);
      if (!known.has(id)) {
        known.add(id);
        addCbs.forEach(cb => {
          try {
            cb(p, id);
          } catch (_) {
            /* ignore */
          }
        });
      } else {
        changeCbs.forEach(cb => {
          try {
            cb(p, id);
          } catch (_) {
            /* ignore */
          }
        });
      }
    });
    known.forEach(id => {
      if (!seen.has(id)) {
        known.delete(id);
        removeCbs.forEach(cb => {
          try {
            cb(id);
          } catch (_) {
            /* ignore */
          }
        });
      }
    });
  });

  return {
    get raw() {
      return room;
    },
    get sessionId() {
      return room.sessionId;
    },
    get name() {
      return room.name;
    },
    get state() {
      return room.state;
    },
    players() {
      return room.state && room.state.players;
    },

    send: (type, message) => room.send(type, message),
    onMessage: (type, cb) => room.onMessage(type, cb),
    onStateChange: cb => room.onStateChange(cb),
    onLeave: cb => room.onLeave(cb),
    onError: cb => room.onError(cb),
    leave: () => room.leave(),

    onPlayerAdd: cb => {
      addCbs.push(cb);
      return () => {};
    },
    onPlayerChange: cb => {
      changeCbs.push(cb);
      return () => {};
    },
    onPlayerRemove: cb => {
      removeCbs.push(cb);
      return () => {};
    },
  };
}

export function netApi() {
  let client = null;
  let current = null; // facade for the active room

  function isSupported() {
    // Any host that wires nova64.net (web, Node, later Godot) can network. The
    // colyseus client loads lazily in connect(), which fails gracefully if it
    // can't. RetroArch never exposes nova64.net, so carts guard with `nova64.net &&`.
    return true;
  }

  async function connect(opts = {}) {
    const url = opts.url || DEFAULT_URL;
    const Client = await loadClient();
    if (typeof Client !== 'function') {
      return { ok: false, error: 'colyseus_client_unavailable' };
    }
    client = new Client(url);
    return { ok: true, url };
  }

  function joinOptions(options, token) {
    const o = Object.assign({}, options);
    if (token && o.token == null) o.token = token;
    return o;
  }

  async function _enter(method, roomName, options, token) {
    if (!client) {
      const r = await connect(options);
      if (!r.ok || !client) throw new Error(r.error || 'connect_failed');
    }
    const room = await client[method](roomName, joinOptions(options, token));
    current = makeRoomFacade(room);
    return current;
  }

  // token is taken from opts.token, else nova64.auth.token() if present.
  function tokenFrom(options) {
    if (options && options.token) return options.token;
    const auth = globalThis.nova64 && globalThis.nova64.auth;
    return auth && typeof auth.token === 'function' ? auth.token() : undefined;
  }

  const joinOrCreate = (name, options = {}) =>
    _enter('joinOrCreate', name, options, tokenFrom(options));
  const join = (name, options = {}) => _enter('join', name, options, tokenFrom(options));
  const create = (name, options = {}) => _enter('create', name, options, tokenFrom(options));
  const joinById = (id, options = {}) => _enter('joinById', id, options, tokenFrom(options));

  function leave() {
    if (current) {
      try {
        current.leave();
      } catch (_) {
        /* ignore */
      }
      current = null;
    }
  }

  function room() {
    return current;
  }
  function backend() {
    return 'web';
  }

  // Web colyseus.js is event-driven; the per-frame pump is a no-op here (the
  // Godot transport will use it to poll the host WebSocket).
  function _tick() {}

  const surface = {
    connect,
    joinOrCreate,
    join,
    create,
    joinById,
    leave,
    room,
    isSupported,
    backend,
    _tick,
  };

  function exposeTo(target) {
    target.net = surface;
  }

  return Object.assign({}, surface, { exposeTo });
}
