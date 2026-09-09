import * as THREE from 'three';

/**
 * The XAI-OPC desk: a sheet of paper on a clinic table where every patient in
 * the study is a small token. Tokens can be grouped into piles, bars can grow
 * out of the paper, and flat panels can carry a drawn chart.
 *
 * Everything is animated by lerping towards a target, so a chapter can simply
 * declare where things should be and the scene walks there.
 */

const MAX_TOKENS = 1600;

function roundedBox(w, h, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 8 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -h / 2, 0); // centre on the object origin
  return g;
}

function paperTexture(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#fbf8f2';
  g.fillRect(0, 0, size, size);
  let seed = 9;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = `rgba(150,130,105,${0.012 + rnd() * 0.03})`;
    g.fillRect(rnd() * size, rnd() * size, 1.4, 1.4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export class ClinicScene extends THREE.Group {
  constructor({ palette }) {
    super();
    this.palette = palette;
    this.W = 7.6;
    this.D = 5.2;
    this.surfaceY = 0.18; // top of the paper, bevel included
    this.labels = []; // { text, cls, get(), on() } — projected to HTML by main

    const deskMat = new THREE.MeshStandardMaterial({ color: '#d7bfa0', roughness: 0.82 });
    const desk = new THREE.Mesh(roundedBox(this.W + 1.6, 0.16, this.D + 1.2, 0.24), deskMat);
    desk.position.y = 0.08;
    desk.receiveShadow = true;
    desk.castShadow = true;
    this.add(desk);

    const paper = new THREE.Mesh(
      roundedBox(this.W, 0.02, this.D, 0.1),
      new THREE.MeshStandardMaterial({ map: paperTexture(), color: '#ffffff', roughness: 0.96 })
    );
    paper.position.y = 0.158;
    paper.receiveShadow = true;
    this.add(paper);
    this.paper = paper;

    // --- patient tokens ---------------------------------------------------
    const tokenGeo = new THREE.CylinderGeometry(0.5, 0.46, 0.36, 18);
    tokenGeo.translate(0, 0.18, 0);
    this.tokenMesh = new THREE.InstancedMesh(
      tokenGeo,
      new THREE.MeshPhysicalMaterial({ roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.4 }),
      MAX_TOKENS
    );
    this.tokenMesh.castShadow = true;
    this.tokenMesh.receiveShadow = true;
    this.tokenMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.tokenMesh.count = 0;
    this.add(this.tokenMesh);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._c = new THREE.Color();
    this.tokens = [];
    for (let i = 0; i < MAX_TOKENS; i++) {
      this.tokens.push({
        x: 0, z: 0, y: 0,
        tx: 0, tz: 0,
        s: 0.001, ts: 0.001,
        color: new THREE.Color('#b6a695'),
        target: new THREE.Color('#b6a695'),
        delay: 0,
        hop: 0,
      });
    }

    // write every instance colour once: instances never touched by setColorAt
    // stay pure white, which reads as a missing token on the paper
    for (let i = 0; i < MAX_TOKENS; i++) this.tokenMesh.setColorAt(i, this.tokens[i].color);
    this.tokenMesh.instanceColor.needsUpdate = true;

    // everything a chapter draws lives here and is thrown away on clear()
    this.drawing = new THREE.Group();
    this.add(this.drawing);
  }

  // --- helpers ------------------------------------------------------------
  /** A point on the paper. */
  p(x, z, lift = 0) {
    return new THREE.Vector3(x, this.surfaceY + lift, z);
  }

  clear() {
    for (const c of [...this.drawing.children]) {
      c.traverse?.((o) => {
        if (o.geometry && o.userData.own) o.geometry.dispose();
      });
      this.drawing.remove(c);
    }
    this.labels.length = 0;
  }

  label(text, pos, cls = '') {
    const entry = { text, cls, get: () => pos, on: () => true };
    this.labels.push(entry);
    return entry;
  }

  // --- tokens -------------------------------------------------------------
  /** Show `n` tokens; everything beyond n shrinks away. */
  use(n) {
    this.tokenMesh.count = Math.min(MAX_TOKENS, Math.max(n, this.tokenMesh.count));
    for (let i = 0; i < MAX_TOKENS; i++) {
      if (i >= n) this.tokens[i].ts = 0.001;
    }
    this.activeCount = n;
  }

  /** Send tokens `idx` into a centred grid; returns the block's half sizes. */
  grid(idx, cx, cz, cols, { gap = 0.26, size = null, color = null, delay = 0, stagger = 0.004, rowFirst = true } = {}) {
    const rows = Math.ceil(idx.length / cols);
    const w = (cols - 1) * gap;
    const h = (rows - 1) * gap;
    idx.forEach((i, k) => {
      const t = this.tokens[i];
      if (!t) return;
      const r = rowFirst ? Math.floor(k / cols) : k % rows;
      const c = rowFirst ? k % cols : Math.floor(k / rows);
      t.tx = cx - w / 2 + c * gap;
      t.tz = cz - h / 2 + r * gap;
      t.ts = size ?? gap * 0.82;
      t.delay = delay + k * stagger;
      if (color) t.target.set(color);
    });
    return { w, h, rows, cols };
  }

  color(idx, color, delay = 0) {
    const c = new THREE.Color(color);
    for (const i of idx) {
      const t = this.tokens[i];
      if (t) {
        t.target.copy(c);
        if (delay) t.delay = Math.max(t.delay, delay);
      }
    }
  }

  scale(idx, s) {
    for (const i of idx) if (this.tokens[i]) this.tokens[i].ts = s;
  }

  hop(idx, amount = 0.5) {
    for (const i of idx) if (this.tokens[i]) this.tokens[i].hop = amount;
  }

  /** Put every token in one loose pile, ready for a fresh layout. */
  pile(n, cx = 0, cz = 0, cols = 34, opts = {}) {
    const all = [];
    for (let i = 0; i < n; i++) all.push(i);
    this.use(n);
    this.grid(all, cx, cz, cols, opts);
    return all;
  }

  // --- drawn things -------------------------------------------------------
  /** A frame outlining a region of the paper (for confusion-matrix quadrants). */
  zone(cx, cz, w, h, color, { opacity = 0.1 } = {}) {
    const g = new THREE.Group();
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
    );
    fill.rotation.x = -Math.PI / 2;
    fill.position.set(cx, this.surfaceY + 0.004, cz);
    g.add(fill);
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 })
    );
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(cx, this.surfaceY + 0.006, cz);
    g.add(edge);
    g.userData.own = true;
    this.drawing.add(g);
    return g;
  }

  /** A bar growing up out of the paper (SHAP weights, probabilities). */
  bar(x, z, height, color, { w = 0.3, d = 0.3, delay = 0 } = {}) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, 1, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.45 })
    );
    m.castShadow = true;
    m.position.set(x, this.surfaceY, z);
    m.scale.y = 0.001;
    m.userData.grow = { h: Math.max(0.001, height), t: -delay, dur: 0.55 };
    this.drawing.add(m);
    return m;
  }

  /** A flat card lying on the paper with a canvas drawing on it. */
  panel(x, z, w, h, draw, { pixels = 1024, tilt = 0, y = 0.012 } = {}) {
    const c = document.createElement('canvas');
    c.width = pixels;
    c.height = Math.round((pixels * h) / w);
    const g = c.getContext('2d');
    g.fillStyle = '#fffdf9';
    g.fillRect(0, 0, c.width, c.height);
    draw(g, c.width, c.height);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    m.rotation.x = -Math.PI / 2 + tilt;
    m.position.set(x, this.surfaceY + y, z);
    m.userData.own = true;
    m.userData.pop = { t: 0, dur: 0.4 };
    m.scale.setScalar(0.001);
    this.drawing.add(m);
    return m;
  }

  /** A rounded block standing on the paper — used for the three base models. */
  block(x, z, w, d, h, color, { delay = 0 } = {}) {
    const m = new THREE.Mesh(roundedBox(w, h, d, 0.06), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
    m.castShadow = true;
    m.position.set(x, this.surfaceY + h / 2, z);
    m.scale.setScalar(0.001);
    m.userData.pop = { t: -delay, dur: 0.45 };
    this.drawing.add(m);
    return m;
  }

  /** A thin connector lying on the paper. */
  link(a, b, color = '#b9a996', { w = 0.035, delay = 0 } = {}) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.02, w),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
    );
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.rotation.y = Math.atan2(-dir.z, dir.x);
    m.scale.x = 0.001;
    m.userData.stretch = { len, t: -delay, dur: 0.4 };
    this.drawing.add(m);
    return m;
  }

  /** Finish every running animation at once (slider redraws). */
  finishAll() {
    this.drawing.traverse((o) => {
      if (o.userData.grow) {
        o.scale.y = o.userData.grow.h;
        o.position.y = this.surfaceY + o.userData.grow.h / 2;
        o.userData.grow = undefined;
      }
      if (o.userData.pop) {
        o.scale.setScalar(1);
        o.userData.pop = undefined;
      }
      if (o.userData.stretch) {
        o.scale.x = o.userData.stretch.len;
        o.userData.stretch = undefined;
      }
    });
    for (let i = 0; i < this.tokenMesh.count; i++) {
      const t = this.tokens[i];
      t.x = t.tx;
      t.z = t.tz;
      t.s = t.ts;
      t.delay = 0;
      t.y = this.surfaceY;
      t.hop = 0;
      t.color.copy(t.target);
      this.tokenMesh.setColorAt(i, t.color); // the buffer needs it too
      this._m.compose(new THREE.Vector3(t.x, t.y, t.z), this._q, new THREE.Vector3(t.s, t.s * 0.9, t.s));
      this.tokenMesh.setMatrixAt(i, this._m);
    }
    this.tokenMesh.instanceMatrix.needsUpdate = true;
    if (this.tokenMesh.instanceColor) this.tokenMesh.instanceColor.needsUpdate = true;
  }

  // --- per-frame ----------------------------------------------------------
  update(dt, time) {
    const k = Math.min(1, dt * 7);
    let dirty = false;
    for (let i = 0; i < this.tokenMesh.count; i++) {
      const t = this.tokens[i];
      if (t.delay > 0) {
        t.delay -= dt;
        continue;
      }
      const dx = t.tx - t.x;
      const dz = t.tz - t.z;
      const ds = t.ts - t.s;
      const moving = Math.abs(dx) + Math.abs(dz) > 0.0008;
      if (moving || Math.abs(ds) > 0.0004 || t.hop > 0.001) {
        t.x += dx * k;
        t.z += dz * k;
        t.s += ds * k;
        if (moving) t.hop = Math.min(0.6, t.hop + dt * 2.2);
        else t.hop *= 0.86;
        t.y = this.surfaceY + t.hop * 0.22 * Math.abs(Math.sin(time * 6 + i));
        dirty = true;
      } else if (t.y !== this.surfaceY) {
        t.y = this.surfaceY;
        dirty = true;
      }
      if (!t.color.equals(t.target)) {
        t.color.lerp(t.target, k);
        this.tokenMesh.setColorAt(i, t.color);
        if (this.tokenMesh.instanceColor) this.tokenMesh.instanceColor.needsUpdate = true;
        dirty = true;
      }
      this._m.compose(
        new THREE.Vector3(t.x, t.y, t.z),
        this._q,
        new THREE.Vector3(t.s, t.s * 0.9, t.s)
      );
      this.tokenMesh.setMatrixAt(i, this._m);
    }
    if (dirty) this.tokenMesh.instanceMatrix.needsUpdate = true;

    this.drawing.traverse((o) => {
      const g = o.userData.grow;
      if (g) {
        g.t = Math.min(g.dur, g.t + dt);
        if (g.t > 0) {
          const e = 1 - Math.pow(1 - g.t / g.dur, 3);
          o.scale.y = Math.max(0.001, g.h * e);
          o.position.y = this.surfaceY + (g.h * e) / 2;
        }
        if (g.t >= g.dur) o.userData.grow = undefined;
      }
      const p = o.userData.pop;
      if (p) {
        p.t = Math.min(p.dur, p.t + dt);
        if (p.t > 0) {
          const e = 1 - Math.pow(1 - p.t / p.dur, 3);
          o.scale.setScalar(Math.max(0.001, e));
        }
        if (p.t >= p.dur) o.userData.pop = undefined;
      }
      const s = o.userData.stretch;
      if (s) {
        s.t = Math.min(s.dur, s.t + dt);
        if (s.t > 0) {
          const e = 1 - Math.pow(1 - s.t / s.dur, 3);
          o.scale.x = Math.max(0.001, s.len * e);
        }
        if (s.t >= s.dur) o.userData.stretch = undefined;
      }
    });
  }
}

