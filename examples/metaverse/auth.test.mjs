// Auth plugin test: the identity panel exposes Google/wallet sign-in for guests
// and sign-out for signed-in users, all through the app-provided ctx.auth seam.

import { authPlugin } from './plugins/auth.js';
import { defaultTheme } from './core/ui.js';

const assert = (c, m) => {
  if (!c) {
    console.error('FAIL auth-plugin:', m);
    process.exit(1);
  }
};

function backend(draws) {
  return {
    drawRect: (...a) => draws.push(['rect', ...a]),
    drawText: (...a) => draws.push(['text', ...a]),
    measureText: s => String(s).length * 6,
    viewport: () => ({ w: 640, h: 360 }),
  };
}

function paint(plugin, ctx, draws = []) {
  const hits = [];
  const node = plugin.renderUI(ctx);
  node.paint({ backend: backend(draws), theme: defaultTheme }, 0, 0, hits);
  return { hits, draws };
}

const signIns = [];
let signedOut = false;
let me = { provider: 'guest', displayName: 'Visitor' };
const ctx = {
  theme: defaultTheme,
  me: () => me,
  displayName: () => me.displayName,
  auth: {
    busy: () => false,
    message: () => '',
    signIn: async provider => {
      signIns.push(provider);
      return { provider, displayName: provider === 'google' ? 'Ada L.' : '0xAbC0...0001' };
    },
    signOut: () => {
      signedOut = true;
      me = { provider: 'guest', displayName: 'Visitor' };
    },
  },
};

const plugin = authPlugin();
let painted = paint(plugin, ctx);
assert(
  painted.draws.some(d => d[0] === 'text' && d[1] === 'IDENTITY'),
  'identity title rendered'
);
assert(
  painted.draws.some(d => d[0] === 'text' && d[1] === 'guest'),
  'guest state rendered'
);

const google = painted.hits.find(h => h.id === 'auth-google');
const wallet = painted.hits.find(h => h.id === 'auth-wallet');
assert(google && wallet, 'guest actions rendered');
await google.onTap();
await wallet.onTap();
assert(signIns.join(',') === 'google,wallet', 'guest buttons invoke provider sign-in');

me = { provider: 'google', displayName: 'Ada L.' };
painted = paint(plugin, ctx);
assert(
  painted.draws.some(d => d[0] === 'text' && String(d[1]).includes('Ada L.')),
  'signed-in identity rendered'
);
const out = painted.hits.find(h => h.id === 'auth-signout');
assert(out, 'sign-out button rendered for signed-in user');
out.onTap();
assert(signedOut, 'sign-out action invoked');

console.log('PASS auth-plugin: Google/wallet sign-in and sign-out controls wired');
process.exit(0);
