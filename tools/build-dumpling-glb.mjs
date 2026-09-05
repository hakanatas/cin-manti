#!/usr/bin/env node
/**
 * Bakes assets/models/dumpling.glb from the procedural shape in
 * js/dumpling-shape.js using three.js' GLTFExporter (no npm install needed).
 *
 *   node tools/build-dumpling-glb.mjs
 */
import { register } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

register('./three-resolver-hook.mjs', import.meta.url);

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

// Minimal FileReader shim — GLTFExporter uses it to read its Blob.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        this.onloadend?.({ target: this });
      });
    }
    readAsDataURL() {
      throw new Error('readAsDataURL is not supported in this shim');
    }
  };
}

const THREE = await import('three');
const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
const { createDumplingGeometry } = await import('../js/dumpling-shape.js');

const geometry = createDumplingGeometry(THREE);
const material = new THREE.MeshStandardMaterial({
  name: 'Dough',
  color: 0xffffff,
  vertexColors: true,
  roughness: 0.72,
  metalness: 0,
});
const mesh = new THREE.Mesh(geometry, material);
mesh.name = 'DumplingBody';

const scene = new THREE.Scene();
scene.name = 'Dumpling';
scene.add(mesh);

const exporter = new GLTFExporter();
const result = await new Promise((res, rej) => {
  exporter.parse(scene, res, rej, { binary: true });
});

const out = path.join(root, 'assets/models/dumpling.glb');
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, Buffer.from(result));
console.log(`wrote ${path.relative(root, out)} (${(result.byteLength / 1024).toFixed(1)} KB, ${geometry.index.count / 3} triangles)`);
