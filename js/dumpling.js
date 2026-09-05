import * as THREE from 'three';
import { PALETTE } from './config.js';
import { damp, rand, clamp } from './tween.js';

const DEG = Math.PI / 180;

/** Named expressions: mouth sprite + eye openness/width + cheek strength. */
export const EXPRESSIONS = {
  happy: { mouth: 'smile', eyeH: 1.0, eyeW: 1.0 },
  joy: { mouth: 'grin', eyeH: 0.12, eyeW: 1.15, cheeks: 1.2 },
  bliss: { mouth: 'grin', eyeH: 0.1, eyeW: 1.25, cheeks: 1.4 },
  sleepy: { mouth: 'sleepy', eyeH: 0.42, eyeW: 1.0, cheeks: 0.8 },
  smug: { mouth: 'w', eyeH: 0.72, eyeW: 1.0, wink: true },
  worried: { mouth: 'wobble', eyeH: 1.12, eyeW: 0.95 },
  nervous: { mouth: 'flat', eyeH: 1.0, eyeW: 0.9 },
  proud: { mouth: 'tiny', eyeH: 0.68, eyeW: 1.0, cheeks: 1.1 },
  yum: { mouth: 'tongue', eyeH: 0.85, eyeW: 1.0 },
  curious: { mouth: 'o', eyeH: 1.18, eyeW: 1.1 },
  surprised: { mouth: 'o', eyeH: 1.35, eyeW: 1.2 },
  shocked: { mouth: 'o', eyeH: 1.5, eyeW: 1.3, cheeks: 0.4 },
  giggle: { mouth: 'w', eyeH: 0.15, eyeW: 1.2, cheeks: 1.2 },
};

