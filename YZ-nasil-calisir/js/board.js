import * as THREE from 'three';
import { createDumplingGeometry } from '../../js/dumpling-shape.js';
import { Face } from './face.js';

/**
 * The "feature space" tablecloth: a tiled square where each dish sits at
 * (sugar, salt). Tiles tint with the network's prediction once it has learnt.
 */
export class Board extends THREE.Group {
  constructor({ size = 3.0, tiles = 26, palette, mouths }) {
    super();
    this.name = 'board';
    this.size = size;
    this.tiles = tiles;
    this.palette = palette;
    this.tint = 0; // 0 = plain cloth, 1 = full prediction tint
    this.tintTarget = 0;

    const cell = size / tiles;
    const geo = new THREE.BoxGeometry(cell * 0.92, 0.025, cell * 0.92);
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 });
    this.tileMesh = new THREE.InstancedMesh(geo, mat, tiles * tiles);
    this.tileMesh.receiveShadow = true;
    const d = new THREE.Object3D();
    this.baseColor = new THREE.Color(palette.creamDeep);
    this.sweet = new THREE.Color(palette.sweet);
    this.salty = new THREE.Color(palette.salty);
    this.clothSweet = new THREE.Color(palette.sweet).lerp(new THREE.Color('#ffffff'), 0.1);
    this.clothSalty = new THREE.Color('#e4a114');
    this.sweetDough = new THREE.Color(palette.sweet).lerp(new THREE.Color('#ffffff'), 0.08);
    this.saltyDough = new THREE.Color(palette.salty).lerp(new THREE.Color('#ffffff'), 0.05);
    this.predictions = new Float32Array(tiles * tiles).fill(0.5);
    for (let j = 0; j < tiles; j++) {
      for (let i = 0; i < tiles; i++) {
        d.position.set((i + 0.5) * cell - size / 2, 0.0125, size / 2 - (j + 0.5) * cell);
        d.updateMatrix();
        const idx = j * tiles + i;
        this.tileMesh.setMatrixAt(idx, d.matrix);
        this.tileMesh.setColorAt(idx, this.baseColor);
      }
    }
    this.add(this.tileMesh);

    // cloth border
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(size + 0.16, 0.012, size + 0.16),
      new THREE.MeshStandardMaterial({ color: palette.terracottaSoft, roughness: 0.9 })
    );
    border.position.y = 0.006;
    border.receiveShadow = true;
    this.add(border);

    // dishes: little plates + a marble showing the label
    const maxDishes = 96;
    this.plateMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.085, 0.07, 0.02, 20),
      new THREE.MeshPhysicalMaterial({ color: palette.porcelain, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 }),
      maxDishes
    );
    const dumplingGeo = createDumplingGeometry(THREE, { around: 44, down: 26 });
    dumplingGeo.deleteAttribute('color');
    dumplingGeo.scale(0.075, 0.075, 0.075);
    this.marbleMesh = new THREE.InstancedMesh(
      dumplingGeo,
      new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color('#ffd7b3') }),
      maxDishes
    );
    this.plateMesh.castShadow = true;
    this.marbleMesh.castShadow = true;
    this.plateMesh.count = 0;
    this.marbleMesh.count = 0;
    this.plateMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.marbleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.add(this.plateMesh, this.marbleMesh);
    this.dishes = []; // { x:[sugar,salt], y, scale }
    this.dummy = d;

    // probe dish (the one the visitor places)
    this.probe = new THREE.Group();
    const probePlate = new THREE.Mesh(this.plateMesh.geometry, this.plateMesh.material);
    probePlate.scale.setScalar(1.25);
    const probeMarble = new THREE.Mesh(this.marbleMesh.geometry, new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color('#ffd7b3') }));
    probeMarble.position.y = 0.03;
    probeMarble.scale.setScalar(1.6);
    const probeFace = new Face({ radius: 0.075 * 0.98, mouths, palette, cheek: 0.7, blink: [2, 5] });
    probeFace.position.y = 0.075 * 0.82;
    probeFace.setMood('curious');
    probeMarble.add(probeFace);
    this.probeFace = probeFace;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 8, 40), new THREE.MeshBasicMaterial({ color: palette.terracotta }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    this.probe.add(probePlate, probeMarble, ring);
    this.probe.userData.marble = probeMarble;
    this.probe.visible = false;
    this.probe.castShadow = true;
    this.add(this.probe);
  }

  /** World position on the board for (sugar, salt) in 0..1. */
  toLocal(sugar, salt, y = 0.03) {
    return new THREE.Vector3((sugar - 0.5) * this.size, y, (0.5 - salt) * this.size);
  }

  fromLocal(v) {
    return [v.x / this.size + 0.5, 0.5 - v.z / this.size];
  }

  setDishes(data) {
    this.dishes = data.map((d) => ({ ...d, scale: 0 }));
  }

  /** Grow dish i to full size (animated by update). */
  revealDish(i) {
    if (this.dishes[i]) this.dishes[i].target = 1;
  }

  revealAll() {
    for (const d of this.dishes) d.target = 1;
  }

  hideAll() {
    for (const d of this.dishes) d.target = 0;
  }

  /** Update tile tints from a predictor (sugar, salt) → p. */
  paint(predict) {
    const n = this.tiles;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const sugar = (i + 0.5) / n;
        const salt = 1 - (j + 0.5) / n;
        this.predictions[j * n + i] = predict(sugar, salt);
      }
    }
    this.dirty = true;
  }

  clearPaint() {
    this.predictions.fill(0.5);
    this.dirty = true;
  }

  setProbe(sugar, salt, p) {
    this.probe.visible = true;
    this.probe.position.copy(this.toLocal(sugar, salt, 0.0));
    const c = new THREE.Color().lerpColors(this.salty, this.sweet, p).lerp(new THREE.Color('#ffffff'), 0.08);
    this.probe.userData.marble.material.color.copy(c);
  }

  update(dt) {
    if (this.probe.visible) this.probeFace.update(dt);
    // dish pop-ins
    const d = this.dummy;
    let count = 0;
    for (const dish of this.dishes) {
      const target = dish.target ?? 0;
      dish.scale += (target - dish.scale) * Math.min(1, dt * 9);
      if (dish.scale < 0.01) continue;
      const pos = this.toLocal(dish.x[0], dish.x[1], 0.03);
      const s = dish.scale;
      d.position.copy(pos);
      d.scale.set(s, s, s);
      d.rotation.set(0, 0, 0);
      d.updateMatrix();
      this.plateMesh.setMatrixAt(count, d.matrix);
      d.position.y = 0.04;
      d.rotation.y = (dish.x[0] * 7 + dish.x[1] * 5) % 1.2 - 0.6;
      d.updateMatrix();
      this.marbleMesh.setMatrixAt(count, d.matrix);
      this.marbleMesh.setColorAt(count, (dish.y ? this.sweetDough : this.saltyDough));
      count++;
    }
    this.plateMesh.count = count;
    this.marbleMesh.count = count;
    this.plateMesh.instanceMatrix.needsUpdate = true;
    this.marbleMesh.instanceMatrix.needsUpdate = true;
    if (this.marbleMesh.instanceColor) this.marbleMesh.instanceColor.needsUpdate = true;

    // tint
    const prev = this.tint;
    this.tint += (this.tintTarget - this.tint) * Math.min(1, dt * 4);
    if (this.dirty || Math.abs(prev - this.tint) > 0.0005) {
      const tmp = new THREE.Color();
      const n = this.tiles * this.tiles;
      for (let k = 0; k < n; k++) {
        const p = this.predictions[k];
        tmp.lerpColors(this.clothSalty, this.clothSweet, p);
        // soften toward the cloth so the dumplings stay readable
        tmp.lerp(this.baseColor, 0.38);
        tmp.lerp(this.baseColor, 1 - this.tint);
        this.tileMesh.setColorAt(k, tmp);
      }
      this.tileMesh.instanceColor.needsUpdate = true;
      this.dirty = false;
    }
  }
}
