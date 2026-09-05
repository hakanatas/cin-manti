/** Shared palette and tuning constants for The Dumpling Club. */

export const PALETTE = {
  cream: '#f5eee3',
  creamDeep: '#ecdfcc',
  ink: '#2b211b',
  terracotta: '#c4623d',
  terracottaDeep: '#9c472a',
  bamboo: '#d2a76d',
  bambooDark: '#a37543',
  rattan: '#b78a4f',
  parchment: '#f7efdf',
  porcelain: '#fbf8f2',
  sauce: '#2c1408',
  dough: '#f6e7d2',
  filling: '#c7745a',
  cheek: '#f0908e',
  eye: '#2a1d18',
};

export const MODEL_URL = './assets/models/dumpling.glb';

/** World-space layout of the tabletop. */
export const LAYOUT = {
  steamerInnerRadius: 1.5,
  steamerWall: 0.07,
  steamerHeight: 0.62,
  latticeY: 0.13,
  linerY: 0.155,
  plateRadius: 1.72,
  plateSurfaceY: 0.027,
  bowl: { x: 2.62, z: 0.5, radius: 0.62, height: 0.37, sauceY: 0.27, sauceRadius: 0.52 },
  rest: { x: 1.95, z: 1.6 },
};

/** Portion presets: dumpling scale and ring layout for each count. */
export const PORTIONS = {
  3: { scale: 0.55, rings: [{ n: 3, r: 0.7, phase: 0 }] },
  5: { scale: 0.49, rings: [{ n: 5, r: 0.94, phase: 0 }] },
  8: { scale: 0.38, rings: [{ n: 1, r: 0, phase: 0 }, { n: 7, r: 1.02, phase: 0 }] },
};

export const PERSONALITIES = [
  { name: 'Bao', trait: 'the cheerful one', mood: 'happy', blink: [2.5, 5.5], hop: [5, 11], cheek: 0.6 },
  { name: 'Pip', trait: 'the sleepy one', mood: 'sleepy', blink: [4, 9], hop: [14, 26], cheek: 0.45 },
  { name: 'Momo', trait: 'the mischievous one', mood: 'smug', blink: [2, 4.5], hop: [3.5, 7], cheek: 0.7 },
  { name: 'Dodo', trait: 'the nervous one', mood: 'worried', blink: [1.2, 3], hop: [6, 12], cheek: 0.5 },
  { name: 'Sesame', trait: 'the proud one', mood: 'proud', blink: [3, 6], hop: [8, 16], cheek: 0.85 },
  { name: 'Nugget', trait: 'the hungry one', mood: 'yum', blink: [2, 5], hop: [4, 9], cheek: 0.65 },
  { name: 'Plum', trait: 'the dreamy one', mood: 'joy', blink: [3, 7], hop: [9, 18], cheek: 0.8 },
  { name: 'Tofu', trait: 'the curious one', mood: 'curious', blink: [1.8, 4], hop: [5, 10], cheek: 0.55 },
];

export const REACTIONS = [
  'Mmm. Soft as a cloud.',
  'Perfectly steamed.',
  'So juicy!',
  "That's the good stuff.",
  'Ten out of ten. No notes.',
  'Worth every second in the steamer.',
  'Soy sauce for the soul.',
  'Small bite. Big feeling.',
  "Chef's kiss.",
  'Tender. Warm. Gone too soon.',
  'Okay, one more.',
  'Pure comfort.',
];

export const STORAGE_KEY = 'dumpling-club:v1';