/** Physically based dough material with per-instance dip, bite and filling uniforms. */
export function createDoughMaterial({ vertexColors = true } = {}) {
  const uniforms = {
    uDip: { value: 0 },
    uDipColor: { value: new THREE.Color('#3a1a0a') },
    uBite: { value: new THREE.Vector4(0, 0, 0, 0) },
    uFilling: { value: new THREE.Color(PALETTE.filling) },
  };
  const mat = new THREE.MeshPhysicalMaterial({
    color: vertexColors ? '#ffffff' : PALETTE.dough,
    vertexColors,
    roughness: 0.72,
    metalness: 0,
    sheen: 0.45,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#ffc9a0'),
    side: THREE.DoubleSide,
    envMapIntensity: 0.6,
  });
  mat.userData.uniforms = uniforms;
  mat.customProgramCacheKey = () => 'dumpling-dough-v1';
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocalPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vLocalPos;
        uniform float uDip;
        uniform vec3 uDipColor;
        uniform vec4 uBite;
        uniform vec3 uFilling;`
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        if (uBite.w > 0.0 && distance(vLocalPos, uBite.xyz) < uBite.w) discard;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float dipEdge = uDip + 0.025 * sin(atan(vLocalPos.x, vLocalPos.z) * 9.0 + vLocalPos.y * 4.0);
        float dipMask = (1.0 - smoothstep(dipEdge - 0.05, dipEdge + 0.05, vLocalPos.y)) * step(0.001, uDip);
        float dipRim = smoothstep(dipEdge - 0.16, dipEdge - 0.02, vLocalPos.y) * dipMask;
        diffuseColor.rgb = mix(diffuseColor.rgb, uDipColor, dipMask * 0.9);
        diffuseColor.rgb = mix(diffuseColor.rgb, uDipColor * 1.9, dipRim * 0.35);
        if (!gl_FrontFacing) {
          float inner = smoothstep(0.0, 1.4, vLocalPos.y);
          diffuseColor.rgb = uFilling * (0.62 + 0.38 * inner);
        }`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.1, dipMask);
        if (!gl_FrontFacing) roughnessFactor = 0.62;`
      );
  };
  return mat;
}

export class Dumpling extends THREE.Group {
  /**
   * @param {object} o
   * @param {THREE.BufferGeometry} o.geometry   unit dumpling (bottom at y=0, radius ~1)
   * @param {object} o.personality
   * @param {Record<string, THREE.Texture>} o.mouths
   * @param {boolean} o.reducedMotion
   */
  constructor(o) {
    super();
    this.personality = o.personality;
    this.mouths = o.mouths;
    this.reducedMotion = !!o.reducedMotion;
    this.name = `dumpling-${o.personality.name}`;
    this.geometryHeight = o.height ?? 1.7;

    const hasColors = !!o.geometry.getAttribute('color');
    this.material = createDoughMaterial({ vertexColors: hasColors });
    this.uniforms = this.material.userData.uniforms;
    this.body = new THREE.Mesh(o.geometry, this.material);
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.body.name = 'body';
    this.add(this.body);

    this.face = new THREE.Group();
    this.face.name = 'face';
    this.add(this.face);
    this.faceCenterY = this.geometryHeight * 0.46;
    this._buildFace();

    // animation state
    this.baseScale = 1;
    this.baseY = 0;
    this.baseYaw = 0;
    this.alive = true;
    this.held = false;
    this.hovered = false;
    this.phase = rand(0, Math.PI * 2);
    this.squash = 0;
    this.squashVel = 0;
    this.pinch = 0;
    this.pinchTarget = 0;
    this.hop = null;
    this.hopY = 0;
    this.nextHop = rand(...o.personality.hop) * (this.reducedMotion ? 4 : 1);
    this.blinkT = -1;
    this.nextBlink = rand(...o.personality.blink);
    this.look = new THREE.Vector2();
    this.lookTarget = null;
    this.lookPointer = new THREE.Vector2();
    this.eyeH = 1;
    this.eyeW = 1;
    this.cheekK = 1;
    this.yawOffset = 0;
    this.mood = o.personality.mood;
    this.expression = this.mood;
    this.expressionTimer = 0;
    this.onHop = null;
    this.setExpression(this.mood, 0);
    this.dipLevel = 0;
  }

  // ---- face -------------------------------------------------------------

  _surfacePoint(yawDeg, pitchDeg) {
    this.body.updateMatrixWorld(true);
    const center = new THREE.Vector3(0, this.faceCenterY, 0);
    const dir = new THREE.Vector3(
      Math.sin(yawDeg * DEG) * Math.cos(pitchDeg * DEG),
      Math.sin(pitchDeg * DEG),
      Math.cos(yawDeg * DEG) * Math.cos(pitchDeg * DEG)
    );
    const origin = center.clone().addScaledVector(dir, 4);
    const ray = new THREE.Raycaster(origin, dir.clone().negate());
    const hit = ray.intersectObject(this.body, false)[0];
    if (!hit) return { point: center.clone().addScaledVector(dir, 1), normal: dir };
    const normal = hit.face ? hit.face.normal.clone() : dir.clone();
    return { point: hit.point.clone(), normal };
  }

  _buildFace() {
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: PALETTE.eye, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 });
    const glintMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const cheekMat = new THREE.MeshStandardMaterial({ color: PALETTE.cheek, roughness: 0.9, transparent: true, opacity: 0.5, depthWrite: false });
    this.cheekMat = cheekMat;
    this.eyes = [];
    for (const side of [-1, 1]) {
      const { point, normal } = this._surfacePoint(side * 23, 7);
      const eye = new THREE.Group();
      eye.position.copy(point).addScaledVector(normal, 0.004);
      eye.lookAt(point.clone().add(normal));
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.088, 22, 14), eyeMat);
      ball.scale.set(1, 1.05, 0.5);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), glintMat);
      glint.position.set(-0.03, 0.032, 0.05);
      const glint2 = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), glintMat);
      glint2.position.set(0.03, -0.024, 0.05);
      const inner = new THREE.Group();
      inner.add(ball, glint, glint2);
      eye.add(inner);
      eye.userData.inner = inner;
      eye.userData.side = side;
      this.face.add(eye);
      this.eyes.push(eye);
    }
    this.cheeks = [];
    for (const side of [-1, 1]) {
      const { point, normal } = this._surfacePoint(side * 47, -9);
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 12), cheekMat);
      cheek.position.copy(point).addScaledVector(normal, -0.02);
      cheek.lookAt(point.clone().add(normal));
      cheek.scale.set(1.15, 0.8, 0.4);
      this.face.add(cheek);
      this.cheeks.push(cheek);
    }
    {
      const { point, normal } = this._surfacePoint(0, -15);
      this.mouthMat = new THREE.MeshBasicMaterial({ map: this.mouths.smile, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      this.mouthMat.toneMapped = false;
      const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), this.mouthMat);
      mouth.position.copy(point).addScaledVector(normal, 0.012);
      mouth.lookAt(point.clone().add(normal));
      mouth.renderOrder = 2;
      this.face.add(mouth);
      this.mouth = mouth;
    }
  }

  // ---- expressions ------------------------------------------------------

  /** Show an expression; `hold` seconds later revert to the base mood (0 = permanent). */
  setExpression(name, hold = 0) {
    const e = EXPRESSIONS[name] || EXPRESSIONS.happy;
    this.expression = name;
    this.expressionData = e;
    this.mouthMat.map = this.mouths[e.mouth] || this.mouths.smile;
    this.expressionTimer = hold;
  }

  setMood(name) {
    this.mood = name;
    this.setExpression(name, 0);
  }

  /** Look at a world position (or null to relax). */
  lookAtPoint(worldPos) {
    this.lookTarget = worldPos ? worldPos.clone() : null;
  }

  /** Trigger a tiny hop. */
  doHop(strength = 1) {
    if (this.hop || !this.alive || this.held) return;
    this.hop = { t: 0, strength, phase: 'anticipate' };
    this.squashVel -= 2.2 * strength;
  }

  /** Bite a chunk out (local unit coordinates). */
  setBite(center, radius) {
    this.uniforms.uBite.value.set(center.x, center.y, center.z, radius);
    // hide face parts that fall inside the bite
    for (const part of [...this.eyes, ...this.cheeks, this.mouth]) {
      part.visible = radius <= 0 || part.position.distanceTo(center) > radius + 0.03;
    }
  }

  /** Mark the dough as dipped up to `localY` (unit space). Never recedes until reset. */
  setDip(localY) {
    this.dipLevel = Math.max(this.dipLevel, clamp(localY, 0, this.geometryHeight));
    this.uniforms.uDip.value = this.dipLevel;
  }

  resetState() {
    this.dipLevel = 0;
    this.uniforms.uDip.value = 0;
    this.setBite(new THREE.Vector3(), 0);
    this.alive = true;
    this.held = false;
    this.visible = true;
    this.pinchTarget = 0;
    this.pinch = 0;
    this.hop = null;
    this.hopY = 0;
    this.squash = 0;
    this.squashVel = 0;
    this.rotation.set(0, this.baseYaw, 0);
    this.scale.setScalar(this.baseScale);
    this.lookTarget = null;
    this.setExpression(this.mood, 0);
  }

  /** World position of the top of the dumpling (steam emitter). */
  topWorld(target = new THREE.Vector3()) {
    return this.localToWorld(target.set(0, this.geometryHeight * 0.92, 0));
  }

  centerWorld(target = new THREE.Vector3()) {
    return this.localToWorld(target.set(0, this.geometryHeight * 0.5, 0));
  }

  // ---- per-frame --------------------------------------------------------

  update(dt, time, pointerWorld) {
    if (!this.alive) return;
    const rm = this.reducedMotion;

    // expression timeout
    if (this.expressionTimer > 0) {
      this.expressionTimer -= dt;
      if (this.expressionTimer <= 0) this.setExpression(this.mood, 0);
    }
    const e = this.expressionData;
    this.eyeH = damp(this.eyeH, e.eyeH, 12, dt);
    this.eyeW = damp(this.eyeW, e.eyeW, 12, dt);
    this.cheekK = damp(this.cheekK, e.cheeks ?? 1, 6, dt);

    // blinking
    this.nextBlink -= dt;
    if (this.nextBlink <= 0 && this.blinkT < 0) {
      this.blinkT = 0;
      this.nextBlink = rand(...this.personality.blink) + (Math.random() < 0.18 ? -0.6 : 0);
      if (this.nextBlink < 0.25) this.nextBlink = 0.25;
    }
    let blink = 0;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const d = 0.16;
      blink = this.blinkT < d ? Math.sin((this.blinkT / d) * Math.PI) : 0;
      if (this.blinkT >= d) this.blinkT = -1;
    }

    // looking
    let lookX = 0;
    let lookY = 0;
    let yawToward = 0;
    const target = this.lookTarget || (this.hovered || !this.held ? pointerWorld : null);
    if (target && !this.held) {
      const wp = this.getWorldPosition(new THREE.Vector3());
      const dx = target.x - wp.x;
      const dz = target.z - wp.z;
      const dy = target.y - (wp.y + this.faceCenterY * this.baseScale);
      const horiz = Math.hypot(dx, dz);
      const desired = Math.atan2(dx, dz);
      let delta = desired - this.baseYaw;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      const bodyTurn = clamp(delta, -0.5, 0.5) * (this.lookTarget ? 0.6 : 0.35);
      yawToward = bodyTurn;
      const remaining = delta - bodyTurn;
      lookX = clamp(remaining / 0.9, -1, 1);
      lookY = clamp(Math.atan2(dy, horiz) / 0.9, -1, 1);
    }
    this.look.x = damp(this.look.x, lookX, 6, dt);
    this.look.y = damp(this.look.y, lookY, 6, dt);
    if (!this.held) this.yawOffset = damp(this.yawOffset, yawToward, 4, dt);

    for (const eye of this.eyes) {
      const wink = e.wink && eye.userData.side === 1 ? 0.12 : 1;
      const open = Math.max(0.06, this.eyeH * wink * (1 - blink * 0.94));
      eye.scale.set(this.eyeW, open, 1);
      eye.userData.inner.position.set(this.look.x * 0.035, this.look.y * 0.025, 0);
    }
    this.cheekMat.opacity = 0.5 * this.personality.cheek * this.cheekK;

    // squash & stretch spring
    const k = 130;
    const c = 13;
    this.squashVel += (-this.squash * k - this.squashVel * c) * dt;
    this.squash += this.squashVel * dt;
    this.pinch = damp(this.pinch, this.pinchTarget, 14, dt);

    // idle hops
    if (!this.held) {
      if (this.hop) {
        const h = this.hop;
        h.t += dt;
        if (h.phase === 'anticipate' && h.t > 0.11) {
          h.phase = 'air';
          h.t = 0;
          this.squashVel += 3.4 * h.strength;
          this.onHop?.(this);
        } else if (h.phase === 'air') {
          const dur = 0.36;
          const p = Math.min(1, h.t / dur);
          this.hopY = Math.sin(p * Math.PI) * 0.035 * h.strength * this.baseScale * 2.2;
          if (p >= 1) {
            this.hopY = 0;
            this.squashVel -= 3.2 * h.strength;
            this.hop = null;
          }
        }
      } else if (!rm) {
        this.nextHop -= dt;
        if (this.nextHop <= 0) {
          this.nextHop = rand(...this.personality.hop);
          this.doHop(rand(0.6, 1));
        }
      }
    }

    const breath = (rm ? 0.004 : 0.012) * Math.sin(time * 2.1 + this.phase);
    const hoverSquash = this.hovered ? 0.03 : 0;
    const s = this.baseScale;
    const sq = this.squash + breath + hoverSquash;
    this.scale.set(
      s * (1 - 0.55 * sq - 0.16 * this.pinch),
      s * (1 + sq + 0.08 * this.pinch),
      s * (1 - 0.55 * sq)
    );
    if (!this.held) {
      this.position.y = this.baseY + this.hopY;
      const wiggle = this.hovered && !rm ? Math.sin(time * 16) * 0.05 : 0;
      this.rotation.set(0, this.baseYaw + this.yawOffset, wiggle);
    }
  }
}
