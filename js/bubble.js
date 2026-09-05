import * as THREE from 'three';
import { makeBubbleTexture } from './textures.js';

/** In-scene speech bubble sprite (so it shows up in recordings, too). */
export class Bubble extends THREE.Sprite {
  constructor() {
    super(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, opacity: 0 }));
    this.material.toneMapped = false;
    this.renderOrder = 20;
    this.visible = false;
    this.width = 2.0;
    this.progress = 0;
    this.phase = 'hidden';
    this.timer = 0;
    this.center.set(0.5, 0.0);
  }

  show(text, sub = '', hold = 2.4) {
    if (this.material.map) this.material.map.dispose();
    const map = makeBubbleTexture(text, sub);
    this.material.map = map;
    this.material.needsUpdate = true;
    this.aspect = map.userData.aspect;
    this.phase = 'in';
    this.progress = 0;
    this.timer = hold;
    this.visible = true;
  }

  hide() {
    if (this.phase !== 'hidden') this.phase = 'out';
  }

  update(dt) {
    if (this.phase === 'hidden') return;
    if (this.phase === 'in') {
      this.progress = Math.min(1, this.progress + dt / 0.32);
      if (this.progress >= 1) this.phase = 'hold';
    } else if (this.phase === 'hold') {
      this.timer -= dt;
      if (this.timer <= 0) this.phase = 'out';
    } else if (this.phase === 'out') {
      this.progress = Math.max(0, this.progress - dt / 0.25);
      if (this.progress <= 0) {
        this.phase = 'hidden';
        this.visible = false;
      }
    }
    const t = this.progress;
    const back = 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2); // ease-out-back
    const s = this.phase === 'out' ? t : back;
    this.scale.set(this.width * s, (this.width / this.aspect) * s, 1);
    this.material.opacity = Math.min(1, t * 1.4);
  }
}
