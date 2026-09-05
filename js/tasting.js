import * as THREE from 'three';
import { Context, CancelledError, Ease, rand, pick } from './tween.js';
import { chopstickQuaternion } from './props.js';
import { REACTIONS, LAYOUT } from './config.js';

const BITE_CENTER = new THREE.Vector3(0.52, 1.36, 0.58);
const BITE_RADIUS = 0.52;
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Orchestrates one tasting: chopsticks pick a dumpling, dip it, bring it to
 * the camera, take a bite, and return. Fully cancellable.
 */
export class Tasting {
  constructor(o) {
    this.camera = o.camera;
    this.tweens = o.tweens;
    this.sound = o.sound;
    this.particles = o.particles;
    this.chopsticks = o.chopsticks;
    this.bowl = o.bowl;
    this.bubble = o.bubble;
    this.getOptions = o.getOptions; // () => ({ sauce, reducedMotion })
    this.floorAt = o.floorAt; // (x, z) => y
    this.restPose = o.restPose;
    this.onBite = o.onBite || null;
    this.ctx = null;
    this.held = null;
    this.busy = false;
    this.applyPose(this.restPose);
  }

  applyPose(p) {
    this.chopsticks.position.copy(p.position);
    this.chopsticks.quaternion.copy(p.quaternion);
    this.chopsticks.userData.setGap(p.gap);
    this.gap = p.gap;
  }

  /** Tween the chopsticks toward a (possibly moving) pose. */
  moveTo(getPose, duration, ease = Ease.inOutCubic, onFrame = null) {
    const startPos = this.chopsticks.position.clone();
    const startQ = this.chopsticks.quaternion.clone();
    const startGap = this.gap;
    const pos = new THREE.Vector3();
    const q = new THREE.Quaternion();
    return this.tweens.run(
      this.ctx,
      duration,
      (t, raw) => {
        const target = getPose();
        pos.lerpVectors(startPos, target.position, t);
        q.slerpQuaternions(startQ, target.quaternion, t);
        this.chopsticks.position.copy(pos);
        this.chopsticks.quaternion.copy(q);
        this.gap = startGap + (target.gap - startGap) * t;
        this.chopsticks.userData.setGap(this.gap);
        this.syncHeld();
        onFrame?.(t, raw);
      },
      ease
    );
  }

  syncHeld() {
    const d = this.held;
    if (!d) return;
    const tips = this.chopsticks.position;
    d.position.set(tips.x, tips.y - d.geometryHeight * 0.58 * d.baseScale, tips.z);
  }

  pickQuaternion() {
    return chopstickQuaternion(new THREE.Vector3(0.42, 0.86, 0.3));
  }

  presentPose(gap) {
    const cam = this.camera;
    const position = new THREE.Vector3(0.42, -0.08, -4.3).applyMatrix4(cam.matrixWorld);
    const handDir = new THREE.Vector3(0.9, -0.42, 0.42).applyQuaternion(cam.quaternion).normalize();
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    return { position, quaternion: chopstickQuaternion(handDir, camUp), gap };
  }

  cancel() {
    this.ctx?.cancel();
  }

  update() {
    this.syncHeld();
  }

