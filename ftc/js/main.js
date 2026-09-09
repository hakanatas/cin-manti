import { LAYERS, ROLES, RESOURCES, AWARDS, TASKS, SUPPLY } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// Hero: hexagon field. BIOBUZZ sezonu için petek, imleç ışığıyla canlanıyor.
// ---------------------------------------------------------------------------
function hive() {
  const cv = $('#hive');
  const g = cv.getContext('2d');
  const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
  let cells = [];
  let w = 0;
  let h = 0;
  let dpr = 1;

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = cv.clientWidth;
    h = cv.clientHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = Math.max(26, Math.min(46, w / 34)); // hücre yarıçapı
    const dx = R * Math.sqrt(3);
    const dy = R * 1.5;
    cells = [];
    for (let row = -1; row * dy < h + R; row++) {
      for (let col = -1; col * dx < w + dx; col++) {
        const x = col * dx + (row % 2 ? dx / 2 : 0);
        const y = row * dy;
        cells.push({ x, y, r: R, seed: Math.random() * Math.PI * 2, lit: Math.random() < 0.045 });
      }
    }
  }

  function hex(x, y, r) {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      const px = x + r * 0.92 * Math.cos(a);
      const py = y + r * 0.92 * Math.sin(a);
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
  }

  let t = 0;
  function frame() {
    requestAnimationFrame(frame);
    t += reduced ? 0.002 : 0.006;
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    g.clearRect(0, 0, w, h);
    const R = cells.length ? cells[0].r : 30;
    const reach = R * 5.5;
    for (const c of cells) {
      const drift = Math.sin(t + c.seed + c.x * 0.004) * 0.5 + 0.5;
      const d = Math.hypot(c.x - pointer.x, c.y - pointer.y);
      const near = d < reach ? 1 - d / reach : 0;
      const glow = near * near;
      hex(c.x, c.y, c.r);
      g.strokeStyle = `rgba(127, 176, 147, ${0.06 + drift * 0.05 + glow * 0.5})`;
      g.lineWidth = 1 + glow * 1.2;
      g.stroke();
      if (c.lit || glow > 0.42) {
        const a = (c.lit ? 0.05 + drift * 0.09 : 0) + glow * 0.22;
        g.fillStyle = `rgba(224, 149, 47, ${a})`;
        g.fill();
      }
    }
  }

  build();
  frame();
  window.addEventListener('resize', build);
  window.addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect();
    pointer.tx = e.clientX - r.left;
    pointer.ty = e.clientY - r.top;
  });
  window.addEventListener('pointerleave', () => {
    pointer.tx = -9999;
    pointer.ty = -9999;
  });
}

// ---------------------------------------------------------------------------
// Reveal on scroll + sticky nav
// ---------------------------------------------------------------------------
function reveals() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
  );
  const attach = () => $$('.reveal:not(.is-in)').forEach((el) => {
    el.style.setProperty('--d', el.dataset.d || 0);
    io.observe(el);
  });
  attach();
  return attach;
}

function stickyNav() {
  const nav = $('#nav');
  const on = () => nav.classList.toggle('is-stuck', window.scrollY > 40);
  on();
  window.addEventListener('scroll', on, { passive: true });
}

// ---------------------------------------------------------------------------
// Marquee
// ---------------------------------------------------------------------------
function marquee() {
  const items = ['3 katman', `${RESOURCES.length} kaynak`, '5 yapı sistemi', '9 ödül', '~6 ay', 'soru sormak yöntemdir', 'oyun değişir, kaynaklar değişmez'];
  const one = items.map((i) => `${i}<i>◆</i>`).join('');
  $('#marquee').innerHTML = `<span>${one}</span><span>${one}</span>`;
}

// ---------------------------------------------------------------------------
// Katmanlar: sticky yığın kartlar + tek soruluk test
// ---------------------------------------------------------------------------
function layers(goToAtlas) {
  const host = $('#stackcards');
  host.innerHTML = '';
  Object.entries(LAYERS).forEach(([key, l], i) => {
    const el = document.createElement('article');
    el.className = 'layer';
    el.style.setProperty('--c', l.color);
    el.style.top = `${96 + i * 16}px`;
    el.style.zIndex = String(i + 1);
    const n = RESOURCES.filter((r) => r.layer === key).length;
    el.innerHTML = `
      <span class="layer__no">${l.no}</span>
      <h3 class="layer__name">${l.name}</h3>
      <p class="layer__line">${l.line}</p>
      <p class="layer__body">${l.body}</p>
      <div class="layer__pills"><button type="button" data-layer="${key}">Bu katmandaki ${n} kaynağı gör</button></div>`;
    host.appendChild(el);
  });
  $$('#stackcards [data-layer]').forEach((b) =>
    b.addEventListener('click', () => goToAtlas(b.dataset.layer))
  );

  const opts = [
    { k: 'resmi', label: 'Manual’ın şu maddesi', ok: true },
    { k: 'dokuman', label: 'gm0’da böyle yazıyor', ok: false },
    { k: 'canli', label: 'Discord’da biri öyle dedi', ok: false },
  ];
  const box = $('#quiz-opts');
  const why = $('#quiz-why');
  opts.forEach((o) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = o.label;
    b.addEventListener('click', () => {
      if (box.classList.contains('is-done')) return;
      box.classList.add('is-done');
      b.classList.add(o.ok ? 'is-right' : 'is-wrong');
      $$('button', box).forEach((x, i) => {
        if (opts[i].ok) x.classList.add('is-right');
      });
      why.hidden = false;
      why.textContent = o.ok
        ? 'Doğru. Yalnızca resmî katman bağlayıcıdır: Manual ve Q&A cevapları. Gerisi yorumdur, ne kadar iyi yazılmış olursa olsun.'
        : 'Hayır. Bu katman öğretir ama bağlamaz. Tartışmayı yalnızca Manual maddesi veya resmî Q&A cevabı bitirir.';
    });
    box.appendChild(b);
  });
}

