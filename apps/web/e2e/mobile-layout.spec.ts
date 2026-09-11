import { expect, test, type Locator } from "@playwright/test";

async function expectVisibleStatBesideIdentity(region: Locator, identityIndex = 0) {
  await expect(region).toBeVisible();
  await expect(region.locator("tbody tr").first()).toBeVisible();
  const measurements = await region.evaluate((element, index) => {
    const viewport = element.getBoundingClientRect();
    const cells = Array.from(element.querySelectorAll<HTMLTableCellElement>("tbody tr:first-child > td"));
    const identity = cells[index].getBoundingClientRect();
    return {
      identityWidth: identity.width,
      viewportWidth: viewport.width,
      visibleStats: cells.slice(index + 1).filter(cell => {
        const rect = cell.getBoundingClientRect();
        return rect.width > 0 && rect.left >= identity.right - 1 && rect.right <= viewport.right + 1;
      }).length,
    };
  }, identityIndex);
  expect(measurements.identityWidth).toBeLessThan(measurements.viewportWidth * 0.55);
  expect(measurements.visibleStats).toBeGreaterThan(0);
}

for (const width of [320, 390, 430]) {
  test(`player statistics stay visible in both column presets at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const type of ["skaters", "goalies"]) {
      await page.goto(`/players?type=${type}`);
      const region = page.locator(".ux-player-results .responsive-table-scroll");
      await expect(region.locator("tbody tr").first()).toBeVisible();
      for (const expanded of [false, true]) {
        if (expanded) await page.getByRole("button", { name: "Show all columns" }).click();
        await region.evaluate(element => { element.scrollLeft = 0; });
        await expectVisibleStatBesideIdentity(region);
        await region.evaluate(element => { element.scrollLeft = element.scrollWidth; });
        await expectVisibleStatBesideIdentity(region);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

test("phone standings and record books expose the ranking beside the identity", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const route of ["/standings", "/history?section=careers", "/history?section=careers&metric=goals"]) {
    await page.goto(route);
    const region = page.locator(".responsive-table-scroll").first();
    await expectVisibleStatBesideIdentity(region, 1);
    const primaryHeader = region.locator("thead tr").first().locator("th").nth(2);
    if (route === "/standings") await expect(primaryHeader).toHaveAttribute("aria-label", "PTS");
    else await expect(primaryHeader).toHaveClass(/is-active-metric/);
    await region.evaluate(element => { element.scrollLeft = element.scrollWidth; });
    const left = await region.evaluate(element => ({
      viewport: element.getBoundingClientRect().left,
      identity: element.querySelector("tbody tr > td:nth-child(2)")!.getBoundingClientRect().left,
    }));
    expect(Math.abs(left.viewport - left.identity)).toBeLessThanOrEqual(2);
  }
});

test("tables retain their header and permit vertical scroll chaining", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/players", "/standings", "/history?section=careers", "/teams/26/games"]) {
    await page.goto(route);
    const region = page.locator(".responsive-table-scroll").first();
    await expect(region).toHaveAttribute("data-overflow-y", "true");
    await region.scrollIntoViewIfNeeded();
    await region.evaluate(element => { element.scrollTop = 300; });
    const scroll = await region.evaluate(element => ({
      top: element.getBoundingClientRect().top,
      headerTop: element.querySelector("thead")!.getBoundingClientRect().top,
      chaining: getComputedStyle(element).overscrollBehaviorY,
    }));
    expect(Math.abs(scroll.top - scroll.headerTop)).toBeLessThanOrEqual(2);
    expect(scroll.chaining).toBe("auto");
  }
});

test("two-player comparison fits and overflow guidance responds to resizing", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/players/compare?players=8478402,8479318");
  const region = page.locator(".modern-comparison-scroll");
  await expect(region).toHaveAttribute("data-overflow", "false");
  expect(await region.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.goto("/players/compare?players=8478402,8479318,8477934");
  await expect(region).toHaveAttribute("data-overflow", "true");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(region).toHaveAttribute("data-overflow", "false");
});

test("draft, scoring and combination tables expose useful first-screen information", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const [route, selector, identity] of [
    ["/drafts", ".modern-draft-board", 1],
    ["/games/2025030416", ".workspace-scoring-table", 0],
    ["/lines", ".workspace-unit-table", 1],
  ] as const) {
    await page.goto(route);
    const region = page.locator(".responsive-table-scroll").filter({ has: page.locator(selector) }).first();
    await expectVisibleStatBesideIdentity(region, identity);
    if (route === "/lines") {
      await expect(region.getByRole("link", { name: /View supporting games/ }).first()).toBeVisible();
      await region.evaluate(element => { element.scrollLeft = element.scrollWidth; });
      await expectVisibleStatBesideIdentity(region, identity);
    }
    if (route.startsWith("/games")) await expect(region.locator(".workspace-mobile-goal-time").first()).toContainText("03:47");
  }
});

for (const [width, height] of [[320, 568], [375, 667], [390, 844], [844, 390]]) {
  test(`playoff stats are readable and dismissible at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/playoffs");
    await page.locator(".workspace-bracket-series").first().click();
    const dialog = page.getByRole("dialog");
    for (const tab of ["Player Stats", "Advanced Analytics"]) {
      await dialog.getByRole("tab", { name: tab, exact: true }).click();
      await expect(dialog.locator("tbody tr").first()).toBeVisible();
      const visibleHeight = await dialog.locator(".workspace-series-table-scroll").evaluate(element => {
        const rect = element.getBoundingClientRect();
        const panel = element.closest(".workspace-series-panel")!.getBoundingClientRect();
        return Math.min(rect.bottom, panel.bottom, innerHeight) - Math.max(rect.top, panel.top, 0);
      });
      expect(visibleHeight).toBeGreaterThanOrEqual(120);
    }
    await dialog.locator(".workspace-series-masthead-bar button").click();
    await expect(dialog).not.toBeVisible();
  });
}

