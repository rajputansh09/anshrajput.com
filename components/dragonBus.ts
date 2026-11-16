// lets the astrolabe and the dragon talk to each other
export type Pt = { x: number; y: number };
export const dragonBus = {
  guard: null as null | { cx: number; cy: number; r: number },
  breathe: null as Pt | null,
  celebrateUntil: 0, // performance.now() timestamp, dragon races around the rim until then
};
