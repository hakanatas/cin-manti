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

The same visual language powers a growing set of interactive lessons. The
first one, **"Yapay zeka nasıl çalışır?"** (How does AI work?, in Turkish,
for ages 8–14), lives at `YZ-nasil-calisir/`. Bıdık, an apprentice robot
chef, learns to tell sweet dumplings from salty ones while a real 2-6-1
neural network trains in the browser: dumplings on a tablecloth, helpers
with faces connected by weighted strings, guess-before-the-robot games, one
learning step with backpropagation, full training with a live decision
boundary, a test with a brand-new dumpling, a next-word demo for chatbots,
and a three-question quiz. Every chapter carries a collapsible teacher note
with the real terminology.

Open it at `/YZ-nasil-calisir/` from the same static server.

The second lesson, **"Geometrik şekiller"** (basic geometric figures, 5th
grade maths, adapted from the MEB textbook unit), lives at
`geometrik-sekiller/`: Bıdık's dough board is the plane; children place
points, fill the gap between two points, turn a segment into a ray and a
line, rotate an angle to find the right angle, stretch a rope with the
dumplings to form a circle, pick the shortest path to a line (the
perpendicular), build a parallel line, and finish with the Geombala
notation game. Open it at `/geometrik-sekiller/`.

The third lesson, **"Açılar ve çokgenler"** (angles and polygons, same
textbook), lives at `acilar-cokgenler/`: measuring angles in degrees with a
protractor, congruent angles, intersecting and perpendicular lines,
parallel and coincident lines, complementary and supplementary angles, a
transversal across parallels, building polygons from lines, polygon
elements and diagonals, regular polygons, triangles by angle, and a quiz.

The fourth piece is not a school lesson but a project explainer:
**"Model neden böyle dedi?"** at `xai-opc/`. It walks through XAI-OPC, a
study that predicts survival for 606 oropharyngeal cancer patients and then
explains its own predictions with SHAP. Every patient is a token on a clinic
desk: the cohort splits into training and test sets, the test set falls into
the four boxes of a confusion matrix, a slider moves the decision threshold
and the tokens move with it, three base models vote, SHAP weights grow as
bars, and an independent cohort (RADCURE) shows up beside ours. It also
carries the audit honestly — the ensemble is not significantly better than a
lone Random Forest, chemotherapy's protective weight is confounding by
indication, and HPV is missing from the data. All numbers come from the
project's corrected final report.

Open it at `/xai-opc/`.

A landing page listing all lessons lives at `dersler/` (`/dersler/`).

## FTC resource map

`ftc/` is a separate piece for a robotics team: the season-kickoff resource
map of AG Robotik (ALKEV Okulları) as a page instead of a slide deck. The
deck's own closing promise was that the link list would live on the team
page, since a link on a slide cannot be clicked. It keeps the deck's green
and honey palette and turns the reference half into an atlas: every resource
is a card with its layer, its role and its address, searchable and
filterable, plus sticky layer cards, an awards grid that filters the atlas,
an order-window slider and a five-task checklist saved in the browser. All
content lives in `ftc/js/data.js`.

## Third-party

- Three.js r170 (MIT) — `vendor/three/` (see `vendor/three/LICENSE`)
- Fraunces and Instrument Sans (SIL Open Font License) — `assets/fonts/`
