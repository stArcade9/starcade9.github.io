// Coastal Signal — camera rig
//
// Nova64's camera API is stateless: `setCameraPosition` / `setCameraTarget`
// place the camera this frame and nothing else. That is exactly what a
// chapter wants while it's following the player — both chapters recompute a
// framing from the walker's lane position every frame — but it means a beat
// that wants a *different* framing gets it instantly, as a cut. Chapter Two
// cuts twice at the single most important moment in the story: into the
// close-up when the ocean spirit appears, and back out again when she leaves.
//
// The rig sits in front of those calls without changing how any of them are
// computed. Normally `set()` is a pass-through — identical behaviour, no lag
// introduced into the follow cameras. But after `blend(seconds)` it eases
// from wherever the camera actually was at the moment of the cut toward the
// live incoming framing, so an existing hard cut becomes a move by adding one
// call at the point of the cut and changing nothing else.
//
// Blending toward the *live* pose each frame (rather than toward a pose
// captured once) is what makes this work on a camera that is still tracking
// something: the walk camera keeps following the walker throughout the move,
// and the rig only controls how fast the framing catches up to it.

interface Pose {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
}

/** Smootherstep — zero first *and* second derivative at both ends, so a move
 * has no perceptible kick as it starts or stops. Ordinary smoothstep still
 * shows a faint snap at the end on a long camera push. */
function ease(t: number): number {
  const k = Math.max(0, Math.min(1, t));
  return k * k * k * (k * (k * 6 - 15) + 10);
}

export class CameraRig {
  private applied: Pose | null = null;
  private from: Pose | null = null;
  private blendT = 0;
  private blendDur = 0;

  /** Advance the blend clock. Call once per frame, before any `set()`. */
  update(dt: number): void {
    if (this.blendDur > 0) {
      this.blendT += dt;
      if (this.blendT >= this.blendDur) {
        this.blendDur = 0;
        this.from = null;
      }
    }
  }

  /**
   * Start easing from the current framing to whatever `set()` is given next.
   * Call at the moment of a cut — after the new beat has been entered but
   * before its first `set()`.
   */
  blend(seconds: number): void {
    if (!this.applied || seconds <= 0) return;
    this.from = { ...this.applied };
    this.blendT = 0;
    this.blendDur = seconds;
  }

  /** Drop any in-flight blend and take the next framing instantly. */
  cut(): void {
    this.blendDur = 0;
    this.from = null;
  }

  /** Place the camera. Instant unless a blend is running. */
  set(px: number, py: number, pz: number, tx: number, ty: number, tz: number): void {
    let pose: Pose = { px, py, pz, tx, ty, tz };
    if (this.blendDur > 0 && this.from) {
      const k = ease(this.blendT / this.blendDur);
      const a = this.from;
      pose = {
        px: a.px + (px - a.px) * k,
        py: a.py + (py - a.py) * k,
        pz: a.pz + (pz - a.pz) * k,
        tx: a.tx + (tx - a.tx) * k,
        ty: a.ty + (ty - a.ty) * k,
        tz: a.tz + (tz - a.tz) * k,
      };
    }
    this.applied = pose;
    const ns = (globalThis as { nova64?: any }).nova64;
    ns?.camera?.setCameraPosition(pose.px, pose.py, pose.pz);
    ns?.camera?.setCameraTarget(pose.tx, pose.ty, pose.tz);
  }

  /** True while a move is in flight — for beats that want to hold something
   * else back until the camera has arrived. */
  get blending(): boolean {
    return this.blendDur > 0;
  }
}
