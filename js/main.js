import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createScene } from './scene.js';
import { LAYOUT, PORTIONS, PERSONALITIES, MODEL_URL, STORAGE_KEY, PALETTE } from './config.js';
import { Tweens, Ease, rand, pick, clamp } from './tween.js';
import { SoundKit } from './audio.js';
import * as TX from './textures.js';
import {
  createPropMaterials,
  createSteamer,
  createSteamerLid,
  createPlate,
  createSauceBowl,
  createChopsticks,
  createChopstickRest,
  chopstickQuaternion,
} from './props.js';
import { Dumpling } from './dumpling.js';
import { createDumplingGeometry } from './dumpling-shape.js';
import { Steam } from './steam.js';
import { Particles } from './particles.js';
import { Bubble } from './bubble.js';
import { Tasting } from './tasting.js';
import { BiteRecorder } from './recorder.js';

// ---------------------------------------------------------------------------
// State & DOM
// ---------------------------------------------------------------------------

const $ = (sel) => document.querySelector(sel);
const canvas = $('#stage');
const dom = {
  loading: $('#loading'),
  loadingBar: $('#loading-bar'),
  loadingText: $('#loading-text'),
  hint: $('#hint'),
  hover: $('#hover-label'),
  toast: $('#toast'),
  a11y: $('#a11y-list'),
  hideUi: $('#btn-hide-ui'),
  showUi: $('#btn-show-ui'),
  boing: $('#btn-boing'),
  refill: $('#btn-refill'),
  record: $('#btn-record'),
  recorder: $('#recorder'),
  recorderFrame: $('#recorder-frame'),
  recorderResult: $('#recorder-result'),
  recTime: $('#rec-time'),
  recVideo: $('#rec-video'),
  recDownload: $('#rec-download'),
  recNote: $('#rec-note'),
  recAgain: $('#rec-again'),
  recClose: $('#rec-close'),
};

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 860;

const state = {
  portion: 5,
  serving: 'steamer',
  steam: true,
  sauce: true,
  sound: false,
  autoplay: false,
  uiHidden: false,
  reducedMotion: reducedMotionQuery.matches,
  recording: false,
  selected: -1,
  keyboardMode: false,
};

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  if ([3, 5, 8].includes(saved.portion)) state.portion = saved.portion;
  if (['steamer', 'plate'].includes(saved.serving)) state.serving = saved.serving;
  if (typeof saved.steam === 'boolean') state.steam = saved.steam;
  if (typeof saved.sauce === 'boolean') state.sauce = saved.sauce;
} catch {
  /* ignore */
}
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ portion: state.portion, serving: state.serving, steam: state.steam, sauce: state.sauce }));
  } catch {
    /* ignore */
  }
}

let toastTimer = 0;
function toast(msg, ms = 2400) {
  dom.toast.textContent = msg;
  dom.toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('is-on'), ms);
}

