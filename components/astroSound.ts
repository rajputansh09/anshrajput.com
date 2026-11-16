// tiny synthesized sound set for the skill astrolabe
type AC = AudioContext;
let ctx: AC | null = null;
let master: GainNode | null = null;
let enabled = false;
let lastChime = 0;
let lastTick = 0;

const ac = () => {
  if (!ctx) {
    try {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new C();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
};

const noise = (c: AC, secs: number) => {
  const b = c.createBuffer(1, Math.ceil(c.sampleRate * secs), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = b;
  return src;
};

// a pentatonic scale per ring, so waking runes plays something musical rather than random beeps
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19];
const BASE = [523.25, 392.0, 329.63, 261.63];

export const sound = {
  get on() {
    return enabled;
  },
  set(v: boolean) {
    enabled = v;
    if (v) ac();
  },
  chime(ring: number, idx: number) {
    if (!enabled) return;
    const c = ac();
    if (!c || !master) return;
    const now = c.currentTime;
    if (now - lastChime < 0.05) return;
    lastChime = now;
    const f = BASE[ring] * Math.pow(2, SCALE[idx % SCALE.length] / 12);
    for (const [mult, vol, type] of [[1, 0.22, "sine"], [2.01, 0.08, "triangle"], [3.99, 0.03, "sine"]] as const) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = f * mult;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol, now + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      o.connect(g).connect(master);
      o.start(now);
      o.stop(now + 1.7);
    }
  },
  whoosh() {
    if (!enabled) return;
    const c = ac();
    if (!c || !master) return;
    const now = c.currentTime;
    const src = noise(c, 0.9);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(300, now);
    bp.frequency.exponentialRampToValueAtTime(2200, now + 0.5);
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.35, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    src.connect(bp).connect(g).connect(master);
    src.start(now);
  },
  tick() {
    if (!enabled) return;
    const c = ac();
    if (!c || !master) return;
    const now = c.currentTime;
    if (now - lastTick < 0.045) return;
    lastTick = now;
    const src = noise(c, 0.03);
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2500;
    const g = c.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    src.connect(hp).connect(g).connect(master);
    src.start(now);
  },
  chord(ring: number) {
    if (!enabled) return;
    [0, 4, 7, 12].forEach((s, i) => setTimeout(() => this.chime(ring, s === 0 ? 0 : s === 4 ? 2 : s === 7 ? 3 : 5), i * 90));
  },
  roar() {
    if (!enabled) return;
    const c = ac();
    if (!c || !master) return;
    const now = c.currentTime;
    const src = noise(c, 2.2);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(900, now);
    lp.frequency.exponentialRampToValueAtTime(180, now + 1.8);
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.6, now + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);
    src.connect(lp).connect(g).connect(master);
    src.start(now);
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(95, now);
    o.frequency.exponentialRampToValueAtTime(55, now + 1.6);
    og.gain.setValueAtTime(0, now);
    og.gain.linearRampToValueAtTime(0.12, now + 0.1);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 1.7);
    o.connect(og).connect(lp);
    o.start(now);
    o.stop(now + 1.8);
  },
};
