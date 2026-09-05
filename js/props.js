import * as THREE from 'three';
import { PALETTE, LAYOUT } from './config.js';
import { SauceSurface } from './sauce.js';

const DEG = Math.PI / 180;

/** Materials shared by the props. */
export function createPropMaterials(tx) {
  return {
    bamboo: new THREE.MeshStandardMaterial({ map: tx.bamboo, roughness: 0.62, metalness: 0 }),
    bambooInner: new THREE.MeshStandardMaterial({ map: tx.bamboo, roughness: 0.7, side: THREE.BackSide, color: '#e8d2ad' }),
    bambooBand: new THREE.MeshStandardMaterial({ map: tx.bamboo, roughness: 0.6, color: '#f0dcb4' }),
    bambooDark: new THREE.MeshStandardMaterial({ color: '#8a6238', roughness: 0.75 }),
    rattan: new THREE.MeshStandardMaterial({ map: tx.rattan, roughness: 0.75 }),
    weave: new THREE.MeshStandardMaterial({ map: tx.weave, roughness: 0.78 }),
    parchment: new THREE.MeshStandardMaterial({
      map: tx.parchment.color,
      alphaMap: tx.parchment.alpha,
      alphaTest: 0.5,
      roughness: 0.92,
      side: THREE.DoubleSide,
    }),
    porcelain: new THREE.MeshPhysicalMaterial({
      color: PALETTE.porcelain,
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      side: THREE.DoubleSide,
      envMapIntensity: 0.9,
    }),
    porcelainGlazed: new THREE.MeshPhysicalMaterial({
      map: tx.plateGlaze,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
      envMapIntensity: 0.9,
    }),
    stoneware: new THREE.MeshPhysicalMaterial({ map: tx.stoneware, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35, side: THREE.DoubleSide }),
    stonewareCream: new THREE.MeshPhysicalMaterial({ map: tx.stonewareCream, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, side: THREE.DoubleSide }),
    chopstick: new THREE.MeshStandardMaterial({ color: '#d8b98b', roughness: 0.55 }),
    chopstickHandle: new THREE.MeshPhysicalMaterial({ color: PALETTE.terracottaDeep, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
  };
}

function shadowed(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

// ---------------------------------------------------------------------------
// Bamboo steamer
// ---------------------------------------------------------------------------

export function createSteamer(m) {
  const g = new THREE.Group();
  g.name = 'steamer';
  const Ri = LAYOUT.steamerInnerRadius;
  const wall = LAYOUT.steamerWall;
  const H = LAYOUT.steamerHeight;
  const Ro = Ri + wall;
  const seg = 128;

  // walls
  const outer = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(Ro, Ro, H, seg, 1, true), m.bamboo));
  outer.position.y = H / 2;
  const inner = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(Ri, Ri, H, seg, 1, true), m.bambooInner), false, true);
  inner.position.y = H / 2;
  const rim = shadowed(new THREE.Mesh(new THREE.RingGeometry(Ri, Ro, seg), m.bambooDark), false, true);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = H + 0.0005;
  g.add(outer, inner, rim);

  // layered outer strip wrapped around the lower two thirds, with a visible overlap seam
  const bandH = H * 0.62;
  const band = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(Ro + 0.018, Ro + 0.018, bandH, seg, 1, true), m.bambooBand));
  band.position.y = 0.05 + bandH / 2;
  band.material.map = m.bambooBand.map;
  g.add(band);
  const bandTop = new THREE.Mesh(new THREE.RingGeometry(Ro, Ro + 0.018, seg), m.bambooDark);
  bandTop.rotation.x = -Math.PI / 2;
  bandTop.position.y = 0.05 + bandH + 0.0005;
  g.add(bandTop);

  // seam where the strip overlaps itself, stitched with rattan
  const seamAngle = 32 * DEG;
  const seam = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.03, bandH, 0.09), m.bambooBand));
  seam.position.set(Math.sin(seamAngle) * (Ro + 0.03), 0.05 + bandH / 2, Math.cos(seamAngle) * (Ro + 0.03));
  seam.rotation.y = seamAngle;
  g.add(seam);
  for (let i = 0; i < 5; i++) {
    const stitch = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.05, 3, 6), m.rattan);
    const y = 0.09 + (i / 4) * (bandH - 0.08);
    stitch.position.set(Math.sin(seamAngle) * (Ro + 0.048), y, Math.cos(seamAngle) * (Ro + 0.048));
    stitch.rotation.set(0, seamAngle, 0.75);
    g.add(stitch);
  }

  // woven rattan straps top and bottom
  for (const [y, r] of [
    [H - 0.045, Ro + 0.012],
    [0.045 + bandH - 0.03, Ro + 0.03],
    [0.075, Ro + 0.03],
  ]) {
    const strap = shadowed(new THREE.Mesh(new THREE.TorusGeometry(r, 0.021, 10, seg), m.rattan));
    strap.rotation.x = Math.PI / 2;
    strap.position.y = y;
    g.add(strap);
  }

  // lattice floor: two crossing layers of thin slats inside a ring
  const lattice = new THREE.Group();
  const latY = LAYOUT.latticeY;
  const slatCount = 9;
  for (let layer = 0; layer < 2; layer++) {
    for (let i = 0; i < slatCount; i++) {
      const t = (i + 0.5) / slatCount;
      const z = (t * 2 - 1) * (Ri - 0.12);
      const len = 2 * Math.sqrt(Math.max(0, Ri * Ri - z * z)) - 0.02;
      const slat = shadowed(new THREE.Mesh(new THREE.BoxGeometry(len, 0.018, 0.055), m.bambooDark));
      if (layer === 1) {
        slat.position.set(z, latY - 0.02, 0);
        slat.rotation.y = Math.PI / 2;
      } else {
        slat.position.set(0, latY, z);
      }
      lattice.add(slat);
    }
  }
  const latRing = new THREE.Mesh(new THREE.TorusGeometry(Ri - 0.015, 0.02, 8, seg), m.bambooDark);
  latRing.rotation.x = Math.PI / 2;
  latRing.position.y = latY - 0.005;
  lattice.add(latRing);
  g.add(lattice);

  // parchment liner with steamer-paper holes, slightly crinkled
  const linerGeo = new THREE.RingGeometry(0.01, Ri - 0.05, 96, 14);
  linerGeo.rotateX(-Math.PI / 2);
  const lp = linerGeo.attributes.position;
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i);
    const z = lp.getZ(i);
    lp.setY(i, 0.004 * Math.sin(x * 6.1 + 1.3) * Math.cos(z * 5.3 + 0.4) + 0.0025 * Math.sin((x + z) * 11));
  }
  linerGeo.computeVertexNormals();
  const liner = shadowed(new THREE.Mesh(linerGeo, m.parchment));
  liner.position.y = LAYOUT.linerY;
  liner.name = 'liner';
  g.add(liner);

  g.userData.surfaceY = LAYOUT.linerY + 0.004;
  g.userData.radius = Ri;
  return g;
}