// ---------------------------------------------------------------------------
// Atlas: arama + filtreler
// ---------------------------------------------------------------------------
function atlas() {
  const cardsEl = $('#cards');
  const qEl = $('#q');
  const countEl = $('#count');
  const emptyEl = $('#empty');
  const state = { q: '', layer: null, role: null };

  const norm = (s) =>
    s
      .toLocaleLowerCase('tr')
      .replaceAll('ı', 'i')
      .replaceAll('ğ', 'g')
      .replaceAll('ü', 'u')
      .replaceAll('ş', 's')
      .replaceAll('ö', 'o')
      .replaceAll('ç', 'c');

  // filtre çipleri
  const layerBox = $('#chips-layer');
  const mk = (label, val, box, kind, color) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = color ? `<i style="color:${color}"></i>${label}` : label;
    b.addEventListener('click', () => {
      state[kind] = state[kind] === val ? null : val;
      $$('.chip', box).forEach((c) => c.setAttribute('aria-pressed', String(c === b && state[kind] === val)));
      render();
    });
    box.appendChild(b);
    return b;
  };
  Object.entries(LAYERS).forEach(([k, l]) => mk(l.name, k, layerBox, 'layer', l.color));
  const roleBox = $('#chips-role');
  Object.entries(ROLES).forEach(([k, label]) => mk(label, k, roleBox, 'role'));

  function render() {
    const q = norm(state.q.trim());
    const list = RESOURCES.filter((r) => {
      if (state.layer && r.layer !== state.layer) return false;
      if (state.role && !r.roles.includes(state.role)) return false;
      if (!q) return true;
      return norm(`${r.name} ${r.desc} ${r.url || ''} ${r.roles.map((x) => ROLES[x]).join(' ')}`).includes(q);
    });
    cardsEl.innerHTML = '';
    for (const r of list) {
      const l = LAYERS[r.layer];
      const tag = r.url ? 'a' : 'div';
      const el = document.createElement(tag);
      el.className = 'card';
      el.style.setProperty('--c', l.color);
      if (r.url) {
        el.href = r.url;
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
      }
      const host = r.url ? r.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
      el.innerHTML = `
        <div class="card__top">
          <span class="card__layer">${l.short}</span>
          <span class="card__kind">${r.kind === 'sezonluk' ? 'sezonluk' : 'kalıcı'}${r.local ? ' · Türkiye' : ''}</span>
        </div>
        <h3 class="card__name">${r.star ? '<span class="card__star">◆</span> ' : ''}${r.name}</h3>
        <p class="card__desc">${r.desc}</p>
        <div class="card__roles">${r.roles.map((x) => `<span>${ROLES[x]}</span>`).join('')}</div>
        <div class="card__foot">
          ${r.url ? `<span class="card__url">${host}</span><span class="card__go">↗</span>` : '<span class="card__soon">adres bekliyor</span>'}
        </div>`;
      cardsEl.appendChild(el);
    }
    countEl.textContent = `${list.length} / ${RESOURCES.length}`;
    emptyEl.hidden = list.length > 0;
  }

  qEl.addEventListener('input', () => {
    state.q = qEl.value;
    render();
  });
  render();
  $('#stat-count').textContent = String(RESOURCES.length);

  return {
    focusLayer(key) {
      state.layer = key;
      state.role = null;
      state.q = '';
      qEl.value = '';
      $$('.chip', layerBox).forEach((c, i) => c.setAttribute('aria-pressed', String(Object.keys(LAYERS)[i] === key)));
      $$('.chip', roleBox).forEach((c) => c.setAttribute('aria-pressed', 'false'));
      render();
      $('#atlas').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    },
    focusRole(key) {
      state.role = key;
      state.layer = null;
      state.q = '';
      qEl.value = '';
      $$('.chip', roleBox).forEach((c, i) => c.setAttribute('aria-pressed', String(Object.keys(ROLES)[i] === key)));
      $$('.chip', layerBox).forEach((c) => c.setAttribute('aria-pressed', 'false'));
      render();
      $('#atlas').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    },
    search(text) {
      state.q = text;
      state.layer = null;
      state.role = null;
      qEl.value = text;
      $$('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      render();
      $('#atlas').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    },
  };
}

