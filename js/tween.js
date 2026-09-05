/** Minimal promise-based tweening with cancellation contexts. */

export const Ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  outElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  outBounceSoft: (t) => {
    // a single, gentle overshoot then settle
    const s = 1.4;
    return 1 - Math.cos(t * Math.PI * 0.5) * Math.exp(-s * t) * (1 - t);
  },
};

export class CancelledError extends Error {
  constructor() {
    super('cancelled');
    this.name = 'CancelledError';
  }
}

/** A cancellation token shared by a sequence of tweens. */
export class Context {
  constructor() {
    this.cancelled = false;
  }
  cancel() {
    this.cancelled = true;
  }
  check() {
    if (this.cancelled) throw new CancelledError();
  }
}

export class Tweens {
  constructor() {
    this.active = [];
    /** Global duration multiplier (reduced motion shortens things). */
    this.timeScale = 1;
  }

  /**
   * Tween from 0 → 1 over `duration` seconds, calling `onUpdate(t, eased)`.
   * Resolves when complete, rejects with CancelledError if `ctx` is cancelled.
   */
  run(ctx, duration, onUpdate, ease = Ease.inOutCubic) {
    return new Promise((resolve, reject) => {
      if (ctx?.cancelled) {
        reject(new CancelledError());
        return;
      }
      const d = Math.max(0.0001, duration * this.timeScale);
      this.active.push({ ctx, d, t: 0, onUpdate, ease, resolve, reject });
    });
  }

  wait(ctx, seconds) {
    return this.run(ctx, seconds, () => {}, Ease.linear);
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const tw = this.active[i];
      if (tw.ctx?.cancelled) {
        this.active.splice(i, 1);
        tw.reject(new CancelledError());
        continue;
      }
      tw.t = Math.min(tw.d, tw.t + dt);
      const k = tw.t / tw.d;
      try {
        tw.onUpdate(tw.ease(k), k);
      } catch (err) {
        this.active.splice(i, 1);
        tw.reject(err);
        continue;
      }
      if (tw.t >= tw.d) {
        this.active.splice(i, 1);
        tw.resolve();
      }
    }
  }
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
/** Frame-rate independent exponential approach. */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const rand = (lo, hi) => lo + Math.random() * (hi - lo);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
