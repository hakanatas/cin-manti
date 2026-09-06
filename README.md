# The Dumpling Club

*Small bites. Big feelings.*

A cozy, interactive 3D website built with [Three.js](https://threejs.org): five
adorable dumplings sit in a round bamboo steamer, blink, wobble and watch each
other. Click one and a pair of chopsticks gently picks it up, dips it in soy
sauce, brings it to the camera for a bite, and the others react.

Everything is local: no build step, no bundler, no CDN. Open it with any static
file server.

## Live

Published with GitHub Pages: <https://hakanatas.github.io/cin-manti/>
(the lesson is at <https://hakanatas.github.io/cin-manti/YZ-nasil-calisir/>).
The workflow in `.github/workflows/pages.yml` redeploys on every push.

## Run it

```bash
node serve.mjs          # → http://localhost:8080
# or
python3 -m http.server 8080
```

ES modules need `http://`, so opening `index.html` directly from disk will not
work.

## What is inside

| Feature | Where |
| --- | --- |
| Bamboo steamer (layered walls, rattan straps, lattice floor, parchment liner) and lid, porcelain plate, soy sauce bowl, chopsticks and rest | `js/props.js`, `js/textures.js` |
| Dumpling model (GLB) with normalised loading and a procedural fallback | `assets/models/dumpling.glb`, `js/dumpling-shape.js`, `js/main.js` |
| Faces placed on the surface by raycast, blinking, look-at, expressions, squash & stretch, very low hops | `js/dumpling.js` |
| Dip gloss, bite cut-out and filling colour as shader uniforms on a physical material | `js/dumpling.js` (`createDoughMaterial`) |
| Tasting choreography (pick → dip → present → bite → gulp → return) with audience reactions | `js/tasting.js` |
| Sauce ripples, droplets, crumbs, sparkles, steam puffs | `js/sauce.js`, `js/particles.js` |
| GPU steam | `js/steam.js` |
| In-scene reaction bubbles (so they appear in recordings) | `js/bubble.js` |
| Synthesized sound effects (no audio files) | `js/audio.js` |
| Square 1080 × 1080, 30 fps recording, MP4 with WebM fallback | `js/recorder.js`, `js/main.js` |
| Controls, keyboard, accessibility, reduced motion, mobile layout | `js/main.js`, `css/styles.css`, `index.html` |

### Controls

- **Portion** 3 / 5 / 8 · **Serving** bamboo steamer / porcelain plate
- **Steam**, **Sauce**, **Sound**, **Autoplay** toggles
- **Boing!** makes everyone hop · **Refill** brings the dumplings back
- **Record a bite** runs an automatic tasting with a live square preview and
  saves a local 1080 × 1080 video at 30 fps (MP4 where the browser can encode
  it, otherwise WebM). When sound is on, the synthesized effects are recorded too.
- **Hide interface** (or `H`) leaves only the scene on screen.

Keyboard: `←` `→` choose a dumpling, `Enter` taste it, `B` boing, `R` refill,
`A` autoplay, `M` sound, `S` steam, `H` hide interface, `Esc` back.

Touch: tap a dumpling to taste it, drag to orbit, pinch to zoom.

`prefers-reduced-motion` turns off idle hops, calms the steam and shortens the
animations.

## The dumpling model

`assets/models/dumpling.glb` is baked from the procedural shape in
`js/dumpling-shape.js`:

```bash
node tools/build-dumpling-glb.mjs
```

You can drop in any dumpling GLB with the same file name. The loader picks the
largest mesh, centres it, puts its bottom at `y = 0`, scales it to a radius of 1
and places the face on the +Z side. If the file has no vertex colours the dough
colour from `js/config.js` is used instead.

## Küçük Dersler (lessons)

The same visual language powers a growing set of interactive lessons under
`YZ-nasil-calisir/`. The first one, **"Yapay zeka nasıl çalışır?"** (How does AI
work?, in Turkish), lives at `YZ-nasil-calisir/` and trains a
real tiny neural network in the browser while you watch: data on a tablecloth,
an abacus-style network with weighted connections, signal pulses, one learning
step with backpropagation, full training with a live decision boundary, a
"try it yourself" probe, and a next-word demo for large language models.

Open it at `/YZ-nasil-calisir/` from the same static server.

## Third-party

- Three.js r170 (MIT) — `vendor/three/` (see `vendor/three/LICENSE`)
- Fraunces and Instrument Sans (SIL Open Font License) — `assets/fonts/`
