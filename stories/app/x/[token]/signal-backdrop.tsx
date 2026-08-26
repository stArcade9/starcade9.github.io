'use client';

import { useEffect, useRef } from 'react';
import { mulberry32 } from '@/lib/seed';

/**
 * Seeded, silent, GPU-free animated backdrop for every non-gameplay screen
 * (touch gate, countdown, loading, error, finished) — stories.md requires the
 * initial screen be "visually interesting but silent" since mobile browsers
 * block autoplaying audio; this satisfies that without needing Nova64 (and
 * its AudioContext) to boot first. Plain Canvas2D, no user gesture required.
 * Seeded from the experience so the same token always renders the same look.
 */
export function SignalBackdrop({ seed }: { seed: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rand = mulberry32(seed);
    const hue = Math.floor(rand() * 360);
    const accent = `hsl(${hue}, 85%, 60%)`;
    const accentDim = `hsla(${hue}, 85%, 60%, 0.25)`;

    let raf = 0;
    let start = performance.now();

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(canvas!.clientWidth * dpr);
      canvas!.height = Math.round(canvas!.clientHeight * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    function frame(now: number) {
      const t = (now - start) / 1000;
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      const horizonY = h * 0.58;

      // Sky gradient
      const sky = ctx!.createLinearGradient(0, 0, 0, horizonY);
      sky.addColorStop(0, '#050507');
      sky.addColorStop(1, `hsl(${hue}, 40%, 14%)`);
      ctx!.fillStyle = sky;
      ctx!.fillRect(0, 0, w, horizonY);

      // Ground
      ctx!.fillStyle = '#050507';
      ctx!.fillRect(0, horizonY, w, h - horizonY);

      // Horizon glow
      const glowY = horizonY - Math.sin(t * 0.6) * 3;
      const glow = ctx!.createRadialGradient(w / 2, glowY, 0, w / 2, glowY, w * 0.4);
      glow.addColorStop(0, accentDim);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = glow;
      ctx!.fillRect(0, 0, w, h);
      ctx!.strokeStyle = accent;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(0, horizonY);
      ctx!.lineTo(w, horizonY);
      ctx!.stroke();

      // Perspective floor grid — Design-Republic style technical grid
      // converging to a vanishing point, drifting slowly toward the viewer.
      const vanishX = w / 2;
      const rowCount = 14;
      const drift = (t * 0.12) % 1;
      ctx!.strokeStyle = accentDim;
      for (let i = 0; i < rowCount; i++) {
        const f = (i + drift) / rowCount;
        const y = horizonY + f * f * (h - horizonY);
        ctx!.globalAlpha = 0.15 + f * 0.5;
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(w, y);
        ctx!.stroke();
      }
      ctx!.globalAlpha = 0.3;
      const colCount = 9;
      for (let i = -colCount; i <= colCount; i++) {
        ctx!.beginPath();
        ctx!.moveTo(vanishX, horizonY);
        ctx!.lineTo(vanishX + i * (w / colCount) * 1.4, h);
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, [seed]);

  return <canvas ref={canvasRef} className="signal-backdrop" aria-hidden="true" />;
}
