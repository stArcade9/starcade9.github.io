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
      {caption && (
        <p className="signal-caption" key={caption}>
          {caption}
        </p>
      )}
    </div>
  );
}
