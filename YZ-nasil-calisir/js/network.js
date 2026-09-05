import * as THREE from 'three';

/**
 * A little abacus-like neural network: porcelain nodes on bamboo posts,
 * connections whose thickness and colour show the weight, and glowing
 * pulses that travel along them.
 */
export class Network3D extends THREE.Group {
  constructor({ net, palette, softDot }) {
    super();
    this.name = 'network';
    this.net = net;
    this.palette = palette;
    const H = net.hidden;
    this.columns = [2.35, 3.15, 3.95];
    this.pos = { input: [], hidden: [], output: null };
    const span = 1.55;
    const base = 0.42;
    this.pos.input = [new THREE.Vector3(this.columns[0], base + span * 0.68, 0), new THREE.Vector3(this.columns[0], base + span * 0.32, 0)];
    for (let i = 0; i < H; i++) this.pos.hidden.push(new THREE.Vector3(this.columns[1], base + (span * (i + 0.5)) / H, 0));
    this.pos.output = new THREE.Vector3(this.columns[2], base + span * 0.5, 0);

    // stand
    const wood = new THREE.MeshStandardMaterial({ color: palette.bamboo, roughness: 0.65 });
    const woodDark = new THREE.MeshStandardMaterial({ color: palette.bambooDark, roughness: 0.7 });
    const foot = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.5), wood);
    foot.position.set(this.columns[1], 0.03, 0);
    foot.castShadow = true;
    foot.receiveShadow = true;
    this.add(foot);
    for (const x of this.columns) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, base + span + 0.1, 12), woodDark);
      post.position.set(x, (base + span + 0.1) / 2 + 0.06, 0);
      post.castShadow = true;
      this.add(post);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), woodDark);
      cap.position.set(x, base + span + 0.16, 0);
      this.add(cap);
    }

    // nodes
    this.nodeMat = () =>
      new THREE.MeshPhysicalMaterial({ color: palette.porcelain, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12, emissive: '#000000' });
    const nodeGeo = new THREE.SphereGeometry(0.11, 28, 20);
    this.nodes = { input: [], hidden: [], output: null };
    const mk = (p, r = 1) => {
      const m = new THREE.Mesh(nodeGeo, this.nodeMat());
      m.position.copy(p);
      m.scale.setScalar(r);
      m.castShadow = true;
      this.add(m);
      return m;
    };
    this.nodes.input = this.pos.input.map((p) => mk(p));
    this.nodes.hidden = this.pos.hidden.map((p) => mk(p, 0.85));
    this.nodes.output = mk(this.pos.output, 1.25);

    // connections
    this.posColor = new THREE.Color(palette.terracotta);
    this.negColor = new THREE.Color(palette.slate);
    const cGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
    this.links = [];
    const link = (a, b, layer, i, j) => {
      const m = new THREE.Mesh(cGeo, new THREE.MeshStandardMaterial({ color: palette.terracotta, roughness: 0.6 }));
      m.castShadow = true;
      this.add(m);
      const l = { mesh: m, a, b, layer, i, j, w: 0, shown: 0 };
      this.links.push(l);
      return l;
    };
    for (let i = 0; i < H; i++) {
      for (let j = 0; j < 2; j++) link(this.pos.input[j], this.pos.hidden[i], 1, i, j);
      link(this.pos.hidden[i], this.pos.output, 2, i, 0);
    }

    // pulses
    this.pulses = [];
    this.pulseMat = new THREE.SpriteMaterial({ map: softDot, color: '#ffd9a8', transparent: true, depthWrite: false, opacity: 0.95 });
    this.pulseMatBack = new THREE.SpriteMaterial({ map: softDot, color: palette.slate, transparent: true, depthWrite: false, opacity: 0.9 });
    this.pool = [];
    for (let k = 0; k < 40; k++) {
      const s = new THREE.Sprite(this.pulseMat);
      s.visible = false;
      s.scale.setScalar(0.16);
      this.add(s);
      this.pool.push(s);
    }
    this.glow = { input: [0, 0], hidden: new Array(H).fill(0), output: 0 };
    this.glowTarget = { input: [0, 0], hidden: new Array(H).fill(0), output: 0 };
    this.time = 0;
    this.weightsShown = 0;
    this.weightsShownTarget = 0;
    this.syncWeights(true);
  }

  weightOf(l) {
    return l.layer === 1 ? this.net.W1[l.i][l.j] : this.net.W2[l.i];
  }

  /** Read weights from the network and re-orient the connection cylinders. */
  syncWeights(immediate = false) {
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const q = new THREE.Quaternion();
    for (const l of this.links) {
      const target = this.weightOf(l);
      l.w = immediate ? target : l.w + (target - l.w) * 0.35;
      dir.subVectors(l.b, l.a);
      const len = dir.length();
      q.setFromUnitVectors(up, dir.clone().normalize());
      l.mesh.quaternion.copy(q);
      l.mesh.position.copy(l.a).addScaledVector(dir, 0.5);
      const r = (0.006 + Math.min(0.045, Math.abs(l.w) * 0.024)) * this.weightsShown;
      l.mesh.scale.set(Math.max(0.0001, r), len, Math.max(0.0001, r));
      l.mesh.material.color.copy(l.w >= 0 ? this.posColor : this.negColor);
    }
  }

  setWeightsVisible(on) {
    this.weightsShownTarget = on ? 1 : 0;
  }

  /** Animate signal pulses along a layer. `values[i]` sizes each pulse. */
  emitPulses(layer, values, backward = false, duration = 0.7) {
    for (const l of this.links) {
      if (l.layer !== layer) continue;
      const v = layer === 1 ? values[l.j] : values[l.i];
      const s = this.pool.find((p) => !p.visible);
      if (!s) continue;
      s.visible = true;
      s.material = backward ? this.pulseMatBack : this.pulseMat;
      const size = 0.08 + Math.min(0.2, Math.abs(v) * 0.16);
      this.pulses.push({ sprite: s, from: backward ? l.b : l.a, to: backward ? l.a : l.b, t: 0, d: duration, size, strength: Math.abs(v * this.weightOf(l)) });
    }
  }

  setGlow(kind, i, v) {
    if (kind === 'output') this.glowTarget.output = v;
    else this.glowTarget[kind][i] = v;
  }

  clearGlow() {
    this.glowTarget.input = [0, 0];
    this.glowTarget.hidden.fill(0);
    this.glowTarget.output = 0;
  }

  update(dt) {
    this.time += dt;
    this.weightsShown += (this.weightsShownTarget - this.weightsShown) * Math.min(1, dt * 5);
    this.syncWeights(false);

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.t += dt;
      const k = Math.min(1, p.t / p.d);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      p.sprite.position.lerpVectors(p.from, p.to, e);
      const sc = p.size * (0.7 + 0.3 * Math.sin(k * Math.PI));
      p.sprite.scale.setScalar(sc);
      if (k >= 1) {
        p.sprite.visible = false;
        this.pulses.splice(i, 1);
      }
    }

    const warm = new THREE.Color('#ffb073');
    const apply = (mesh, g) => {
      mesh.material.emissive.copy(warm).multiplyScalar(g * 0.75);
      mesh.material.color.copy(new THREE.Color(this.palette.porcelain)).lerp(warm, g * 0.35);
      const s = mesh.userData.base ?? (mesh.userData.base = mesh.scale.x);
      mesh.scale.setScalar(s * (1 + g * 0.18));
    };
    for (let i = 0; i < 2; i++) {
      this.glow.input[i] += (this.glowTarget.input[i] - this.glow.input[i]) * Math.min(1, dt * 6);
      apply(this.nodes.input[i], this.glow.input[i]);
    }
    for (let i = 0; i < this.nodes.hidden.length; i++) {
      this.glow.hidden[i] += (this.glowTarget.hidden[i] - this.glow.hidden[i]) * Math.min(1, dt * 6);
      apply(this.nodes.hidden[i], this.glow.hidden[i]);
    }
    this.glow.output += (this.glowTarget.output - this.glow.output) * Math.min(1, dt * 6);
    apply(this.nodes.output, this.glow.output);
  }
}
