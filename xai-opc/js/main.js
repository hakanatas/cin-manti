import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Tweens, clamp } from '../../js/tween.js';
import { SoundKit } from '../../js/audio.js';
import { makeMouthTextures } from '../../js/textures.js';
import { Bidik } from '../../YZ-nasil-calisir/js/bidik.js';
import { Confetti } from '../../YZ-nasil-calisir/js/confetti.js';
import { ClinicScene } from './clinic.js';
import { STEPS, QUIZ } from './steps.js';

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
  stats: $('#lesson-stats'),
  sliders: $('#lesson-sliders'),
  choices: $('#choices'),
  toggles: $('#toggles'),
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
const state = { step: -1, autoplay: false, sound: false, uiHidden: false, autoTimer: 0, score: 0 };

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
renderer.toneMappingExposure = 0.94;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.cream);
scene.fog = new THREE.Fog(PALETTE.cream, 20, 40);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;
pmrem.dispose();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 90);
const controls = new OrbitControls(camera, canvas);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 0.5;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = 1.3;
controls.minDistance = 3;
controls.maxDistance = 22;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
const key = new THREE.DirectionalLight('#fff0dc', 2.2);
key.position.set(-3.5, 9, 5);
key.castShadow = true;
const sm = isMobile ? 1024 : 2048;
key.shadow.mapSize.set(sm, sm);
Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 26 });
key.shadow.bias = -0.0003;
key.shadow.normalBias = 0.02;
if ('intensity' in key.shadow) key.shadow.intensity = 0.65;
scene.add(key, key.target);
scene.add(new THREE.HemisphereLight('#fff9ef', '#e2c4a2', 0.6));
const rim = new THREE.DirectionalLight('#dde7ff', 0.7);
rim.position.set(5, 5, -6);
scene.add(rim);
const ground = new THREE.Mesh(new THREE.CircleGeometry(44, 64), new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.96 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const tweens = new Tweens();
tweens.timeScale = reducedMotion ? 0.6 : 1;
const sound = new SoundKit();
const mouths = makeMouthTextures();
const clinic = new ClinicScene({ palette: PALETTE });
scene.add(clinic);
const bidik = new Bidik({ mouths, palette: PALETTE });
bidik.position.set(3.2, 0.16, -2.1);
scene.add(bidik);
const confetti = new Confetti([PALETTE.terracotta, PALETTE.slate, '#f0b41f', '#3f8a5b', '#ffffff']);
scene.add(confetti);

// ---------------------------------------------------------------------------
// Labels floating over the 3D scene
// ---------------------------------------------------------------------------
function makeTag(text, cls = '') {
  const el = document.createElement('div');
  el.className = `tag ${cls}`;
  el.textContent = text;
  dom.tags.appendChild(el);
  return el;
}
const tags = [];
const bubble = {
  el: makeTag('', 'tag--bubble'),
  get: () => bidik.position.clone().add(new THREE.Vector3(0, 1.95, 0)),
  on: () => bubble.text && !state.uiHidden,
  text: '',
  timer: 0,
};
tags.push(bubble);
const notations = [];

// ---------------------------------------------------------------------------
// Camera presets
// ---------------------------------------------------------------------------
const FOCUS = {
  desk: { target: new THREE.Vector3(0, 0.2, 0.1), dist: 10.6, az: 0.02, el: 0.66, bidik: [3.2, 0.16, -2.6] },
  wide: { target: new THREE.Vector3(0, 0.2, 0.1), dist: 12.4, az: 0.02, el: 0.58, bidik: [3.4, 0.16, -2.8] },
  top: { target: new THREE.Vector3(0, 0.2, 0.05), dist: 11.4, az: 0.02, el: 0.9, bidik: [3.4, 0.16, -2.8] },
  bidik: { target: new THREE.Vector3(1.6, 0.8, -1.2), dist: 7.4, az: 0.22, el: 1.1, bidik: [2.2, 0.16, -0.6] },
};
let focusCtx = null;
function focus(name, instant = false) {
  const f = FOCUS[name] || FOCUS.desk;
  resize(); // the view offset depends on whether the panel is showing
  const inset = name === 'bidik' ? 0 : uiInset();
  // narrow screens need a wider view: the desk is 9.2 units across
  const base = window.innerWidth <= 900 ? 1.62 : 1.35;
  const fit = clamp(base / (camera.aspect * (1 - inset)), inset > 0 ? 1.25 : 1, 4.4);
  const to = new THREE.Vector3(Math.sin(f.az) * Math.sin(f.el), Math.cos(f.el), Math.cos(f.az) * Math.sin(f.el))
    .multiplyScalar(f.dist * fit)
    .add(f.target);
  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();
  const fromB = bidik.position.clone();
  const toB = f.bidik ? new THREE.Vector3(f.bidik[0], f.bidik[1], f.bidik[2]) : bidik.position.clone();
  if (f.bidik && window.innerWidth <= 900) toB.set(f.bidik[0] * 0.72, f.bidik[1], f.bidik[2] * 0.5);
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
    })
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// Chapter context
// ---------------------------------------------------------------------------
const timers = [];
const ctx = {
  THREE,
  clinic,
  bidik,
  sound,
  vec: (x, y, z) => new THREE.Vector3(x, y, z),
  later(sec, fn) {
    // each timer gets its own cancellation context so leaving the chapter
    // really stops it (a pending line must not land on the next chapter)
    const c = { cancelled: false };
    timers.push(c);
    tweens.wait(c, sec).then(fn).catch(() => {});
  },
  say(text, hold = 5) {
    bubble.text = text;
    bubble.el.textContent = text;
    bubble.timer = hold;
  },
  /** A small label pinned to a point on the desk. */
  note(text, pos, kind = 'note') {
    const el = makeTag(text, kind === 'big' ? 'tag--big' : kind === 'axis' ? 'tag--axis' : 'tag--measure');
    const entry = { el, get: () => pos, on: () => true };
    tags.push(entry);
    notations.push(entry);
    return entry;
  },
  clearNotes() {
    for (const n of notations) {
      n.el.remove();
      tags.splice(tags.indexOf(n), 1);
    }
    notations.length = 0;
  },
  /** Numbers shown under the chapter text. */
  stats(list) {
    dom.stats.innerHTML = '';
    dom.stats.hidden = !list || !list.length;
    if (!list) return;
    for (const s of list) {
      const d = document.createElement('div');
      d.className = 'stat';
      d.innerHTML = `<span class="stat__label">${s.label}</span><span class="stat__value">${s.value}</span>`;
      dom.stats.appendChild(d);
    }
  },
  readout(html) {
    dom.readout.hidden = !html;
    dom.readout.innerHTML = html || '';
  },
  instant() {
    clinic.finishAll();
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
    correct === 5
      ? 'Beşte beş. Modelin ne yaptığını da, neyi yapamadığını da biliyorsun; asıl mesele buydu.'
      : `${correct} doğru, ${5 - correct} yanlış. Bölümlere dönüp bakmak serbest, sınav değil sonuçta.`;
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
  dom.stats.hidden = true;
  dom.stats.innerHTML = '';
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
        sound.play('click', { volume: 0.5 });
        s.onToggle?.(ctx, t.id);
      });
      dom.toggles.appendChild(b);
    }
  }
  ctx.clearNotes();
  bidik.calmDown();
  if (s.mood) bidik.setMood(s.mood);
  // sliders
  dom.sliders.innerHTML = '';
  dom.sliders.hidden = !s.sliders;
  if (s.sliders) {
    for (const sp of s.sliders) {
      const label = document.createElement('label');
      label.innerHTML = `${sp.label} <input type="range" id="sl-${sp.id}" min="${sp.min}" max="${sp.max}" step="${sp.step || 1}" value="${sp.value}" />`;
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
        dom.readout.innerHTML = ch.why;
        sound.play(ch.ok ? 'yum' : 'grab', { volume: 0.6 });
        if (ch.ok) {
          bidik.react('joy', 1.5);
          bidik.doHop(0.7);
        } else bidik.react('worried', 1.5);
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
  refocus();
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
  refocus();
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

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const inset = uiInset();
  const shift = uiShiftY(h);
  if (inset > 0) camera.setViewOffset(w, h, -w * inset * 0.5, -h * 0.02, w, h);
  else if (shift !== 0) camera.setViewOffset(w, h, 0, shift, w, h);
  else if (w / h < 0.8) camera.setViewOffset(w, h, 0, h * 0.02, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
/** Fraction of the viewport width hidden behind the lesson panel (desktop). */
function uiInset() {
  if (state.uiHidden || window.innerWidth <= 900 || !dom.intro.hidden) return 0;
  const rct = dom.lesson.getBoundingClientRect();
  if (rct.width === 0 || rct.width > window.innerWidth * 0.6) return 0;
  return clamp((rct.right + 24) / window.innerWidth, 0, 0.5);
}
/** Pixels to lift the scene so it centres between header and panel (mobile). */
function uiShiftY(h) {
  if (state.uiHidden || window.innerWidth > 900 || !dom.intro.hidden) return 0;
  const rct = dom.lesson.getBoundingClientRect();
  if (rct.height === 0) return 0;
  const top = window.innerWidth <= 900 ? 92 : 126;
  const bottom = Math.max(top + 120, rct.top - 10);
  return clamp(h / 2 - (top + bottom) / 2, 0, h * 0.3);
}
function refocus() {
  resize();
  if (!dom.intro.hidden) focus('bidik', true);
  else if (state.step >= 0 && STEPS[state.step]) focus(STEPS[state.step].focus, true);
}
window.addEventListener('resize', refocus);
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
    if (state.autoTimer > 18) go(state.step === STEPS.length - 1 ? 0 : state.step + 1);
  }
  if (bubble.timer > 0) {
    bubble.timer -= dt;
    if (bubble.timer <= 0) bubble.text = '';
  }
  clinic.update(dt, time);
  bidik.faceToward(camera.position);
  bidik.update(dt);
  confetti.update(dt);
  controls.update();
  const r = canvas.getBoundingClientRect();
  const all = tags.concat(
    clinic.labels.map((l) => {
      if (!l.el) l.el = makeTag(l.text, l.cls);
      return l;
    })
  );
  for (const t of all) {
    const on = t.on() && !state.uiHidden;
    t.el.classList.toggle('is-on', !!on);
    if (!on) continue;
    tmp.copy(t.get());
    if (t !== bubble) clinic.localToWorld(tmp);
    tmp.project(camera);
    let x = r.left + ((tmp.x + 1) / 2) * r.width;
    let y = r.top + ((1 - tmp.y) / 2) * r.height;
    const hw = t.el.offsetWidth / 2 + 10;
    const hh = t.el.offsetHeight / 2 + 10;
    if (t === bubble) {
      x = clamp(x, hw, r.width - hw);
      y = clamp(y, hh + (window.innerWidth <= 900 ? 168 : 84), r.height - hh);
    } else {
      x = clamp(x, hw, r.width - hw);
      y = clamp(y, hh + (window.innerWidth <= 900 ? 104 : 74), r.height - hh - (window.innerWidth > 900 ? 96 : 0));
    }
    t.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  }
  renderer.render(scene, camera);
}
// labels belong to the drawing: clearing the desk clears them too, otherwise a
// slider redraw stacks a fresh copy of every label on top of the old ones
const origClear = clinic.clear.bind(clinic);
clinic.clear = () => {
  for (const l of clinic.labels) l.el?.remove();
  ctx.clearNotes();
  origClear();
};

async function boot() {
  dom.loadingBar.style.width = '40%';
  const fontsReady = document.fonts?.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
  await fontsReady;
  dom.loadingBar.style.width = '80%';
  document.body.classList.add('is-intro');
  // welcome layout: the whole cohort waiting on the desk
  const all = clinic.pile(606, 0, 0.15, 34, { gap: 0.165, stagger: 0.0012 });
  clinic.color(all.slice(0, 347), PALETTE.slate);
  clinic.color(all.slice(347), PALETTE.terracotta);
  bidik.setMood('happy');
  focus('bidik', true);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  dom.loadingBar.style.width = '100%';
  frame();
  window.__lesson = { state, go, ctx, camera, controls, bidik, clinic, get time() { return time; } };
  requestAnimationFrame(() => {
    dom.loading.classList.add('is-done');
    setTimeout(() => bidik.doHop(1), 400);
  });
}
boot().catch((err) => {
  console.error(err);
  dom.loadingText.textContent = 'Bir şeyler ters gitti. Sayfayı yenilemeyi dener misin?';
});
