import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 900 } });

test("selected player names and remove controls stay usable on phones", async ({ page }) => {
  await page.goto("/players/compare?season=20252026&players=8478402,8479318");
  const selected = page.getByRole("list", { name: "Selected players" });
  await expect(selected.getByText("Connor McDavid", { exact: true })).toBeVisible();
  const names = await selected.locator("strong").evaluateAll((elements) =>
    elements.every((element) => element.scrollWidth <= element.clientWidth + 1),
  );
  expect(names).toBe(true);
  const remove = selected.getByRole("button", { name: "Remove Connor McDavid" });
  const bounds = await remove.boundingBox();
  expect(bounds?.width).toBeGreaterThanOrEqual(40);
  expect(bounds?.height).toBeGreaterThanOrEqual(40);
  await remove.click();
  await expect(selected.getByText("Connor McDavid", { exact: true })).toHaveCount(0);
  await expect(page).not.toHaveURL(/players=8478402/);
});

test("comparison metric labels remain visible while values scroll", async ({ page }) => {
  await page.goto("/players/compare?season=20252026&players=8478402,8479318");
  const region = page.getByRole("region", { name: "Player comparison table, scroll horizontally for more players" });
  const label = region.locator("tbody th").first();
  await label.scrollIntoViewIfNeeded();
  const before = await label.boundingBox();
  await region.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  const after = await label.boundingBox();
  expect(Math.abs(after!.x - before!.x)).toBeLessThan(2);
  expect(await region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});

test("playoff abbreviations fit without reducing readable type", async ({ page }) => {
  await page.goto("/playoffs?season=20252026");
  const names = page.locator(".workspace-bracket-team-name");
  await expect(names.first()).toBeVisible();
  expect(await names.evaluateAll((elements) => elements.every((element) =>
    element.scrollWidth <= element.clientWidth + 1 && parseFloat(getComputedStyle(element).fontSize) >= 13,
  ))).toBe(true);
  await page.locator(".workspace-bracket-series").first().click();
  const close = page.getByRole("button", { name: "Close series details" });
  await expect(close).toBeVisible();
  expect((await close.boundingBox())!.width).toBeGreaterThanOrEqual(40);
  await close.click();
  await expect(page.locator("dialog")).not.toBeVisible();
});

test("team overview supporting labels use a readable size", async ({ page }) => {
  await page.goto("/teams/26?season=20252026");
  const label = page.getByText("Percent of possible standings points earned", { exact: true });
  await expect(label).toBeVisible();
  expect(await label.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(13);
});

test("mobile game score keeps both numbers in the same compact column", async ({ page }) => {
  await page.goto("/games/2025030416");
  const hero = page.locator(".workspace-game-hero");
  await expect(hero).toBeVisible();
  expect((await hero.boundingBox())!.height).toBeLessThan(350);
  const scores = page.locator(".workspace-game-score-team > strong");
  const first = await scores.nth(0).boundingBox();
  const second = await scores.nth(1).boundingBox();
  expect(Math.abs(first!.x + first!.width - second!.x - second!.width)).toBeLessThan(2);
});

test("comparison remains contained on a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/players/compare?season=20252026&players=8478402,8479318");
  await expect(page.locator(".workspace-comparison-matrix")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