export function createSteamerLid(m) {
  const g = new THREE.Group();
  g.name = 'lid';
  const R = LAYOUT.steamerInnerRadius + LAYOUT.steamerWall + 0.025;
  const H = 0.3;
  const seg = 128;
  const wallOuter = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, seg, 1, true), m.bamboo));
  const wallInner = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(R - 0.06, R - 0.06, H, seg, 1, true), m.bambooInner), false);
  g.add(wallOuter, wallInner);
  const bottomRing = new THREE.Mesh(new THREE.RingGeometry(R - 0.06, R, seg), m.bambooDark);
  bottomRing.rotation.x = Math.PI / 2;
  bottomRing.position.y = -H / 2;
  g.add(bottomRing);

  // woven domed top
  const topGeo = new THREE.RingGeometry(0.001, R, 96, 12);
  topGeo.rotateX(-Math.PI / 2);
  const tp = topGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i);
    const z = tp.getZ(i);
    const r = Math.sqrt(x * x + z * z) / R;
    tp.setY(i, H / 2 + 0.11 * (1 - r * r));
  }
  topGeo.computeVertexNormals();
  const uv = topGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3.2, uv.getY(i) * 3.2);
  const top = shadowed(new THREE.Mesh(topGeo, m.weave));
  g.add(top);

  for (const y of [H / 2 - 0.035, -H / 2 + 0.05]) {
    const strap = shadowed(new THREE.Mesh(new THREE.TorusGeometry(R + 0.008, 0.02, 10, seg), m.rattan));
    strap.rotation.x = Math.PI / 2;
    strap.position.y = y;
    g.add(strap);
  }
  // woven handle loop on top
  const handle = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 10, 48, Math.PI), m.rattan));
  handle.position.y = H / 2 + 0.12;
  g.add(handle);
  return g;
}

// ---------------------------------------------------------------------------
// Porcelain plate
// ---------------------------------------------------------------------------

