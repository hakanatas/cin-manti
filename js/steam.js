import * as THREE from 'three';

const MAX_EMITTERS = 16;

const vertexShader = /* glsl */ `
  attribute vec4 aSeed; // seed, phase, emitter index, size factor
  uniform float uTime;
  uniform float uSpeed;
  uniform float uPixelScale;
  uniform float uIntensity;
  uniform vec3 uEmitters[${MAX_EMITTERS}];
  uniform float uEmitterOn[${MAX_EMITTERS}];
  uniform float uEmitterScale[${MAX_EMITTERS}];
  varying float vAlpha;
  void main() {
    int idx = int(aSeed.z + 0.5);
    vec3 e = uEmitters[idx];
    float on = uEmitterOn[idx];
    float es = uEmitterScale[idx];
    float life = 2.4 + aSeed.x * 1.6;
    float t = fract(uTime * uSpeed / life + aSeed.y);
    float ang = aSeed.x * 6.2831 + t * 2.4 + uTime * 0.35;
    float wob = (0.03 + t * 0.14) * es;
    vec3 p = e + vec3(
      cos(ang) * wob + sin(uTime * 0.9 + aSeed.x * 12.0) * 0.025 * es,
      t * (0.42 + aSeed.w * 0.3) * es + 0.02,
      sin(ang * 1.37 + aSeed.y * 3.0) * wob
    );
    vec4 mv = viewMatrix * vec4(p, 1.0);
    float size = (0.06 + t * 0.26) * (0.6 + aSeed.w * 0.7) * es;
    gl_PointSize = size * uPixelScale / max(0.2, -mv.z);
    gl_Position = projectionMatrix * mv;
    float fade = sin(t * 3.14159);
    vAlpha = fade * fade * (1.0 - t * 0.45) * on * uIntensity * (0.3 + 0.7 * aSeed.w);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  varying float vAlpha;
  void main() {
    vec4 c = texture2D(uMap, gl_PointCoord);
    gl_FragColor = vec4(1.0, 0.985, 0.96, c.a * vAlpha * 0.5);
  }
`;

/** Delicate rising steam driven entirely on the GPU. */
export class Steam extends THREE.Points {
  constructor(map, count = 420) {
    const geometry = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seed[i * 4] = Math.random();
      seed[i * 4 + 1] = Math.random();
      seed[i * 4 + 2] = i % MAX_EMITTERS;
      seed[i * 4 + 3] = Math.random();
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 30);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 1 },
        uPixelScale: { value: 500 },
        uIntensity: { value: 1 },
        uMap: { value: map },
        uEmitters: { value: Array.from({ length: MAX_EMITTERS }, () => new THREE.Vector3(0, -10, 0)) },
        uEmitterOn: { value: new Float32Array(MAX_EMITTERS) },
        uEmitterScale: { value: new Float32Array(MAX_EMITTERS).fill(1) },
      },
    });
    super(geometry, material);
    this.frustumCulled = false;
    this.renderOrder = 10;
    this.name = 'steam';
    this.targetIntensity = 1;
    this.time = 0;
    this.targetOn = new Float32Array(MAX_EMITTERS);
  }

  /** Set emitter i to a world position; `on` fades in/out smoothly. */
  setEmitter(i, position, on = 1, scale = 1) {
    if (i >= MAX_EMITTERS) return;
    this.material.uniforms.uEmitters.value[i].copy(position);
    this.targetOn[i] = on;
    this.material.uniforms.uEmitterScale.value[i] = scale;
  }

  clearFrom(i) {
    for (let k = i; k < MAX_EMITTERS; k++) this.targetOn[k] = 0;
  }

  update(dt, camera, renderer) {
    this.time += dt;
    const u = this.material.uniforms;
    u.uTime.value = this.time;
    u.uIntensity.value += (this.targetIntensity - u.uIntensity.value) * Math.min(1, dt * 3);
    const on = u.uEmitterOn.value;
    for (let i = 0; i < MAX_EMITTERS; i++) on[i] += (this.targetOn[i] - on[i]) * Math.min(1, dt * 4);
    const h = renderer.domElement.height;
    u.uPixelScale.value = camera.projectionMatrix.elements[5] * h * 0.5;
    this.visible = u.uIntensity.value > 0.01;
  }
}
