import * as THREE from 'three';
import { createDumplingGeometry } from '../../js/dumpling-shape.js';
import { makeBambooTexture } from '../../js/textures.js';
import { Face } from '../../YZ-nasil-calisir/js/face.js';

/**
 * Bıdık's dough board: the "plane" where points, segments, rays, lines,
 * angles and circles are drawn with sesame dots and chocolate lines.
 */
export class GeoScene extends THREE.Group {
  constructor({ palette, mouths }) {
    super();
    this.palette = palette;
    this.mouths = mouths;
    this.W = 6.4;
    this.D = 4.4;
    this.surfaceY = 0.175;

    // board
    const wood = makeBambooTexture({ seed: 21 });
    wood.repeat.set(2, 1.4);
    const boardMat = new THREE.MeshStandardMaterial({ map: wood, color: '#f1dcb8', roughness: 0.7 });
    const board = new THREE.Mesh(roundedBox(this.W, 0.14, this.D, 0.18), boardMat);
    board.position.y = 0.07;
    board.receiveShadow = true;
    board.castShadow = true;
    this.add(board);
    this.board = board;
    // flour dusting (soft disc)
    const dust = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), new THREE.MeshStandardMaterial({ color: '#fbf5ea', roughness: 1, transparent: true, opacity: 0.22, depthWrite: false }));
    dust.rotation.x = -Math.PI / 2;
    dust.position.set(0.1, this.surfaceY + 0.002, 0.15);
    dust.scale.set(1.25, 1, 0.8);
    this.add(dust);

    this.pointMat = new THREE.MeshPhysicalMaterial({ color: palette.terracotta, roughness: 0.35, clearcoat: 0.8 });
    this.pointGeo = new THREE.SphereGeometry(0.075, 20, 14);
    this.lineMat = new THREE.MeshStandardMaterial({ color: '#4a2e1e', roughness: 0.6 });
    this.softMat = new THREE.MeshStandardMaterial({ color: '#4a2e1e', roughness: 0.6, transparent: true, opacity: 0.35 });
    this.accentMat = new THREE.MeshStandardMaterial({ color: palette.slate, roughness: 0.6 });
    this.goodMat = new THREE.MeshStandardMaterial({ color: '#3f8a5b', roughness: 0.6 });
    this.dotGeo = new THREE.SphereGeometry(0.04, 10, 8);

    this.drawing = new THREE.Group();
    this.add(this.drawing);
    this.points = [];
    this.labels = []; // { el text, get(), on() } entries consumed by main

    this._buildTools();
    this._buildKids();
  }

  // --- helpers ---------------------------------------------------------
  p(x, z, lift = 0) {
    return new THREE.Vector3(x, this.surfaceY + 0.075 + lift, z);
  }

  clear() {
    for (const c of [...this.drawing.children]) this.drawing.remove(c);
    this.points = [];
    this.labels.length = 0;
    this.rope.visible = false;
    this.hideTools();
  }

  addPoint(x, z, name, { color = null, size = 1 } = {}) {
    const m = new THREE.Mesh(this.pointGeo, color ? new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.8 }) : this.pointMat);
    m.position.copy(this.p(x, z));
    m.scale.setScalar(0.001);
    m.userData.target = size;
    m.castShadow = true;
    this.drawing.add(m);
    const pt = { mesh: m, name, pos: m.position.clone() };
    this.points.push(pt);
    if (name) this.labels.push({ text: name, cls: 'tag--point', get: () => m.position.clone().add(new THREE.Vector3(0.16, 0.22, -0.1)), on: () => m.visible });
    return pt;
  }

  /** small sesame dots between two points (n dots), for "fill the gap" play */
  dots(a, b, n, mat = this.lineMat) {
    const g = new THREE.Group();
    for (let i = 1; i < n; i++) {
      const d = new THREE.Mesh(this.dotGeo, mat);
      d.position.lerpVectors(a, b, i / n);
      d.userData.delay = i * 0.04;
      d.scale.setScalar(0.001);
      d.userData.target = 1;
      g.add(d);
    }
    this.drawing.add(g);
    return g;
  }

  bar(a, b, mat = this.lineMat, r = 0.022) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10, 1), mat);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.scale.set(1, 0.001, 1);
    m.userData.grow = { a: a.clone(), b: b.clone(), len, t: 0, dur: 0.5 };
    m.castShadow = true;
    this.drawing.add(m);
    return m;
  }

  arrowHead(at, dir, mat = this.lineMat) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 12), mat);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    c.position.copy(at);
    this.drawing.add(c);
    return c;
  }

  /** Extend from `from` through `to` until the board edge; returns end point. */
  edgePoint(from, to) {
    const dir = new THREE.Vector3().subVectors(to, from).setY(0).normalize();
    const hx = this.W / 2 - 0.35;
    const hz = this.D / 2 - 0.35;
    let t = Infinity;
    if (dir.x > 0) t = Math.min(t, (hx - from.x) / dir.x);
    if (dir.x < 0) t = Math.min(t, (-hx - from.x) / dir.x);
    if (dir.z > 0) t = Math.min(t, (hz - from.z) / dir.z);
    if (dir.z < 0) t = Math.min(t, (-hz - from.z) / dir.z);
    return from.clone().addScaledVector(dir, t);
  }

  segment(a, b, mat) {
    return this.bar(a, b, mat);
  }

  ray(a, through, mat = this.lineMat) {
    const end = this.edgePoint(a, through);
    const bar = this.bar(a, end, mat);
    const head = this.arrowHead(end, new THREE.Vector3().subVectors(end, a));
    head.visible = false;
    bar.userData.onDone = () => (head.visible = true);
    return { bar, head, end };
  }

  line(a, b, mat = this.lineMat) {
    const e1 = this.edgePoint(a, b);
    const e2 = this.edgePoint(b, a);
    const bar = this.bar(e1, e2, mat);
    const h1 = this.arrowHead(e1, new THREE.Vector3().subVectors(e1, e2));
    const h2 = this.arrowHead(e2, new THREE.Vector3().subVectors(e2, e1));
    h1.visible = h2.visible = false;
    bar.userData.onDone = () => (h1.visible = h2.visible = true);
    return { bar, h1, h2 };
  }

  /** angle arc at vertex v between directions to a and b */
  arc(v, a, b, r = 0.5, mat = this.accentMat) {
    const da = new THREE.Vector3().subVectors(a, v).setY(0).normalize();
    const db = new THREE.Vector3().subVectors(b, v).setY(0).normalize();
    const a0 = Math.atan2(da.z, da.x);
    let a1 = Math.atan2(db.z, db.x);
    let sweep = a1 - a0;
    while (sweep > Math.PI) sweep -= Math.PI * 2;
    while (sweep < -Math.PI) sweep += Math.PI * 2;
    const pts = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const t = a0 + (sweep * i) / n;
      pts.push(new THREE.Vector3(v.x + Math.cos(t) * r, v.y - 0.02, v.z + Math.sin(t) * r));
    }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.018, 8, false), mat);
    this.drawing.add(tube);
    return tube;
  }

  rightAngleMark(v, a, b, s = 0.28) {
    const da = new THREE.Vector3().subVectors(a, v).setY(0).normalize().multiplyScalar(s);
    const db = new THREE.Vector3().subVectors(b, v).setY(0).normalize().multiplyScalar(s);
    const p1 = v.clone().add(da);
    const p2 = v.clone().add(da).add(db);
    const p3 = v.clone().add(db);
    const g = new THREE.Group();
    g.add(this._thin(p1, p2), this._thin(p2, p3));
    this.drawing.add(g);
    return g;
  }

  _thin(a, b) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, dir.length(), 6), this.accentMat);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    m.position.copy(a).addScaledVector(dir, 0.5);
    return m;
  }

  circle(c, r, mat = this.lineMat) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.024, 10, 96), mat);
    t.rotation.x = Math.PI / 2;
    t.position.copy(c);
    t.scale.setScalar(0.001);
    t.userData.target = 1;
    t.castShadow = true;
    this.drawing.add(t);
    return t;
  }

  disk(c, r, color = '#e9c1ad') {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 96), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    d.position.copy(c).setY(this.surfaceY + 0.016);
    d.scale.setScalar(0.001);
    d.userData.target = 1;
    this.drawing.add(d);
    return d;
  }

  // --- tools -------------------------------------------------------------
  _buildTools() {
    const wood = new THREE.MeshStandardMaterial({ color: '#d9b07a', roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: '#7a5433', roughness: 0.6 });
    const metal = new THREE.MeshPhysicalMaterial({ color: '#c9c3b8', roughness: 0.3, metalness: 0.7 });
    // straightedge (çizgeç): a plain wooden stick
    this.straightedge = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 0.3), wood);
    this.straightedge.castShadow = true;
    // ruler with cm ticks
    const rulerTex = rulerTexture();
    this.ruler = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.05, 0.34), [wood, wood, new THREE.MeshStandardMaterial({ map: rulerTex, roughness: 0.6 }), wood, wood, wood]);
    this.ruler.castShadow = true;
    // set square (gönye)
    const tri = new THREE.Shape();
    tri.moveTo(0, 0);
    tri.lineTo(1.6, 0);
    tri.lineTo(0, 1.1);
    tri.closePath();
    const hole = new THREE.Path();
    hole.moveTo(0.35, 0.25);
    hole.lineTo(0.95, 0.25);
    hole.lineTo(0.35, 0.65);
    hole.closePath();
    tri.holes.push(hole);
    this.setSquare = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.05, bevelEnabled: false }), new THREE.MeshPhysicalMaterial({ color: '#f5d7a6', roughness: 0.3, transparent: true, opacity: 0.85 }));
    this.setSquare.rotation.x = -Math.PI / 2;
    this.setSquare.castShadow = true;
    // compass (pergel): two legs and a hinge
    this.compass = new THREE.Group();
    const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), metal);
    hinge.position.y = 1.35;
    const legA = new THREE.Group();
    const legB = new THREE.Group();
    for (const [leg, m] of [[legA, metal], [legB, dark]]) {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 1.35, 10), m);
      cyl.position.y = -0.675;
      leg.add(cyl);
      leg.position.y = 1.35;
      leg.castShadow = true;
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 8), metal);
    tip.rotation.x = Math.PI;
    tip.position.y = -1.4;
    legA.add(tip);
    const lead = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.005, 0.14, 8), new THREE.MeshStandardMaterial({ color: '#2b211b' }));
    lead.position.y = -1.42;
    legB.add(lead);
    this.compass.add(hinge, legA, legB);
    this.compass.userData.legA = legA;
    this.compass.userData.legB = legB;
    this.compass.userData.setOpening = (r) => {
      const a = Math.asin(Math.min(0.9, r / 2 / 1.35));
      legA.rotation.z = a;
      legB.rotation.z = -a;
    };
    for (const t of [this.straightedge, this.ruler, this.setSquare, this.compass]) {
      t.visible = false;
      this.add(t);
    }
  }

  hideTools() {
    for (const t of [this.straightedge, this.ruler, this.setSquare, this.compass]) t.visible = false;
  }

  /** Place the straightedge along a→b, slightly beside the line. */
  placeStraightedge(a, b, tool = this.straightedge) {
    const dir = new THREE.Vector3().subVectors(b, a).setY(0);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(0.24);
    tool.position.copy(mid).add(side).setY(this.surfaceY + 0.03);
    tool.rotation.set(0, -Math.atan2(dir.z, dir.x), 0);
    tool.visible = true;
  }

  // --- kids (dumplings) --------------------------------------------------
  _buildKids() {
    const geo = createDumplingGeometry(THREE, { around: 48, down: 28 });
    geo.deleteAttribute('color');
    const mat = new THREE.MeshPhysicalMaterial({ color: '#f6e7d2', roughness: 0.65, sheen: 0.4, sheenColor: new THREE.Color('#ffd7b3') });
    this.kids = [];
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(geo, mat);
      body.scale.setScalar(0.28);
      body.castShadow = true;
      g.add(body);
      const face = new Face({ radius: 0.28 * 0.97, mouths: this.mouths, palette: this.palette, cheek: 0.7 });
      face.position.y = 0.28 * 0.82;
      face.setMood(['happy', 'joy', 'curious', 'proud'][i % 4]);
      g.add(face);
      g.userData.face = face;
      g.userData.target = new THREE.Vector3(-2.2 + i * 0.6, 0, 3.4);
      g.position.copy(g.userData.target);
      g.userData.hop = 0;
      g.userData.phase = Math.random() * 6;
      g.visible = false;
      this.add(g);
      this.kids.push(g);
    }
    this.rope = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.03, 8, 96), new THREE.MeshStandardMaterial({ color: '#c9a06a', roughness: 0.8 }));
    this.rope.rotation.x = Math.PI / 2;
    this.rope.visible = false;
    this.add(this.rope);
  }

  showKids(on) {
    for (const k of this.kids) k.visible = on;
  }

  scatterKids() {
    this.kids.forEach((k, i) => k.userData.target.set(-2.6 + i * 0.75 + Math.random() * 0.3, 0, 2.9 + Math.random() * 0.5));
  }

  arrangeKidsCircle(center, r) {
    this.kids.forEach((k, i) => {
      const a = (i / this.kids.length) * Math.PI * 2 + 0.3;
      k.userData.target.set(center.x + Math.cos(a) * r, 0, center.z + Math.sin(a) * r);
      k.userData.face.setMood('joy');
    });
    this.rope.position.set(center.x, this.surfaceY + 0.12, center.z);
    this.rope.scale.setScalar(r / 1.5);
  }

  // --- per-frame -----------------------------------------------------------
  update(dt, time) {
    this.drawing.traverse((o) => {
      if (o.userData.target !== undefined && o.userData.grow === undefined) {
        if (o.userData.delay > 0) {
          o.userData.delay -= dt;
          return;
        }
        const s = o.scale.x + (o.userData.target - o.scale.x) * Math.min(1, dt * 10);
        o.scale.setScalar(Math.max(0.001, s));
      }
      if (o.userData.grow) {
        const g = o.userData.grow;
        g.t = Math.min(g.dur, g.t + dt);
        const k = g.t / g.dur;
        const e = 1 - Math.pow(1 - k, 3);
        o.scale.y = Math.max(0.001, g.len * e);
        o.position.copy(g.a).lerp(g.b, e * 0.5);
        if (k >= 1) {
          o.userData.onDone?.();
          o.userData.grow = undefined;
        }
      }
    });
    for (const k of this.kids) {
      if (!k.visible) continue;
      const to = k.userData.target;
      const d = k.position.distanceTo(to);
      if (d > 0.02) {
        k.position.lerp(new THREE.Vector3(to.x, 0, to.z), Math.min(1, dt * 3));
        k.userData.hop = Math.abs(Math.sin(time * 9 + k.userData.phase)) * 0.12;
        k.rotation.y = Math.atan2(to.x - k.position.x, to.z - k.position.z);
      } else {
        k.userData.hop += (0 - k.userData.hop) * Math.min(1, dt * 8);
      }
      k.position.y = this.surfaceY + k.userData.hop;
      k.userData.face.update(dt);
    }
  }
}

