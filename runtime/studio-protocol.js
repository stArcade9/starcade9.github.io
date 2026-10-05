/**
 * Game Studio ⇄ Nova64 runtime message protocol (versioned + validated).
 *
 * The runtime executes user cart code via `new Function` when it receives an
 * EXECUTE_CODE message (see runtime/studio-executor.js + src/main.js). That makes
 * the postMessage boundary a code-execution surface: EVERY inbound message must be
 * validated — trusted sender/origin, correct schema, bounded size — before it is
 * acted on. This module holds the shared, dependency-free validation so both the
 * runtime (src/main.js) and the Game Studio host (os9-shell) enforce the same rules.
 *
 * Pure ES module, no DOM/Node dependencies, so it is unit-testable under node.
 */

export const STUDIO_PROTOCOL_VERSION = 1;

export const StudioMessageType = Object.freeze({
  // Studio host → runtime
  CODE: 'EXECUTE_CODE',
  // runtime → Studio host
  READY: 'EXECUTE_READY',
  SUCCESS: 'EXECUTE_SUCCESS',
  ERROR: 'EXECUTE_ERROR',
  LOG: 'CART_LOG',
});

/** Max UTF-8 byte size of a cart source payload accepted over the boundary (2 MB). */
export const MAX_CART_SOURCE_BYTES = 2 * 1024 * 1024;
/** Max UTF-8 byte size of a single CART_LOG message (64 KB). */
export const MAX_LOG_MESSAGE_BYTES = 64 * 1024;

/** UTF-8 byte length of a string. Works under both browser and node. */
export function byteLength(str) {
  if (typeof str !== 'string') return 0;
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str).length;
  // node fallback (TextEncoder is global in modern node, this is belt-and-braces)
  return Buffer.byteLength(str, 'utf8');
}

/**
 * Decide whether a message `origin` is trusted.
 *
 * Rules:
 *  - same as `selfOrigin` → trusted (production embeds are same-origin)
 *  - present in `allowedOrigins` (exact match) → trusted (dev cross-origin embeds)
 *  - the literal wildcard '*' is NEVER trusted
 *  - the opaque 'null' origin (sandboxed iframe / file://) is NEVER trusted
 *  - empty / non-string → not trusted
 */
export function isTrustedOrigin(origin, { selfOrigin = '', allowedOrigins = [] } = {}) {
  if (typeof origin !== 'string' || origin.length === 0) return false;
  if (origin === '*' || origin === 'null') return false;
  if (selfOrigin && origin === selfOrigin) return true;
  return allowedOrigins.includes(origin);
}

/**
 * Validate an inbound EXECUTE_CODE command's shape and size (NOT its origin —
 * callers must check the sender/origin separately with `isTrustedOrigin` and a
 * window-identity check). Returns `{ ok, code, runId, error }`.
 */
export function validateInboundCode(data) {
  if (!data || typeof data !== 'object') return { ok: false, error: 'not an object' };
  if (data.type !== StudioMessageType.CODE) return { ok: false, error: 'unexpected type' };
  if (data.v !== undefined && data.v !== STUDIO_PROTOCOL_VERSION) {
    return { ok: false, error: `unsupported version: ${data.v}` };
  }
  if (typeof data.code !== 'string') return { ok: false, error: 'code is not a string' };
  const size = byteLength(data.code);
  if (size > MAX_CART_SOURCE_BYTES) {
    return { ok: false, error: `code too large: ${size} > ${MAX_CART_SOURCE_BYTES} bytes` };
  }
  const runId = typeof data.runId === 'string' && data.runId.length <= 128 ? data.runId : null;
  return { ok: true, code: data.code, runId };
}

/**
 * Validate an inbound runtime→Studio status/log message (READY/SUCCESS/ERROR/LOG).
 * Used by the Game Studio host to reject forged status messages. Returns
 * `{ ok, type, message, error, protocolError }`.
 */
export function validateInboundStatus(data) {
  if (!data || typeof data !== 'object') return { ok: false, protocolError: 'not an object' };
  const { type } = data;
  if (type === StudioMessageType.READY || type === StudioMessageType.SUCCESS) {
    return { ok: true, type };
  }
  if (type === StudioMessageType.LOG) {
    if (typeof data.message !== 'string')
      return { ok: false, protocolError: 'log message not a string' };
    if (byteLength(data.message) > MAX_LOG_MESSAGE_BYTES) {
      return { ok: false, protocolError: 'log message too large' };
    }
    return { ok: true, type, message: data.message };
  }
  if (type === StudioMessageType.ERROR) {
    const error = typeof data.error === 'string' ? data.error.slice(0, 4096) : 'unknown error';
    return { ok: true, type, error };
  }
  return { ok: false, protocolError: `unexpected type: ${String(type)}` };
}

/**
 * Build the runtime-side inbound guard result for an EXECUTE_CODE MessageEvent.
 * `event` is a MessageEvent-like `{ origin, source, data }`; `expectedSource` is the
 * only window allowed to send code (the runtime's embedding parent). Returns
 * `{ ok, code, runId, error }`.
 */
export function acceptExecuteCode(event, { expectedSource, selfOrigin, allowedOrigins } = {}) {
  if (!event || typeof event !== 'object') return { ok: false, error: 'no event' };
  // Window identity is the primary trust anchor: only the embedding parent may
  // inject code. This rejects opener windows, other frames, and extensions even
  // when they happen to share a trusted origin.
  if (expectedSource !== undefined && event.source !== expectedSource) {
    return { ok: false, error: 'untrusted sender window' };
  }
  if (!isTrustedOrigin(event.origin, { selfOrigin, allowedOrigins })) {
    return { ok: false, error: `untrusted origin: ${String(event.origin)}` };
  }
  return validateInboundCode(event.data);
}
