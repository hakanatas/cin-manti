import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Tweens, Ease, pick, clamp } from '../../js/tween.js';
import { SoundKit } from '../../js/audio.js';
import { makeMouthTextures } from '../../js/textures.js';
import { Bidik } from '../../YZ-nasil-calisir/js/bidik.js';
import { Confetti } from '../../YZ-nasil-calisir/js/confetti.js';
import { GeoScene } from '../../geometrik-sekiller/js/geo.js';
import { STEPS, QUIZ } from './steps.js';
import { angleKind, KIND_LABEL } from '../../geometrik-sekiller/js/geo.js';

const PALETTE = {
  cream: '#f5eee3',
  ink: '#2b211b',
  terracotta: '#c4623d',
  terracottaSoft: '#e9c1ad',
  porcelain: '#fbf8f2',
  slate: '#5b7c99',
  cheek: '#f0908e',
};

const $ = (s) => document.querySelector(s);
const dom = {
  canvas: $('#stage'),
  loading: $('#loading'),
  loadingBar: $('#loading-bar'),
  loadingText: $('#loading-text'),
  tags: $('#tags'),
  intro: $('#intro'),
  start: $('#btn-start'),
  finish: $('#finish'),
  finishText: $('#finish-text'),
  again: $('#btn-again'),
  count: $('#lesson-count'),
  title: $('#lesson-title'),
  text: $('#lesson-text'),
  sliders: $('#lesson-sliders'),
  choices: $('#choices'),
  toggles: $('#toggles'),
  target: $('#target'),
  readout: $('#readout'),
  score: $('#score'),
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
const canvas = dom.canvas;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
const state = { step: -1, autoplay: false, sound: false, uiHidden: false, autoTimer: 0, score: 0, round: 0 };

let toastTimer = 0;
function toast(msg, ms = 2600) {
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
controls.minPolarAngle = 0.3;
controls.maxPolarAngle = 1.25;
controls.minDistance = 3;
controls.maxDistance = 18;
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
const mouths = makeMouthTextures();
const geo = new GeoScene({ palette: PALETTE, mouths });
scene.add(geo);
const bidik = new Bidik({ mouths, palette: PALETTE });
bidik.position.set(4.1, 0, 1.6);
scene.add(bidik);
const confetti = new Confetti([PALETTE.terracotta, '#e2557e', '#f0b41f', PALETTE.slate, '#ffffff']);
scene.add(confetti);

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------
const tagPool = [];
function makeTag(text, cls = '') {
  const el = document.createElement('div');
  el.className = `tag ${cls}`;
  el.textContent = text;
  dom.tags.appendChild(el);
  return el;
}
const tags = [];
const bubble = { el: makeTag('', 'tag--bubble'), get: () => bidik.position.clone().add(new THREE.Vector3(0, 1.95, 0)), on: () => bubble.text && !state.uiHidden, text: '', timer: 0 };
tags.push(bubble);
const notations = [];

// ---------------------------------------------------------------------------
// Camera presets & Bıdık spots
// ---------------------------------------------------------------------------
const FOCUS = {
  board: { target: new THREE.Vector3(0.4, 0.2, 0.2), dist: 8.6, az: 0.05, el: 0.72, bidik: [4.1, 0, 1.5] },
  angle: { target: new THREE.Vector3(0.6, 0.2, 0.2), dist: 8.2, az: 0.05, el: 0.65, bidik: [4.1, 0, 1.5] },
  circle: { target: new THREE.Vector3(0.5, 0.3, 0.3), dist: 9.2, az: 0.08, el: 0.85, bidik: [0.3, 0.14, 0.1] },
  bidik: { target: new THREE.Vector3(2.2, 0.7, 0.9), dist: 6.2, az: 0.2, el: 1.15, bidik: [2.8, 0, 1.8] },
};
let focusCtx = null;
function focus(name, instant = false) {
  const f = FOCUS[name];
  const fit = clamp(1.5 / camera.aspect, 1, 2.4);
  const to = new THREE.Vector3(Math.sin(f.az) * Math.sin(f.el), Math.cos(f.el), Math.cos(f.az) * Math.sin(f.el)).multiplyScalar(f.dist * fit).add(f.target);
  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();
  const fromB = bidik.position.clone();
  const toB = f.bidik ? new THREE.Vector3(f.bidik[0], f.bidik[1], f.bidik[2]) : bidik.position.clone();
  if (focusCtx) focusCtx.cancelled = true;
  if (instant) {
    camera.position.copy(to);
    controls.target.copy(f.target);
    bidik.position.copy(toB);
    controls.update();
    return;
  }
  const c = { cancelled: false };
  focusCtx = c;
  tweens
    .run(c, 1.1, (t) => {
      camera.position.lerpVectors(fromPos, to, t);
      controls.target.lerpVectors(fromTarget, f.target, t);
      bidik.position.lerpVectors(fromB, toB, t);
      if (!fromB.equals(toB)) bidik.position.y = toB.y + Math.sin(t * Math.PI * 3) ** 2 * 0.08;
    }, Ease.inOutCubic)
    .catch(() => {});
}
canvas.addEventListener('pointerdown', () => {
  if (focusCtx) focusCtx.cancelled = true;
});

// ---------------------------------------------------------------------------
// Lesson context
// ---------------------------------------------------------------------------
const timers = [];
const ctx = {
  THREE,
  geo,
  bidik,
  sound,
  vec: (x, y, z) => new THREE.Vector3(x, y, z),
  later(sec, fn) {
    timers.push(tweens.wait(null, sec).then(fn));
  },
  say(text, hold = 4) {
    bubble.text = text;
    bubble.el.textContent = text;
    bubble.timer = hold;
  },
  notation(text, pos, kind = 'notation') {
    const el = makeTag(text, kind === 'measure' ? 'tag--measure' : 'tag--notation');
    const entry = { el, get: () => pos, on: () => true };
    tags.push(entry);
    notations.push(entry);
  },
  clearNotation() {
    for (const n of notations) {
      n.el.remove();
      tags.splice(tags.indexOf(n), 1);
    }
    notations.length = 0;
  },
  bidikOnBoard(center) {
    const c = { cancelled: false };
    const from = bidik.position.clone();
    const to = new THREE.Vector3(center.x, geo.surfaceY, center.z);
    tweens.run(c, 1.0, (t) => {
      bidik.position.lerpVectors(from, to, t);
      bidik.position.y = geo.surfaceY * t + Math.sin(t * Math.PI * 3) ** 2 * 0.1;
    }, Ease.inOutCubic).catch(() => {});
  },
  angleKind,
  KIND_LABEL,
  toggle: {},
  /** Finish grow/pop animations immediately (for slider-driven redraws). */
  instant() {
    geo.drawing.traverse((o) => {
      if (o.userData.grow) {
        o.scale.y = Math.max(0.001, o.userData.grow.len);
        o.position.copy(o.userData.grow.a).lerp(o.userData.grow.b, 0.5);
        o.userData.onDone?.();
        o.userData.grow = undefined;
      }
      if (o.userData.target !== undefined) {
        o.userData.delay = 0;
        o.scale.setScalar(Math.max(0.001, o.userData.target));
      }
    });
  },
  setTarget(deg) {
    dom.target.hidden = deg === null;
    if (deg !== null) dom.target.innerHTML = `Bıdık'ın isteği: <b>${deg}°</b> yap`;
  },
  startQuiz() {
    const host = dom.text.querySelector('#quiz');
    if (!host) return;
    host.innerHTML = '';
    const picked = QUIZ.slice().sort(() => Math.random() - 0.5).slice(0, 5);
    let correct = 0;
    let answered = 0;
    state.score = 0;
    dom.score.hidden = false;
    dom.score.innerHTML = 'Puan <b>0</b> / 5';
    picked.forEach((q, qi) => {
      const item = document.createElement('div');
      item.className = 'quiz__item';
      const opts = q.options.map((o, i) => ({ o, i })).sort(() => Math.random() - 0.5);
      item.innerHTML = `<p class="quiz__q">${qi + 1}. ${q.q}</p><div class="quiz__opts"></div><p class="quiz__why" hidden></p>`;
      const box = item.querySelector('.quiz__opts');
      const why = item.querySelector('.quiz__why');
      for (const { o, i } of opts) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.textContent = o;
        b.addEventListener('click', () => {
          if (item.classList.contains('is-done')) return;
          item.classList.add('is-done');
          answered++;
          const ok = i === q.answer;
          if (ok) correct++;
          state.score = correct;
          dom.score.innerHTML = `Puan <b>${correct}</b> / 5`;
          b.classList.add(ok ? 'is-right' : 'is-wrong');
          why.hidden = false;
          why.textContent = ok ? q.why : q.nope;
          sound.play(ok ? 'yum' : 'grab', { volume: 0.6 });
          if (ok) {
            bidik.react('joy', 1.5);
            bidik.doHop(0.7);
          } else bidik.react('worried', 1.5);
          if (answered === 5) finishQuiz(correct);
        });
        box.appendChild(b);
      }
      host.appendChild(item);
    });
  },
};
function finishQuiz(correct) {
  dom.finishText.textContent =
    correct === 5 ? 'Beşte beş! Açılar, doğrular, çokgenler… Hepsi cebinde.' : `${correct} doğru, ${5 - correct} yanlış. Hiç dert değil; bölümlere geri dönüp bir daha bakabilirsin.`;
  setTimeout(() => {
    dom.finish.hidden = false;
    bidik.celebrate();
    confetti.burst(bidik.position.clone().add(new THREE.Vector3(0, 1.4, 0)), 120);
    sound.play('refill', { volume: 0.7 });
    focus('bidik');
  }, 800);
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
const sliderValues = {};
function go(i, instant = false) {
  i = clamp(i, 0, STEPS.length - 1);
  if (i === state.step) return;
  STEPS[state.step]?.exit?.(ctx);
  for (const t of timers) t.cancelled = true;
  timers.length = 0;
  state.step = i;
  state.autoTimer = 0;
  const s = STEPS[i];
  dom.count.textContent = `Bölüm ${i + 1} / ${STEPS.length}`;
  dom.title.textContent = s.title;
  dom.text.innerHTML = s.body;
  dom.readout.hidden = true;
  dom.action.hidden = !s.action;
  dom.action.textContent = s.action || '';
  dom.action2.hidden = !s.secondary;
  dom.action2.textContent = s.secondary || '';
  dom.prev.disabled = i === 0;
  dom.next.textContent = i === STEPS.length - 1 ? 'Baştan başla' : 'Devam →';
  dom.dots.querySelectorAll('button').forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
  dom.lesson.classList.remove('is-collapsed');
  dom.collapse.setAttribute('aria-expanded', 'true');
  dom.collapse.textContent = 'Küçült';
  dom.lesson.scrollTop = 0;
  dom.finish.hidden = true;
  dom.score.hidden = !s.quiz;
  dom.target.hidden = true;
  ctx.toggle = {};
  dom.toggles.innerHTML = '';
  dom.toggles.hidden = !s.toggles;
  if (s.toggles) {
    for (const t of s.toggles) {
      ctx.toggle[t.id] = !!t.on;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = t.label;
      b.setAttribute('aria-pressed', String(!!t.on));
      b.addEventListener('click', () => {
        ctx.toggle[t.id] = !ctx.toggle[t.id];
        b.setAttribute('aria-pressed', String(ctx.toggle[t.id]));
        s.onToggle?.(ctx);
      });
      dom.toggles.appendChild(b);
    }
  }
  canvas.classList.toggle('is-drawing', !!s.click);
  ctx.lastState = null;
  ctx.lastType = null;
  ctx.saidDik = false;
  ctx.matched = false;
  ctx.clearNotation();
  bidik.calmDown();
  if (s.mood) bidik.setMood(s.mood);
  // sliders
  dom.sliders.innerHTML = '';
  dom.sliders.hidden = !s.sliders;
  if (s.sliders) {
    for (const sp of s.sliders) {
      const label = document.createElement('label');
      label.innerHTML = `${sp.label} <input type="range" id="sl-${sp.id}" min="${sp.min}" max="${sp.max}" value="${sp.value}" />`;
      const input = label.querySelector('input');
      sliderValues[sp.id] = sp.value;
      input.addEventListener('input', () => {
        sliderValues[sp.id] = Number(input.value);
        s.onSlider?.(ctx, { ...sliderValues });
      });
      dom.sliders.appendChild(label);
    }
  }
  // choices
  dom.choices.innerHTML = '';
  dom.choices.hidden = !s.choices;
  dom.choices.classList.remove('is-done');
  if (s.choices) {
    for (const ch of s.choices) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = ch.label;
      b.addEventListener('click', () => {
        if (dom.choices.classList.contains('is-done')) return;
        dom.choices.classList.add('is-done');
        b.classList.add(ch.ok ? 'is-right' : 'is-wrong');
        dom.readout.hidden = false;
        dom.readout.textContent = ch.why;
        sound.play(ch.ok ? 'yum' : 'grab', { volume: 0.6 });
        if (ch.ok) {
          bidik.react('joy', 1.5);
          bidik.doHop(0.7);
          ctx.say('Bildin!', 2.5);
        } else {
          bidik.react('worried', 1.5);
          ctx.say('Hmm, tam değil. Cevabı okudun mu?', 3);
        }
      });
      dom.choices.appendChild(b);
    }
  }
  focus(s.focus, instant);
  s.enter?.(ctx);
  if (s.say) ctx.later(instant ? 0.3 : 1.0, () => ctx.say(s.say, 5));
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
  dom.collapse.textContent = collapsed ? 'Yazıyı aç' : 'Küçült';
});
dom.start.addEventListener('click', () => {
  sound.unlock();
  dom.intro.hidden = true;
  document.body.classList.remove('is-intro');
  bidik.react('joy', 1.5);
  bidik.doHop(1);
  go(0);
});
dom.again.addEventListener('click', () => {
  dom.finish.hidden = true;
  state.step = -1;
  go(0);
});
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
    if (on) toast('Tamam, bölümler kendi kendine ilerleyecek.');
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
  if (!dom.intro.hidden) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dom.start.click();
    }
    return;
  }
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