function roundedBox(w, h, d, r) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + d - r);
  shape.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  shape.lineTo(x + r, y + d);
  shape.quadraticCurveTo(x, y + d, x, y + d - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -h / 2, 0);
  return g;
}

function rulerTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#e9cf9f';
  g.fillRect(0, 0, 1024, 96);
  g.fillStyle = '#4a2e1e';
  g.font = '600 26px "Instrument Sans", sans-serif';
  g.textAlign = 'center';
  const cmPx = 1024 / 12;
  for (let i = 0; i <= 120; i++) {
    const x = 40 + (i * cmPx) / 10;
    if (x > 1000) break;
    const h = i % 10 === 0 ? 34 : i % 5 === 0 ? 22 : 12;
    g.fillRect(x, 0, 2, h);
    if (i % 10 === 0) g.fillText(String(i / 10), x, 66);
  }
  g.font = '500 20px "Instrument Sans", sans-serif';
  g.textAlign = 'right';
  g.fillText('cm', 1000, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------------------
// Additions for lesson 03: protractor, sweeps, coloured arcs, polygons
// ---------------------------------------------------------------------------
const KIND_COLORS = { dar: '#e2557e', dik: '#5b7c99', genis: '#f0b41f', dogru: '#4a2e1e', tam: '#4a2e1e' };
export function angleKind(deg) {
  if (Math.abs(deg - 90) < 1.5) return 'dik';
  if (Math.abs(deg - 180) < 1.5) return 'dogru';
  if (deg >= 359) return 'tam';
  return deg < 90 ? 'dar' : 'genis';
}
export const KIND_LABEL = { dar: 'dar açı', dik: 'dik açı', genis: 'geniş açı', dogru: 'doğru açı', tam: 'tam açı' };

Object.assign(GeoScene.prototype, {
  kindMat(kind) {
    this._kindMats = this._kindMats || {};
    if (!this._kindMats[kind]) this._kindMats[kind] = new THREE.MeshStandardMaterial({ color: KIND_COLORS[kind] || '#4a2e1e', roughness: 0.6 });
    return this._kindMats[kind];
  },
  /** Direction on the board for an angle in degrees (counter-clockwise seen from above). */
  dirDeg(deg) {
    const a = (deg * Math.PI) / 180;
    return new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
  },
  /** Arc from startDeg sweeping sweepDeg counter-clockwise. */
  arcSweep(v, startDeg, sweepDeg, r = 0.5, mat = this.accentMat, radius = 0.018) {
    const pts = [];
    const n = Math.max(8, Math.round(Math.abs(sweepDeg) / 4));
    for (let i = 0; i <= n; i++) {
      const d = this.dirDeg(startDeg + (sweepDeg * i) / n);
      pts.push(new THREE.Vector3(v.x + d.x * r, v.y - 0.02, v.z + d.z * r));
    }
    if (pts.length < 2) return null;
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, n * 2), radius, 8, false), mat);
    this.drawing.add(tube);
    return tube;
  },
  /** Line through point p at angle deg (both directions to the board edge). */
  lineAt(p, deg, mat = this.lineMat) {
    const d = this.dirDeg(deg);
    const a = p.clone().addScaledVector(d, 0.5);
    const b = p.clone().addScaledVector(d, -0.5);
    return this.line(a, b, mat);
  },
  rayAt(p, deg, mat = this.lineMat) {
    return this.ray(p, p.clone().addScaledVector(this.dirDeg(deg), 0.5), mat);
  },
  dashed(a, b, mat = this.accentMat) {
    const g = new THREE.Group();
    const n = Math.max(3, Math.round(a.distanceTo(b) / 0.22));
    for (let i = 0; i < n; i++) {
      const s = a.clone().lerp(b, i / n);
      const e = a.clone().lerp(b, (i + 0.55) / n);
      g.add(this._thin(s, e));
    }
    g.children.forEach((m) => (m.material = mat));
    this.drawing.add(g);
    return g;
  },
  /** Filled polygon on the board from XZ points. */
  polygonFill(points, color = '#f4d7c4') {
    const shape = new THREE.Shape();
    points.forEach((p, i) => (i ? shape.lineTo(p.x, -p.z) : shape.moveTo(p.x, -p.z)));
    shape.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color, roughness: 0.9, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = this.surfaceY + 0.008;
    this.drawing.add(m);
    return m;
  },
  /** Protractor disc (full = 360, else half) centred at v with 0° along +x. */
  protractor(v, full = true, r = 1.45) {
    if (!this._protTex) this._protTex = { full: protractorTexture(true), half: protractorTexture(false) };
    const tex = full ? this._protTex.full : this._protTex.half;
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 96, 0, full ? Math.PI * 2 : Math.PI), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.copy(v).setY(this.surfaceY + 0.006);
    this.drawing.add(m);
    return m;
  },
});

