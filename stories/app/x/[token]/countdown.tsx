'use client';

import { useEffect, useState } from 'react';
import { SignalBackdrop } from './signal-backdrop';

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function Countdown({
  nextUnlockAt,
  serverTime,
  chapterTitle,
  seed,
  onUnlocked,
}: {
  nextUnlockAt: string;
  serverTime: string;
  chapterTitle: string;
  seed: number;
  onUnlocked: () => void;
}) {
  // Captured once on mount: how far the device clock is from the server's.
  // Countdown math always uses (Date.now() + clockOffsetMs), never the raw
  // device clock alone, so changing the device clock can't unlock early.
  const [clockOffsetMs] = useState(() => new Date(serverTime).getTime() - Date.now());
  const targetMs = new Date(nextUnlockAt).getTime();
  const [remainingMs, setRemainingMs] = useState(() => targetMs - (Date.now() + clockOffsetMs));

  useEffect(() => {
    const tick = () => {
      const remaining = targetMs - (Date.now() + clockOffsetMs);
      setRemainingMs(remaining);
      if (remaining <= 0) onUnlocked();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMs, clockOffsetMs]);

  return (
    <main className="signal-screen">
      <SignalBackdrop seed={seed} />
      <div className="signal-frame">
        <p className="signal-eyebrow">{chapterTitle}</p>
        <p className="signal-label">NEXT SIGNAL IN</p>
        <p className="signal-countdown">{formatRemaining(remainingMs)}</p>
      </div>
    </main>
  );
}
