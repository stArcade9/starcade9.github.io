// The rig (content/camera-rig.ts) is what turns Chapter Two's two hard cuts
// around the ocean spirit into moves. Two things about it are easy to get
// wrong and impossible to notice from reading the cart:
//
//   * a blend has to interpolate toward the *live* incoming framing, because
//     both chapters recompute their camera from the player's position every
//     frame. An implementation that captured the destination once would still
//     arrive, but it would arrive at a stale pose;
//   * a beat that places the camera only once when it begins gets no movement
//     at all, since there is nothing for the rig to interpolate toward on the
//     frames in between. That was the actual bug in the first version of the
//     spirit beat, and it is silent — the camera simply stays where it was.
import { describe, it, expect, beforeEach } from 'vitest';
import { CameraRig } from '@/content/camera-rig';

interface Placed {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
}

let placed: Placed[] = [];

function last(): Placed {
  const p = placed[placed.length - 1];
  if (!p) throw new Error('camera was never placed');
  return p;
}

beforeEach(() => {
  placed = [];
  let pending: { x: number; y: number; z: number } | null = null;
  (globalThis as unknown as { nova64: unknown }).nova64 = {
    camera: {
      setCameraPosition(x: number, y: number, z: number) {
        pending = { x, y, z };
      },
      setCameraTarget(x: number, y: number, z: number) {
        const p = pending!;
        placed.push({ px: p.x, py: p.y, pz: p.z, tx: x, ty: y, tz: z });
      },
    },
  };
});

describe('CameraRig', () => {
  it('passes straight through when nothing is blending', () => {
    const rig = new CameraRig();
    rig.update(1 / 60);
    rig.set(1, 2, 3, 4, 5, 6);
    expect(last()).toEqual({ px: 1, py: 2, pz: 3, tx: 4, ty: 5, tz: 6 });
    expect(rig.blending).toBe(false);
  });

  it('eases from the pose held at the cut to the new one, and lands exactly', () => {
    const rig = new CameraRig();
    rig.set(0, 0, 10, 0, 0, 0); // the wide shot
    rig.blend(1);

    // Halfway through, it must be genuinely between the two — not snapped to
    // either end.
    for (let i = 0; i < 30; i++) {
      rig.update(1 / 60);
      rig.set(0, 0, 2, 0, 0, 0); // the close-up, restated every frame
    }
    const mid = last().pz;
    expect(mid).toBeLessThan(9.5);
    expect(mid).toBeGreaterThan(2.5);

    for (let i = 0; i < 31; i++) {
      rig.update(1 / 60);
      rig.set(0, 0, 2, 0, 0, 0);
    }
    expect(rig.blending).toBe(false);
    expect(last().pz).toBeCloseTo(2, 6);
  });

  it('never overshoots or reverses on the way', () => {
    const rig = new CameraRig();
    rig.set(0, 0, 10, 0, 0, 0);
    rig.blend(1);
    let previous = 10;
    for (let i = 0; i < 70; i++) {
      rig.update(1 / 60);
      rig.set(0, 0, 2, 0, 0, 0);
      const z = last().pz;
      expect(z).toBeLessThanOrEqual(previous + 1e-9);
      expect(z).toBeGreaterThanOrEqual(2 - 1e-9);
      previous = z;
    }
  });

  it('tracks a destination that is still moving', () => {
    // The walk camera keeps following the walker during the blend out of the
    // spirit close-up, so the rig has to chase a target that moves. Blending
    // toward a destination captured once would land somewhere behind it.
    const rig = new CameraRig();
    rig.set(0, 0, 0, 0, 0, 0);
    rig.blend(1);
    let goal = 0;
    for (let i = 0; i < 61; i++) {
      rig.update(1 / 60);
      goal += 0.1;
      rig.set(goal, 0, 0, 0, 0, 0);
    }
    expect(rig.blending).toBe(false);
    expect(last().px).toBeCloseTo(goal, 6);
  });

  it('does nothing at all if the beat places the camera only once', () => {
    // Documents the failure mode rather than endorsing it: with no per-frame
    // set() there is nothing to interpolate toward, so the camera stays put.
    // Both chapters restate their framing every frame for exactly this reason.
    const rig = new CameraRig();
    rig.set(0, 0, 10, 0, 0, 0);
    rig.blend(1);
    rig.set(0, 0, 2, 0, 0, 0); // the "once, on beat entry" mistake
    for (let i = 0; i < 60; i++) rig.update(1 / 60);
    expect(last().pz).toBeCloseTo(10, 6); // never moved
  });

  it('ignores a blend requested before the camera has ever been placed', () => {
    const rig = new CameraRig();
    rig.blend(2);
    expect(rig.blending).toBe(false);
    rig.set(5, 5, 5, 0, 0, 0);
    expect(last().px).toBe(5);
  });

  it('cut() abandons a blend in flight', () => {
    const rig = new CameraRig();
    rig.set(0, 0, 10, 0, 0, 0);
    rig.blend(1);
    rig.update(0.2);
    rig.cut();
    rig.set(0, 0, 2, 0, 0, 0);
    expect(last().pz).toBe(2);
    expect(rig.blending).toBe(false);
  });
});