function protractorTexture(full) {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  const cx = S / 2;
  const cy = S / 2;
  const R = S / 2 - 6;
  g.fillStyle = 'rgba(251, 246, 236, 0.9)';
  g.beginPath();
  if (full) g.arc(cx, cy, R, 0, Math.PI * 2);
  else {
    g.arc(cx, cy, R, Math.PI, 0);
    g.closePath();
  }
  g.fill();
  g.strokeStyle = '#4a2e1e';
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = '#4a2e1e';
  g.strokeStyle = '#4a2e1e';
  const maxDeg = full ? 360 : 180;
  for (let d = 0; d < maxDeg + (full ? 0 : 1); d++) {
    const a = (-d * Math.PI) / 180; // canvas y is down; counter-clockwise on the board maps to negative canvas angle
    const len = d % 10 === 0 ? 46 : d % 5 === 0 ? 30 : 16;
    g.lineWidth = d % 10 === 0 ? 3 : 1.5;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * (R - len), cy + Math.sin(a) * (R - len));
    g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    g.stroke();
    if (d % 10 === 0 && (full ? d < 360 : d <= 180)) {
      g.font = '600 30px "Instrument Sans", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(d), cx + Math.cos(a) * (R - 78), cy + Math.sin(a) * (R - 78));
    }
  }
  g.beginPath();
  g.arc(cx, cy, 8, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
