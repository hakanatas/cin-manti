import * as THREE from 'three';

/** Little paper squares for the celebration. */
export class Confetti extends THREE.InstancedMesh {
  constructor(colors, count = 160) {
    super(new THREE.PlaneGeometry(0.07, 0.05), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, vertexColors: false }), count);
    this.count = 0;
    this.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.items = [];
    this.colors = colors.map((c) => new THREE.Color(c));
    this.dummy = new THREE.Object3D();
    this.frustumCulled = false;
    this.max = count;
  }

  burst(center, n = 80) {
    for (let i = 0; i < n && this.items.length < this.max; i++) {
      this.items.push({
        p: center.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.3, (Math.random() - 0.5) * 0.4)),
        v: new THREE.Vector3((Math.random() - 0.5) * 2.4, 1.6 + Math.random() * 2.2, (Math.random() - 0.5) * 2.4),
        r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        spin: new THREE.Vector3(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4),
        life: 2.2 + Math.random() * 1.2,
        color: this.colors[i % this.colors.length],
      });
    }
  }

  update(dt) {
    const d = this.dummy;
    let k = 0;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      if (it.life <= 0) {
        this.items.splice(i, 1);
        continue;
      }
      it.v.y -= 3.2 * dt;
      it.v.multiplyScalar(1 - dt * 1.4);
      it.p.addScaledVector(it.v, dt);
      if (it.p.y < 0.02) {
        it.p.y = 0.02;
        it.v.set(0, 0, 0);
        it.spin.set(0, 0, 0);
      }
      it.r.x += it.spin.x * dt;
      it.r.y += it.spin.y * dt;
      it.r.z += it.spin.z * dt;
      d.position.copy(it.p);
      d.rotation.copy(it.r);
      const s = Math.min(1, it.life / 0.5);
      d.scale.setScalar(s);
      d.updateMatrix();
      this.setMatrixAt(k, d.matrix);
      this.setColorAt(k, it.color);
      k++;
    }
    this.count = k;
    this.instanceMatrix.needsUpdate = true;
    if (this.instanceColor) this.instanceColor.needsUpdate = true;
  }
}
