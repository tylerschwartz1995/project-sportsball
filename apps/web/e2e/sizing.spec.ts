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
  const region = page.getByRole("region", { name: "Player comparison table" });
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
  const label = page.getByText("Points Percentage", { exact: true });
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

test("desktop comparison uses a wider metric column and only cues real overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/players/compare?season=20252026&players=8478402,8479318,8477934,8477492");
  const region = page.getByRole("region", { name: "Player comparison table", exact: true });
  await expect(region).toHaveAttribute("data-overflow", "false");
  expect((await region.locator("tbody th").first().boundingBox())!.width).toBeCloseTo(240, 0);
  await expect(region.locator("tbody td").first()).toHaveCSS("font-size", "16px");
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(region).toHaveAttribute("data-overflow", "true");
  expect((await region.locator("tbody th").first().boundingBox())!.width).toBeCloseTo(152, 0);
});

test("shot orientation stays readable without scaling with the rink", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/games/2025030416?view=advanced&advancedView=shots");
  const map = page.locator(".modern-shot-map").first();
  const orientation = map.locator(".modern-shot-orientation");
  await expect(orientation).toHaveCSS("font-size", "14px");
  await expect(map.locator("svg text")).toHaveCount(0);
  const marker = map.locator('svg g[role="button"]').first();
  await marker.click();
  await expect(map.locator('[aria-live="polite"]')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(orientation).toHaveCSS("font-size", "14px");
});

test("desktop tables distinguish sparse totals from dense histories", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/players?season=20252026");
  await expect(page.locator("table tbody td.workspace-semantic-number").first()).toHaveCSS("font-size", "16px");
  const row = page.locator("table tbody tr").first();
  await row.scrollIntoViewIfNeeded();
  expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.goto("/history?section=careers");
  await expect(page.locator(".workspace-history-results h3")).toHaveCSS("font-size", "24px");
  await expect(page.locator(".workspace-history-table tbody td.workspace-history-metric").first()).toHaveCSS("font-size", "15px");
  await page.locator(".workspace-history-table").scrollIntoViewIfNeeded();
  expect((await page.locator(".workspace-history-table thead th").first().boundingBox())!.height).toBeGreaterThanOrEqual(40);
  await page.locator(".workspace-history-filter-drawer > summary").click();
  const input = page.locator('.workspace-history-filter-drawer input:not([type="hidden"])').first();
  await expect(input).toHaveCSS("font-size", "16px");
  expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test("short series game lists use natural height and stats retain internal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/playoffs?season=20252026");
  await page.locator(".workspace-bracket-series").first().click();
  const dialog = page.getByRole("dialog");
  await page.getByRole("tab", { name: /Games \(/ }).click();
  await expect(dialog).toHaveAttribute("data-view", "games");
  expect(await dialog.evaluate(element => element.getBoundingClientRect().height - element.querySelector(".workspace-series-dialog-card")!.getBoundingClientRect().height)).toBeLessThan(3);
  expect((await dialog.boundingBox())!.height).toBeLessThanOrEqual(936);
  await page.getByRole("tab", { name: "Player Stats", exact: true }).click();
  await expect(dialog.locator(".workspace-series-table").first()).toBeVisible();
  await expect(dialog.locator(".workspace-series-table td").first()).toHaveCSS("font-size", "15px");
  await expect(dialog.locator(".workspace-series-tabs button").first()).toHaveCSS("font-size", "15px");
  await expect(page.getByRole("button", { name: "Close series details" })).toBeVisible();
});
