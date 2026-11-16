// a tiny shared channel between the skill astrolabe and the roaming dragon
export type Pt = { x: number; y: number };
export const dragonBus = {
  guard: null as null | { cx: number; cy: number; r: number },
  breathe: null as Pt | null,
  celebrateUntil: 0, // performance.now() time; while it lasts the guarding dragon races round the rim
};
