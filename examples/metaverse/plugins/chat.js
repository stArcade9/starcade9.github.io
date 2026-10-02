// chat.js — chat as a plugin, over a swappable transport provider.
//
// Web input is an ALWAYS-PRESENT, full-width bar docked to the bottom of the
// cart screen (a real DOM <input> = native mobile keyboard). Click/tap it to
// type, Enter to send. While it has focus, keystrokes are kept out of the game
// (stopPropagation) so typing never moves your avatar or restarts the cart.
//
// Default transport = the colyseus `event` relay (room.send('chat',…) → server
// broadcasts to everyone else → onNetMessage). Swap via chatPlugin({ provider })
// with { send(text, ctx), receive(evt) -> {from,text} }. Commands register via
// ctx.registerCommand. On non-DOM backends (Godot) the bar is skipped — a native
// input is wired there separately; receive/log still work.

import { Panel, List, Text } from '../core/ui.js';

const MAX_LOG = 7;
const BAR_ID = 'nova64-metaverse-chatbar';
const BAR_H = 30;

function colyseusProvider() {
  return {
    id: 'colyseus',
    send(text, ctx) {
      ctx.sendRelay('chat', { text });
    },
    receive(evt) {
      if (evt && evt.type === 'chat' && evt.msg && typeof evt.msg.text === 'string') {
        return { from: evt.from, text: evt.msg.text };
      }
      return null;
    },
  };
}

export function chatPlugin(opts = {}) {
  const provider = opts.provider || colyseusProvider();
  const log = [];
  let bar = null;
  let barTried = false; // one-shot: don't retry DOM creation every frame
  let gdtext = false; // using the native Godot text input (no DOM)
  let focused = false;

  function push(name, text) {
    log.push({ name, text });
    while (log.length > MAX_LOG) log.shift();
  }
  function nameFor(id, ctx) {
    if (ctx.room() && id === ctx.room().sessionId) return myName(ctx);
    const o = ctx.others.get(id);
    return (o && o.name) || (id || '').slice(0, 4);
  }
  function myName(ctx) {
    if (typeof ctx.displayName === 'function') return ctx.displayName();
    const me = ctx.me();
    return (me && me.displayName) || 'me';
  }

  function submit(ctx, raw) {
    const text = (raw || '').trim();
    if (!text) return;
    if (text[0] === '/') {
      const sp = text.indexOf(' ');
      const name = (sp < 0 ? text.slice(1) : text.slice(1, sp)).toLowerCase();
      const args = sp < 0 ? '' : text.slice(sp + 1);
      if (ctx.runCommand(name, args)) return;
      push('*', 'unknown command: /' + name);
      return;
    }
    provider.send(text, ctx);
    push(myName(ctx), text); // local echo (relay excludes the sender)
  }

  // Build the persistent, full-width bottom chat bar (web only).
  function ensureBar(ctx) {
    if (bar || barTried) return;
    barTried = true; // attempt once; on non-DOM hosts the catch below leaves bar null
    // Godot's QuickJS shim defines a partial `document` stub (createElement exists
    // but document.body.appendChild doesn't), so feature-testing is whack-a-mole.
    // Try to build the bar and bail cleanly if anything is missing (no real DOM →
    // no chat bar; a native Godot text input comes later; receive/log still work).
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    try {
      buildBar(ctx);
    } catch (_) {
      bar = null;
    }
  }

  function buildBar(ctx) {
    const old = document.getElementById(BAR_ID);
    if (old) old.remove();
    const el = document.createElement('input');
    el.id = BAR_ID;
    el.type = 'text';
    el.autocomplete = 'off';
    el.spellcheck = false;
    el.placeholder = 'Press Enter to chat…  (/me, /help)';
    el.maxLength = 160;
    Object.assign(el.style, {
      position: 'fixed',
      left: '0px',
      bottom: '0px',
      width: '320px',
      height: BAR_H + 'px',
      boxSizing: 'border-box',
      zIndex: '99999',
      padding: '4px 10px',
      border: 'none',
      borderTop: '1px solid #2a3550',
      background: 'rgba(11,16,32,0.82)',
      color: '#dfe4ff',
      font: '13px monospace',
      outline: 'none',
    });
    // Keep all key events out of the game/console while typing.
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const v = el.value;
        el.value = '';
        submit(ctx, v);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        el.blur(); // drop back into movement
      }
      e.stopPropagation();
    });
    el.addEventListener('keyup', e => e.stopPropagation());
    el.addEventListener('focus', () => (focused = true));
    el.addEventListener('blur', () => (focused = false));
    document.body.appendChild(el);
    bar = el;
  }

  // Dock the bar to the bottom edge of the cart canvas, full width.
  function positionBar() {
    if (!bar) return;
    const canvas = document.getElementById('screen') || document.querySelector('canvas');
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    bar.style.left = r.left + 'px';
    bar.style.width = r.width + 'px';
    bar.style.top = r.bottom - BAR_H + 'px';
    bar.style.bottom = 'auto';
  }

  return {
    id: 'chat',
    isTyping: () => focused,

    init(ctx) {
      ensureBar(ctx);
      // No DOM bar (e.g. Godot) but a native text input is available → mount it.
      if (
        !bar &&
        typeof nova64 !== 'undefined' &&
        nova64.gdtext &&
        typeof nova64.gdtext.mount === 'function'
      ) {
        nova64.gdtext.mount('Tap / Enter to chat…  (/me, /help)');
        gdtext = true;
      }
      ctx.registerCommand('help', () => push('*', 'commands: /me <action>, /nick <name>, /help'));
      ctx.registerCommand('nick', (args, c) => {
        const name = (args || '').trim().slice(0, 24);
        if (!name) {
          push('*', 'usage: /nick <name>');
          return;
        }
        if (typeof c.setName === 'function') c.setName(name);
        push('*', 'you are now ' + name);
      });
      ctx.registerCommand('me', (args, c) => {
        const action = (args || '').trim();
        if (!action) return;
        const line = myName(c) + ' ' + action;
        c.sendRelay('chat', { text: line });
        push('*', line);
      });
    },

    update(_dt, ctx) {
      ensureBar(ctx);
      positionBar();
      // Godot native input: drain submitted lines + track focus.
      if (gdtext && nova64.gdtext) {
        const r = nova64.gdtext.poll();
        if (r) {
          focused = !!r.focused;
          const lines = r.lines || [];
          for (let i = 0; i < lines.length; i++) submit(ctx, lines[i]);
        }
      }
      // Expose typing state so controls can ignore movement while typing.
      ctx.typing = focused;
    },

    onNetMessage(evt, ctx) {
      const m = provider.receive(evt);
      if (m) push(nameFor(m.from, ctx), m.text);
    },

    renderUI(ctx) {
      const lines = log.map(e => e.name + ': ' + e.text);
      // Chat log sits just above the docked input bar (bottom-left).
      return Panel({ x: 6, y: BAR_H + 6, anchor: 'bl', bg: 0xaa0b1020 }, [
        Text({ value: 'CHAT', color: ctx.theme.accent }),
        List({ items: lines.length ? lines : ['(no messages yet)'], color: ctx.theme.dim }),
      ]);
    },
  };
}
