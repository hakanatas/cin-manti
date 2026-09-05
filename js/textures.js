import * as THREE from 'three';
import { PALETTE } from './config.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, { srgb = true, repeat = null, wrap = false, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  return t;
}

// Seeded random so textures look identical on every load.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Bamboo wood: warm base with fine vertical grain and a few darker streaks. */
export function makeBambooTexture({ w = 1024, h = 256, seed = 7 } = {}) {
  const [c, g] = canvas(w, h);
  const r = rng(seed);
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#d9b078');
  grad.addColorStop(0.5, '#d4a76c');
  grad.addColorStop(1, '#c99c62');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  // fine grain
  for (let i = 0; i < 900; i++) {
    const alpha = 0.04 + r() * 0.12;
    const dark = r() > 0.35;
    g.strokeStyle = dark ? `rgba(120,80,40,${alpha})` : `rgba(255,240,210,${alpha})`;
    g.lineWidth = 0.6 + r() * 1.6;
    // grain runs horizontally: bamboo strips are bent around the steamer
    const y = r() * h;
    g.beginPath();
    const wob = (r() - 0.5) * 4;
    g.moveTo(0, y);
    g.bezierCurveTo(w * 0.33, y + wob, w * 0.66, y - wob, w, y + (r() - 0.5) * 2);
    g.stroke();
  }
  // occasional bamboo node bands
  for (let i = 0; i < 5; i++) {
    const x = r() * w;
    g.fillStyle = 'rgba(140,95,50,0.16)';
    g.fillRect(x, 0, 2 + r() * 3, h);
    g.fillStyle = 'rgba(255,235,200,0.16)';
    g.fillRect(x + 4, 0, 1.5, h);
  }
  // soft mottling
  for (let i = 0; i < 60; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = 20 + r() * 80;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(160,110,60,${0.05 + r() * 0.06})`);
    gr.addColorStop(1, 'rgba(160,110,60,0)');
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  return tex(c, { wrap: true, repeat: [3, 1] });
}

/** Rattan binding strap: diagonal over-under weave. */
export function makeRattanTexture({ w = 256, h = 64 } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = '#b58549';
  g.fillRect(0, 0, w, h);
  const step = 16;
  for (let x = -h; x < w + h; x += step) {
    g.fillStyle = 'rgba(80,50,20,0.28)';
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + step * 0.45, 0);
    g.lineTo(x + step * 0.45 + h, h);
    g.lineTo(x + h, h);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,230,190,0.22)';
    g.fillRect(x + step * 0.45, 0, 1.5, h);
  }
  // horizontal highlight/shadow to read as a rounded strap
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(80,50,20,0.35)');
  grad.addColorStop(0.3, 'rgba(255,240,210,0.12)');
  grad.addColorStop(1, 'rgba(80,50,20,0.4)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  return tex(c, { wrap: true, repeat: [24, 1] });
}

/** Woven bamboo lattice (for the steamer lid top). Returns colour + bump. */
export function makeWeaveTexture({ size = 512, cells = 10 } = {}) {
  const [c, g] = canvas(size, size);
  const cell = size / cells;
  g.fillStyle = '#b98b52';
  g.fillRect(0, 0, size, size);
  const strip = cell * 0.82;
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const over = (i + j) % 2 === 0;
      const x = i * cell;
      const y = j * cell;
      const drawH = (c1, c2) => {
        const gr = g.createLinearGradient(0, y + (cell - strip) / 2, 0, y + (cell + strip) / 2);
        gr.addColorStop(0, c1);
        gr.addColorStop(0.5, c2);
        gr.addColorStop(1, c1);
        g.fillStyle = gr;
        g.fillRect(x - 1, y + (cell - strip) / 2, cell + 2, strip);
      };
      const drawV = (c1, c2) => {
        const gr = g.createLinearGradient(x + (cell - strip) / 2, 0, x + (cell + strip) / 2, 0);
        gr.addColorStop(0, c1);
        gr.addColorStop(0.5, c2);
        gr.addColorStop(1, c1);
        g.fillStyle = gr;
        g.fillRect(x + (cell - strip) / 2, y - 1, strip, cell + 2);
      };
      if (over) {
        drawV('#a67a45', '#d4ab72');
        drawH('#a37543', '#dcb57c');
      } else {
        drawH('#a37543', '#d4ab72');
        drawV('#a67a45', '#dcb57c');
      }
    }
  }
  return tex(c, { wrap: true, repeat: [1, 1] });
}

/** Parchment liner colour map and an alpha map with steamer-paper holes. */
export function makeParchmentTextures({ size = 1024, seed = 3 } = {}) {
  const r = rng(seed);
  const [c, g] = canvas(size, size);
  g.fillStyle = PALETTE.parchment;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(150,120,80,${0.03 + r() * 0.08})`;
    g.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2);
  }
  for (let i = 0; i < 160; i++) {
    g.strokeStyle = `rgba(200,170,120,${0.06 + r() * 0.08})`;
    g.lineWidth = 1;
    g.beginPath();
    const x = r() * size;
    const y = r() * size;
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 60);
    g.stroke();
  }
  // soft crease shadows
  for (let i = 0; i < 6; i++) {
    const x = r() * size;
    const gr = g.createLinearGradient(x - 60, 0, x + 60, 0);
    gr.addColorStop(0, 'rgba(120,90,60,0)');
    gr.addColorStop(0.5, 'rgba(120,90,60,0.05)');
    gr.addColorStop(1, 'rgba(120,90,60,0)');
    g.fillStyle = gr;
    g.fillRect(x - 60, 0, 120, size);
  }
  const color = tex(c);

  // alpha: white with black holes in a radial pattern (centre of the texture = centre of the liner)
  const [a, ag] = canvas(size, size);
  ag.fillStyle = '#fff';
  ag.fillRect(0, 0, size, size);
  ag.fillStyle = '#000';
  const cx = size / 2;
  const cy = size / 2;
  const holeR = size * 0.0085;
  for (let ring = 1; ring <= 6; ring++) {
    const rad = ring * size * 0.068;
    const n = ring * 7;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + ring * 0.3;
      ag.beginPath();
      ag.arc(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, holeR, 0, Math.PI * 2);
      ag.fill();
    }
  }
  ag.beginPath();
  ag.arc(cx, cy, holeR * 1.2, 0, Math.PI * 2);
  ag.fill();
  const alpha = tex(a, { srgb: false });
  return { color, alpha };
}

