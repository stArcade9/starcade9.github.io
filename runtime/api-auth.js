// nova64.auth — extensible identity. A pluggable provider registry behind a
// single API. Built-ins: `guest` (works with no backend), Supabase-backed
// OAuth/social (`google`/`discord`/`github`/`oauth`), and `wallet` (EVM
// Sign-In-With-Ethereum, EIP-4361). New methods register via registerProvider.
//
// Auth yields a session JWT that nova64.net hands to the Colyseus server.
// See docs/MULTIPLAYER_AND_AUTH_DESIGN.md.
//
//   await nova64.auth.signIn('guest', { name: 'IO' });          // no backend
//   nova64.auth.configure({ client: supabaseClient });          // app provides it
//   await nova64.auth.signIn('google');                         // Supabase OAuth
//   await nova64.auth.signIn('wallet');                         // window.ethereum SIWE
//   nova64.auth.identity();  nova64.auth.token();  nova64.auth.onChange(cb);
//   nova64.auth.registerProvider('solana', mySolanaProvider);

const STORAGE_KEY = 'nova64.auth.session';

function safeGet() {
  try {
    return globalThis.localStorage ? localStorage.getItem(STORAGE_KEY) : null;
  } catch (_) {
    return null;
  }
}
function safeSet(v) {
  try {
    if (!globalThis.localStorage) return;
    if (v) localStorage.setItem(STORAGE_KEY, v);
    else localStorage.removeItem(STORAGE_KEY);
  } catch (_) {
    /* ignore */
  }
}

// Short 0x1234…abcd label for a wallet address.
function shortAddr(a) {
  return a.slice(0, 6) + '…' + a.slice(-4);
}
// EIP-4361 message — must match the server's buildSiweMessage (server/src/wallet/siwe.js).
function buildSiweMessage({ domain, address, uri, nonce, chainId = 1 }) {
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    'Sign in to the Nova64 metaverse.',
    '',
    `URI: ${uri}`,
    'Version: 1',
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join('\n');
}

