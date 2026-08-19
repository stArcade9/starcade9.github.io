// auth.js — identity controls for the metaverse.
//
// The app owns nova64.auth; this plugin stays backend-neutral and only calls the
// auth methods exposed through ctx.auth. OAuth may redirect away, while wallet
// sign-in resolves in-place.

import { Panel, Text, Row, Button } from '../core/ui.js';

export function authPlugin() {
  let message = '';

  function nameOf(ctx, me) {
    return (me && me.displayName) || (ctx.displayName && ctx.displayName()) || 'guest';
  }

  async function signIn(ctx, provider) {
    if (!(ctx.auth && ctx.auth.signIn)) {
      message = 'auth unavailable';
      return;
    }
    message = 'opening ' + provider + '...';
    const res = await ctx.auth.signIn(provider);
    if (res && res.error) {
      message = res.message || res.error;
    } else if (res) {
      message = 'signed in';
    } else {
      message = 'complete sign-in in browser';
    }
  }

  function signOut(ctx) {
    if (ctx.auth && ctx.auth.signOut) ctx.auth.signOut();
    message = 'signed out';
  }

  return {
    id: 'auth',
    renderUI(ctx) {
      const me = ctx.me();
      const provider = (me && me.provider) || 'guest';
      const signedIn = provider !== 'guest';
      const busy = !!(ctx.auth && ctx.auth.busy && ctx.auth.busy());
      const status = busy ? 'working...' : signedIn ? nameOf(ctx, me) + ' · ' + provider : 'guest';
      const msg = (ctx.auth && ctx.auth.message && ctx.auth.message()) || message;
      return Panel({ x: 8, y: 8, anchor: 'tr' }, [
        Text({ value: 'IDENTITY', color: ctx.theme.accent }),
        Text({ value: status, color: signedIn ? ctx.theme.fg : ctx.theme.dim }),
        signedIn
          ? Button({ id: 'auth-signout', label: 'SIGN OUT', onTap: () => signOut(ctx) })
          : Row({}, [
              Button({
                id: 'auth-google',
                label: 'GOOGLE',
                active: busy,
                onTap: () => signIn(ctx, 'google'),
              }),
              Button({
                id: 'auth-wallet',
                label: 'WALLET',
                active: busy,
                onTap: () => signIn(ctx, 'wallet'),
              }),
            ]),
        msg ? Text({ value: msg, color: ctx.theme.dim }) : null,
      ]);
    },
  };
}
