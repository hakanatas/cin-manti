import * as THREE from 'three';
import { PALETTE } from './config.js';
import { rand } from './tween.js';

const GRAVITY = 7.5;

/** Droplets, crumbs, sparkles (instanced) and soft puffs (sprites). */
export class Particles {
  constructor(scene, softDot) {
    this.scene = scene;
    this.max = 120;
    this.items = [];
    this.dummy = new THREE.Object3D();

    this.meshes = {
      droplet: new THREE.InstancedMesh(
        new THREE.SphereGeometry(1, 10, 8),
        new THREE.MeshPhysicalMaterial({ color: PALETTE.sauce, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2 }),
        this.max
      ),
      crumb: new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(1, 0),
        new THREE.MeshStandardMaterial({ color: '#e9d6b7', roughness: 0.85 }),
        this.max
      ),
      spark: new THREE.InstancedMesh(
        new THREE.OctahedronGeometry(1, 0),
        new THREE.MeshBasicMaterial({ color: '#ffcf8a' }),
        48
      ),
    };
    for (const m of Object.values(this.meshes)) {
      m.count = 0;
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(m);
    }
    this.meshes.droplet.castShadow = true;
    this.meshes.crumb.castShadow = true;

    this.puffs = [];
    const puffMat = new THREE.SpriteMaterial({ map: softDot, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
    for (let i = 0; i < 24; i++) {
      const s = new THREE.Sprite(puffMat.clone());
      s.visible = false;
      s.renderOrder = 11;
      scene.add(s);
      this.puffs.push({ sprite: s, life: 0, max: 1, vel: new THREE.Vector3(), size: 0.2 });
    }
  }

  /**
   * @param {'droplet'|'crumb'|'spark'} type
   * @param {object} o  position, count, speed, spread, floorAt(x,z)->y|null, onLand(pos)
   */
  emit(type, o) {
    for (let i = 0; i < o.count; i++) {
      if (this.items.length >= this.max * 2) this.items.shift();
      const dir = new THREE.Vector3(rand(-1, 1), rand(0.2, 1), rand(-1, 1)).normalize();
      if (o.direction) dir.lerp(o.direction, 0.6).normalize();
      const speed = o.speed * rand(0.4, 1.1);
      this.items.push({
        type,
        pos: o.position.clone().add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(o.spread || 0.02)),
        vel: dir.multiplyScalar(speed).add(o.velocity || new THREE.Vector3()),
        life: 0,
        max: o.life || rand(1.6, 3.2),
        size: (o.size || 0.02) * rand(0.6, 1.3),
        rot: new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6)),
        spin: new THREE.Vector3(rand(-6, 6), rand(-6, 6), rand(-6, 6)),
        floorAt: o.floorAt || null,
        onLand: o.onLand || null,
        landed: false,
        stretch: type === 'droplet',
      });
    }
  }

  puff(position, count = 6, size = 0.18, color = '#ffffff') {
    let n = 0;
    for (const p of this.puffs) {
      if (p.life > 0) continue;
      p.life = p.max = rand(0.6, 1.1);
      p.size = size * rand(0.7, 1.3);
      p.sprite.position.copy(position).add(new THREE.Vector3(rand(-1, 1), rand(-0.3, 0.6), rand(-1, 1)).multiplyScalar(size * 0.4));
      p.vel.set(rand(-0.25, 0.25), rand(0.25, 0.5), rand(-0.25, 0.25));
      p.sprite.material.color.set(color);
      p.sprite.visible = true;
      if (++n >= count) break;
    }
  }

  update(dt) {
    const counts = { droplet: 0, crumb: 0, spark: 0 };
    const d = this.dummy;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life += dt;
      if (it.life > it.max) {
        this.items.splice(i, 1);
        continue;
      }
      if (!it.landed) {
        if (it.type !== 'spark') it.vel.y -= GRAVITY * dt;
        else it.vel.multiplyScalar(1 - dt * 3.5);
        it.pos.addScaledVector(it.vel, dt);
        it.rot.x += it.spin.x * dt;
        it.rot.y += it.spin.y * dt;
        it.rot.z += it.spin.z * dt;
        const floor = it.floorAt ? it.floorAt(it.pos.x, it.pos.z) : null;
        if (floor !== null && it.pos.y <= floor + it.size * 0.6) {
          it.pos.y = floor + it.size * 0.6;
          if (it.onLand) {
            it.onLand(it.pos.clone(), it);
            it.onLand = null;
          }
          if (it.type === 'droplet') {
            // droplets that hit the sauce vanish into it; on ceramic they sit as a dot
            if (it.absorb) {
              this.items.splice(i, 1);
              continue;
            }
            it.landed = true;
            it.max = Math.min(it.max, it.life + 2.6);
          } else if (Math.abs(it.vel.y) < 0.6) {
            it.landed = true;
            it.max = Math.min(it.max, it.life + rand(2.5, 4.5));
          } else {
            it.vel.y *= -0.3;
            it.vel.x *= 0.55;
            it.vel.z *= 0.55;
            it.spin.multiplyScalar(0.4);
          }
        }
      }
      const fade = it.landed ? Math.max(0, Math.min(1, (it.max - it.life) / 0.6)) : Math.min(1, it.life * 12);
      const s = it.size * (it.type === 'spark' ? (1 - it.life / it.max) : fade);
      d.position.copy(it.pos);
      d.rotation.copy(it.rot);
      if (it.stretch && !it.landed) {
        d.scale.set(s, s * (1 + Math.min(1.2, it.vel.length() * 0.35)), s);
        d.rotation.set(0, 0, 0);
      } else if (it.type === 'droplet') {
        d.scale.set(s * 1.5, s * 0.35, s * 1.5);
        d.rotation.set(0, 0, 0);
      } else {
        d.scale.setScalar(s);
      }
      d.updateMatrix();
      const mesh = this.meshes[it.type];
      const idx = counts[it.type]++;
      if (idx < mesh.instanceMatrix.count) mesh.setMatrixAt(idx, d.matrix);
    }
    for (const [type, mesh] of Object.entries(this.meshes)) {
      mesh.count = Math.min(counts[type], mesh.instanceMatrix.count);
      mesh.instanceMatrix.needsUpdate = true;
    }
    for (const p of this.puffs) {
      if (p.life <= 0) continue;
      p.life -= dt;
      const t = 1 - p.life / p.max;
      p.sprite.position.addScaledVector(p.vel, dt);
      const sc = p.size * (0.4 + t * 1.6);
      p.sprite.scale.set(sc, sc, 1);
      p.sprite.material.opacity = Math.sin(t * Math.PI) * 0.55 * (1 - t * 0.4);
      if (p.life <= 0) p.sprite.visible = false;
    }
  }
}