export function authApi() {
  const providers = new Map();
  const changeCbs = [];
  let session = null; // current Identity | null
  let supabase = null; // app-provided Supabase client (optional)
  let authUrl = null; // base URL of the wallet auth endpoints (optional)

  function emit() {
    changeCbs.forEach(cb => {
      try {
        cb(session);
      } catch (_) {
        /* ignore */
      }
    });
  }

  // ---- built-in: guest (always available, no backend) --------------------
  providers.set('guest', {
    name: 'guest',
    async signIn(opts = {}) {
      return {
        id: 'guest:' + Math.random().toString(36).slice(2, 10),
        provider: 'guest',
        displayName: opts.name || 'Guest',
        claims: {},
        token: '', // server allows guests in dev
      };
    },
  });

  // ---- built-in: Supabase OAuth/social ----------------------------------
  async function readSupabaseSession() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const s = data && data.session;
    if (!s || !s.user) return null;
    const u = s.user;
    const prov = (u.app_metadata && u.app_metadata.provider) || 'oauth';
    return {
      id: prov + ':' + u.id,
      provider: prov,
      displayName:
        (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) ||
        u.email ||
        'player',
      avatar: u.user_metadata && u.user_metadata.avatar_url,
      claims: u,
      token: s.access_token, // Supabase JWT — Colyseus verifies it
    };
  }

  function makeOAuthProvider(providerName) {
    function oauthOptions(opts) {
      const options = Object.assign({}, (opts && opts.options) || {});
      if (!options.redirectTo && typeof location !== 'undefined' && location && location.href) {
        options.redirectTo = location.href;
      }
      return options;
    }
    return {
      name: providerName,
      async signIn(opts = {}) {
        if (!supabase) {
          return {
            error: 'auth_not_configured',
            message: 'call nova64.auth.configure({ client }) with a Supabase client first',
          };
        }
        const provider = providerName === 'oauth' ? opts.provider || 'google' : providerName;
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: oauthOptions(opts),
        });
        if (error) return { error: 'oauth_failed', message: error.message };
        // The OAuth redirect navigates away; on return, restore() reads the session.
        return await readSupabaseSession();
      },
      restore: readSupabaseSession,
      async signOut() {
        if (supabase) await supabase.auth.signOut();
      },
    };
  }
  ['google', 'discord', 'github', 'oauth'].forEach(n => providers.set(n, makeOAuthProvider(n)));

  // ---- built-in: wallet (EVM Sign-In-With-Ethereum, EIP-4361) ------------
  // window.ethereum signs a server-issued nonce; the server verifies the
  // signature and mints a session JWT (id = "wallet:<address>"). Deps are
  // injectable (ethereum/fetch/authUrl) so the flow is testable without a wallet.
  function resolveAuthUrl(opts) {
    if (opts && opts.authUrl) return opts.authUrl;
    if (authUrl) return authUrl;
    if (typeof location !== 'undefined' && location.hostname) {
      const proto = location.protocol === 'https:' ? 'https' : 'http';
      return `${proto}://${location.hostname}:2567`;
    }
    return 'http://localhost:2567';
  }
  providers.set('wallet', {
    name: 'wallet',
    async signIn(opts = {}) {
      const eth = opts.ethereum || (typeof window !== 'undefined' ? window.ethereum : null);
      const doFetch = opts.fetch || (typeof fetch !== 'undefined' ? fetch : null);
      if (!eth || typeof eth.request !== 'function') {
        return { error: 'no_wallet', message: 'no EIP-1193 wallet (window.ethereum) found' };
      }
      if (!doFetch) return { error: 'no_fetch', message: 'fetch unavailable' };
      const base = resolveAuthUrl(opts).replace(/\/$/, '');
      try {
        const accounts = await eth.request({ method: 'eth_requestAccounts' });
        const address = accounts && accounts[0];
        if (!address) return { error: 'no_account' };
        const nres = await doFetch(base + '/auth/wallet/nonce', { method: 'POST' });
        const { nonce } = await nres.json();
        if (!nonce) return { error: 'no_nonce' };
        const domain = (typeof location !== 'undefined' && location.host) || 'nova64';
        const uri = (typeof location !== 'undefined' && location.origin) || 'https://nova64';
        const message = buildSiweMessage({ domain, address, uri, nonce });
        const signature = await eth.request({
          method: 'personal_sign',
          params: [message, address],
        });
        const vres = await doFetch(base + '/auth/wallet/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, signature }),
        });
        if (!vres.ok) {
          const e = await vres.json().catch(() => ({}));
          return { error: e.error || 'verify_failed' };
        }
        const data = await vres.json();
        return {
          id: data.id || 'wallet:' + String(address).toLowerCase(),
          provider: 'wallet',
          displayName: data.name || shortAddr(address),
          address: String(address).toLowerCase(),
          claims: {},
          token: data.token,
        };
      } catch (e) {
        return { error: 'wallet_signin_failed', message: e && e.message };
      }
    },
  });

  // ---- public API --------------------------------------------------------
  function configure(opts = {}) {
    let ok = false;
    if (opts && opts.client) {
      supabase = opts.client;
      ok = true;
    }
    if (opts && opts.authUrl) {
      authUrl = opts.authUrl;
      ok = true;
    }
    return ok;
  }

  async function signIn(providerName = 'guest', opts = {}) {
    const p = providers.get(providerName);
    if (!p) return { error: 'unknown_provider', message: providerName };
    const res = await p.signIn(opts);
    if (!res || res.error) return res || { error: 'sign_in_failed' };
    session = res;
    safeSet(JSON.stringify(session));
    emit();
    return session;
  }

  function signOut() {
    const p = session && providers.get(session.provider);
    if (p && p.signOut) {
      try {
        p.signOut();
      } catch (_) {
        /* ignore */
      }
    }
    session = null;
    safeSet(null);
    emit();
  }

  function identity() {
    return session;
  }
  function token() {
    return session ? session.token : '';
  }
  function isSignedIn() {
    return !!session;
  }

  function onChange(cb) {
    changeCbs.push(cb);
    if (session) {
      try {
        cb(session);
      } catch (_) {
        /* ignore */
      }
    }
    return () => {
      const i = changeCbs.indexOf(cb);
      if (i >= 0) changeCbs.splice(i, 1);
    };
  }

  async function restore() {
    // 1) a provider may have a live session (e.g. Supabase after OAuth redirect)
    for (const p of providers.values()) {
      if (typeof p.restore === 'function') {
        try {
          const r = await p.restore();
          if (r) {
            session = r;
            safeSet(JSON.stringify(session));
            emit();
            return session;
          }
        } catch (_) {
          /* ignore */
        }
      }
    }
    // 2) fall back to a stored session
    const raw = safeGet();
    if (raw) {
      try {
        session = JSON.parse(raw);
        emit();
        return session;
      } catch (_) {
        /* ignore */
      }
    }
    return null;
  }

  function registerProvider(name, impl) {
    if (name && impl && typeof impl.signIn === 'function') {
      providers.set(name, Object.assign({ name }, impl));
      return true;
    }
    return false;
  }

  const surface = {
    configure,
    signIn,
    signOut,
    identity,
    token,
    isSignedIn,
    onChange,
    restore,
    registerProvider,
    providers: () => [...providers.keys()],
  };

  function exposeTo(target) {
    target.auth = surface;
  }
  return Object.assign({}, surface, { exposeTo });
}
