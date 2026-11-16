// arcade sound effects, all synthesised with Web Audio, no audio files

type Tone = { f0: number; f1: number; dur: number; type?: OscillatorType; vol?: number; at?: number };
type Noise = { dur: number; f0: number; f1?: number; q?: number; filter?: BiquadFilterType; vol?: number; at?: number };
type Recipe = { tones?: Tone[]; noise?: Noise[] };

const MUTE_KEY = "arcade-mute";

const RECIPES: Record<string, Recipe> = {
  shell: { tones: [{ f0: 170, f1: 55, dur: 0.18, type: "sine", vol: 0.5 }], noise: [{ dur: 0.16, f0: 900, f1: 200, filter: "lowpass", vol: 0.35 }] },
  shellLow: { tones: [{ f0: 120, f1: 45, dur: 0.2, type: "sine", vol: 0.35 }], noise: [{ dur: 0.14, f0: 600, f1: 150, filter: "lowpass", vol: 0.22 }] },
  laser: { tones: [{ f0: 1500, f1: 420, dur: 0.07, type: "sawtooth", vol: 0.12 }], noise: [{ dur: 0.03, f0: 4000, filter: "highpass", vol: 0.06 }] },
  zap: { tones: [{ f0: 700, f1: 180, dur: 0.11, type: "square", vol: 0.08 }] },
  hit: { tones: [{ f0: 320, f1: 110, dur: 0.09, type: "triangle", vol: 0.32 }], noise: [{ dur: 0.05, f0: 2200, filter: "bandpass", q: 1.5, vol: 0.2 }] },
  metal: { tones: [{ f0: 1250, f1: 900, dur: 0.06, type: "square", vol: 0.07 }, { f0: 1870, f1: 1500, dur: 0.05, type: "square", vol: 0.04 }] },
  hurt: { tones: [{ f0: 220, f1: 90, dur: 0.16, type: "sawtooth", vol: 0.16 }], noise: [{ dur: 0.08, f0: 1200, filter: "bandpass", vol: 0.2 }] },
  boom: { tones: [{ f0: 95, f1: 28, dur: 0.6, type: "sine", vol: 0.7 }], noise: [{ dur: 0.7, f0: 1400, f1: 70, filter: "lowpass", vol: 0.6 }] },
  pop: { tones: [{ f0: 140, f1: 50, dur: 0.25, type: "sine", vol: 0.45 }], noise: [{ dur: 0.3, f0: 1800, f1: 200, filter: "lowpass", vol: 0.35 }] },
  crate: { tones: [{ f0: 190, f1: 80, dur: 0.12, type: "triangle", vol: 0.35 }], noise: [{ dur: 0.16, f0: 900, q: 0.8, filter: "bandpass", vol: 0.4 }] },
  knock: { tones: [{ f0: 130, f1: 70, dur: 0.08, type: "sine", vol: 0.3 }], noise: [{ dur: 0.05, f0: 500, filter: "lowpass", vol: 0.18 }] },
  jump: { tones: [{ f0: 280, f1: 720, dur: 0.12, type: "square", vol: 0.09 }] },
  land: { noise: [{ dur: 0.07, f0: 500, filter: "lowpass", vol: 0.25 }] },
  swing: { noise: [{ dur: 0.22, f0: 400, f1: 1300, q: 2, filter: "bandpass", vol: 0.14 }] },
  flag: { tones: [{ f0: 660, f1: 660, dur: 0.09, vol: 0.18 }, { f0: 880, f1: 880, dur: 0.09, vol: 0.18, at: 0.08 }, { f0: 1320, f1: 1320, dur: 0.18, vol: 0.18, at: 0.16 }] },
  die: { tones: [{ f0: 440, f1: 70, dur: 0.38, type: "sawtooth", vol: 0.14 }], noise: [{ dur: 0.2, f0: 800, filter: "lowpass", vol: 0.2 }] },
  grab: { tones: [{ f0: 380, f1: 760, dur: 0.08, type: "sine", vol: 0.22 }] },
  drop: { tones: [{ f0: 520, f1: 240, dur: 0.09, type: "sine", vol: 0.2 }] },
  plate: { tones: [{ f0: 220, f1: 220, dur: 0.3, type: "triangle", vol: 0.25 }, { f0: 330, f1: 330, dur: 0.3, type: "triangle", vol: 0.18, at: 0.05 }] },
  gate: { noise: [{ dur: 1.1, f0: 260, f1: 160, filter: "lowpass", vol: 0.32 }], tones: [{ f0: 55, f1: 48, dur: 1.0, type: "sawtooth", vol: 0.05 }] },
  spike: { noise: [{ dur: 0.09, f0: 3500, filter: "highpass", vol: 0.16 }], tones: [{ f0: 1900, f1: 1300, dur: 0.05, type: "square", vol: 0.03 }] },
  tick: { tones: [{ f0: 880, f1: 880, dur: 0.07, type: "sine", vol: 0.2 }] },
  go: { tones: [{ f0: 1320, f1: 1320, dur: 0.25, type: "sine", vol: 0.24 }, { f0: 660, f1: 660, dur: 0.25, type: "triangle", vol: 0.12 }] },
  throw: { noise: [{ dur: 0.22, f0: 500, f1: 1800, q: 1.2, filter: "bandpass", vol: 0.26 }] },
  win: { tones: [0, 1, 2, 3].map((k) => ({ f0: [523, 659, 784, 1047][k], f1: [523, 659, 784, 1047][k], dur: k === 3 ? 0.45 : 0.14, type: "triangle" as OscillatorType, vol: 0.2, at: k * 0.12 })) },
  lose: { tones: [0, 1, 2].map((k) => ({ f0: [392, 330, 262][k], f1: [392, 330, 220][k], dur: k === 2 ? 0.5 : 0.16, type: "triangle" as OscillatorType, vol: 0.2, at: k * 0.15 })) },
  star: { tones: [{ f0: 988, f1: 1976, dur: 0.16, type: "sine", vol: 0.16 }] },
  click: { tones: [{ f0: 660, f1: 520, dur: 0.05, type: "square", vol: 0.1 }] },
  on: { tones: [{ f0: 660, f1: 660, dur: 0.08, type: "triangle", vol: 0.25 }, { f0: 990, f1: 990, dur: 0.12, type: "triangle", vol: 0.25, at: 0.07 }] },
};

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;
let primed = false;
let listening = false;
let started = false;
const VOLUME = 0.9;
let loaded = false;
const last: Record<string, number> = {};

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch { /* storage blocked, sound on */ }
}