// ---------------------------------------------------------------------------
// Ödüller
// ---------------------------------------------------------------------------
function awards(api) {
  const host = $('#awards');
  for (const a of AWARDS) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `award${a.big ? ' award--big' : ''}`;
    el.style.textAlign = 'left';
    el.style.cursor = 'pointer';
    el.innerHTML = `
      <p class="award__role">${a.role}</p>
      <h3 class="award__name">${a.name}</h3>
      <p class="award__desc">${a.desc}</p>`;
    el.addEventListener('click', () => api.focusRole(a.roleKey));
    host.appendChild(el);
  }
}

// ---------------------------------------------------------------------------
// Sipariş penceresi
// ---------------------------------------------------------------------------
function supply() {
  const range = $('#weeks');
  const out = $('#weeks-out');
  const box = $('#verdict');
  const tones = { bad: '#d9704a', warn: '#e0952f', ok: '#7fb093' };
  function draw() {
    const w = Number(range.value);
    out.textContent = `${w} hafta`;
    const row = SUPPLY.find((s) => w <= s.max);
    box.style.setProperty('--tone', tones[row.tone]);
    box.innerHTML = `<b>${row.verdict}</b><span>${row.line}</span>`;
  }
  range.addEventListener('input', draw);
  draw();
}

// ---------------------------------------------------------------------------
// Bu haftanın görevleri
// ---------------------------------------------------------------------------
function week(api) {
  const host = $('#tasks');
  const ring = $('#ring-fg');
  const num = $('#ring-num');
  const KEY = 'ftc-hafta';
  let done = {};
  try {
    done = JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    done = {};
  }
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(done));
    } catch {
      /* gizli sekmede yazamayabiliriz, sorun değil */
    }
  };
  function paint() {
    const n = TASKS.filter((t) => done[t.id]).length;
    num.textContent = `${n}/${TASKS.length}`;
    ring.style.strokeDashoffset = String(327 - (327 * n) / TASKS.length);
  }
  TASKS.forEach((t) => {
    const li = document.createElement('li');
    li.className = `task${done[t.id] ? ' is-done' : ''}`;
    li.innerHTML = `
      <button type="button" aria-pressed="${!!done[t.id]}">
        <span class="task__box"><svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3.2L13 5" stroke="#0e2a1e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <span class="task__text">${t.text}<span class="task__hint">${t.hint} →</span></span>
      </button>`;
    const b = li.querySelector('button');
    b.addEventListener('click', (e) => {
      if (e.target.closest('.task__hint')) return;
      done[t.id] = !done[t.id];
      li.classList.toggle('is-done', !!done[t.id]);
      b.setAttribute('aria-pressed', String(!!done[t.id]));
      save();
      paint();
    });
    li.querySelector('.task__hint').addEventListener('click', (e) => {
      e.stopPropagation();
      api.search(t.hint);
    });
    host.appendChild(li);
  });
  paint();
}

/** Hero sayaçları: sayfaya girerken sayıyor. */
function counters() {
  const els = $$('.hero__stats dd');
  for (const el of els) {
    const raw = el.textContent.trim();
    const m = raw.match(/^(\D*)(\d+)(.*)$/);
    if (!m || reduced) continue;
    const [, pre, numStr, post] = m;
    const target = Number(numStr);
    const dur = 900;
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = `${pre}${Math.round(target * e)}${post}`;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

/** Kartlarda imleci takip eden hafif eğim. */
function magnetic(sel) {
  if (reduced) return;
  const host = $(sel);
  if (!host) return;
  let active = null;
  host.addEventListener('pointermove', (e) => {
    const el = e.target.closest('.card, .award');
    if (el !== active) {
      if (active) active.style.transform = '';
      active = el;
    }
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `translateY(-4px) rotateX(${-y * 5}deg) rotateY(${x * 6}deg)`;
  });
  host.addEventListener('pointerleave', () => {
    if (active) active.style.transform = '';
    active = null;
  });
}

function endLayers() {
  const host = $('#end-layers');
  Object.values(LAYERS).forEach((l) => {
    const el = document.createElement('div');
    el.className = 'end__layer';
    el.style.setProperty('--c', l.color);
    el.innerHTML = `<b>${l.short}</b><span>${l.line}</span>`;
    host.appendChild(el);
  });
}

// ---------------------------------------------------------------------------
hive();
stickyNav();
marquee();
const attachReveals = reveals();
const api = atlas();
layers((k) => api.focusLayer(k));
awards(api);
supply();
week(api);
endLayers();
counters();
magnetic('#cards');
magnetic('#awards');
attachReveals();
