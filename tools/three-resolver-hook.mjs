// Node module-resolution hook so bare `three` imports inside the vendored
// add-ons resolve to the vendored build (no npm install required).
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') {
    return { url: pathToFileURL(path.join(root, 'vendor/three/three.module.js')).href, shortCircuit: true };
  }
  if (specifier.startsWith('three/addons/')) {
    const rel = specifier.slice('three/addons/'.length);
    return { url: pathToFileURL(path.join(root, 'vendor/three/addons', rel)).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
