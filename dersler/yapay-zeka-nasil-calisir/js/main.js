import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Tweens, Ease, rand, pick, clamp } from '../../../js/tween.js';
import { SoundKit } from '../../../js/audio.js';
import { makeSoftDotTexture } from '../../../js/textures.js';
import { TinyNet, makeDataset, trueLabel } from './mlp.js';
import { Board } from './board.js';
import { Network3D } from './network.js';
import { TokenDemo } from './tokens.js';
import { STEPS } from './steps.js';

const PALETTE = {
  cream: '#f5eee3',
  creamDeep: '#efe4d3',
  ink: '#2b211b',
  terracotta: '#c4623d',
  terracottaSoft: '#e9c1ad',
  porcelain: '#fbf8f2',
  bamboo: '#d2a76d',
  bambooDark: '#a37543',
  sweet: '#d9647e',
  salty: '#c4623d',
  slate: '#5b7c99',
};

const $ = (s) => document.querySelector(s);
const canvas = $('#stage');
const dom = {
  loading: $('#loading'),
  loadingBar: $('#loading-bar'),
  loadingText: $('#loading-text'),
  tags: $('#tags'),
  count: $('#lesson-count'),
  title: $('#lesson-title'),
  text: $('#lesson-text'),
  stats: $('#lesson-stats'),
  statSteps: $('#stat-steps'),
  statLoss: $('#stat-loss'),
  statAcc: $('#stat-acc'),
  spark: $('#spark'),
  sliders: $('#lesson-sliders'),
  slSugar: $('#sl-sugar'),
  slSalt: $('#sl-salt'),
  readout: $('#readout'),
  action: $('#btn-action'),
  action2: $('#btn-action2'),
  prev: $('#btn-prev'),
  next: $('#btn-next'),
  dots: $('#dots'),
  hideUi: $('#btn-hide-ui'),
  showUi: $('#btn-show-ui'),
  collapse: $('#btn-collapse'),
  lesson: $('#lesson'),
  toast: $('#toast'),
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
const state = { step: -1, autoplay: false, sound: false, training: false, uiHidden: false, autoTimer: 0 };

let toastTimer = 0;
function toast(msg, ms = 2400) {
  dom.toast.textContent = msg;
  dom.toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('is-on'), ms);
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.6 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.cream);
scene.fog = new THREE.Fog(PALETTE.cream, 18, 36);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;
pmrem.dispose();

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
const controls = new OrbitControls(camera, canvas);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 0.5;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.3;
controls.minDistance = 3;
controls.maxDistance = 16;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };

const key = new THREE.DirectionalLight('#fff0dc', 2.3);
key.position.set(-3.5, 8, 5);
key.castShadow = true;
const sm = isMobile ? 1024 : 2048;
key.shadow.mapSize.set(sm, sm);
Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 24 });
key.shadow.bias = -0.0003;
key.shadow.normalBias = 0.02;
if ('intensity' in key.shadow) key.shadow.intensity = 0.7;
key.target.position.set(1, 0, 0);
scene.add(key, key.target);
scene.add(new THREE.HemisphereLight('#fff9ef', '#e2c4a2', 0.55));
const rim = new THREE.DirectionalLight('#dde7ff', 0.7);
rim.position.set(5, 5, -6);
scene.add(rim);
const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.96 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const tweens = new Tweens();
tweens.timeScale = reducedMotion ? 0.6 : 1;
const sound = new SoundKit();
const softDot = makeSoftDotTexture();

// ---------------------------------------------------------------------------
// Lesson objects
// ---------------------------------------------------------------------------

const net = new TinyNet(6, 3);
const data = makeDataset(64, 11);
const board = new Board({ size: 3.0, tiles: 26, palette: PALETTE });
board.position.set(-0.35, 0, 0.25);
board.setDishes(data);
scene.add(board);
const network = new Network3D({ net, palette: PALETTE, softDot });
scene.add(network);
const tokens = new TokenDemo({ palette: PALETTE });
tokens.position.set(0.9, 0, 0.1);
scene.add(tokens);

