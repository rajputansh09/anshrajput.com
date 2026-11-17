// every level of every game has to be beatable
import { test, expect } from "@playwright/test";
import { withSeed } from "./bots/random";
import { playTanks } from "./bots/tanks";
import { playObstacle } from "./bots/obstacle";
import { playCrypt } from "./bots/crypt";
import { playShooter } from "./bots/shooter";
import { playWarehouse } from "./bots/warehouse";

const games: [string, (level: number) => { state: string; seconds: number }][] = [
  ["Toon Tanks", playTanks],
  ["Obstacle Assault", playObstacle],
  ["Crypt Raider", playCrypt],
  ["Simple Shooter", playShooter],
  ["Warehouse Wreckage", playWarehouse],
];

for (const [name, play] of games) {
  test.describe(name, () => {
    for (const level of [0, 1, 2]) {
      test(`level ${level + 1} can be cleared`, () => {
        test.setTimeout(120_000);
        const tries: string[] = [];
        for (let seed = 1; seed <= 5; seed++) {
          const r = withSeed(seed, () => play(level));
          tries.push(`seed ${seed}: ${r.state} after ${r.seconds.toFixed(1)}s`);
          if (r.state === "won") break;
        }
        expect(tries.at(-1), tries.join("\n")).toContain("won");
      });
    }
  });
}