function setLoading(fraction, text) {
  dom.loadingBar.style.width = `${Math.round(10 + fraction * 90)}%`;
  if (text) dom.loadingText.textContent = text;
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

let api;
try {
  api = createScene(canvas, { isMobile });
} catch (err) {
  console.error(err);
  setLoading(1, 'WebGL is not available in this browser.');
  throw err;
}
const { renderer, scene, camera, controls } = api;
const tweens = new Tweens();
tweens.timeScale = state.reducedMotion ? 0.7 : 1;
const sound = new SoundKit();

setLoading(0.15, 'Weaving the steamer…');

const textures = {
  bamboo: TX.makeBambooTexture(),
  rattan: TX.makeRattanTexture(),
  weave: TX.makeWeaveTexture(),
  parchment: TX.makeParchmentTextures(),
  softDot: TX.makeSoftDotTexture(),
  plateGlaze: TX.makePlateGlazeTexture(),
  stoneware: TX.makeStonewareTexture({ base: PALETTE.terracotta }),
  stonewareCream: TX.makeStonewareTexture({ base: '#f4e8d6', seed: 5 }),
  mouths: TX.makeMouthTextures(),
};
const materials = createPropMaterials(textures);

const steamer = createSteamer(materials);
const lid = createSteamerLid(materials);
lid.position.set(-2.35, 0.16, -2.15);
lid.rotation.set(0.0, 0.35, 0.0);
const plate = createPlate(materials);
plate.visible = false;
const bowl = createSauceBowl(materials);
const chopsticks = createChopsticks(materials);
const rest = createChopstickRest(materials);
scene.add(steamer, lid, plate, bowl, chopsticks, rest);

const steam = new Steam(textures.softDot, isMobile ? 260 : 440);
scene.add(steam);
const particles = new Particles(scene, textures.softDot);
const bubble = new Bubble();
scene.add(bubble);

const selectionRing = new THREE.Mesh(
  new THREE.TorusGeometry(1, 0.022, 8, 64),
  new THREE.MeshBasicMaterial({ color: PALETTE.terracotta, transparent: true, opacity: 0.85 })
);
selectionRing.rotation.x = -Math.PI / 2;
selectionRing.visible = false;
scene.add(selectionRing);

const caption = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }));
caption.material.toneMapped = false;
caption.visible = false;
caption.renderOrder = 21;
caption.center.set(0, 0);
scene.add(caption);

// ---------------------------------------------------------------------------
// Dumplings
// ---------------------------------------------------------------------------

/** Normalise any dumpling mesh: bottom at y=0, centred, radius ≈ 1. */
function normaliseGeometry(geometry) {
  const g = geometry.clone();
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const size = new THREE.Vector3();
  bb.getSize(size);
  const cx = (bb.min.x + bb.max.x) / 2;
  const cz = (bb.min.z + bb.max.z) / 2;
  const radius = Math.max(size.x, size.z) / 2;
  const m = new THREE.Matrix4().makeScale(1 / radius, 1 / radius, 1 / radius).multiply(new THREE.Matrix4().makeTranslation(-cx, -bb.min.y, -cz));
  g.applyMatrix4(m);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  return { geometry: g, height: g.boundingBox.max.y };
}

async function loadDumplingGeometry() {
  try {
    const gltf = await new Promise((resolve, reject) => {
      new GLTFLoader().load(
        MODEL_URL,
        resolve,
        (e) => {
          if (e.total) setLoading(0.2 + (0.5 * e.loaded) / e.total, 'Folding the dumplings…');
        },
        reject
      );
    });
    let best = null;
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => {
      if (o.isMesh && (!best || o.geometry.attributes.position.count > best.geometry.attributes.position.count)) best = o;
    });
    if (!best) throw new Error('GLB has no mesh');
    const geo = best.geometry.clone();
    geo.applyMatrix4(best.matrixWorld);
    return normaliseGeometry(geo);
  } catch (err) {
    console.warn('Falling back to the procedural dumpling:', err);
    return normaliseGeometry(createDumplingGeometry(THREE));
  }
}

const dumplings = [];
const alive = () => dumplings.filter((d) => d.alive && d.inPlay);
const others = (d) => alive().filter((o) => o !== d && !o.held);

function servingSurface() {
  return state.serving === 'plate' ? plate : steamer;
}