  /**
   * @param {import('./dumpling.js').Dumpling} d
   * @param {import('./dumpling.js').Dumpling[]} others  the remaining live dumplings
   */
  async run(d, others) {
    if (this.busy || !d.alive) return false;
    this.busy = true;
    this.ctx = new Context();
    const ctx = this.ctx;
    const T = this.tweens;
    const opts = this.getOptions();
    const s = d.baseScale;
    const H = d.geometryHeight;
    const gripGap = 2 * 0.95 * s;
    const centerOf = () => d.localToWorld(new THREE.Vector3(0, H * 0.58, 0));
    const qPick = this.pickQuaternion();
    const sauce = this.bowl.userData.sauce;
    const sauceWorldY = this.bowl.position.y + sauce.position.y;
    const bowlCenter = new THREE.Vector3(this.bowl.position.x, sauceWorldY, this.bowl.position.z);

    try {
      this.sound.play('pick');
      d.setExpression('surprised', 1.4);
      d.doHop(0.6);
      for (const o of others) {
        o.lookAtPoint(centerOf());
        o.setExpression('curious', 2.6);
      }

      // 1. approach and hover above the chosen dumpling
      await this.moveTo(() => ({ position: centerOf().add(new THREE.Vector3(0, 0.55 + 0.9 * s, 0)), quaternion: qPick, gap: 1.35 }), 0.75, Ease.inOutCubic);
      // 2. descend and grip
      await this.moveTo(() => ({ position: centerOf(), quaternion: qPick, gap: 1.35 }), 0.32, Ease.inOutQuad);
      await this.moveTo(() => ({ position: centerOf(), quaternion: qPick, gap: gripGap }), 0.16, Ease.outCubic);
      d.held = true;
      this.held = d;
      d.pinchTarget = 1;
      d.squashVel -= 1.4;
      d.setExpression('shocked', 0.9);
      this.sound.play('grab');
      await T.wait(ctx, 0.12);

      // 3. lift
      this.sound.play('lift', { volume: 0.7 });
      const liftPos = centerOf().add(new THREE.Vector3(0, 1.05, 0));
      await this.moveTo(() => ({ position: liftPos, quaternion: qPick, gap: gripGap }), 0.55, Ease.inOutCubic);
      others.forEach((o, i) => {
        o.setExpression(i % 2 ? 'worried' : 'nervous', 2.2);
        if (Math.random() < 0.5) o.doHop(0.5);
      });

      if (opts.sauce) {
        // 4. carry to the bowl
        d.setExpression('joy', 3.5);
        const aboveBowl = bowlCenter.clone().add(new THREE.Vector3(0, 0.5 * H * s + 0.62, 0));
        await this.moveTo(() => ({ position: aboveBowl, quaternion: qPick, gap: gripGap }), 0.7, Ease.inOutCubic);
        // 5. dip
        const dipTips = bowlCenter.clone().add(new THREE.Vector3(0, 0.5 * H * s - 0.24 * H * s, 0));
        let splashed = false;
        await this.moveTo(
          () => ({ position: dipTips, quaternion: qPick, gap: gripGap }),
          0.42,
          Ease.inQuad,
          () => {
            const bottomY = d.position.y;
            if (bottomY < sauceWorldY) {
              d.setDip((sauceWorldY - bottomY) / s);
              if (!splashed) {
                splashed = true;
                this.sound.play('dip');
                sauce.ripple(0, 0, 1.4);
                this.particles.emit('droplet', {
                  position: new THREE.Vector3(d.position.x, sauceWorldY + 0.02, d.position.z),
                  count: 7,
                  speed: 1.1,
                  spread: 0.08,
                  size: 0.016,
                  floorAt: (x, z) => this.floorAt(x, z),
                  onLand: (p, it) => this.landDroplet(p, it, sauce, bowlCenter),
                });
              }
            }
          }
        );
        // a tiny swirl while it soaks
        await T.run(
          ctx,
          0.36,
          (t) => {
            const a = t * Math.PI * 2;
            this.chopsticks.position.set(dipTips.x + Math.sin(a) * 0.02, dipTips.y - Math.sin(t * Math.PI) * 0.015, dipTips.z + Math.cos(a) * 0.02);
            this.syncHeld();
            d.setDip((sauceWorldY - d.position.y) / s);
          },
          Ease.inOutSine
        );
        sauce.ripple(0.05, -0.03, 0.6);
        // 6. lift out with drips
        this.sound.play('lift', { volume: 0.5 });
        let dripClock = 0;
        await this.moveTo(
          () => ({ position: aboveBowl, quaternion: qPick, gap: gripGap }),
          0.48,
          Ease.outCubic,
          (t, raw) => {
            dripClock += 1;
            if (raw > 0.2 && raw < 0.85 && dripClock % 3 === 0) {
              this.particles.emit('droplet', {
                position: new THREE.Vector3(d.position.x + rand(-0.25, 0.25) * s, d.position.y + 0.02, d.position.z + rand(-0.25, 0.25) * s),
                count: 1,
                speed: 0.15,
                size: 0.014,
                velocity: new THREE.Vector3(0, -0.2, 0),
                floorAt: (x, z) => this.floorAt(x, z),
                onLand: (p, it) => this.landDroplet(p, it, sauce, bowlCenter),
              });
            }
          }
        );
        await T.wait(ctx, 0.22);
      }

      // 7. bring it to the camera
      d.setExpression('happy', 0);
      const startRot = d.rotation.clone();
      const targetRot = new THREE.Euler();
      const presentRotation = () => {
        const camPos = this.camera.position;
        const yaw = Math.atan2(camPos.x - d.position.x, camPos.z - d.position.z);
        targetRot.set(0.16, yaw - 0.22, -0.1);
        return targetRot;
      };
      let startYaw = startRot.y;
      const goalYaw0 = presentRotation().y;
      // choose the shortest rotation direction
      startYaw = goalYaw0 - Math.atan2(Math.sin(goalYaw0 - startYaw), Math.cos(goalYaw0 - startYaw));
      await this.moveTo(
        () => this.presentPose(gripGap),
        0.85,
        Ease.inOutCubic,
        (t) => {
          const tr = presentRotation();
          d.rotation.set(startRot.x + (tr.x - startRot.x) * t, startYaw + (tr.y - startYaw) * t, startRot.z + (tr.z - startRot.z) * t);
        }
      );
      for (const o of others) {
        o.lookAtPoint(this.camera.position.clone().setY(0.6));
        o.setExpression('surprised', 2.4);
      }
      // hold the pose for a beat while the camera can still drift
      await T.run(ctx, 0.32, () => {
        this.applyPose(this.presentPose(gripGap));
        d.rotation.copy(presentRotation());
      });

      // 8. the bite
      d.setBite(BITE_CENTER, BITE_RADIUS);
      d.squashVel -= 2.2;
      d.setExpression('bliss', 0);
      this.sound.play('bite');
      const biteWorld = d.localToWorld(BITE_CENTER.clone());
      const toCam = this.camera.position.clone().sub(biteWorld).normalize();
      this.particles.emit('crumb', {
        position: biteWorld,
        count: 11,
        speed: 0.9,
        spread: 0.05,
        size: 0.022 * s * 2,
        direction: toCam.clone().add(new THREE.Vector3(0, -0.8, 0)).normalize(),
        floorAt: (x, z) => this.floorAt(x, z),
      });
      this.particles.puff(biteWorld, 5, 0.22, '#fff6ec');
      this.onBite?.(d);
      const line = pick(REACTIONS);
      this.bubble.show(line, `${d.personality.name} · ${d.personality.trait}`, 2.3);
      others.forEach((o, i) => {
        o.setExpression('shocked', 1.6 + i * 0.1);
        setTimeout(() => {
          if (!ctx.cancelled) o.doHop(0.55);
        }, 80 + i * 90);
        this.sound.play('gasp', { delay: 0.1 + i * 0.08, volume: 0.8 });
      });
      if (!opts.reducedMotion) {
        const fov0 = this.camera.fov;
        T.run(null, 0.34, (t) => {
          this.camera.fov = fov0 - Math.sin(t * Math.PI) * 1.1;
          this.camera.updateProjectionMatrix();
        }, Ease.linear);
      }
      await T.run(ctx, 1.05, () => {
        this.applyPose(this.presentPose(gripGap));
        d.rotation.copy(presentRotation());
      });
      this.sound.play('yum');
      await T.run(ctx, 0.45, () => {
        this.applyPose(this.presentPose(gripGap));
      });

      // 9. gulp — the rest disappears
      this.sound.play('gulp');
      const s0 = s;
      await T.run(
        ctx,
        0.3,
        (t) => {
          this.applyPose(this.presentPose(gripGap * (1 - t) + 0.02 * t));
          d.baseScale = s0 * (1 - t);
          d.squashVel -= 0.3;
        },
        Ease.inBack
      );
      const gone = d.centerWorld(new THREE.Vector3());
      this.particles.emit('spark', { position: gone, count: 9, speed: 1.6, spread: 0.05, size: 0.02, life: 0.55 });
      this.particles.puff(gone, 4, 0.16, '#ffe9d2');
      d.alive = false;
      d.visible = false;
      d.held = false;
      d.baseScale = s0;
      this.held = null;
      others.forEach((o) => o.setExpression('giggle', 1.4));

      // 10. return to the rest
      await this.moveTo(() => this.restPose, 0.9, Ease.inOutCubic);
      others.forEach((o) => o.lookAtPoint(null));
      return true;
    } catch (err) {
      if (!(err instanceof CancelledError)) console.error(err);
      // snap everything back
      if (this.held) {
        this.held.held = false;
        this.held.pinchTarget = 0;
        this.held = null;
      }
      this.applyPose(this.restPose);
      this.bubble.hide();
      return false;
    } finally {
      d.pinchTarget = 0;
      this.busy = false;
      this.ctx = null;
    }
  }

  landDroplet(p, it, sauce, bowlCenter) {
    const dx = p.x - bowlCenter.x;
    const dz = p.z - bowlCenter.z;
    if (Math.hypot(dx, dz) < LAYOUT.bowl.sauceRadius && Math.abs(p.y - bowlCenter.y) < 0.05) {
      sauce.ripple(dx, dz, 0.45);
      this.sound.play('drip', { volume: 0.7 });
      it.absorb = true;
    }
  }
}
