'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ExperienceState } from '@/lib/experience';
import { deriveChapterSeed, deriveExperienceSeed } from '@/lib/seed';
import type { ChapterResult } from '@/content/chapter-context';
import { Countdown } from './countdown';
import { ViewerCanvas } from './viewer-canvas';
import { SignalBackdrop } from './signal-backdrop';
import { SceneTransition } from './scene-transition';

type ShellState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; data: ExperienceState };

/**
 * Whole client-side state machine for /x/[token]: fetches state, gates on a
 * touch gesture (mobile browsers block autoplaying audio), boots the Nova64
 * viewer, and hands chapter completions back to the server. `started` tracks
 * whether *this session* has had its gesture — it's deliberately reset
 * whenever the chapter goes back to "locked" so a countdown resolving later
 * (possibly a fresh page load, hours on) always re-gates on a new touch
 * before Nova64 (and its AudioContext) boot again.
 */
export function ExperienceShell({ token }: { token: string }) {
  const [state, setState] = useState<ShellState>({ kind: 'loading' });
  const [started, setStarted] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/experience/${token}`, { cache: 'no-store' });
      if (!res.ok) {
        setState({ kind: 'error' });
        return;
      }
      const data = (await res.json()) as ExperienceState;
      setState({ kind: 'ready', data });
    } catch {
      setState({ kind: 'error' });
    }
  }, [token]);

  useEffect(() => {
    void fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (state.kind === 'ready' && state.data.chapter.status === 'locked') {
      setStarted(false);
    }
  }, [state]);

  const handleTouch = useCallback(() => {
    // Unlock audio synchronously in the click's own call stack — the most
    // defensively-correct place for this per mobile Safari/Chrome policy.
    try {
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) void new AudioCtx().resume().catch(() => {});
    } catch {
      // ignored — a locked context just means silent playback
    }
    document.documentElement.requestFullscreen?.().catch(() => {});

    setStarted(true);
    void fetch(`/api/experience/${token}/start`, { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) {
          await fetchState();
          return;
        }
        const data = (await res.json()) as ExperienceState;
        setState({ kind: 'ready', data });
      })
      .catch(() => void fetchState());
  }, [token, fetchState]);

  const handleComplete = useCallback(
    async (result?: ChapterResult) => {
      const current = stateRef.current;
      if (current.kind !== 'ready' || !current.data.chapter.id) return;
      const completionId = crypto.randomUUID();
      try {
        const res = await fetch(`/api/experience/${token}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterId: current.data.chapter.id, completionId, result }),
        });
        if (res.ok) {
          const data = (await res.json()) as ExperienceState;
          setState({ kind: 'ready', data });
        } else {
          await fetchState();
        }
      } catch {
        await fetchState();
      }
    },
    [token, fetchState],
  );

  const fallbackSeed = deriveExperienceSeed(token);

  // Which of the six screens is being shown. Any change here plays the CRT
  // transition (see scene-transition.tsx); anything else — a countdown
  // ticking, a state refetch that lands on the same screen — re-renders
  // underneath without one. The chapter id is part of the viewer's key so
  // that an immediate-unlock chapter handing off to the next one is a
  // transition too, not a silent cart swap.
  let screen: ReactNode;
  let screenKey: string;

  if (state.kind === 'loading') {
    screenKey = 'loading';
    screen = (
      <main className="signal-screen">
        <SignalBackdrop seed={fallbackSeed} />
        <p className="signal-label" style={{ position: 'relative', zIndex: 2 }}>
          CONNECTING —
        </p>
      </main>
    );
  } else if (state.kind === 'error') {
    screenKey = 'error';
    screen = (
      <main className="signal-screen">
        <SignalBackdrop seed={fallbackSeed} />
        <div className="signal-frame">
          <p className="signal-eyebrow">SIGNAL LOST</p>
          <p className="signal-label">Could not reach this signal. Try again.</p>
        </div>
      </main>
    );
  } else if (state.data.chapter.status === 'finished') {
    screenKey = 'finished';
    screen = (
      <main className="signal-screen">
        <SignalBackdrop seed={state.data.experience.seed} />
        <div className="signal-frame">
          <p className="signal-eyebrow">SIGNAL COMPLETE</p>
          <p className="signal-label">Every chapter here has been received.</p>
        </div>
      </main>
    );
  } else if (state.data.chapter.status === 'locked' && state.data.progress.nextUnlockAt) {
    screenKey = 'countdown';
    screen = (
      <Countdown
        nextUnlockAt={state.data.progress.nextUnlockAt}
        serverTime={state.data.serverTime}
        chapterTitle={state.data.chapter.title}
        seed={state.data.experience.seed}
        onUnlocked={() => void fetchState()}
      />
    );
  } else if (!started || !state.data.chapter.cartUrl || !state.data.chapter.id) {
    screenKey = 'gate';
    screen = (
      <main className="signal-screen" onClick={handleTouch}>
        <SignalBackdrop seed={state.data.experience.seed} />
        <div className="signal-frame">
          <p className="signal-eyebrow">{state.data.chapter.title}</p>
          <p className="signal-label signal-blink">TOUCH TO RECEIVE SIGNAL</p>
        </div>
      </main>
    );
  } else {
    screenKey = `viewer:${state.data.chapter.id}`;
    screen = (
      <ViewerCanvas
        cartUrl={state.data.chapter.cartUrl}
        tokenSeed={state.data.experience.seed}
        chapterSeed={deriveChapterSeed(state.data.experience.seed, state.data.chapter.id)}
        onComplete={handleComplete}
        onCartError={() => setState({ kind: 'error' })}
      />
    );
  }

  return <SceneTransition screenKey={screenKey}>{screen}</SceneTransition>;
}
