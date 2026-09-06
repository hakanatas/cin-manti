import * as THREE from 'three';

/** Expression presets shared by every face in the lesson. */
export const EXPRESSIONS = {
  happy: { mouth: 'smile', eyeH: 1, eyeW: 1 },
  joy: { mouth: 'grin', eyeH: 0.12, eyeW: 1.15, cheeks: 1.3 },
  bliss: { mouth: 'grin', eyeH: 0.1, eyeW: 1.25, cheeks: 1.4 },
  sleepy: { mouth: 'sleepy', eyeH: 0.38, eyeW: 1, cheeks: 0.7 },
  worried: { mouth: 'wobble', eyeH: 1.1, eyeW: 0.95, cheeks: 1.3 },
  nervous: { mouth: 'flat', eyeH: 1, eyeW: 0.9 },
  curious: { mouth: 'o', eyeH: 1.2, eyeW: 1.1 },
  surprised: { mouth: 'o', eyeH: 1.4, eyeW: 1.2 },
  thinking: { mouth: 'tiny', eyeH: 0.85, eyeW: 1, look: [0.6, 0.8] },
  proud: { mouth: 'tiny', eyeH: 0.7, eyeW: 1, cheeks: 1.1 },
  giggle: { mouth: 'w', eyeH: 0.15, eyeW: 1.2, cheeks: 1.2 },
  yum: { mouth: 'tongue', eyeH: 0.85, eyeW: 1 },
  calm: { mouth: 'tiny', eyeH: 0.9, eyeW: 1 },
};

const DEG = Math.PI / 180;

/**
 * A small expressive face pinned to a sphere of radius `radius`.
 * Blinks on its own; call update(dt) each frame.
 */
export class Face extends THREE.Group {
  constructor({ radius, mouths, palette, cheek = 0.7, eyeScale = 1, blink = [2.5, 6] }) {
    super();
    this.mouths = mouths;
    this.cheekStrength = cheek;
    this.blinkRange = blink;
    const R = radius;
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: palette.ink, roughness: 0.2, clearcoat: 1 });
    const glintMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.cheekMat = new THREE.MeshStandardMaterial({ color: palette.cheek, roughness: 0.9, transparent: true, opacity: 0.5, depthWrite: false });
    const place = (yawDeg, pitchDeg, out = 0) => {
      const dir = new THREE.Vector3(Math.sin(yawDeg * DEG) * Math.cos(pitchDeg * DEG), Math.sin(pitchDeg * DEG), Math.cos(yawDeg * DEG) * Math.cos(pitchDeg * DEG));
      const p = dir.clone().multiplyScalar(R + out);
      return { p, dir };
    };
    this.eyes = [];
    for (const side of [-1, 1]) {
      const { p, dir } = place(side * 26, 9, 0.002);
      const eye = new THREE.Group();
      eye.position.copy(p);
      eye.lookAt(p.clone().add(dir));
      const ball = new THREE.Mesh(new THREE.SphereGeometry(R * 0.17 * eyeScale, 18, 12), eyeMat);
      ball.scale.set(1, 1.05, 0.5);
      const g1 = new THREE.Mesh(new THREE.SphereGeometry(R * 0.06 * eyeScale, 8, 6), glintMat);
      g1.position.set(-R * 0.06, R * 0.06, R * 0.09);
      const g2 = new THREE.Mesh(new THREE.SphereGeometry(R * 0.028 * eyeScale, 6, 5), glintMat);
      g2.position.set(R * 0.06, -R * 0.045, R * 0.09);
      const inner = new THREE.Group();
      inner.add(ball, g1, g2);
      eye.add(inner);
      eye.userData.inner = inner;
      this.add(eye);
      this.eyes.push(eye);
    }
    this.cheeks = [];
    for (const side of [-1, 1]) {
      const { p, dir } = place(side * 50, -10, -0.01);
      const c = new THREE.Mesh(new THREE.SphereGeometry(R * 0.22, 14, 10), this.cheekMat);
      c.position.copy(p);
      c.lookAt(p.clone().add(dir));
      c.scale.set(1.15, 0.8, 0.35);
      this.add(c);
      this.cheeks.push(c);
    }
    {
      const { p, dir } = place(0, -17, 0.006);
      this.mouthMat = new THREE.MeshBasicMaterial({ map: mouths.smile, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      this.mouthMat.toneMapped = false;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.8, R * 0.8), this.mouthMat);
      m.position.copy(p);
      m.lookAt(p.clone().add(dir));
      m.renderOrder = 2;
      this.add(m);
      this.mouth = m;
    }
    this.eyeH = 1;
    this.eyeW = 1;
    this.cheekK = 1;
    this.look = new THREE.Vector2();
    this.lookTarget = new THREE.Vector2();
    this.blinkT = -1;
    this.nextBlink = 1 + Math.random() * 3;
    this.mood = 'happy';
    this.timer = 0;
    this.setExpression('happy');
  }

  setExpression(name, hold = 0) {
    const e = EXPRESSIONS[name] || EXPRESSIONS.happy;
    this.current = e;
    this.expression = name;
    this.mouthMat.map = this.mouths[e.mouth] || this.mouths.smile;
    this.timer = hold;
    if (e.look) this.lookTarget.set(e.look[0], e.look[1]);
    else this.lookTarget.set(0, 0);
  }

  setMood(name) {
    this.mood = name;
    this.setExpression(name);
  }

  lookAt2D(x, y) {
    this.lookTarget.set(x, y);
  }

  update(dt) {
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) this.setExpression(this.mood);
    }
    const e = this.current;
    const k = Math.min(1, dt * 12);
    this.eyeH += (e.eyeH - this.eyeH) * k;
    this.eyeW += (e.eyeW - this.eyeW) * k;
    this.cheekK += ((e.cheeks ?? 1) - this.cheekK) * Math.min(1, dt * 6);
    this.look.lerp(this.lookTarget, Math.min(1, dt * 6));
    this.nextBlink -= dt;
    if (this.nextBlink <= 0 && this.blinkT < 0) {
      this.blinkT = 0;
      this.nextBlink = this.blinkRange[0] + Math.random() * (this.blinkRange[1] - this.blinkRange[0]);
    }
    let blink = 0;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      blink = this.blinkT < 0.16 ? Math.sin((this.blinkT / 0.16) * Math.PI) : 0;
      if (this.blinkT >= 0.16) this.blinkT = -1;
    }
    for (const eye of this.eyes) {
      eye.scale.set(this.eyeW, Math.max(0.06, this.eyeH * (1 - blink * 0.94)), 1);
      eye.userData.inner.position.set(this.look.x * 0.03, this.look.y * 0.02, 0);
    }
    this.cheekMat.opacity = 0.5 * this.cheekStrength * this.cheekK;
  }
}