test("mobile filters remain available and all page views fit their navigation", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/players");
  const toggle = page.getByRole("button", { name: /Filters & Sort/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect((await page.locator(".ux-player-results table").boundingBox())!.y).toBeLessThan(800);
  await toggle.click();
  await page.getByRole("combobox", { name: "Sort By", exact: true }).selectOption("goals");
  await page.getByRole("button", { name: "Apply Filters", exact: true }).click();
  await expect(page).toHaveURL(/sort=goals/);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  for (const route of ["/history", "/drafts", "/games/2025030416", "/players/8478402"]) {
    await page.goto(route);
    const clipped = await page.locator(".workspace-scroll-nav:visible a").evaluateAll(links => links.filter(link => {
      const rect = link.getBoundingClientRect();
      return rect.left < 0 || rect.right > innerWidth + 1 || rect.height < 44;
    }).map(link => link.textContent));
    expect(clipped).toEqual([]);
  }
});

test("standings plot keeps its width when a team is highlighted on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/standings?display=progress");
  const gridLine = page.locator(".recharts-cartesian-grid-horizontal line").first();
  await expect(page.locator(".workspace-chart svg")).toBeVisible();
  await expect(gridLine).toBeAttached();
  const width = () => gridLine.evaluate(element => {
    const svg = element.closest("svg")!.getBoundingClientRect();
    return element.getBoundingClientRect().width / svg.width;
  });
  expect(await width()).toBeGreaterThan(0.75);
  await page.getByRole("combobox", { name: "Highlight Team" }).selectOption({ index: 1 });
  expect(await width()).toBeGreaterThan(0.75);
  await expect(page.locator(".workspace-chart-legend button[aria-pressed=true]")).toHaveCount(1);
});

test("compact selectors and disclosures have usable phone touch targets", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, selector, height] of [
    ["/standings", ".workspace-standings-scope a", 44],
    ["/lines", ".modern-scope-help > summary", 44],
    ["/lines", '.workspace-result-summary [aria-label="Rows per page"] a', 40],
  ] as const) {
    await page.goto(route);
    const targets = page.locator(selector);
    await expect(targets.first()).toBeVisible();
    for (const target of await targets.all()) expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(height);
  }
});

test("returning to a player list restores its inner scroll and filter disclosure", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/players");
  const toggle = page.getByRole("button", { name: /Filters & Sort/ });
  await toggle.click();
  const region = page.locator(".ux-player-results .responsive-table-scroll");
  const player = region.locator("tbody tr").nth(15).getByRole("link");
  await player.scrollIntoViewIfNeeded();
  const before = await region.evaluate(element => element.scrollTop);
  expect(before).toBeGreaterThan(500);
  await player.click();
  await page.getByRole("link", { name: "← Back to Results", exact: true }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect.poll(() => region.evaluate(element => element.scrollTop)).toBeCloseTo(before, 0);
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect.poll(() => region.evaluate(element => element.scrollTop)).toBeCloseTo(before, 0);
});