export const sfx = {
  isMuted() { load(); return muted; },
  setMuted(m: boolean) {
    load();
    muted = m;
    try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch { /* not saved but still applied */ }
    if (out && ctx) out.gain.setTargetAtTime(m ? 0 : VOLUME, ctx.currentTime, 0.02);
  },
  // call this from a click, tap or key press so the browser allows audio
  unlock() {
    load();
    if (typeof window === "undefined") return;
    try {
      if (!ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        // iPhone: "playback" lets game sound play even with the silent switch on (iOS 17+)
        const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
        if (session) { try { session.type = "playback"; } catch { /* older Safari */ } }
        ctx = new AC({ latencyHint: "interactive" });
        out = ctx.createGain();
        out.gain.value = muted ? 0 : VOLUME;
        // light compressor so stacked explosions don't clip
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -10; comp.ratio.value = 3; comp.knee.value = 10;
        out.connect(comp).connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state !== "running") void ctx.resume().catch(() => {});
      if (!primed) {
        primed = true;
        const s = ctx.createBufferSource();
        s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        s.connect(ctx.destination);
        s.start(0);
      }
    } catch {
      ctx = null;
    }
  },
  // resume audio on the first real interaction anywhere on the page
  listen() {
    if (listening || typeof window === "undefined") return;
    listening = true;
    const wake = () => { if (ctx || started) sfx.unlock(); };
    for (const ev of ["pointerdown", "touchend", "keydown", "click"]) window.addEventListener(ev, wake, { capture: true, passive: true });
    document.addEventListener("visibilitychange", () => { if (!document.hidden && ctx && ctx.state !== "running") void ctx.resume().catch(() => {}); });
  },
  start() { started = true; sfx.unlock(); },
  play(name: keyof typeof RECIPES | string, vol = 1) {
    if (!ctx || !out || muted) return;
    if (ctx.state !== "running") {
      // Safari resumes audio async, so play once it's ready unless that takes too long
      const asked = performance.now();
      void ctx.resume().then(() => { if (ctx?.state === "running" && performance.now() - asked < 300) sfx.play(name, vol); }).catch(() => {});
      return;
    }
    const r = RECIPES[name];
    if (!r) return;
    const now = ctx.currentTime;
    if (now - (last[name] ?? -1) < 0.04) return;
    last[name] = now;
    try {
      for (const t of r.tones ?? []) {
        const o = ctx.createOscillator(), g = ctx.createGain(), at = now + (t.at ?? 0);
        o.type = t.type ?? "sine";
        o.frequency.setValueAtTime(t.f0, at);
        o.frequency.exponentialRampToValueAtTime(Math.max(20, t.f1), at + t.dur);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime((t.vol ?? 0.2) * vol, at + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, at + t.dur);
        o.connect(g).connect(out);
        o.start(at); o.stop(at + t.dur + 0.02);
      }
      for (const n of r.noise ?? []) {
        if (!noiseBuf) break;
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), at = now + (n.at ?? 0);
        s.buffer = noiseBuf;
        f.type = n.filter ?? "lowpass";
        f.Q.value = n.q ?? 0.7;
        f.frequency.setValueAtTime(n.f0, at);
        if (n.f1) f.frequency.exponentialRampToValueAtTime(n.f1, at + n.dur);
        g.gain.setValueAtTime((n.vol ?? 0.2) * vol, at);
        g.gain.exponentialRampToValueAtTime(0.0001, at + n.dur);
        s.connect(f).connect(g).connect(out);
        s.start(at, Math.random() * 0.5); s.stop(at + n.dur + 0.02);
      }
    } catch {
      // a broken sound should never stop the game
    }
  },
};
