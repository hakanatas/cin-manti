/**
 * Procedural dumpling shape — dependency free.
 *
 * Builds the raw vertex data (positions, vertex colours, uvs, indices) for a
 * plump, pleated dumpling in the spirit of a xiaolongbao: a soft round bun
 * whose pleats spiral upward into a little twisted knot.
 *
 * The same module is used by `tools/build-dumpling-glb.mjs` to bake the
 * shipped GLB and by the browser as a fallback if the GLB cannot load.
 *
 * Coordinate conventions: Y up, bottom of the dumpling at y = 0, base radius
 * of roughly 1 unit in X/Z, face intended to point toward +Z.
 */

const TAU = Math.PI * 2;

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

/**
 * @param {object} [o]
 * @param {number} [o.around=112]   segments around the dumpling
 * @param {number} [o.down=72]      segments from the top pole to the bottom
 * @param {number} [o.pleats=13]    number of pleats
 * @param {number} [o.pleatDepth=0.075]
 * @param {number} [o.swirl=1.15]   how far pleats twist (radians) between the belly and the knot
 * @param {number} [o.squash=0.80]  vertical squash of the body
 * @param {number[]} [o.dough]      base RGB (0..1)
 */
export function createDumplingShapeData(o = {}) {
  const around = o.around ?? 112;
  const down = o.down ?? 72;
  const pleats = o.pleats ?? 13;
  const pleatDepth = o.pleatDepth ?? 0.075;
  const swirl = o.swirl ?? 1.15;
  const squash = o.squash ?? 0.8;
  const dough = o.dough ?? [0.95, 0.87, 0.75];

  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];

  // --- Body -------------------------------------------------------------
  // Rows j = 0 (top pole) .. down (bottom pole). Interior rows share `around`
  // vertices with wrap-around indexing so there is no lighting seam.

  const bodyRadius = (v, theta) => {
    // v: 0 top -> 1 bottom.  Returns radial multiplier and valley depth [0..1].
    const pleatBand = smoothstep(0.66, 0.30, v) * (1 - smoothstep(0.14, 0.0, v) * 0.35);
    const twist = swirl * Math.pow(Math.max(0, 1 - v / 0.66), 1.6);
    let w = Math.cos(pleats * (theta + twist));
    w = Math.sign(w) * Math.pow(Math.abs(w), 0.72);
    const amp = pleatDepth * pleatBand;
    const valley = (1 - w) * 0.5 * pleatBand;
    return { mul: 1 + amp * w, valley };
  };

  const pushVertex = (x, y, z, u, v, shade) => {
    positions.push(x, y, z);
    uvs.push(u, v);
    colors.push(dough[0] * shade, dough[1] * shade, dough[2] * shade);
  };

  const rowStart = [];
  for (let j = 0; j <= down; j++) {
    const v = j / down;
    const phi = v * Math.PI;
    const sinP = Math.sin(phi);
    let yRaw = Math.cos(phi);

    // plump belly: widen the lower-middle part a touch
    const belly = 1 + 0.06 * Math.sin(Math.PI * Math.pow(v, 0.9));

    // soft flat contact patch on the bottom
    const flatFrom = -0.58;
    if (yRaw < flatFrom) {
      const k = (yRaw - flatFrom) / (-1 - flatFrom); // 0..1 toward pole
      yRaw = flatFrom + (-1 - flatFrom) * (1 - Math.pow(1 - k, 2.6)) * 0.28;
    }

    const isPole = j === 0 || j === down;
    const count = isPole ? 1 : around;
    rowStart.push(positions.length / 3);

    for (let i = 0; i < count; i++) {
      const u = isPole ? 0.5 : i / around;
      const theta = u * TAU;
      const { mul, valley } = bodyRadius(v, theta);
      const r = sinP * belly * (isPole ? 1 : mul);

      const x = r * Math.sin(theta);
      const z = r * Math.cos(theta);
      const y = (yRaw + 1) * squash;

      // Vertex-colour ambient occlusion: darker in pleat valleys, slightly
      // darker at the contact patch, a warm toasted tint toward the knot.
      let shade = 1 - valley * 0.16;
      shade *= 1 - smoothstep(0.86, 1.0, v) * 0.14;
      const warmth = smoothstep(0.35, 0.0, v) * 0.045;
      positions.push(x, y, z);
      uvs.push(u, 1 - v);
      colors.push(
        dough[0] * shade * (1 + warmth * 0.2),
        dough[1] * shade * (1 - warmth * 0.4),
        dough[2] * shade * (1 - warmth * 0.9)
      );
    }
  }

  // Top fan
  for (let i = 0; i < around; i++) {
    const a = rowStart[1] + i;
    const b = rowStart[1] + ((i + 1) % around);
    indices.push(rowStart[0], b, a);
  }
  // Body quads
  for (let j = 1; j < down - 1; j++) {
    for (let i = 0; i < around; i++) {
      const i1 = (i + 1) % around;
      const a = rowStart[j] + i;
      const b = rowStart[j] + i1;
      const c = rowStart[j + 1] + i;
      const d = rowStart[j + 1] + i1;
      indices.push(a, d, b);
      indices.push(a, c, d);
    }
  }
  // Bottom fan
  for (let i = 0; i < around; i++) {
    const a = rowStart[down - 1] + i;
    const b = rowStart[down - 1] + ((i + 1) % around);
    indices.push(rowStart[down], a, b);
  }

  // --- Knot ----------------------------------------------------------------
  // A small twisted bud where the pleats meet.
  const knotOffset = positions.length / 3;
  const kAround = 40;
  const kDown = 20;
  const kR = 0.19;
  const kY = 2 * squash - 0.06;
  const kStart = [];
  for (let j = 0; j <= kDown; j++) {
    const v = j / kDown;
    const phi = v * Math.PI;
    const isPole = j === 0 || j === kDown;
    const count = isPole ? 1 : kAround;
    kStart.push(positions.length / 3);
    for (let i = 0; i < count; i++) {
      const u = isPole ? 0.5 : i / kAround;
      const theta = u * TAU;
      let w = Math.cos(5 * theta + v * 2.2);
      const mul = isPole ? 1 : 1 + 0.10 * w * Math.sin(phi);
      const r = kR * Math.sin(phi) * mul * (1 + 0.15 * (1 - v));
      const x = r * Math.sin(theta);
      const z = r * Math.cos(theta);
      const y = kY + kR * 0.78 * Math.cos(phi) * (1 - 0.35 * v);
      const shade = 0.93 - (1 - w) * 0.05 * (1 - Math.abs(v * 2 - 1));
      pushVertex(x, y, z, u, 1 - v, shade * (1 + 0.02) );
    }
  }
  for (let i = 0; i < kAround; i++) {
    const a = kStart[1] + i;
    const b = kStart[1] + ((i + 1) % kAround);
    indices.push(kStart[0], b, a);
  }
  for (let j = 1; j < kDown - 1; j++) {
    for (let i = 0; i < kAround; i++) {
      const i1 = (i + 1) % kAround;
      const a = kStart[j] + i;
      const b = kStart[j] + i1;
      const c = kStart[j + 1] + i;
      const d = kStart[j + 1] + i1;
      indices.push(a, d, b);
      indices.push(a, c, d);
    }
  }
  for (let i = 0; i < kAround; i++) {
    const a = kStart[kDown - 1] + i;
    const b = kStart[kDown - 1] + ((i + 1) % kAround);
    indices.push(kStart[kDown], a, b);
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
    knotOffset,
    bounds: { radius: 1.06, height: 2 * squash + kR * 0.8 },
  };
}

/** Helper for environments that have three.js available. */
export function createDumplingGeometry(THREE, options) {
  const d = createDumplingShapeData(options);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(d.positions, 3));
  g.setAttribute('color', new THREE.BufferAttribute(d.colors, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(d.uvs, 2));
  g.setIndex(new THREE.BufferAttribute(d.indices, 1));
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
