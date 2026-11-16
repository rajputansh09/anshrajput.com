// shared shapes for the dragon modules
export type P = { x: number; y: number };
export type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; smoke: boolean; fx?: boolean; px?: number; py?: number; own?: number; bid?: number };
// kind: what sort of lantern it is
export type LanternKind = "plain" | "iron" | "great" | "jade";
export type Lantern = { x: number; y: number; bx: number; by: number; r: number; heat: number; need: number; ph: number; amp: number; spd: number; burst: number; kind?: LanternKind; vy?: number };
export type Wall = { x: number; y: number; w: number; h: number; seed: number; ghost?: boolean };
// off: no game
export type Phase = "off" | "menu" | "intro" | "brief" | "play" | "won" | "lost";
export type GameKind = "trial" | "siege";
// a floating "+10" or "-15" that rises and fades where something happened
export type Float = { x: number; y: number; text: string; col: string; at: number };
export type GameState = {
  kind: GameKind;
  lanterns: Lantern[]; walls: Wall[];
  // Trial: sand left (time), sand at the start (start), lanterns in the level (total) and not yet burned (left)
  time: number; start: number; total: number; left: number;
  doneAt: number;
  elapsed: number;
  // fire: how much flame is left (0 to 100)
  fuel: number; overheat: boolean; lastBurn: number;
  // score and counts
  score: number; shown: number; burned: number;
  // Siege only
  health: number; hpShown: number; plain: number; great: number; jade: number; escaped: number;
  nextPlain: number; nextGreat: number; nextJade: number; over: boolean; stage: number;
  hurtAt: number; floats: Float[]; toast: { text: string; at: number } | null;
};
