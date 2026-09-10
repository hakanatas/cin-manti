import { LAYERS, RESOURCES, PATHS, AWARDS, KICKOFF } from './data.js';
import { SLIDES } from './slides.js';

/**
 * Sunum modu.
 *
 * Sayfayı slayta çevirir: tam ekran, tek ekranda tek fikir, ok tuşlarıyla
 * ilerleyen. Etkileşimli bloklar (atlas, test, görevler, kaydırıcı) kopya
 * değil, sayfadaki asıl DOM düğümleri; slayda taşınır, çıkışta yerine konur.
 */

const $ = (s, r = document) => r.querySelector(s);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createDeck({ root, onOpen, onClose }) {
  let open = false;
  let i = 0;
  let notesOn = false;
  const homes = new Map(); // taşınan düğümlerin asıl yeri

  root.innerHTML = `
    <div class="deck__stage" id="deck-stage"></div>
    <div class="deck__notes" id="deck-notes" hidden></div>
    <div class="deck__bar">
      <span class="deck__brand">AG Robotik · Kaynak haritası</span>
      <span class="deck__where"><b id="deck-no">1</b> / ${SLIDES.length}</span>
      <div class="deck__actions">
        <button type="button" id="deck-prev" title="Önceki (←)" aria-label="Önceki slayt">←</button>
        <button type="button" id="deck-next" title="Sonraki (→)" aria-label="Sonraki slayt">→</button>
        <button type="button" id="deck-notes-btn" title="Konuşmacı notu (N)">Not</button>
        <button type="button" id="deck-full" title="Tam ekran (F)">Tam ekran</button>
        <button type="button" id="deck-exit" title="Çık (Esc)">Çık</button>
      </div>
      <div class="deck__progress"><span id="deck-progress"></span></div>
    </div>`;

  const stage = $('#deck-stage', root);
  const notesEl = $('#deck-notes', root);

  // --- yardımcılar ---------------------------------------------------------
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  };

  function head(s) {
    const h = el('header', 'slide__head');
    if (s.kicker) h.appendChild(el('p', 'slide__kicker', s.kicker));
    if (s.title) h.appendChild(el('h2', 'slide__title', Array.isArray(s.title) ? s.title.join('<br />') : s.title));
    if (s.lede) h.appendChild(el('p', 'slide__lede', s.lede));
    return h;
  }

  function foot(s) {
    return s.foot ? el('p', 'slide__foot', s.foot) : null;
  }

  function resourceCard(r) {
    const l = LAYERS[r.layer];
    const tag = r.url ? 'a' : 'div';
    const n = document.createElement(tag);
    n.className = 'scard';
    n.style.setProperty('--c', l.color);
    if (r.url) {
      n.href = r.url;
      n.target = '_blank';
      n.rel = 'noopener noreferrer';
    }
    const host = r.url ? r.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'adres bekliyor';
    n.innerHTML = `
      <span class="scard__layer">${l.short}</span>
      <h3 class="scard__name">${r.name}</h3>
      <p class="scard__desc">${r.desc}</p>
      <span class="scard__url${r.url ? '' : ' is-soon'}">${host}</span>`;
    return n;
  }

  // --- slayt gövdeleri -----------------------------------------------------
  const builders = {
    cover(s) {
      const b = el('div', 'slide__cover');
      b.innerHTML = `
        <p class="slide__kicker">${s.eyebrow}</p>
        <h1 class="slide__big">${s.title.join('<br />')}</h1>
        <p class="slide__lede">${s.lede}</p>
        <p class="slide__foot">${s.foot}</p>`;
      return b;
    },
    closing(s) {
      const b = el('div', 'slide__cover');
      b.innerHTML = `
        <h1 class="slide__big slide__big--quote">${s.title.join('<br />')}</h1>
        <p class="slide__lede">${s.lede}</p>
        <p class="slide__foot">${s.foot}</p>`;
      return b;
    },
    facts(s) {
      const b = el('div');
      b.appendChild(head(s));
      const g = el('div', 'slide__facts');
      for (const f of KICKOFF) g.appendChild(el('div', 'fact', `<b>${f.big}</b><span>${f.label}</span>`));
      b.appendChild(g);
      if (s.callout) b.appendChild(el('p', 'slide__callout', s.callout));
      return b;
    },
    two(s) {
      const b = el('div');
      b.appendChild(head(s));
      const g = el('div', 'slide__two');
      g.innerHTML = `
        <div class="spanel">
          <p class="spanel__tag">Sezonluk</p>
          <h3>Her eylülde sıfırlanır</h3>
          <ul><li>Competition Manual</li><li>Saha çizimleri ve elemanları</li><li>Oyuna özel Q&amp;A cevapları</li><li>Sezon ödül güncellemeleri</li></ul>
          <p class="spanel__foot">Okunur, uygulanır, sezon bitince arşive kalkar.</p>
        </div>
        <div class="spanel spanel--gold">
          <p class="spanel__tag">Kalıcı</p>
          <h3>Yıllar boyu aynı</h3>
          <ul><li>Game Manual 0</li><li>FTC Docs: kontrol sistemi, vision</li><li>Java ve kontrol teorisi kaynakları</li><li>CAD kütüphaneleri, hesaplayıcılar</li></ul>
          <p class="spanel__foot">Bir kere öğrenilir, her sezon geri döner. <b>Asıl yatırım burada.</b></p>
        </div>`;
      b.appendChild(g);
      return b;
    },
    layers(s) {
      const b = el('div');
      b.appendChild(head(s));
      const g = el('div', 'slide__layers');
      Object.entries(LAYERS).forEach(([k, l]) => {
        const n = RESOURCES.filter((r) => r.layer === k).length;
        const c = el('div', 'slayer', `
          <span class="slayer__no">${l.no}</span>
          <h3>${l.name}</h3>
          <p class="slayer__line">${l.line}</p>
          <p class="slayer__body">${l.body}</p>
          <p class="slayer__count">${n} kaynak</p>`);
        c.style.setProperty('--c', l.color);
        g.appendChild(c);
      });
      b.appendChild(g);
      b.appendChild(el('p', 'slide__foot', 'Bir tartışmada “gm0’da böyle yazıyor” geçerli bir argüman değildir. “Manual’ın şu maddesi” geçerlidir.'));
      return b;
    },
    paths(s) {
      const b = el('div');
      b.appendChild(head(s));
      const g = el('div', 'slide__paths');
      for (const p of PATHS) {
        g.appendChild(el('div', 'spath', `<span class="spath__no">${p.no}</span><h3>${p.name}</h3><p>${p.line}</p><span class="spath__when">${p.when}</span>`));
      }
      b.appendChild(g);
      const f = foot(s);
      if (f) b.appendChild(f);
      return b;
    },
    awards(s) {
      const b = el('div');
      b.appendChild(head(s));
      const g = el('div', 'slide__awards');
      for (const a of AWARDS) {
        const n = el('div', `saward${a.big ? ' saward--big' : ''}`, `<p class="saward__role">${a.role}</p><h3>${a.name}</h3><p class="saward__desc">${a.desc}</p>`);
        g.appendChild(n);
      }
      b.appendChild(g);
      const f = foot(s);
      if (f) b.appendChild(f);
      return b;
    },
    cards(s) {
      const b = el('div');
      b.appendChild(head(s));
      if (s.bullets) {
        const ul = el('ul', 'slide__bullets');
        for (const t of s.bullets) ul.appendChild(el('li', null, t));
        b.appendChild(ul);
      }
      const n = s.names.length;
      const cols = n <= 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : n === 4 ? 2 : n <= 6 ? 3 : 4;
      const g = el('div', `slide__cards slide__cards--${cols}${n >= 5 ? ' slide__cards--tight' : ''}`);
      for (const name of s.names) {
        const r = RESOURCES.find((x) => x.name === name);
        if (r) g.appendChild(resourceCard(r));
      }
      b.appendChild(g);
      const f = foot(s);
      if (f) b.appendChild(f);
      return b;
    },
    supply(s) {
      const b = el('div');
      b.appendChild(head(s));
      const holder = el('div', 'slide__adopt');
      holder.appendChild(take('#supply-host'));
      b.appendChild(holder);
      const f = foot(s);
      if (f) b.appendChild(f);
      return b;
    },
    adopt(s) {
      const b = el('div');
      b.appendChild(head(s));
      const holder = el('div', 'slide__adopt');
      holder.appendChild(take(s.target));
      b.appendChild(holder);
      const f = foot(s);
      if (f) b.appendChild(f);
      return b;
    },
  };

  /** Sayfadaki asıl düğümü al, nereden aldığını not et. */
  function take(sel) {
    const node = $(sel);
    if (!node) return el('p', 'slide__foot', '');
    if (!homes.has(node)) homes.set(node, { parent: node.parentNode, next: node.nextSibling });
    return node;
  }

  function giveBack() {
    for (const [node, home] of homes) {
      if (home.parent) home.parent.insertBefore(node, home.next);
    }
    homes.clear();
  }

  // --- gezinme -------------------------------------------------------------
  let refit = () => {};
  function draw() {
    const s = SLIDES[i];
    stage.innerHTML = '';
    const wrap = el('div', 'slide__fit');
    const slide = el('article', `slide slide--${s.kind}${s.wide ? ' slide--wide' : ''}`);
    slide.appendChild(builders[s.kind](s));
    wrap.appendChild(slide);
    stage.appendChild(wrap);
    // hiçbir slayt kaydırma gerektirmesin: taşarsa son çare olarak ölçekle
    refit = () => {
      slide.style.transform = 'none';
      wrap.style.height = '';
      const h = slide.offsetHeight;
      const avail = stage.clientHeight - 12;
      if (h > avail + 2) {
        const k = Math.max(0.55, avail / h);
        slide.style.transformOrigin = 'top center';
        slide.style.transform = `scale(${k})`;
        wrap.style.height = `${h * k}px`;
      }
    };
    requestAnimationFrame(refit);
    setTimeout(refit, 260);
    if (!reduced) {
      slide.animate(
        [
          { opacity: 0, transform: 'translateY(22px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 420, easing: 'cubic-bezier(0.22,1,0.36,1)' }
      );
    }
    $('#deck-no', root).textContent = String(i + 1);
    $('#deck-progress', root).style.width = `${((i + 1) / SLIDES.length) * 100}%`;
    notesEl.innerHTML = `<b>Not</b> ${s.note || '—'}`;
    stage.scrollTop = 0;
  }

  function go(n) {
    const next = Math.max(0, Math.min(SLIDES.length - 1, n));
    if (next === i && stage.childElementCount) return;
    giveBack(); // taşınan düğümleri yerine koy, sonra yenisini al
    i = next;
    draw();
    try {
      const u = new URL(location.href);
      u.searchParams.set('slayt', String(i + 1));
      history.replaceState(null, '', u);
    } catch {
      /* dosya protokolünde olabilir */
    }
  }

  function setNotes(on) {
    notesOn = on;
    notesEl.hidden = !on;
    root.classList.toggle('has-notes', on);
    $('#deck-notes-btn', root).setAttribute('aria-pressed', String(on));
  }

  function openDeck(at = 0) {
    if (open) return;
    open = true;
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-present');
    i = at;
    draw();
    onOpen?.();
    root.focus();
  }

  function closeDeck() {
    if (!open) return;
    open = false;
    giveBack();
    stage.innerHTML = '';
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-present');
    try {
      const u = new URL(location.href);
      u.searchParams.delete('slayt');
      u.searchParams.delete('sunum');
      history.replaceState(null, '', u);
    } catch {
      /* yoksay */
    }
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    onClose?.();
  }

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  // --- olaylar -------------------------------------------------------------
  $('#deck-prev', root).addEventListener('click', () => go(i - 1));
  $('#deck-next', root).addEventListener('click', () => go(i + 1));
  $('#deck-exit', root).addEventListener('click', closeDeck);
  $('#deck-full', root).addEventListener('click', toggleFull);
  $('#deck-notes-btn', root).addEventListener('click', () => setNotes(!notesOn));

  // boş alana tıklayınca ilerle; düğme, link, kart ve form öğeleri hariç
  stage.addEventListener('click', (e) => {
    if (e.target.closest('a, button, input, label, select, textarea, .card, .scard, .quiz, .tasks, .supply__box')) return;
    const r = stage.getBoundingClientRect();
    go(e.clientX - r.left < r.width * 0.25 ? i - 1 : i + 1);
  });

  // dokunmatik kaydırma
  let sx = 0;
  let sy = 0;
  stage.addEventListener('pointerdown', (e) => {
    sx = e.clientX;
    sy = e.clientY;
  });
  stage.addEventListener('pointerup', (e) => {
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) go(dx < 0 ? i + 1 : i - 1);
  });

  window.addEventListener('resize', () => {
    if (open) refit();
  });

  window.addEventListener('keydown', (e) => {
    if (!open) return;
    const typing = e.target instanceof HTMLElement && e.target.matches('input, textarea, select');
    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
        if (typing && e.key === 'ArrowRight') return;
        e.preventDefault();
        go(i + 1);
        break;
      case ' ':
        if (typing) return;
        e.preventDefault();
        go(i + 1);
        break;
      case 'ArrowLeft':
      case 'PageUp':
        if (typing && e.key === 'ArrowLeft') return;
        e.preventDefault();
        go(i - 1);
        break;
      case 'Home':
        e.preventDefault();
        go(0);
        break;
      case 'End':
        e.preventDefault();
        go(SLIDES.length - 1);
        break;
      case 'Escape':
        e.preventDefault();
        closeDeck();
        break;
      case 'f':
      case 'F':
        if (typing) return;
        toggleFull();
        break;
      case 'n':
      case 'N':
        if (typing) return;
        setNotes(!notesOn);
        break;
      default:
        break;
    }
  });

  return { open: openDeck, close: closeDeck, isOpen: () => open, count: SLIDES.length };
}
