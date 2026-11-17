// quick checks on the real page in Chromium: it loads without errors, every arcade level starts
import { test, expect } from "@playwright/test";

test("home page loads without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  expect(errors).toEqual([]);
});

test("every arcade level starts", async ({ page }) => {
  // unlock all the levels the same way a returning player would have them
  await page.addInitScript(() => {
    const all = { stars: [1, 1, 0], best: [1, 1, 0] };
    localStorage.setItem("arcade-progress", JSON.stringify({ tanks: all, obstacle: all, crypt: all, shooter: all, warehouse: all }));
  });
  await page.goto("/?dragon-debug");
  await page.locator("#games").scrollIntoViewIfNeeded();
  const tabs = page.locator(".arc-tab");
  for (let g = 0; g < 5; g++) {
    await tabs.nth(g).click();
    for (let lv = 0; lv < 3; lv++) {
      await page.locator(".arc-level").nth(lv).click();
      await page.locator(".arc-card .btn-primary").click();
      const state = await page.evaluate(() => {
        const game = (window as unknown as { __arcade: { game: () => { state: string; level: number } } }).__arcade.game();
        return `${game.level}:${game.state}`;
      });
      expect(state).toBe(`${lv}:play`);
      await page.keyboard.press("Escape");
      await page.locator(".arc-card .btn", { hasText: "Levels" }).click();
    }
  }
});

test("gap sample verdict follows the answers", async ({ page }) => {
  await page.goto("/#ucert");
  const demo = page.locator(".demo.gap");
  const answer = async (picks: number[]) => {
    for (let q = 0; q < 3; q++) await demo.locator(".seg").nth(q).locator("button").nth(picks[q]).click();
  };
  await answer([0, 0, 0]);
  await expect(demo.locator(".gap-num")).toHaveText("100%");
  await expect(demo.locator(".gap-label")).toHaveText(/Audit-ready/);
  await answer([0, 0, 2]);
  await expect(demo.locator(".gap-num")).toHaveText("67%");
  await expect(demo.locator(".gap-label")).toHaveText(/Needs improvement/);
  await answer([1, 1, 2]);
  await expect(demo.locator(".gap-num")).toHaveText("33%");
  await expect(demo.locator(".gap-label")).toHaveText(/Not ready/);
});