// floating labels
function makeTag(text, cls = '') {
  const el = document.createElement('div');
  el.className = `tag ${cls}`;
  el.textContent = text;
  dom.tags.appendChild(el);
  return el;
}
const tags = [
  { el: makeTag('şeker'), get: () => network.pos.input[0].clone().add(new THREE.Vector3(-0.42, 0, 0)), on: () => network.weightsShown > 0.5 && !tokens.visible },
  { el: makeTag('tuz'), get: () => network.pos.input[1].clone().add(new THREE.Vector3(-0.38, 0, 0)), on: () => network.weightsShown > 0.5 && !tokens.visible },
  { el: makeTag('tatlı mı?', 'tag--big'), get: () => network.pos.output.clone().add(new THREE.Vector3(0.05, 0.42, 0)), on: () => network.weightsShown > 0.5 && !tokens.visible },
  { el: makeTag('gizli katman'), get: () => new THREE.Vector3(network.columns[1], 2.28, 0), on: () => network.weightsShown > 0.5 && !tokens.visible },
  { el: makeTag('şeker →', 'tag--axis'), get: () => board.localToWorld(new THREE.Vector3(0.9, 0.02, board.size / 2 + 0.3)), on: () => !tokens.visible && state.step !== 6 },
  { el: makeTag('↑ tuz', 'tag--axis'), get: () => board.localToWorld(new THREE.Vector3(board.size / 2 + 0.36, 0.02, 0.1)), on: () => !tokens.visible && state.step !== 6 },
  { el: makeTag('sıradaki kelime?', 'tag--big'), get: () => tokens.localToWorld(new THREE.Vector3(0, 2.3, -0.4)), on: () => tokens.visible },
];
const outputTag = { el: makeTag('', 'tag--big'), get: () => network.pos.output.clone().add(new THREE.Vector3(0.62, 0, 0)), on: () => outputTag.text && network.weightsShown > 0.5 && !tokens.visible, text: '' };
tags.push(outputTag);

// ---------------------------------------------------------------------------
// Camera focus presets
// ---------------------------------------------------------------------------

const FOCUS = {
  overview: { target: new THREE.Vector3(1.7, 0.5, 0.1), dist: 11.0, az: 0.25, el: 0.98 },
  board: { target: new THREE.Vector3(-0.35, 0.2, 0.25), dist: 6.4, az: 0.1, el: 1.0 },
  network: { target: new THREE.Vector3(3.15, 1.2, 0), dist: 6.4, az: 0.18, el: 1.2 },
  tokens: { target: new THREE.Vector3(0.9, 0.6, 0.0), dist: 8.2, az: 0.05, el: 1.05 },
};
let focusCtx = null;
function focus(name, instant = false) {
  const f = FOCUS[name];
  const aspect = camera.aspect;
  const fit = clamp(1.4 / aspect, 1, 2.4);
  const dist = f.dist * fit;
  const to = new THREE.Vector3(Math.sin(f.az) * Math.sin(f.el), Math.cos(f.el), Math.cos(f.az) * Math.sin(f.el)).multiplyScalar(dist).add(f.target);
  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();
  if (focusCtx) focusCtx.cancelled = true;
  if (instant) {
    camera.position.copy(to);
    controls.target.copy(f.target);
    controls.update();
    return;
  }
  const ctx = { cancelled: false };
  focusCtx = ctx;
  tweens.run(ctx, 1.1, (t) => {
    camera.position.lerpVectors(fromPos, to, t);
    controls.target.lerpVectors(fromTarget, f.target, t);
  }, Ease.inOutCubic).catch(() => {});
}
canvas.addEventListener('pointerdown', () => {
  if (focusCtx) focusCtx.cancelled = true;
});

// ---------------------------------------------------------------------------
// Lesson context (what steps can call)
// ---------------------------------------------------------------------------

