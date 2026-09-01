'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChapterResult } from '@/content/chapter-context';

interface NovaController {
  loadCart: (url: string) => Promise<void>;
  stop: () => void;
}

/**
 * Mounts a full-bleed canvas and boots Nova64 against it exactly once per
 * mount — must only be rendered after the visitor's touch gesture (see
 * experience-shell.tsx), since booting resumes the Web Audio context.
 * Subsequent `cartUrl` changes (an immediate-unlock chapter completing while
 * this stays mounted) call the already-booted instance's loadCart() instead
 * of rebooting, matching Nova64.loadCart's own scene-clearing behavior.
 */
export function ViewerCanvas({
  cartUrl,
  tokenSeed,
  chapterSeed,
  onComplete,
  onCartError,
}: {
  cartUrl: string;
  tokenSeed: number;
  chapterSeed: number;
  onComplete: (result?: ChapterResult) => Promise<void>;
  onCartError?: (err: unknown) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<NovaController | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const [caption, setCaption] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  // The chapters score themselves (content/audio/score.ts) and start playing
  // as soon as the cart boots, on a page that is most often reached by
  // scanning a QR code in public. There has to be a way to silence that.
  //
  // Routed through the score's global registry rather than an import: the
  // running score belongs to the *cart's* bundle, which is loaded at runtime
  // by native dynamic import and shares no module instance with this app.
  // `setMuted` also records the preference on globalThis, so a chapter that
  // boots later comes up silent instead of playing until this effect re-runs.
  useEffect(() => {
    (globalThis as { __coastalSignalScore?: { setMuted?: (m: boolean) => void } }).__coastalSignalScore?.setMuted?.(
      muted,
    );
    (globalThis as { __coastalSignalMuted?: boolean }).__coastalSignalMuted = muted;
  }, [muted]);

  useEffect(() => {
    globalThis.__chapterContext = {
      tokenSeed,
      chapterSeed,
      previousChoices: {},
      complete: (result) => onCompleteRef.current(result),
      setCaption,
    };
  }, [tokenSeed, chapterSeed]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!canvasRef.current) return;
      // A variable specifier (not a string literal) keeps TS from trying to
      // resolve this as a project module — it's a plain static asset served
      // from public/, loaded via the browser's native dynamic import().
      const bootModuleUrl = '/engine/boot.js';
      const mod = await import(/* webpackIgnore: true */ bootModuleUrl);
      if (cancelled) return;
      const controller: NovaController = await mod.bootNova64({
        canvas: canvasRef.current,
        cartUrl,
        onCartError,
      });
      if (cancelled) {
        controller.stop();
        return;
      }
      controllerRef.current = controller;
    })();
    return () => {
      cancelled = true;
      controllerRef.current?.stop();
      controllerRef.current = null;
    };
    // Boot exactly once per mount; chapter changes are handled below via loadCart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevCartUrl = useRef(cartUrl);
  useEffect(() => {
    if (prevCartUrl.current === cartUrl) return;
    prevCartUrl.current = cartUrl;
    void controllerRef.current?.loadCart(cartUrl);
  }, [cartUrl]);

  return (
    <div className="signal-viewer">
      <canvas ref={canvasRef} className="signal-canvas" />
      {/* Nova64 binds its pointer and touch handlers to `window` (see
          runtime/input.js), so a tap anywhere — including on this button —
          would otherwise also steer or fire in the chapter underneath.
          Stopping propagation here is enough precisely because window is last
          in the bubble path. */}
      <button
        type="button"
        className="signal-audio"
        data-muted={muted}
        aria-label={muted ? 'Unmute chapter audio' : 'Mute chapter audio'}
        aria-pressed={muted}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setMuted((m) => !m);
        }}
      >
        {muted ? '\u2715' : '\u266A'}
      </button>
      {caption && (
        <p className="signal-caption" key={caption}>
          {caption}
        </p>
      )}
    </div>
  );
}