/** Soft radial dot used for steam particles and puffs. */
export function makeSoftDotTexture(size = 128) {
  const [c, g] = canvas(size, size);
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.7, 'rgba(255,255,255,0.14)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  return tex(c, { srgb: false });
}

/** A thin 1D strip that decorates the porcelain plate along its profile. */
export function makePlateGlazeTexture() {
  const [c, g] = canvas(4, 512);
  g.fillStyle = PALETTE.porcelain;
  g.fillRect(0, 0, 4, 512);
  const band = (v0, v1, color) => {
    g.fillStyle = color;
    g.fillRect(0, Math.round(v0 * 512), 4, Math.round((v1 - v0) * 512));
  };
  band(0.57, 0.585, 'rgba(196,98,61,0.55)');
  band(0.90, 0.93, PALETTE.terracotta);
  band(0.955, 0.965, 'rgba(196,98,61,0.4)');
  const t = tex(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  return t;
}

/** Subtle speckled glaze for stoneware (the sauce bowl and chopstick rest). */
export function makeStonewareTexture({ base = PALETTE.terracotta, size = 256, seed = 11 } = {}) {
  const r = rng(seed);
  const [c, g] = canvas(size, size);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 700; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(60,30,15,0.18)' : 'rgba(255,225,200,0.16)';
    const s = 1 + r() * 2;
    g.fillRect(r() * size, r() * size, s, s);
  }
  return tex(c, { wrap: true, repeat: [2, 1] });
}

// ---------------------------------------------------------------------------
// Faces
// ---------------------------------------------------------------------------

const MOUTH_STYLES = ['smile', 'grin', 'o', 'w', 'flat', 'wobble', 'tongue', 'tiny', 'sleepy'];