const timers = [];
const ctx = {
  board,
  network,
  tokens,
  net,
  data,
  sound,
  later(sec, fn) {
    timers.push(tweens.wait(null, sec).then(fn));
  },
  randomExample() {
    return pick(data);
  },
  async showForward(example, quiet = false) {
    if (ctx.forwardBusy) return;
    ctx.forwardBusy = true;
    const { h, p } = net.forward(example.x);
    network.clearGlow();
    outputTag.text = '';
    network.setGlow('input', 0, example.x[0]);
    network.setGlow('input', 1, example.x[1]);
    board.setProbe(example.x[0], example.x[1], example.y);
    sound.play('pick', { volume: 0.6 });
    await tweens.wait(null, 0.25);
    network.emitPulses(1, example.x);
    sound.play('drip', { volume: 0.5 });
    await tweens.wait(null, 0.7);
    h.forEach((v, i) => network.setGlow('hidden', i, Math.abs(v)));
    network.emitPulses(2, h);
    sound.play('drip', { volume: 0.5 });
    await tweens.wait(null, 0.7);
    network.setGlow('output', 0, p);
    const guess = p > 0.5 ? 'tatlı' : 'tuzlu';
    const truth = example.y ? 'tatlı' : 'tuzlu';
    const ok = guess === truth;
    outputTag.text = `%${Math.round(p * 100)} tatlı`;
    outputTag.el.textContent = outputTag.text;
    sound.play(ok ? 'yum' : 'grab', { volume: 0.7 });
    if (quiet) {
      ctx.forwardBusy = false;
      return;
    }
    dom.readout.hidden = false;
    dom.readout.innerHTML = `<span class="big">Tahmin: %${Math.round(p * 100)} tatlı → <b>${guess}</b></span>Gerçek: <b>${truth}</b> · ${ok ? '<span class="ok">doğru ✓</span>' : '<span class="bad">yanlış ✗</span>'} · şeker ${example.x[0].toFixed(2)}, tuz ${example.x[1].toFixed(2)}`;
    ctx.lastExample = example;
    ctx.forwardBusy = false;
  },
  async learnStep() {
    if (ctx.forwardBusy) return;
    const ex = ctx.lastExample || pick(data);
    await ctx.showForward(ex);
    ctx.forwardBusy = true;
    const before = net.evaluate(data);
    await tweens.wait(null, 0.5);
    // backward pulses: from the output back to the inputs
    const { gW2, gW1 } = net.gradients(data);
    network.emitPulses(2, gW2.map((g) => g * 3), true, 0.6);
    sound.play('lift', { volume: 0.6 });
    await tweens.wait(null, 0.6);
    network.emitPulses(1, [1, 1], true, 0.6);
    await tweens.wait(null, 0.6);
    net.trainStep(data, 0.6);
    const after = net.evaluate(data);
    sound.play('boing', { volume: 0.5 });
    ctx.updateStats();
    board.paint((s, t) => net.predict([s, t]));
    dom.readout.hidden = false;
    dom.readout.innerHTML = `<span class="big">Kayıp ${before.loss.toFixed(3)} → <b>${after.loss.toFixed(3)}</b></span>Ağırlıklar hatayı azaltacak yönde azıcık oynadı. Bir daha bas: her adım biraz daha iyi.`;
    void gW1;
    ctx.forwardBusy = false;
  },
  toggleTraining() {
    if (state.training) ctx.stopTraining();
    else ctx.startTraining();
  },
  startTraining() {
    state.training = true;
    state.trainBudget = 360;
    dom.action.textContent = 'Durdur';
    dom.action.classList.add('is-running');
    board.tintTarget = 1;
    sound.play('click');
  },
  stopTraining() {
    if (!state.training) return;
    state.training = false;
    dom.action.textContent = 'Eğit';
    dom.action.classList.remove('is-running');
  },
  resetNet() {
    ctx.stopTraining();
    net.reset();
    network.syncWeights(true);
    board.paint((s, t) => net.predict([s, t]));
    ctx.updateStats();
    dom.readout.hidden = true;
    sound.play('refill', { volume: 0.5 });
    toast('Ağırlıklar yeniden rastgele. Sıfırdan başlıyoruz.');
  },
  updateStats() {
    const e = net.evaluate(data);
    dom.statSteps.textContent = String(net.steps);
    dom.statLoss.textContent = e.loss.toFixed(3);
    dom.statAcc.textContent = `%${Math.round(e.acc * 100)}`;
    drawSpark();
  },
  setProbe(sugar, salt) {
    const p = net.predict([sugar, salt]);
    board.setProbe(sugar, salt, p);
    const guess = p > 0.5 ? 'tatlı' : 'tuzlu';
    const truth = trueLabel(sugar, salt) ? 'tatlı' : 'tuzlu';
    dom.readout.hidden = false;
    dom.readout.innerHTML = `<span class="big">Model: %${Math.round(p * 100)} tatlı → <b>${guess}</b></span>Mutfağın gizli kuralına göre: <b>${truth}</b> ${guess === truth ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'}`;
    dom.slSugar.value = String(Math.round(sugar * 100));
    dom.slSalt.value = String(Math.round(salt * 100));
    outputTag.text = `%${Math.round(p * 100)} tatlı`;
    outputTag.el.textContent = outputTag.text;
    network.setGlow('input', 0, sugar);
    network.setGlow('input', 1, salt);
    network.setGlow('output', 0, p);
  },
  updateTokenReadout() {
    const c = tokens.candidates;
    dom.readout.hidden = false;
    dom.readout.innerHTML =
      `<span class="big">"${promptText()} ___"</span>` +
      c.map(([w, p], i) => `${i === 0 ? '<b>' : ''}${w} %${Math.round(p * 100)}${i === 0 ? '</b>' : ''}`).join(' · ');
  },
  startAmbientPulses() {
    state.ambient = true;
  },
  stopAmbientPulses() {
    state.ambient = false;
  },
};
function promptText() {
  const s = tokens.stage;
  return ['Mantı en güzel', 'Mantı en güzel yoğurtla', 'Mantı en güzel yoğurtla yenir'][s] || '';
}