/** Arrange `count` dumplings on the serving surface. */
function serve(count, animate = true) {
  tasting.cancel();
  bubble.hide();
  const preset = PORTIONS[count];
  const surfaceY = servingSurface().userData.surfaceY;
  const spots = [];
  for (const ring of preset.rings) {
    for (let i = 0; i < ring.n; i++) {
      const a = ring.phase + (i / ring.n) * Math.PI * 2;
      const wrapped = Math.atan2(Math.sin(a), Math.cos(a));
      spots.push({ x: Math.sin(a) * ring.r, z: Math.cos(a) * ring.r, a: ring.r > 0 ? wrapped : 0 });
    }
  }
  // front-most first so the closest dumpling reads as the "lead"
  spots.sort((p, q) => q.z - p.z);
  dumplings.forEach((d, i) => {
    const spot = spots[i];
    d.inPlay = !!spot;
    d.resetState();
    if (!spot) {
      d.visible = false;
      return;
    }
    d.baseScale = preset.scale;
    d.baseY = surfaceY;
    d.baseYaw = spot.a * 0.1 + rand(-0.15, 0.15);
    d.position.set(spot.x + rand(-0.02, 0.02), surfaceY, spot.z + rand(-0.02, 0.02));
    d.rotation.set(0, d.baseYaw, 0);
    d.visible = true;
  });
  if (animate && !state.reducedMotion) {
    // stagger the pop-in
    const inPlay = dumplings.filter((d) => d.inPlay);
    inPlay.forEach((d, i) => {
      const s = preset.scale;
      d.baseScale = 0.001;
      tweens
        .wait(null, 0.06 * i)
        .then(() => tweens.run(null, 0.5, (t) => (d.baseScale = Math.max(0.001, s * t)), Ease.outBack))
        .then(() => {
          d.baseScale = s;
          d.squashVel -= 1.0;
        });
    });
  }
  refreshA11y();
  updateSelectionRing();
}

