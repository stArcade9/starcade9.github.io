# Nova64 upstream issues

Issues in the `nova64` package itself, written up so they can be fixed in the
Nova64 workspace rather than worked around again in m{ai}geXR.

**Verified against `nova64@0.5.3`** (current `latest` on npm, 2026-10-04), by
reading the published tarball: `npm pack nova64@0.5.3`.

All file references below are paths inside that tarball.

---

## 1. The README's cart example cannot run in studio mode

**Severity:** high — it is the first example a new user copies, and it fails
three separate ways.

`README.md`, under *"Creating Your First 3D Cart"* (around line 697), opens with:

> Nova64 carts are **ES modules** with three lifecycle functions:

```javascript
export function init() {
  ground = createPlane(50, 50, 0x2a4d3a, [0, 0, 0]);
  player = createCube(1, 0x0088ff, [0, 1, 0], { material: 'metallic' });
  setFog(0x1a1a2e, 10, 30);
}

export function update(dt) {
  if (key('KeyW')) setPosition(player, 0, 1, -5 * dt);
}

export function draw() {
  print(`Score: ${score}`, 10, 10, 0xffffff);
}
```

That shape is correct for carts loaded as modules by the CLI. It does not work
in **studio mode**, which is the path every embedding host uses, including the
hosted `cart-runner.html` and `hero-embed`.

### 1a. `export` is a syntax error under the studio executor

`runtime/studio-executor.js` evaluates cart source with `new Function`:

```javascript
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

A function body is not a module, so a top-level `export` throws
`SyntaxError: Unexpected token 'export'` before any cart code runs. The README's
example therefore fails immediately, with an error that does not mention modules
or studio mode.

This bites hardest with AI-generated carts. A model that has read the README
emits the `export` form confidently, and then *every* generated cart fails for a
reason the error text does not explain.

### 1b. The example calls bare globals that no longer exist

`createPlane`, `createCube`, `setFog`, `setAmbientLight`, `key`, `setPosition`,
`rotateMesh`, `setCameraPosition` and `setCameraTarget` are all written without a
namespace. The grouped API in `runtime/namespace.js` (`NAMESPACE_MAP`) is
authoritative now, and nothing in `runtime/` assigns these names onto
`globalThis` — a `grep` for `globalThis.createCube` finds no assignment. So each
call throws `ReferenceError: createCube is not defined`.

### 1c. Bare `print` is worse than undefined — it silently calls `window.print()`

This is the one worth fixing first, because it fails *silently in the wrong
direction* rather than throwing.

`print` is not undefined in a browser: it is `window.print`. So the README's
`print(\`Score: ${score}\`, 10, 10, 0xffffff)` does not raise a `ReferenceError`
like the other bare globals — it opens the browser's **print dialog**, mid-frame,
on a cart that otherwise looks like it is working.

The runtime is already aware of this. `runtime/api-2d.js:445`:

```javascript
// Use the grouped namespace's draw.print (NOT globalThis.print, which is window.print).
function _print(text, x, y, color, scale) {
  const fn = globalThis.nova64?.draw?.print;
  if (typeof fn === 'function') fn(text, x, y, color, scale);
}
```

The internal helper guards against exactly this collision. The README still
shows the unguarded form.

> Not executed end to end. The collision is inferred from `window.print` being
> standard, from no global assignment existing in `runtime/`, and from the
> runtime's own comment above. Worth confirming with a one-line cart before
> fixing.

### Suggested fix

Either of these resolves 1a–1c together:

1. **Document the studio shape as the default.** Show plain `function init()`
   declarations with namespaced calls, and move the `export` module form into a
   clearly separated "CLI / file-based carts" section.
2. **Accept both in the executor.** Strip or tolerate top-level `export` in
   `createStudioCartFunction`, so the documented shape runs wherever it is
   pasted.

(1) is the smaller change and removes the ambiguity at the source. (2) is more
forgiving for AI-generated carts, which will keep reproducing the README's form
for as long as it is the first example on the page.

A clearer error would help regardless: catching the `SyntaxError` in
`createStudioCartFunction` and re-throwing with "carts cannot use `export` in
studio mode — declare `function init()` directly" would turn a confusing failure
into a self-answering one.

---

## 2. Untrusted-origin rejection is silent at the host

**Severity:** low — behaviour is correct, only the diagnosis is hard.

`runtime/studio-protocol.js:46` is explicit, and right:

```
the opaque 'null' origin (sandboxed iframe / file://) is NEVER trusted
```

`readInboundStudioMessage` returns a structured reason:

```javascript
if (!isTrustedOrigin(event.origin, { selfOrigin, allowedOrigins })) {
  return { ok: false, error: `untrusted origin: ${String(event.origin)}` };
}
```

The reason is good. The problem is that an embedding host that loads the runner
from a `file://` page — which is the normal situation for a native app shipping
a local playground — sees only a console that never becomes ready. No message
reaches the page, so there is nothing to show the user beyond a blank canvas and
a timeout.

**Suggested fix:** emit the rejection outward as well, so a host can distinguish
"blocked for a reason I can explain" from "still loading". A single
`console.warn` on rejection would be enough to make this diagnosable; a
`CART_ERROR`-style message posted back would make it displayable.

This is not a request to trust opaque origins. Keep rejecting them.

---

## 3. Already fixed in 0.5.3 — do not chase

Earlier notes in `docs/NOVA64_INTEGRATION.md` recorded that the published
tarball's `dist/cart-runner.html` referenced an `assets/main-*.js` file the
tarball did not contain.

**This no longer reproduces.** In 0.5.3, `dist/cart-runner.html:215` references
`./assets/main-Bs8E5IrM.js`, and that file is present in `dist/assets/`
alongside 48 others. The note in our integration doc is stale and refers to
0.5.2.

---

## How m{ai}geXR works around 1a–1c today

Worth knowing, since fixing upstream may let some of this be removed:

- All three clients state the studio cart shape emphatically in their Nova64
  system prompts, and state that `export` must not be used.
- The prompts list the namespaced API surface explicitly, so the model does not
  reach for the retired flat globals.
- `WebMaigeXr/src/lib/scene-errors.ts` classifies both failures and tells the
  user the fix: the `export` trap by name, and a bare global by naming the
  namespaced call to use instead. The mobile playgrounds carry the same logic.

See `docs/NOVA64_INTEGRATION.md` for the full integration design.
