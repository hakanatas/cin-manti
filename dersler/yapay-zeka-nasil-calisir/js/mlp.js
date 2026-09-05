/**
 * A tiny neural network (2 → hidden → 1) trained with plain gradient descent.
 * Deliberately small and readable: this is the thing the lesson visualises.
 */

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

/** Ground truth of the toy kitchen: is a dish "sweet" given sugar & salt (0..1)? */
export function trueLabel(sugar, salt) {
  return sugar > 0.28 + 0.55 * salt * salt ? 1 : 0;
}

export function makeDataset(count = 64, seed = 11) {
  const r = seeded(seed);
  const data = [];
  let guard = 0;
  while (data.length < count && guard++ < 5000) {
    const sugar = 0.05 + r() * 0.9;
    const salt = 0.05 + r() * 0.9;
    const margin = sugar - (0.28 + 0.55 * salt * salt);
    if (Math.abs(margin) < 0.05) continue; // keep a little gap so the boundary is learnable
    data.push({ x: [sugar, salt], y: trueLabel(sugar, salt) });
  }
  return data;
}

export class TinyNet {
  constructor(hidden = 6, seed = 3) {
    this.hidden = hidden;
    this.seed = seed;
    this.reset();
  }

  reset() {
    const r = seeded(this.seed);
    const rnd = () => (r() * 2 - 1) * 0.9;
    this.W1 = Array.from({ length: this.hidden }, () => [rnd(), rnd()]);
    this.b1 = Array.from({ length: this.hidden }, () => rnd() * 0.3);
    this.W2 = Array.from({ length: this.hidden }, () => rnd());
    this.b2 = 0;
    this.steps = 0;
    this.history = [];
  }

  /** Forward pass, returning every intermediate so the scene can show them. */
  forward(x) {
    const z1 = this.W1.map((w, i) => w[0] * x[0] + w[1] * x[1] + this.b1[i]);
    const h = z1.map(Math.tanh);
    const z2 = h.reduce((acc, v, i) => acc + v * this.W2[i], this.b2);
    const p = sigmoid(z2);
    return { z1, h, z2, p };
  }

  predict(x) {
    return this.forward(x).p;
  }

  /** One full-batch gradient step. Returns loss and accuracy before the update. */
  trainStep(data, lr = 0.6) {
    const n = data.length;
    const gW1 = this.W1.map(() => [0, 0]);
    const gb1 = new Array(this.hidden).fill(0);
    const gW2 = new Array(this.hidden).fill(0);
    let gb2 = 0;
    let loss = 0;
    let correct = 0;
    for (const { x, y } of data) {
      const { h, p } = this.forward(x);
      const eps = 1e-7;
      loss += -(y * Math.log(p + eps) + (1 - y) * Math.log(1 - p + eps));
      if ((p > 0.5 ? 1 : 0) === y) correct++;
      const dz2 = p - y; // dLoss/dz2 for binary cross-entropy with a sigmoid
      for (let i = 0; i < this.hidden; i++) {
        gW2[i] += dz2 * h[i];
        const dh = dz2 * this.W2[i];
        const dz1 = dh * (1 - h[i] * h[i]);
        gW1[i][0] += dz1 * x[0];
        gW1[i][1] += dz1 * x[1];
        gb1[i] += dz1;
      }
      gb2 += dz2;
    }
    for (let i = 0; i < this.hidden; i++) {
      this.W1[i][0] -= (lr * gW1[i][0]) / n;
      this.W1[i][1] -= (lr * gW1[i][1]) / n;
      this.b1[i] -= (lr * gb1[i]) / n;
      this.W2[i] -= (lr * gW2[i]) / n;
    }
    this.b2 -= (lr * gb2) / n;
    this.steps++;
    const out = { loss: loss / n, acc: correct / n };
    this.history.push(out.loss);
    if (this.history.length > 400) this.history.shift();
    return out;
  }

  evaluate(data) {
    let loss = 0;
    let correct = 0;
    for (const { x, y } of data) {
      const p = this.predict(x);
      loss += -(y * Math.log(p + 1e-7) + (1 - y) * Math.log(1 - p + 1e-7));
      if ((p > 0.5 ? 1 : 0) === y) correct++;
    }
    return { loss: loss / data.length, acc: correct / data.length };
  }

  /** Gradient direction of each weight for the "which screw to turn" animation. */
  gradients(data) {
    const gW1 = this.W1.map(() => [0, 0]);
    const gW2 = new Array(this.hidden).fill(0);
    for (const { x, y } of data) {
      const { h, p } = this.forward(x);
      const dz2 = p - y;
      for (let i = 0; i < this.hidden; i++) {
        gW2[i] += dz2 * h[i];
        const dz1 = dz2 * this.W2[i] * (1 - h[i] * h[i]);
        gW1[i][0] += dz1 * x[0];
        gW1[i][1] += dz1 * x[1];
      }
    }
    return { gW1, gW2 };
  }
}