// board clicks
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
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
  const s = STEPS[state.step];
  if (!s?.click) return;
  const r = canvas.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -geo.surfaceY);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(plane, hit)) return;
  const local = geo.worldToLocal(hit.clone());
  if (Math.abs(local.x) > geo.W / 2 - 0.2 || Math.abs(local.z) > geo.D / 2 - 0.2) {
    ctx.say('Tahtanın dışına çıktın! Tahtaya tıkla.', 2.5);
    return;
  }
  s.onClick?.(ctx, local.x, local.z);
});

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  if (w / h > 1.4) camera.setViewOffset(w, h, -w * 0.14, -h * 0.02, w, h);
  else if (w / h < 0.8) camera.setViewOffset(w, h, 0, h * 0.02, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', () => {
  resize();
  if (!dom.intro.hidden) focus('bidik', true);
  else if (state.step >= 0) focus(STEPS[state.step].focus, true);
});
resize();
const clock = new THREE.Clock();
let time = 0;
const tmp = new THREE.Vector3();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  time += dt;
  tweens.update(dt);
  if (state.autoplay && dom.intro.hidden) {
    state.autoTimer += dt;
    if (state.autoTimer > 16) go(state.step === STEPS.length - 1 ? 0 : state.step + 1);
  }
  if (bubble.timer > 0) {
    bubble.timer -= dt;
    if (bubble.timer <= 0) bubble.text = '';
  }
  geo.update(dt, time);
  bidik.faceToward(camera.position);
  bidik.update(dt);
  confetti.update(dt);
  controls.update();
  // labels: bubble + notations + geo point labels
  const r = canvas.getBoundingClientRect();
  const all = tags.concat(geo.labels.map((l) => {
    if (!l.el) l.el = makeTag(l.text, l.cls);
    return l;
  }));
  for (const el of tagPool) el.hidden = true;
  for (const t of all) {
    const on = t.on();
    t.el.classList.toggle('is-on', !!on);
    if (!on) continue;
    tmp.copy(t.get());
    if (t.get !== bubble.get && !notations.includes(t)) geo.localToWorld(tmp);
    if (notations.includes(t)) geo.localToWorld(tmp);
    tmp.project(camera);
    let x = r.left + ((tmp.x + 1) / 2) * r.width;
    let y = r.top + ((1 - tmp.y) / 2) * r.height;
    if (t === bubble) {
      const hw = t.el.offsetWidth / 2 + 8;
      const hh = t.el.offsetHeight / 2 + 8;
      x = clamp(x, hw, r.width - hw);
      y = clamp(y, hh + 60, r.height - hh);
    }
    t.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  }
  renderer.render(scene, camera);
}
// point labels are created lazily; remove their DOM when geo clears
const origClear = geo.clear.bind(geo);
geo.clear = () => {
  for (const l of geo.labels) l.el?.remove();
  origClear();
};

async function boot() {
  dom.loadingBar.style.width = '40%';
  const fontsReady = document.fonts?.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
  await fontsReady;
  dom.loadingBar.style.width = '80%';
  document.body.classList.add('is-intro');
  // a little welcome drawing
  const o = geo.p(-0.6, 0.4);
  geo.protractor(o, true, 1.3);
  geo.rayAt(o, 0);
  geo.rayAt(o, 60);
  geo.arcSweep(o, 0, 60, 0.55, geo.kindMat('dar'), 0.024);
  bidik.setMood('happy');
  focus('bidik', true);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  dom.loadingBar.style.width = '100%';
  frame();
  window.__lesson = { state, go, ctx, camera, controls, bidik, geo, get time() { return time; } };
  requestAnimationFrame(() => {
    dom.loading.classList.add('is-done');
    setTimeout(() => bidik.doHop(1), 400);
  });
}
boot().catch((err) => {
  console.error(err);
  dom.loadingText.textContent = 'Ay, bir şeyler ters gitti. Sayfayı yenilemeyi dener misin?';
});
