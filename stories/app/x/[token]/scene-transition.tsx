'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * The cut between screens.
 *
 * Every screen change in /x/[token] — connecting to the touch gate, the gate
 * to the chapter, the chapter's climax to the countdown — used to be a single
 * React render: the 3D scene was ripped out mid-glow and a countdown appeared
 * in its place on the next frame. The chapters themselves are carefully
 * staged, and then the joins between them had nothing at all.
 *
 * This wraps the whole shell and makes those joins a CRT power-down and
 * power-up: the picture squeezes to a bright horizontal line, holds on the
 * phosphor trace for a beat, and opens back out onto the next screen. It's
 * the same "a cartridge that shouldn't still work" language the chapters are
 * written in, and it's the one transition that suits both directions —
 * leaving a chapter and arriving at one.
 *
 * While the screen is closing it keeps rendering the *outgoing* element tree,
 * so the chapter stays mounted and playing right up to the moment it is no
 * longer visible; the swap happens under the collapsed picture. That freeze is
 * also why the outgoing screen can't be handed new props mid-wipe.
 */

const CLOSE_MS = 380;
const HOLD_MS = 110;
const OPEN_MS = 560;

type Phase = 'idle' | 'closing' | 'opening';

export function SceneTransition({
  screenKey,
  children,
}: {
  /**
   * Identifies *which* screen is being shown. A change here plays the
   * transition; children changing under the same key (a countdown ticking, a
   * state refetch) just re-render, with no wipe.
   */
  screenKey: string;
  children: ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  // The outgoing screen, held only for the length of the collapse. Null at
  // every other time, so the common case renders `children` straight through
  // with nothing stale in the way.
  const [frozen, setFrozen] = useState<ReactNode | null>(null);

  const previousChildren = useRef<ReactNode>(children);
  // The key actually on screen. Advanced only when the swap commits, never
  // when the transition *starts* — React's dev-mode StrictMode runs an effect,
  // tears it down, and runs it again, and advancing here would make that
  // second run see nothing to do and leave the screen collapsed forever.
  // Because it only moves at commit, a re-run simply restarts the wipe, which
  // is the correct response to being interrupted.
  const committedKey = useRef(screenKey);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (screenKey === committedKey.current) return;

    // The element tree from the render *before* the key changed — the screen
    // being left. `??` rather than a plain set so that a second key change
    // arriving mid-wipe keeps showing the screen already collapsing, instead
    // of swapping in a third one behind the closed picture.
    setFrozen((current) => current ?? previousChildren.current);
    setPhase('closing');

    // Ride the music down with the picture. Without this the score plays at
    // full level behind a screen that has already gone, then stops dead when
    // the cart unmounts.
    (globalThis as { __coastalSignalScore?: { fadeOut?: (s: number) => void } }).__coastalSignalScore?.fadeOut?.(
      (CLOSE_MS + HOLD_MS) / 1000,
    );

    timers.current.push(
      window.setTimeout(() => {
        committedKey.current = screenKey;
        setFrozen(null);
        setPhase('opening');
        timers.current.push(window.setTimeout(() => setPhase('idle'), OPEN_MS));
      }, CLOSE_MS + HOLD_MS),
    );

    return () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    };
    // Only the key. `children` changes identity on every render of the shell,
    // and depending on it would restart the wipe mid-flight; and the effect
    // must not re-run when the swap commits, or its own cleanup would cancel
    // the timer that ends the transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenKey]);

  // Runs after the effect above on every render, so that one always sees the
  // previous render's tree while this one keeps the ref current for the next
  // transition.
  useEffect(() => {
    previousChildren.current = children;
  });

  return (
    <div className="scene-root">
      <div className="scene-stage" data-phase={phase}>
        {frozen ?? children}
      </div>
      <div className="scene-flash" data-phase={phase} aria-hidden="true" />
    </div>
  );
}