function drawSpark() {
  const c = dom.spark;
  const g = c.getContext('2d');
  const w = c.width;
  const h = c.height;
  g.clearRect(0, 0, w, h);
  const hist = net.history;
  g.strokeStyle = 'rgba(43,33,27,0.12)';
  g.beginPath();
  g.moveTo(0, h - 1);
  g.lineTo(w, h - 1);
  g.stroke();
  if (hist.length < 2) return;
  const max = Math.max(0.7, ...hist);
  g.strokeStyle = PALETTE.terracotta;
  g.lineWidth = 2;
  g.beginPath();
  hist.forEach((v, i) => {
    const x = (i / (hist.length - 1)) * (w - 2) + 1;
    const y = h - 2 - (v / max) * (h - 6);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  });
  g.stroke();
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

STEPS.forEach((s, i) => {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<span>${s.label}</span>`;
  b.title = s.title;
  b.addEventListener('click', () => go(i));
  li.appendChild(b);
  dom.dots.appendChild(li);
});

function go(i, instant = false) {
  i = clamp(i, 0, STEPS.length - 1);
  if (i === state.step) return;
  const prev = STEPS[state.step];
  prev?.exit?.(ctx);
  for (const t of timers) t.cancelled = true;
  timers.length = 0;
  state.step = i;
  state.autoTimer = 0;
  const s = STEPS[i];
  dom.count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(STEPS.length).padStart(2, '0')}`;
  dom.title.textContent = s.title;
  dom.text.innerHTML = s.body;
  dom.stats.hidden = !s.stats;
  dom.sliders.hidden = !s.sliders;
  dom.readout.hidden = true;
  outputTag.text = '';
  dom.action.hidden = !s.action;
  dom.action.textContent = s.action || '';
  dom.action.classList.remove('is-running');
  dom.action2.hidden = !s.secondary;
  dom.action2.textContent = s.secondary || '';
  dom.prev.disabled = i === 0;
  dom.next.textContent = i === STEPS.length - 1 ? 'Baştan al' : 'Sonraki →';
  dom.dots.querySelectorAll('button').forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
  dom.lesson.classList.remove('is-collapsed');
  dom.collapse.setAttribute('aria-expanded', 'true');
  dom.collapse.textContent = 'Küçült';
  dom.lesson.scrollTop = 0;
  canvas.classList.toggle('is-probing', !!s.sliders);
  focus(s.focus, instant);
  s.enter?.(ctx);
  sound.play('click', { volume: 0.6 });
}

dom.prev.addEventListener('click', () => go(state.step - 1));
dom.next.addEventListener('click', () => go(state.step === STEPS.length - 1 ? 0 : state.step + 1));
dom.action.addEventListener('click', () => {
  sound.unlock();
  STEPS[state.step].act?.(ctx);
});
dom.action2.addEventListener('click', () => {
  sound.unlock();
  STEPS[state.step].act2?.(ctx);
});
dom.collapse.addEventListener('click', () => {
  const collapsed = dom.lesson.classList.toggle('is-collapsed');
  dom.collapse.setAttribute('aria-expanded', String(!collapsed));
  dom.collapse.textContent = collapsed ? 'Aç' : 'Küçült';
});
for (const sl of [dom.slSugar, dom.slSalt]) {
  sl.addEventListener('input', () => ctx.setProbe(Number(dom.slSugar.value) / 100, Number(dom.slSalt.value) / 100));
}

function setToggle(name, on) {
  state[name] = on;
  document.querySelector(`[data-toggle="${name}"]`)?.setAttribute('aria-pressed', String(on));
  if (name === 'sound') {
    sound.unlock();
    sound.setEnabled(on);
    if (on) sound.play('click');
  }
  if (name === 'autoplay') {
    state.autoTimer = 0;
    if (on) toast('Otomatik oynatma açık: bölümler kendiliğinden ilerler.');
  }
}
document.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => setToggle(b.dataset.toggle, b.getAttribute('aria-pressed') !== 'true')));

