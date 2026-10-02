// Focused test for chat command wiring (esp. /nick → ctx.setName). Builds a fake
// context, inits the plugin (no DOM in node, so the bar is skipped), and invokes
// the registered commands directly. Run: node chat.test.mjs

import { chatPlugin } from './plugins/chat.js';

const assert = (c, m) => {
  if (!c) {
    console.error('FAIL chat:', m);
    process.exit(1);
  }
};

const commands = new Map();
const relayed = [];
let named = 'me';
const ctx = {
  registerCommand: (n, f) => commands.set(n, f),
  runCommand: (n, a) => (commands.has(n) ? (commands.get(n)(a, ctx), true) : false),
  setName: n => {
    named = n;
  },
  displayName: () => named,
  sendRelay: (t, m) => relayed.push({ t, m }),
  me: () => ({}),
  others: new Map(),
  room: () => null,
};

const plug = chatPlugin();
plug.init(ctx);

// /nick renames via ctx.setName.
assert(commands.has('nick'), '/nick command registered');
commands.get('nick')('Neo', ctx);
assert(named === 'Neo', '/nick calls ctx.setName');
assert(ctx.displayName() === 'Neo', 'displayName reflects the new nick');

// blank /nick is a no-op (keeps the previous name).
commands.get('nick')('   ', ctx);
assert(named === 'Neo', 'blank /nick is ignored');

// over-long names are clamped to 24 chars.
commands.get('nick')('x'.repeat(50), ctx);
assert(named.length === 24, '/nick clamps to 24 chars');

// /me still relays an action line.
assert(commands.has('me'), '/me command registered');
commands.get('me')('waves', ctx);
assert(
  relayed.some(r => r.t === 'chat' && /waves/.test(r.m.text)),
  '/me relays an action'
);

console.log('PASS chat: /nick (rename + blank-skip + clamp) and /me wired');
process.exit(0);