export function createPlate(m) {
  const g = new THREE.Group();
  g.name = 'plate';
  const R = LAYOUT.plateRadius;
  const topPts = [
    [0, 0.025], [0.42, 0.025], [0.84, 0.025], [1.12, 0.03], [1.32, 0.045],
    [1.47, 0.08], [1.59, 0.135], [1.68, 0.185], [R, 0.205],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const top = shadowed(new THREE.Mesh(new THREE.LatheGeometry(topPts, 128), m.porcelainGlazed), false, true);
  const underPts = [[R, 0.205], [R + 0.02, 0.16], [1.66, 0.06], [1.25, 0.0], [0, 0.0]].map(([x, y]) => new THREE.Vector2(x, y));
  const under = shadowed(new THREE.Mesh(new THREE.LatheGeometry(underPts, 128), m.porcelain), true, false);
  g.add(top, under);
  g.userData.surfaceY = LAYOUT.plateSurfaceY;
  g.userData.radius = 1.3;
  return g;
}

// ---------------------------------------------------------------------------
// Soy sauce bowl
// ---------------------------------------------------------------------------

export function createSauceBowl(m) {
  const g = new THREE.Group();
  g.name = 'bowl';
  const B = LAYOUT.bowl;
  const k = B.radius / 0.46;
  const h = B.height / 0.32;
  const outerPts = [
    [0.2, 0.0], [0.34, 0.0], [0.42, 0.05], [0.455, 0.14], [0.46, 0.24], [0.445, 0.32],
  ].map(([x, y]) => new THREE.Vector2(x * k, y * h));
  const outer = shadowed(new THREE.Mesh(new THREE.LatheGeometry(outerPts, 96), m.stoneware));
  const innerPts = [
    [0.445, 0.32], [0.405, 0.30], [0.395, 0.24], [0.36, 0.13], [0.24, 0.075], [0, 0.07],
  ].map(([x, y]) => new THREE.Vector2(x * k, y * h));
  const inner = shadowed(new THREE.Mesh(new THREE.LatheGeometry(innerPts, 96), m.stonewareCream), false, true);
  g.add(outer, inner);
  const sauce = new SauceSurface(B.sauceRadius + 0.015);
  sauce.position.y = B.sauceY;
  g.add(sauce);
  g.userData.sauce = sauce;
  g.position.set(B.x, 0, B.z);
  return g;
}

// ---------------------------------------------------------------------------
// Chopsticks and their rest
// ---------------------------------------------------------------------------

/**
 * Chopsticks group. Local +Y points from the tips (origin) toward the hand.
 * `setGap(width)` opens the sticks so the tips are `width` apart.
 */
export function createChopsticks(m) {
  const g = new THREE.Group();
  g.name = 'chopsticks';
  const L = 2.75;
  const hold = L * 0.66;
  const halfBase = 0.034;
  const pivots = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Object3D();
    pivot.position.set(side * halfBase, hold, 0);
    const body = new THREE.CylinderGeometry(0.036, 0.021, L, 16);
    body.translate(0, L / 2 - hold, 0);
    const stick = shadowed(new THREE.Mesh(body, m.chopstick));
    const handleLen = L * 0.42;
    const handle = new THREE.CylinderGeometry(0.037, 0.0325, handleLen, 16);
    handle.translate(0, L - hold - handleLen / 2 + 0.001, 0);
    const handleMesh = shadowed(new THREE.Mesh(handle, m.chopstickHandle));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.037, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.chopstickHandle);
    cap.position.y = L - hold;
    pivot.add(stick, handleMesh, cap);
    g.add(pivot);
    pivots.push(pivot);
  }
  g.userData.hold = hold;
  g.userData.setGap = (gap) => {
    const target = Math.max(0, gap / 2 - halfBase);
    const a = Math.asin(Math.min(0.95, target / hold));
    pivots[0].rotation.z = -a;
    pivots[1].rotation.z = a;
  };
  g.userData.setGap(0.02);
  return g;
}

export function createChopstickRest(m) {
  const rest = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.34, 6, 16), m.stoneware));
  rest.rotation.z = Math.PI / 2;
  rest.position.set(LAYOUT.rest.x, 0.055, LAYOUT.rest.z);
  rest.name = 'rest';
  return rest;
}

/** Pose helper: orient the chopstick group so +Y points along `handDir` with the pinch plane horizontal. */
export function chopstickQuaternion(handDir, up = new THREE.Vector3(0, 1, 0)) {
  const y = handDir.clone().normalize();
  let x = new THREE.Vector3().crossVectors(up, y);
  if (x.lengthSq() < 1e-5) x = new THREE.Vector3(1, 0, 0);
  x.normalize();
  const z = new THREE.Vector3().crossVectors(x, y).normalize();
  const mtx = new THREE.Matrix4().makeBasis(x, y, z);
  return new THREE.Quaternion().setFromRotationMatrix(mtx);
}
