// colours for the two dragons
export type Pal = {
  name: string;
  body: [string, string, string, string];
  band1: string; band2: string; seam: string; plate: string; rim: string; sheen: string; line: string;
  leg: [string, string]; legScale: string;
  fin: [string, string]; skull: [string, string, string];
  shade: string;
  shadeLight: string; crest: string; ridge: string; scale: string; cheek: string;
  brow: string; browLight: string; lid: string; jawLine: string;
};

export const GREEN: Pal = {
  name: "Dravoxus",
  body: ["#1f5a3b", "#1a4a31", "#143b27", "#0c2618"],
  band1: "rgba(30, 84, 56, 0.3)", band2: "rgba(52, 120, 84, 0.26)",
  seam: "rgba(10, 26, 16, 0.85)", plate: "rgba(6, 20, 12, 0.55)", rim: "rgba(140, 220, 175, 0.2)",
  sheen: "rgba(160, 240, 200, 0.09)", line: "#050d08",
  leg: ["#1d4d33", "#12301f"], legScale: "rgba(140, 220, 175, 0.32)",
  fin: ["#1a4a31", "#0a2016"], skull: ["#0f3322", "#1f5a3b", "#2b7a50"],
  shade: "4, 17, 10", shadeLight: "rgba(130, 225, 175, 0.14)", crest: "rgba(170, 240, 200, 0.16)",
  ridge: "rgba(160, 230, 190, 0.42)", scale: "rgba(140, 220, 175, 0.3)", cheek: "rgba(157, 232, 191, 0.3)",
  brow: "#0b2418", browLight: "rgba(182, 245, 210, 0.4)", lid: "#1a4a31", jawLine: "#06140c",
};

export const RED: Pal = {
  name: "Balerian",
  body: ["#5c1a16", "#4b1512", "#390f0d", "#230806"],
  band1: "rgba(100, 30, 26, 0.3)", band2: "rgba(150, 50, 42, 0.26)",
  seam: "rgba(28, 7, 6, 0.85)", plate: "rgba(22, 5, 4, 0.55)", rim: "rgba(240, 150, 130, 0.2)",
  sheen: "rgba(255, 175, 155, 0.09)", line: "#0e0403",
  leg: ["#481613", "#2c0d0b"], legScale: "rgba(240, 150, 130, 0.32)",
  fin: ["#4b1512", "#1c0705"], skull: ["#310c0a", "#5c1a16", "#7d241d"],
  shade: "18, 4, 3", shadeLight: "rgba(255, 150, 130, 0.14)", crest: "rgba(255, 185, 165, 0.16)",
  ridge: "rgba(255, 170, 150, 0.42)", scale: "rgba(240, 150, 130, 0.3)", cheek: "rgba(250, 160, 140, 0.3)",
  brow: "#2a0907", browLight: "rgba(255, 190, 170, 0.4)", lid: "#4b1512", jawLine: "#150504",
};
