import * as THREE from 'three';
import { PALETTE } from './config.js';

/** Glossy soy sauce surface with CPU-simulated ripples. */
export class SauceSurface extends THREE.Mesh {
  constructor(radius) {
    const geometry = new THREE.RingGeometry(0.0005, radius, 72, 26);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshPhysicalMaterial({
      color: PALETTE.sauce,
      roughness: 0.06,
      metalness: 0.0,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      reflectivity: 1,
      envMapIntensity: 1.4,
      specularIntensity: 1,
    });
    super(geometry, material);
    this.radius = radius;
    this.receiveShadow = true;
    this.base = geometry.attributes.position.array.slice();
    this.sources = [];
    this.time = 0;
    this.idle = 0;
    this.name = 'sauce';
  }

  /** Start a ripple at local (x, z). */
  ripple(x, z, amp = 1) {
    this.sources.push({ x, z, t: 0, amp });
    if (this.sources.length > 8) this.sources.shift();
  }

  update(dt) {
    this.time += dt;
    if (this.sources.length === 0 && this.idle <= 0) return;
    const pos = this.geometry.attributes.position;
    const arr = pos.array;
    const base = this.base;
    const R = this.radius;
    for (const s of this.sources) s.t += dt;
    this.sources = this.sources.filter((s) => s.t < 3.2);
    if (this.sources.length === 0) {
      // settle back to flat
      this.idle -= dt;
      for (let i = 0; i < arr.length; i += 3) arr[i + 1] = base[i + 1];
      pos.needsUpdate = true;
      this.geometry.computeVertexNormals();
      return;
    }
    this.idle = 0.5;
    for (let i = 0; i < arr.length; i += 3) {
      const x = base[i];
      const z = base[i + 2];
      const r = Math.sqrt(x * x + z * z);
      const edge = 1 - Math.pow(r / R, 6);
      let h = 0;
      for (const s of this.sources) {
        const dx = x - s.x;
        const dz = z - s.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        const front = s.t * 0.55; // wave front distance
        const env = Math.exp(-s.t * 1.6) * Math.exp(-Math.pow((d - front) * 3.2, 2)) + Math.exp(-s.t * 2.4) * Math.exp(-d * 6) * 0.6;
        h += s.amp * 0.012 * env * Math.sin(d * 34 - s.t * 16);
      }
      arr[i + 1] = base[i + 1] + h * edge;
    }
    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}
