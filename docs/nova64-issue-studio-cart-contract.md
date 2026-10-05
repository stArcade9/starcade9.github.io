<!--
Ready to file at https://github.com/seacloud9/nova64/issues
Title is the first line; everything below the rule is the issue body.
-->

# README's first cart example cannot run in studio mode

---

**Package:** `nova64@0.5.3` (current `latest`)
**Verified by:** reading the published tarball (`npm pack nova64@0.5.3`) and
running the reproduction below. All paths are inside that tarball.

## Summary

The example under **"Creating Your First 3D Cart"** in `README.md` (~line 697)
cannot run in studio mode — the path used by `cart-runner.html`, `hero-embed`,
and every embedding host. It fails three separate ways, and one of them fails
silently in a way that looks like a working cart.

This is the first example a new user copies. It also matters more than a normal
documentation slip, because AI assistants that have read the README emit this
exact shape confidently — so *every* generated cart fails, for a reason the
error text never mentions.

## Reproduction

```js
// repro.mjs — mirrors runtime/studio-executor.js
globalThis.nova64 = { draw: { print: () => {} }, scene: { createCube: () => {} } };

const studioWrap = (src) => new Function(`${src}
; return { init: typeof init !== "undefined" ? init : null };`);

// Verbatim shape from the README
studioWrap(`
export function init() {
  const player = createCube(1, 0x0088ff, [0, 1, 0]);
  print('Score: 0', 10, 10, 0xffffff);
}`);
```

```
$ node repro.mjs
SyntaxError: Unexpected token 'export'
```

Remove the `export` keywords and run `init()`:

```
ReferenceError: createCube is not defined
```

Remove the `createCube` call too, leaving only `print(...)`, and it **does not
throw** — it calls `window.print()` and opens the browser print dialog.

## Root cause

### 1. `export` is a syntax error under the studio executor

`runtime/studio-executor.js:6` evaluates cart source with `new Function`:

```js
export function createStudioCartFunction(userCode) {
  return new Function(
    `${userCode}
; return {
  init: typeof init !== "undefined" ? init : null,
  ...
};`
  );
}
```

A function body is not a module, so a top-level `export` throws before any cart
code runs. The README's framing — *"Nova64 carts are **ES modules**"* — is true
for carts the CLI loads from disk, and false for studio mode. The README does
not currently distinguish the two (searching it for "studio" returns only
unrelated hits at lines 214 and 1111).

### 2. The example calls bare globals that no longer exist

`createPlane`, `createCube`, `setFog`, `setAmbientLight`, `key`, `setPosition`,
`rotateMesh`, `setCameraPosition` and `setCameraTarget` are all written without a
namespace. `runtime/namespace.js` (`NAMESPACE_MAP`) is authoritative now, and
nothing under `runtime/` assigns these onto `globalThis` — `grep -rn
'globalThis.createCube' runtime/` finds no assignment. Each call throws
`ReferenceError`.

### 3. Bare `print` silently calls `window.print()`

This is the one worth fixing first, because it is the only one that doesn't
throw.

`print` is not undefined in a browser — it is `window.print`. So the README's
`print(\`Score: ${score}\`, 10, 10, 0xffffff)` opens the **browser print dialog**
mid-frame, on a cart that otherwise appears to be running.

The runtime already knows about this collision. `runtime/api-2d.js:445`:

```js
// Use the grouped namespace's draw.print (NOT globalThis.print, which is window.print).
function _print(text, x, y, color, scale) {
  const fn = globalThis.nova64?.draw?.print;
  if (typeof fn === 'function') fn(text, x, y, color, scale);
}
```

The internal helper guards against it. The README still shows the unguarded
form.

## Suggested fixes

Either of the first two resolves all three together:

1. **Document the studio shape as the default.** Show plain `function init()`
   declarations with namespaced calls (`nova64.scene.createCube`,
   `nova64.draw.print`), and move the `export` module form into a clearly
   separate "CLI / file-based carts" section. Smallest change, removes the
   ambiguity at the source.

2. **Tolerate `export` in the executor.** Strip or accept top-level `export` in
   `createStudioCartFunction`, so the documented shape runs wherever it is
   pasted. More forgiving for generated carts, which will keep reproducing the
   README's form for as long as it is the first example on the page.

3. **Worth doing regardless — a better error.** Catch the `SyntaxError` in
   `createStudioCartFunction` and re-throw with something self-answering, e.g.
   *"carts cannot use `export` in studio mode — declare `function init()`
   directly"*. Right now the raw `Unexpected token 'export'` gives no hint that
   module syntax is the problem.

## Note on a workaround we chose not to ship

A host can fix all three without changing Nova64, by stripping `export` and
prepending local bindings before posting `EXECUTE_CODE` — the prepended source
lands inside the same `new Function` body, so `const print = nova64.draw.print`
shadows `window.print`. Verified working.

We deliberately did not do this. It needs a parser rather than regexes to be
safe, a naive version breaks carts that declare their own helper
(`SyntaxError: Identifier 'print' has already been declared`), and it would make
carts that run in our host fail in a vanilla one. Mentioned only in case it is
useful as a stopgap elsewhere — the real fix belongs here.