function setUiHidden(hidden) {
  state.uiHidden = hidden;
  document.body.classList.toggle('ui-hidden', hidden);
  dom.showUi.hidden = !hidden;
}
dom.hideUi.addEventListener('click', () => setUiHidden(true));
dom.showUi.addEventListener('click', () => setUiHidden(false));

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const onControl = e.target instanceof HTMLElement && e.target.matches('button, a, input, select, textarea');
  switch (e.key) {
    case 'ArrowRight':
      if (onControl && e.target.type === 'range') return;
      e.preventDefault();
      go(state.step === STEPS.length - 1 ? 0 : state.step + 1);
      break;
    case 'ArrowLeft':
      if (onControl && e.target.type === 'range') return;
      e.preventDefault();
      go(state.step - 1);
      break;
    case ' ':
      if (onControl) return;
      e.preventDefault();
      STEPS[state.step].act?.(ctx);
      break;
    case 'e':
    case 'E':
      if (state.step !== 4) go(4);
      ctx.toggleTraining();
      break;
    case 'r':
    case 'R':
      ctx.resetNet();
      break;
    case 'h':
    case 'H':
      setUiHidden(!state.uiHidden);
      break;
    case 'm':
    case 'M':
      setToggle('sound', !state.sound);
      break;
    case 'Escape':
      if (state.uiHidden) setUiHidden(false);
      break;
    default:
      return;
  }
});

// board probing (step "Dene")
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.03);
let down = null;
canvas.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
});
window.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7 || performance.now() - down.t > 600;
  down = null;
  if (moved || e.target !== canvas) return;
  sound.unlock();
  if (!STEPS[state.step].sliders) return;
  const r = canvas.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(boardPlane, hit)) return;
  const local = board.worldToLocal(hit.clone());
  const [sugar, salt] = board.fromLocal(local);
  if (sugar < -0.05 || sugar > 1.05 || salt < -0.05 || salt > 1.05) return;
  ctx.setProbe(clamp(sugar, 0, 1), clamp(salt, 0, 1));
  sound.play('pick', { volume: 0.6 });
});

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  if (w / h > 1.4) camera.setViewOffset(w, h, -w * 0.13, -h * 0.02, w, h);
  else if (w / h < 0.8) camera.setViewOffset(w, h, 0, h * 0.02, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', () => {
  resize();
  if (state.step >= 0) focus(STEPS[state.step].focus, true);
});
resize();

const clock = new THREE.Clock();
let time = 0;
let ambientTimer = 0;
let paintTimer = 0;
const tmp = new THREE.Vector3();

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  time += dt;
  tweens.update(dt);

  if (state.training) {
    const perFrame = reducedMotion ? 6 : 3;
    for (let k = 0; k < perFrame && state.trainBudget > 0; k++) {
      net.trainStep(data, 0.6);
      state.trainBudget--;
    }
    paintTimer += dt;
    if (paintTimer > 0.08) {
      paintTimer = 0;
      board.paint((s, t) => net.predict([s, t]));
      ctx.updateStats();
      if (net.steps % 12 === 0) sound.play('hop', { volume: 0.25 });
    }
    if (state.trainBudget <= 0) {
      ctx.stopTraining();
      const e = net.evaluate(data);
      toast(`Eğitim bitti: ${net.steps} adım, doğruluk %${Math.round(e.acc * 100)}.`);
      sound.play('refill', { volume: 0.5 });
    }
  }
  if (state.ambient && !reducedMotion) {
    ambientTimer -= dt;
    if (ambientTimer <= 0) {
      ambientTimer = 2.4;
      ctx.showForward(pick(data), true);
    }
  }
  if (state.autoplay && !state.training) {
    state.autoTimer += dt;
    if (state.autoTimer > 11) go(state.step === STEPS.length - 1 ? 0 : state.step + 1);
  }

  board.update(dt);
  network.update(dt);
  tokens.update(dt);
  controls.update();

  // labels
  const r = canvas.getBoundingClientRect();
  for (const t of tags) {
    const on = t.on();
    t.el.classList.toggle('is-on', !!on);
    if (!on) continue;
    tmp.copy(t.get()).project(camera);
    t.el.style.transform = `translate(${r.left + ((tmp.x + 1) / 2) * r.width}px, ${r.top + ((1 - tmp.y) / 2) * r.height}px) translate(-50%, -50%)`;
  }
  renderer.render(scene, camera);
}

async function boot() {
  dom.loadingBar.style.width = '40%';
  const fontsReady = document.fonts?.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
  await fontsReady;
  dom.loadingBar.style.width = '80%';
  renderer.compile(scene, camera);
  go(0, true);
  renderer.render(scene, camera);
  dom.loadingBar.style.width = '100%';
  frame();
  window.__lesson = { state, go, ctx, net, data, camera, controls, get time() { return time; } };
  requestAnimationFrame(() => dom.loading.classList.add('is-done'));
}
boot().catch((err) => {
  console.error(err);
  dom.loadingText.textContent = 'Bir şeyler ters gitti. Sayfayı yenilemeyi dene.';
});
