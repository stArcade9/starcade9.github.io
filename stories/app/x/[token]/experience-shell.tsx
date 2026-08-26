'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExperienceState } from '@/lib/experience';
import { deriveChapterSeed, deriveExperienceSeed } from '@/lib/seed';
import type { ChapterResult } from '@/content/chapter-context';
import { Countdown } from './countdown';
import { ViewerCanvas } from './viewer-canvas';
import { SignalBackdrop } from './signal-backdrop';

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

  if (state.kind === 'loading') {
    return (
      <main className="signal-screen">
        <SignalBackdrop seed={fallbackSeed} />
        <p className="signal-label" style={{ position: 'relative', zIndex: 2 }}>
          CONNECTING —
        </p>
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className="signal-screen">
        <SignalBackdrop seed={fallbackSeed} />
        <div className="signal-frame">
          <p className="signal-eyebrow">SIGNAL LOST</p>
          <p className="signal-label">Could not reach this signal. Try again.</p>
        </div>
      </main>
    );
  }

  const { data } = state;

  if (data.chapter.status === 'finished') {
    return (
      <main className="signal-screen">
        <SignalBackdrop seed={data.experience.seed} />
        <div className="signal-frame">
          <p className="signal-eyebrow">SIGNAL COMPLETE</p>
          <p className="signal-label">Every chapter here has been received.</p>
        </div>
      </main>
    );
  }

  if (data.chapter.status === 'locked' && data.progress.nextUnlockAt) {
    return (
      <Countdown
        nextUnlockAt={data.progress.nextUnlockAt}
        serverTime={data.serverTime}
        chapterTitle={data.chapter.title}
        seed={data.experience.seed}
        onUnlocked={() => void fetchState()}
      />
    );
  }

  if (!started || !data.chapter.cartUrl || !data.chapter.id) {
    return (
      <main className="signal-screen" onClick={handleTouch}>
        <SignalBackdrop seed={data.experience.seed} />
        <div className="signal-frame">
          <p className="signal-eyebrow">{data.chapter.title}</p>
          <p className="signal-label signal-blink">TOUCH TO RECEIVE SIGNAL</p>
        </div>
      </main>
    );
  }

  return (
    <ViewerCanvas
      cartUrl={data.chapter.cartUrl}
      tokenSeed={data.experience.seed}
      chapterSeed={deriveChapterSeed(data.experience.seed, data.chapter.id)}
      onComplete={handleComplete}
      onCartError={() => setState({ kind: 'error' })}
    />
  );
}