/** Draws each mouth style onto a transparent 128px canvas. */
export function makeMouthTextures() {
  const out = {};
  for (const style of MOUTH_STYLES) {
    const [c, g] = canvas(128, 128);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = PALETTE.eye;
    g.fillStyle = PALETTE.eye;
    g.lineWidth = 7;
    const cx = 64;
    const cy = 60;
    switch (style) {
      case 'smile':
        g.beginPath();
        g.arc(cx, cy - 14, 26, Math.PI * 0.2, Math.PI * 0.8);
        g.stroke();
        break;
      case 'tiny':
        g.beginPath();
        g.arc(cx, cy - 8, 14, Math.PI * 0.2, Math.PI * 0.8);
        g.stroke();
        break;
      case 'grin': {
        g.beginPath();
        g.moveTo(cx - 30, cy - 6);
        g.quadraticCurveTo(cx, cy + 46, cx + 30, cy - 6);
        g.closePath();
        g.fill();
        // tongue
        g.fillStyle = '#e57a86';
        g.beginPath();
        g.ellipse(cx, cy + 14, 13, 10, 0, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case 'o':
        g.beginPath();
        g.ellipse(cx, cy, 13, 16, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#e57a86';
        g.beginPath();
        g.ellipse(cx, cy + 6, 6, 4, 0, 0, Math.PI * 2);
        g.fill();
        break;
      case 'w':
        g.beginPath();
        g.moveTo(cx - 28, cy - 8);
        g.quadraticCurveTo(cx - 14, cy + 16, cx, cy - 2);
        g.quadraticCurveTo(cx + 14, cy + 16, cx + 28, cy - 8);
        g.stroke();
        break;
      case 'flat':
        g.beginPath();
        g.moveTo(cx - 20, cy);
        g.lineTo(cx + 20, cy);
        g.stroke();
        break;
      case 'wobble':
        g.beginPath();
        g.moveTo(cx - 26, cy);
        for (let i = 1; i <= 4; i++) {
          g.quadraticCurveTo(cx - 26 + (i - 0.5) * 13, cy + (i % 2 ? -9 : 9), cx - 26 + i * 13, cy);
        }
        g.stroke();
        break;
      case 'tongue':
        g.beginPath();
        g.arc(cx, cy - 14, 24, Math.PI * 0.15, Math.PI * 0.85);
        g.stroke();
        g.fillStyle = '#e57a86';
        g.beginPath();
        g.ellipse(cx + 8, cy + 12, 10, 12, 0.2, 0, Math.PI * 2);
        g.fill();
        break;
      case 'sleepy':
        g.beginPath();
        g.ellipse(cx, cy, 8, 6, 0, 0, Math.PI * 2);
        g.fill();
        break;
      default:
        break;
    }
    out[style] = tex(c);
  }
  return out;
}

/** Text bubble sprite texture: cream rounded bubble with an italic serif line. */
export function makeBubbleTexture(text, sub = '') {
  const W = 1024;
  const H = 320;
  const [c, g] = canvas(W, H);
  const pad = 26;
  const bubbleH = H - 70;
  g.save();
  g.shadowColor = 'rgba(80,50,30,0.22)';
  g.shadowBlur = 28;
  g.shadowOffsetY = 10;
  g.fillStyle = '#fffaf1';
  roundRect(g, pad, pad, W - pad * 2, bubbleH - pad, 44);
  g.fill();
  g.restore();
  g.strokeStyle = 'rgba(196,98,61,0.55)';
  g.lineWidth = 3;
  roundRect(g, pad, pad, W - pad * 2, bubbleH - pad, 44);
  g.stroke();
  // tail
  g.fillStyle = '#fffaf1';
  g.beginPath();
  g.moveTo(W / 2 - 34, bubbleH - 2);
  g.lineTo(W / 2 + 34, bubbleH - 2);
  g.lineTo(W / 2 - 4, bubbleH + 44);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(196,98,61,0.55)';
  g.beginPath();
  g.moveTo(W / 2 - 34, bubbleH);
  g.lineTo(W / 2 - 4, bubbleH + 44);
  g.lineTo(W / 2 + 34, bubbleH);
  g.stroke();

  g.fillStyle = PALETTE.ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = 84;
  g.font = `italic 500 ${size}px Fraunces, "Iowan Old Style", Georgia, serif`;
  while (g.measureText(text).width > W - pad * 2 - 80 && size > 40) {
    size -= 4;
    g.font = `italic 500 ${size}px Fraunces, "Iowan Old Style", Georgia, serif`;
  }
  const textY = sub ? bubbleH / 2 - 8 : bubbleH / 2 + 8;
  g.fillText(text, W / 2, textY);
  if (sub) {
    g.fillStyle = PALETTE.terracottaDeep;
    g.font = `500 34px "Instrument Sans", "Helvetica Neue", Arial, sans-serif`;
    g.fillText(sub, W / 2, textY + 74);
  }
  const t = tex(c);
  t.userData.aspect = W / H;
  return t;
}

/** Small caption for the recording watermark. */
export function makeCaptionTexture(title, tagline) {
  const W = 1024;
  const H = 192;
  const [c, g] = canvas(W, H);
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillStyle = PALETTE.ink;
  g.font = `600 64px Fraunces, "Iowan Old Style", Georgia, serif`;
  g.fillText(title, 24, 86);
  g.fillStyle = PALETTE.terracottaDeep;
  g.font = `500 40px "Instrument Sans", "Helvetica Neue", Arial, sans-serif`;
  g.fillText(tagline, 26, 150);
  const t = tex(c);
  t.userData.aspect = W / H;
  return t;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
