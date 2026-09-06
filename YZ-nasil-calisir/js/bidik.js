import * as THREE from 'three';
import { Face } from './face.js';

/** Bıdık: the apprentice robot chef who learns during the lesson. */
export class Bidik extends THREE.Group {
  constructor({ mouths, palette }) {
    super();
    this.name = 'bidik';
    const cream = new THREE.MeshPhysicalMaterial({ color: '#fbf3e6', roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 });
    const terracotta = new THREE.MeshPhysicalMaterial({ color: palette.terracotta, roughness: 0.4, clearcoat: 0.6 });
    const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 });
    const dark = new THREE.MeshStandardMaterial({ color: palette.ink, roughness: 0.6 });

    const R = 0.46;
    this.R = R;
    this.bodyGroup = new THREE.Group();
    this.add(this.bodyGroup);
    const body = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), cream);
    body.scale.set(1, 0.92, 0.95);
    body.position.y = R * 0.92 + 0.08;
    body.castShadow = true;
    this.bodyGroup.add(body);
    this.body = body;

    // apron: a front shell segment in terracotta
    const apron = new THREE.Mesh(new THREE.SphereGeometry(R * 1.02, 40, 20, Math.PI * 0.62, Math.PI * 0.76, Math.PI * 0.52, Math.PI * 0.42), terracotta);
    apron.scale.copy(body.scale);
    apron.position.copy(body.position);
    this.bodyGroup.add(apron);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(R * 0.55, 0.018, 8, 40, Math.PI), terracotta);
    strap.rotation.x = Math.PI / 2;
    strap.rotation.z = Math.PI;
    strap.position.set(0, body.position.y + R * 0.45, 0);
    this.bodyGroup.add(strap);

    // chef hat with a little antenna
    const hat = new THREE.Group();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.58, R * 0.6, 0.12, 32), white);
    band.position.y = 0;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(R * 0.7, 32, 20), white);
    puff.scale.set(1, 0.75, 1);
    puff.position.y = 0.16;
    const puff2 = new THREE.Mesh(new THREE.SphereGeometry(R * 0.36, 24, 16), white);
    puff2.position.set(R * 0.42, 0.2, 0);
    const puff3 = new THREE.Mesh(new THREE.SphereGeometry(R * 0.36, 24, 16), white);
    puff3.position.set(-R * 0.4, 0.22, R * 0.1);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), dark);
    stem.position.y = 0.42;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), terracotta);
    bulb.position.y = 0.55;
    this.bulb = bulb;
    hat.add(band, puff, puff2, puff3, stem, bulb);
    hat.children.forEach((m) => (m.castShadow = true));
    hat.position.y = body.position.y + R * 0.78;
    hat.rotation.z = -0.12;
    this.bodyGroup.add(hat);
    this.hat = hat;

    // arms & feet
    this.arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.28, 6, 12), cream);
      seg.position.y = -0.16;
      seg.castShadow = true;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), terracotta);
      hand.position.y = -0.34;
      arm.add(seg, hand);
      arm.position.set(side * R * 0.98, body.position.y + R * 0.15, 0);
      arm.rotation.z = side * 0.45;
      this.bodyGroup.add(arm);
      this.arms.push(arm);
    }
    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10), dark);
      foot.scale.set(1.1, 0.55, 1.4);
      foot.position.set(side * 0.2, 0.07, 0.1);
      foot.castShadow = true;
      this.add(foot);
    }

    this.face = new Face({ radius: R * 0.96, mouths, palette, cheek: 0.8, eyeScale: 1.15, blink: [2, 5] });
    this.face.position.copy(body.position);
    this.face.scale.copy(body.scale);
    this.bodyGroup.add(this.face);

    this.time = Math.random() * 10;
    this.squash = 0;
    this.squashVel = 0;
    this.hopY = 0;
    this.hop = null;
    this.targetYaw = 0;
    this.excited = 0;
    this.excitedTarget = 0;
  }

  setMood(name) {
    this.face.setMood(name);
  }

  react(name, hold = 1.6) {
    this.face.setExpression(name, hold);
  }

  doHop(strength = 1) {
    if (this.hop) return;
    this.hop = { t: 0, s: strength };
    this.squashVel -= 2.4 * strength;
  }

  celebrate() {
    this.excitedTarget = 1;
    this.face.setMood('bliss');
    let n = 0;
    const tick = () => {
      if (n++ > 5) return;
      this.doHop(0.9);
      setTimeout(tick, 420);
    };
    tick();
  }

  calmDown() {
    this.excitedTarget = 0;
    this.face.setMood('happy');
  }

  /** Face the camera (yaw only). */
  faceToward(worldPos) {
    this.targetYaw = Math.atan2(worldPos.x - this.position.x, worldPos.z - this.position.z);
  }

  update(dt) {
    this.time += dt;
    this.face.update(dt);
    this.excited += (this.excitedTarget - this.excited) * Math.min(1, dt * 3);
    // squash spring
    this.squashVel += (-this.squash * 130 - this.squashVel * 13) * dt;
    this.squash += this.squashVel * dt;
    if (this.hop) {
      const h = this.hop;
      h.t += dt;
      if (h.t < 0.11) {
        /* anticipation */
      } else {
        const p = Math.min(1, (h.t - 0.11) / 0.38);
        this.hopY = Math.sin(p * Math.PI) * 0.12 * h.s;
        if (h.t === 0.11 + dt) this.squashVel += 3 * h.s;
        if (p >= 1) {
          this.hopY = 0;
          this.squashVel -= 3 * h.s;
          this.hop = null;
        }
      }
    }
    const breath = 0.015 * Math.sin(this.time * 2.2);
    const sq = this.squash + breath;
    this.bodyGroup.scale.set(1 - 0.5 * sq, 1 + sq, 1 - 0.5 * sq);
    this.bodyGroup.position.y = this.hopY;
    // yaw toward the camera, arms wave when excited
    const dy = Math.atan2(Math.sin(this.targetYaw - this.rotation.y), Math.cos(this.targetYaw - this.rotation.y));
    this.rotation.y += dy * Math.min(1, dt * 4);
    const wave = this.excited * Math.sin(this.time * 9) * 0.9;
    this.arms[0].rotation.z = -0.45 - wave * 0.6 - this.excited * 1.6;
    this.arms[1].rotation.z = 0.45 + wave * 0.6 + this.excited * 1.6;
    this.hat.rotation.z = -0.12 + Math.sin(this.time * 1.7) * 0.03;
    this.bulb.material.emissive = this.bulb.material.emissive || new THREE.Color();
  }
}