/** Shared chart helpers for panel() drawings. */
export const Ink = {
  ink: '#2b211b',
  soft: '#6b5a4d',
  line: 'rgba(43,33,27,0.16)',
  grid: 'rgba(43,33,27,0.08)',
  risk: '#c4623d',
  safe: '#5b7c99',
  good: '#3f8a5b',
  warn: '#d99a2b',
  sans: '600 26px "Instrument Sans", system-ui, sans-serif',
  serif: '500 34px Fraunces, Georgia, serif',
};

/** Axes + frame for a chart panel; returns a mapper from data to pixels. */
export function axes(g, W, H, { x0 = 0, x1 = 1, y0 = 0, y1 = 1, pad = 78, xTicks = 5, yTicks = 4, xLabel = '', yLabel = '', fmtX = (v) => v, fmtY = (v) => v } = {}) {
  const L = pad;
  const R = W - pad * 0.5;
  const T = pad * 0.55;
  const B = H - pad * 0.85;
  const mx = (v) => L + ((v - x0) / (x1 - x0)) * (R - L);
  const my = (v) => B - ((v - y0) / (y1 - y0)) * (B - T);
  g.strokeStyle = Ink.grid;
  g.lineWidth = 2;
  g.font = '500 27px "Instrument Sans", system-ui, sans-serif';
  g.fillStyle = Ink.soft;
  g.textAlign = 'center';
  for (let i = 0; i <= xTicks; i++) {
    const v = x0 + ((x1 - x0) * i) / xTicks;
    g.beginPath();
    g.moveTo(mx(v), T);
    g.lineTo(mx(v), B);
    g.stroke();
    g.fillText(String(fmtX(v)), mx(v), B + 36);
  }
  g.textAlign = 'right';
  for (let i = 0; i <= yTicks; i++) {
    const v = y0 + ((y1 - y0) * i) / yTicks;
    g.beginPath();
    g.moveTo(L, my(v));
    g.lineTo(R, my(v));
    g.stroke();
    g.fillText(String(fmtY(v)), L - 12, my(v) + 8);
  }
  g.strokeStyle = Ink.line;
  g.strokeRect(L, T, R - L, B - T);
  if (xLabel) {
    g.textAlign = 'center';
    g.fillStyle = Ink.soft;
    g.font = '600 27px "Instrument Sans", system-ui, sans-serif';
    g.fillText(xLabel, (L + R) / 2, H - 12);
  }
  if (yLabel) {
    g.save();
    g.translate(20, (T + B) / 2);
    g.rotate(-Math.PI / 2);
    g.textAlign = 'center';
    g.fillText(yLabel, 0, 0);
    g.restore();
  }
  return { mx, my, L, R, T, B };
}

export function plot(g, pts, map, color, { width = 5, dash = null } = {}) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineJoin = 'round';
  if (dash) g.setLineDash(dash);
  g.beginPath();
  pts.forEach(([x, y], i) => {
    const px = map.mx(x);
    const py = map.my(y);
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  });
  g.stroke();
  g.restore();
}

export function dot(g, x, y, map, color, r = 9) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(map.mx(x), map.my(y), r, 0, Math.PI * 2);
  g.fill();
}

export function title(g, W, text, sub = '') {
  g.fillStyle = Ink.ink;
  g.font = '600 38px "Instrument Sans", system-ui, sans-serif';
  g.textAlign = 'left';
  g.fillText(text, 26, 48);
  if (sub) {
    g.fillStyle = Ink.soft;
    g.font = '500 27px "Instrument Sans", system-ui, sans-serif';
    g.fillText(sub, 26, 86);
  }
}