function refreshA11y() {
  dom.a11y.innerHTML = '';
  alive().forEach((d, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Taste ${d.personality.name}, ${d.personality.trait}`;
    b.addEventListener('click', () => taste(d));
    dom.a11y.appendChild(b);
  });
  if (!alive().length) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Refill the steamer';
    b.addEventListener('click', refill);
    dom.a11y.appendChild(b);
  }
}

// ---------------------------------------------------------------------------
// Tasting
// ---------------------------------------------------------------------------

const restPose = {
  position: new THREE.Vector3(LAYOUT.rest.x, 0.118, LAYOUT.rest.z),
  quaternion: chopstickQuaternion(new THREE.Vector3(0.58, -0.035, 0.81)),
  gap: 0.02,
};

function floorAt(x, z) {
  const B = LAYOUT.bowl;
  const db = Math.hypot(x - B.x, z - B.z);
  if (db < B.sauceRadius) return bowl.position.y + B.sauceY;
  if (db < B.radius + 0.02) return B.height;
  const dc = Math.hypot(x, z);
  const surf = servingSurface();
  if (state.serving === 'steamer') {
    if (dc < LAYOUT.steamerInnerRadius) return surf.userData.surfaceY;
    if (dc < LAYOUT.steamerInnerRadius + LAYOUT.steamerWall + 0.03) return LAYOUT.steamerHeight;
  } else {
    if (dc < 1.35) return surf.userData.surfaceY;
    if (dc < LAYOUT.plateRadius + 0.03) return 0.12 + (dc - 1.35) * 0.25;
  }
  return 0;
}

let tasting;

async function taste(d) {
  if (!d || !d.alive || tasting.busy || state.recording) return;
  sound.unlock();
  hideHover();
  dom.hint.style.opacity = '0';
  const done = await tasting.run(d, others(d));
  if (done) {
    refreshA11y();
    if (state.selected >= dumplings.indexOf(d)) moveSelection(0);
    if (!alive().length) {
      toast('All gone. Refill for another round.');
      if (state.autoplay) autoplayTimer = 1.6;
    }
  }
}

function refill(animate = true) {
  sound.unlock();
  serve(state.portion, animate);
  if (animate) sound.play('refill');
  dom.hint.style.opacity = '';
}

function boing() {
  sound.unlock();
  sound.play('boing');
  alive().forEach((d, i) => {
    if (d.held) return;
    setTimeout(() => d.doHop(1.1), i * 70);
  });
}

// ---------------------------------------------------------------------------
// Pointer & keyboard
// ---------------------------------------------------------------------------

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pointerInfo = { over: false, down: null, moved: false, x: 0, y: 0 };
const lookPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.45);
const pointerWorld = new THREE.Vector3();
let hovered = null;

function updatePointer(e) {
  const r = canvas.getBoundingClientRect();
  pointerInfo.x = e.clientX;
  pointerInfo.y = e.clientY;
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  pointerInfo.over = true;
}

canvas.addEventListener('pointermove', (e) => {
  updatePointer(e);
  if (pointerInfo.down) {
    if (Math.hypot(e.clientX - pointerInfo.down.x, e.clientY - pointerInfo.down.y) > 7) {
      pointerInfo.moved = true;
      canvas.classList.add('is-dragging');
    }
  }
});
canvas.addEventListener('pointerleave', () => {
  pointerInfo.over = false;
  setHovered(null);
});
canvas.addEventListener('pointerdown', (e) => {
  updatePointer(e);
  pointerInfo.down = { x: e.clientX, y: e.clientY, t: performance.now() };
  pointerInfo.moved = false;
  state.keyboardMode = false;
  updateSelectionRing();
});
window.addEventListener('pointerup', (e) => {
  canvas.classList.remove('is-dragging');
  const down = pointerInfo.down;
  pointerInfo.down = null;
  if (!down || pointerInfo.moved || performance.now() - down.t > 600) return;
  if (e.target !== canvas) return;
  updatePointer(e);
  const hit = pickDumpling();
  if (hit) taste(hit);
  else sound.unlock();
});

function pickDumpling() {
  raycaster.setFromCamera(pointer, camera);
  const bodies = alive()
    .filter((d) => !d.held)
    .map((d) => d.body);
  const hit = raycaster.intersectObjects(bodies, false)[0];
  return hit ? hit.object.parent : null;
}

function setHovered(d) {
  if (hovered === d) return;
  if (hovered) hovered.hovered = false;
  hovered = d;
  if (d) {
    d.hovered = true;
    canvas.classList.add('is-hovering');
    dom.hover.innerHTML = `${d.personality.name} <em>· ${d.personality.trait}</em>`;
    dom.hover.hidden = false;
  } else {
    hideHover();
  }
}
function hideHover() {
  canvas.classList.remove('is-hovering');
  dom.hover.hidden = true;
}

function updateSelectionRing() {
  const list = alive();
  const d = state.keyboardMode && state.selected >= 0 ? dumplings[state.selected] : null;
  if (!d || !d.alive || d.held || !list.includes(d)) {
    selectionRing.visible = false;
    return;
  }
  selectionRing.visible = true;
  selectionRing.position.set(d.position.x, d.baseY + 0.012, d.position.z);
  const s = d.baseScale * 1.12;
  selectionRing.scale.set(s, s, s);
}

function moveSelection(dir) {
  const list = alive().filter((d) => !d.held);
  if (!list.length) {
    state.selected = -1;
    updateSelectionRing();
    return;
  }
  let idx = list.findIndex((d) => dumplings.indexOf(d) === state.selected);
  if (idx < 0) idx = dir >= 0 ? -1 : 0;
  idx = (idx + dir + list.length) % list.length;
  state.selected = dumplings.indexOf(list[idx]);
  state.keyboardMode = true;
  updateSelectionRing();
}

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const onButton = e.target instanceof HTMLElement && e.target.matches('button, a, input, select, textarea, video');
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      if (onButton && !(e.target === canvas)) return;
      e.preventDefault();
      moveSelection(1);
      canvas.focus();
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      if (onButton && !(e.target === canvas)) return;
      e.preventDefault();
      moveSelection(-1);
      canvas.focus();
      break;
    case 'Enter':
    case ' ':
      if (onButton) return;
      e.preventDefault();
      if (state.selected < 0 || !dumplings[state.selected]?.alive) moveSelection(1);
      taste(dumplings[state.selected]);
      break;
    case 'b':
    case 'B':
      boing();
      break;
    case 'r':
    case 'R':
      refill();
      break;
    case 'a':
    case 'A':
      setToggle('autoplay', !state.autoplay);
      break;
    case 'm':
    case 'M':
      setToggle('sound', !state.sound);
      break;
    case 's':
    case 'S':
      setToggle('steam', !state.steam);
      break;
    case 'h':
    case 'H':
      setUiHidden(!state.uiHidden);
      break;
    case 'Escape':
      if (state.recording) return;
      if (!dom.recorderResult.hidden) closeRecorder();
      else if (state.uiHidden) setUiHidden(false);
      break;
    default:
      return;
  }
});

// ---------------------------------------------------------------------------
// UI wiring
// ---------------------------------------------------------------------------

function setPortion(n) {
  state.portion = n;
  document.querySelectorAll('[data-portion]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.portion) === n)));
  persist();
}
function setServing(s) {
  state.serving = s;
  document.querySelectorAll('[data-serving]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.serving === s)));
  steamer.visible = s === 'steamer';
  lid.visible = s === 'steamer';
  plate.visible = s === 'plate';
  persist();
}
function setToggle(name, on) {
  state[name] = on;
  const b = document.querySelector(`[data-toggle="${name}"]`);
  if (b) b.setAttribute('aria-pressed', String(on));
  if (name === 'sound') {
    sound.unlock();
    sound.setEnabled(on);
    if (on) sound.play('click');
  }
  if (name === 'steam') steam.targetIntensity = on ? 1 : 0;
  if (name === 'sauce') {
    bowl.visible = on;
  }
  if (name === 'autoplay') {
    autoplayTimer = on ? 0.8 : 0;
    if (on) sound.unlock();
  }
  persist();
}
function setUiHidden(hidden) {
  state.uiHidden = hidden;
  document.body.classList.toggle('ui-hidden', hidden);
  dom.showUi.hidden = !hidden;
  if (hidden) hideHover();
}

document.querySelectorAll('[data-portion]').forEach((b) =>
  b.addEventListener('click', () => {
    sound.unlock();
    sound.play('click');
    setPortion(Number(b.dataset.portion));
    serve(state.portion, true);
  })
);
document.querySelectorAll('[data-serving]').forEach((b) =>
  b.addEventListener('click', () => {
    sound.unlock();
    sound.play('click');
    setServing(b.dataset.serving);
    serve(state.portion, true);
  })
);
document.querySelectorAll('[data-toggle]').forEach((b) =>
  b.addEventListener('click', () => setToggle(b.dataset.toggle, b.getAttribute('aria-pressed') !== 'true'))
);
dom.boing.addEventListener('click', boing);
dom.refill.addEventListener('click', () => refill(true));
dom.hideUi.addEventListener('click', () => setUiHidden(true));
dom.showUi.addEventListener('click', () => setUiHidden(false));
dom.record.addEventListener('click', () => recordBite());
dom.recAgain.addEventListener('click', () => recordBite());
dom.recClose.addEventListener('click', closeRecorder);

reducedMotionQuery.addEventListener?.('change', (e) => {
  state.reducedMotion = e.matches;
  tweens.timeScale = e.matches ? 0.7 : 1;
  dumplings.forEach((d) => (d.reducedMotion = e.matches));
});

// ---------------------------------------------------------------------------
// Autoplay
// ---------------------------------------------------------------------------

let autoplayTimer = 0;
function updateAutoplay(dt) {
  if (!state.autoplay || state.recording || tasting.busy) return;
  autoplayTimer -= dt;
  if (autoplayTimer > 0) return;
  const list = alive();
  if (!list.length) {
    refill(true);
    autoplayTimer = 2.2;
    return;
  }
  autoplayTimer = rand(2.6, 4.2);
  taste(pick(list));
}

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

const recorder = new BiteRecorder(canvas);
let recStart = 0;
let recAcc = 0;
let lastResultUrl = null;

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

async function recordBite() {
  if (state.recording) return;
  if (!BiteRecorder.supported || !BiteRecorder.pickMime()) {
    toast('Recording is not supported in this browser.');
    return;
  }
  sound.unlock();
  if (tasting.busy) {
    tasting.cancel();
    await tweens.wait(null, 0.1);
  }
  if (!alive().length) {
    serve(state.portion, true);
    await tweens.wait(null, 0.9);
  }
  if (lastResultUrl) URL.revokeObjectURL(lastResultUrl);
  lastResultUrl = null;
  state.recording = true;
  hideHover();
  selectionRing.visible = false;
  document.body.classList.add('is-recording');
  dom.recorder.hidden = false;
  dom.recorder.classList.remove('has-result');
  dom.recorderFrame.hidden = false;
  dom.recorderResult.hidden = true;
  dom.recTime.textContent = '00:00';
  api.setSquare(true, 1080);
  caption.material.map?.dispose();
  const capTex = TX.makeCaptionTexture('The Dumpling Club', 'Small bites. Big feelings.');
  caption.material.map = capTex;
  caption.material.needsUpdate = true;
  caption.userData.aspect = capTex.userData.aspect;
  caption.visible = true;
  sound.play('shutter');
  await tweens.wait(null, 0.15);
  let choice;
  try {
    choice = recorder.start(state.sound ? sound.audioTrack : null);
  } catch (err) {
    console.error(err);
    toast('Could not start the recorder.');
    exitRecordingMode();
    return;
  }
  recStart = performance.now();
  recAcc = 0;
  await tweens.wait(null, 0.8);
  const list = alive();
  const d = pick(list);
  await tasting.run(d, others(d));
  refreshA11y();
  await tweens.wait(null, 0.75);
  const result = await recorder.stop();
  exitRecordingMode();
  if (!result || !result.blob.size) {
    toast('The recording came back empty. Please try again.');
    closeRecorder();
    return;
  }
  lastResultUrl = URL.createObjectURL(result.blob);
  dom.recVideo.src = lastResultUrl;
  dom.recDownload.href = lastResultUrl;
  dom.recDownload.download = `the-dumpling-club-bite.${result.ext}`;
  dom.recDownload.textContent = `Save ${result.ext.toUpperCase()}`;
  const mb = (result.blob.size / 1048576).toFixed(1);
  dom.recNote.textContent =
    result.ext === 'mp4'
      ? `MP4${/avc1/i.test(result.mime) ? ' (H.264)' : ''} · 1080 × 1080 · 30 fps · ${mb} MB`
      : `WebM · 1080 × 1080 · 30 fps · ${mb} MB — this browser cannot encode MP4, so a WebM file was saved instead.`;
  dom.recorderResult.hidden = false;
  dom.recorder.classList.add('has-result');
  dom.recDownload.focus();
  sound.play('refill', { volume: 0.5 });
  void choice;
}

function exitRecordingMode() {
  state.recording = false;
  caption.visible = false;
  api.setSquare(false);
  document.body.classList.remove('is-recording');
  dom.recorderFrame.hidden = true;
}

function closeRecorder() {
  dom.recorder.hidden = true;
  dom.recorder.classList.remove('has-result');
  dom.recorderResult.hidden = true;
  dom.recVideo.pause();
  dom.recVideo.removeAttribute('src');
  dom.recVideo.load();
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function resize() {
  if (state.recording) return;
  api.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
let time = 0;
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  time += dt;

  tweens.update(dt);
  tasting?.update();

  // hover & look target
  let look = null;
  if (pointerInfo.over && !state.recording && !pointerInfo.down) {
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(lookPlane, pointerWorld)) look = pointerWorld;
    if (!tasting.busy) setHovered(pickDumpling());
    else setHovered(null);
  } else if (!pointerInfo.over) {
    setHovered(null);
  }
  for (const d of dumplings) {
    if (!d.inPlay) continue;
    d.update(dt, time, look);
  }
  if (hovered && !dom.hover.hidden) {
    hovered.topWorld(tmp).project(camera);
    const r = canvas.getBoundingClientRect();
    dom.hover.style.transform = `translate(${r.left + ((tmp.x + 1) / 2) * r.width}px, ${r.top + ((1 - tmp.y) / 2) * r.height - 14}px) translate(-50%, -100%)`;
  }

  // steam emitters follow the dumplings; a soft plume rises from the steamer itself
  let ei = 0;
  for (const d of dumplings) {
    if (!d.inPlay) continue;
    const on = d.alive && d.visible ? 1 : 0;
    steam.setEmitter(ei++, on ? d.topWorld(tmp) : tmp.set(0, -5, 0), on, d.baseScale * 2.3);
  }
  const plume = state.serving === 'steamer' ? 0.5 : 0.15;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.6;
    tmp.set(Math.sin(a) * 0.75, servingSurface().userData.surfaceY + 0.05, Math.cos(a) * 0.75);
    steam.setEmitter(ei++, tmp, plume, 1.9);
  }
  steam.clearFrom(ei);
  steam.update(dt, camera, renderer);

  particles.update(dt);
  bowl.userData.sauce.update(dt);
  updateAutoplay(dt);
  updateSelectionRing();

  // bubble and caption float in camera space
  if (bubble.visible) {
    bubble.position.copy(tmp2.set(0.3, 0.62, -4.3).applyMatrix4(camera.matrixWorld));
  }
  bubble.update(dt);
  if (caption.visible) {
    const halfH = 3.0 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    caption.position.copy(tmp2.set(-halfH * 0.92, -halfH * 0.94, -3.0).applyMatrix4(camera.matrixWorld));
    const w = halfH * 1.15;
    caption.scale.set(w, w / caption.userData.aspect, 1);
  }

  controls.enabled = !state.recording;
  controls.update();

  if (state.recording) {
    dom.recTime.textContent = formatTime((performance.now() - recStart) / 1000);
    recAcc += dt;
    if (recAcc < 1 / 30) return;
    recAcc -= 1 / 30;
    renderer.render(scene, camera);
    recorder.frame();
    return;
  }
  renderer.render(scene, camera);
}

async function boot() {
  const fontsReady = document.fonts?.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
  const [{ geometry, height }] = await Promise.all([loadDumplingGeometry(), fontsReady]);
  setLoading(0.8, 'Adding faces…');
  PERSONALITIES.forEach((p) => {
    const d = new Dumpling({ geometry, height, personality: p, mouths: textures.mouths, reducedMotion: state.reducedMotion });
    d.inPlay = false;
    d.visible = false;
    d.onHop = () => sound.play('hop', { volume: 0.5 });
    scene.add(d);
    dumplings.push(d);
  });

  tasting = new Tasting({
    camera,
    tweens,
    sound,
    particles,
    chopsticks,
    bowl,
    bubble,
    restPose,
    floorAt,
    getOptions: () => ({ sauce: state.sauce && bowl.visible, reducedMotion: state.reducedMotion }),
  });

  setPortion(state.portion);
  setServing(state.serving);
  setToggle('steam', state.steam);
  setToggle('sauce', state.sauce);
  setToggle('sound', false);
  setToggle('autoplay', false);
  if (!BiteRecorder.supported) dom.record.title = 'Recording is not supported in this browser';
  if (window.matchMedia('(pointer: coarse)').matches) dom.hint.innerHTML = '<span class="hint__key">Tip</span> Tap a dumpling to taste it.';

  // warm up shaders before revealing
  serve(state.portion, false);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  setLoading(1, 'Ready.');
  serve(state.portion, true);
  frame();
  window.__club = { state, dumplings, taste, refill, boing, serve, camera, controls, tasting, recordBite, alive, get time() { return time; } };
  requestAnimationFrame(() => {
    dom.loading.classList.add('is-done');
    if (state.reducedMotion) toast('Reduced motion is on: gentler animations.', 3200);
  });
}

boot().catch((err) => {
  console.error(err);
  setLoading(1, 'Something went wrong while steaming. Please reload.');
});
