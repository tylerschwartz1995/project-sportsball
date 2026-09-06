import { expect, test } from "@playwright/test";

test("clearing birthplace removes it from both results and the next submission", async ({ page }) => {
  await page.goto("/players?season=20252026&country=CAN");
  await page.getByRole("link", { name: "Clear Filters", exact: true }).first().click();
  await expect(page.locator('select[name="country"]')).toHaveValue("");
  await expect(page.locator('select[name="region"]')).toBeDisabled();
  await page.getByRole("button", { name: "Apply Filters", exact: true }).click();
  await expect(page).not.toHaveURL(/country=CAN/);
});

test("season selection agrees with browser back and forward", async ({ page }) => {
  await page.goto("/teams?season=20252026");
  await page.locator('form.workspace-season-picker[data-navigation-ready="true"]').waitFor();
  await page.locator('select[name="season"]').selectOption("20242025");
  await expect(page).toHaveURL(/season=20242025/);
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("2025–26");
  await expect(page.locator('select[name="season"]')).toHaveValue("20252026");
  await page.goForward();
  await expect(page.locator('select[name="season"]')).toHaveValue("20242025");
});

test("changing draft year cannot leave an invisible round", async ({ page }) => {
  await page.goto("/drafts?year=1974&round=20");
  await page.locator('select[name="year"][data-navigation-ready="true"]').waitFor();
  await page.locator('select[name="year"]').selectOption("2026");
  await expect(page).toHaveURL(/year=2026/);
  await expect(page).not.toHaveURL(/round=20/);
  await expect(page.locator('select[name="round"]')).toHaveValue("");
  await expect(page.getByText("No selections match the current filters.")).toHaveCount(0);
  await page.goto("/drafts?year=2026&round=20");
  await expect(page.locator('select[name="round"]')).toHaveValue("");
  await expect(page.getByText("No selections match the current filters.")).toHaveCount(0);
});

test("five-season peaks survive applying and clearing refinements", async ({ page }) => {
  await page.goto("/history?section=peaks&window=5&country=CAN");
  await page.getByRole("button", { name: "Apply Filters", exact: true }).click();
  await expect(page).toHaveURL(/window=5/);
  await expect(page.getByRole("heading", { name: "5-Season Peaks", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Clear Filters", exact: true }).click();
  await expect(page).toHaveURL(/window=5/);
  await expect(page.locator('select[name="country"]')).toHaveValue("");
});

test("player phase and season preserve applied refinements", async ({ page }) => {
  await page.goto("/players?season=20252026&q=Connor&country=CAN&minGames=10&sort=goals&dir=asc");
  await page.getByRole("navigation", { name: "Season phase", exact: true }).getByRole("link", { name: "Playoffs" }).click();
  await expect(page).toHaveURL(/q=Connor/);
  await expect(page.locator('input[type="number"][name="minGames"]')).toHaveValue("10");
  await expect(page.locator('select[name="country"]')).toHaveValue("CAN");
  await page.locator('select[name="season"]').selectOption("20242025");
  await expect(page).toHaveURL(/season=20242025/);
  await expect(page).toHaveURL(/q=Connor/);
  await expect(page.locator('select[name="sort"]')).toHaveValue("goals");
});

test("player type updates fields and submits together with pending edits", async ({
  page,
}) => {
  await page.goto("/players?season=20252026");
  await expect(
    page.getByRole("button", { name: "Switch between light and dark mode" }),
  ).toBeEnabled();
  await page.locator('select[name="type"]').selectOption("goalies");
  await expect(page).not.toHaveURL(/type=goalies/);
  await expect(
    page.locator('input[type="number"][name="minGoals"]'),
  ).toHaveCount(0);
  await page.getByText("Advanced Filters", { exact: true }).click();
  await expect(
    page.locator('input[type="number"][name="minSavePercentage"]'),
  ).toBeVisible();
  await page.locator('input[type="number"][name="minWins"]').fill("5");
  await expect(page.getByRole("status")).toContainText("Changes not applied");
  await page
    .getByRole("button", { name: "Apply Filters", exact: true })
    .click();
  await expect(page).toHaveURL(/minWins=5/);
  await expect(page).toHaveURL(/type=goalies/);
  await expect(
    page.getByText("Changes not applied", { exact: false }),
  ).toHaveCount(0);
});

test("current chart choices survive phase changes and filter resets", async ({ page }) => {
  await page.goto("/teams/26?season=20252026&view=trends");
  await page.getByRole("group", { name: "Venue", exact: true }).getByRole("button", { name: "Away", exact: true }).click();
  const playoffs = page.getByRole("navigation", { name: "Season phase", exact: true }).getByRole("link", { name: "Playoffs" });
  await expect(playoffs).toHaveAttribute("href", /chartVenue=away/);
  await playoffs.click();
  await expect(page).toHaveURL(/chartVenue=away/);
  await page.goto("/analytics?type=skaters&display=charts&minimum=100");
  await page.locator('.workspace-player-plot-controls select').first().selectOption("goalsPer60");
  await page.getByRole("link", { name: "Clear Filters", exact: true }).click();
  await expect(page).toHaveURL(/xMetric=goalsPer60/);
  await expect(page).toHaveURL(/display=charts/);
});

for (const [route, selector, value] of [
  ["/players/8478402?view=advanced", ".workspace-advanced-situation-filter select", "all"],
  ["/history", ".workspace-history-chart-metric select", "goals"],
  ["/history?section=eras", ".workspace-history-decades select", "goals"],
  ["/history?section=eras", ".workspace-history-chart .workspace-history-chart-metric select", "pointsPerTeamGame"],
  ["/history?section=eras&entity=goalies", ".workspace-history-decades select", "savePercentage"],
] as const) {
  test(`statistical choice survives refresh: ${route} ${value}`, async ({ page }) => {
    await page.goto(route);
    if (route.startsWith("/history")) {
      await page.locator("summary").filter({ hasText: /Record Progression|League Environment and Decade Leaders/ }).click();
    } else {
      await page.locator("details").evaluateAll(elements => elements.forEach(element => { (element as HTMLDetailsElement).open = true; }));
    }
    const select = page.locator(selector).first();
    await select.selectOption(value);
    await expect(page).toHaveURL(new RegExp(`=${value}`));
    await page.reload();
    if (route.startsWith("/history")) {
      await page.locator("summary").filter({ hasText: /Record Progression|League Environment and Decade Leaders/ }).click();
    } else {
      await page.locator("details").evaluateAll(elements => elements.forEach(element => { (element as HTMLDetailsElement).open = true; }));
    }
    await expect(page.locator(selector).first()).toHaveValue(value);
  });
}

test("historical team choices show full names", async ({ page }) => {
  await page.goto("/history?section=careers");
  await expect(page.locator('select[name="team"] option[value="AFM"]')).toHaveText("Atlanta Flames (AFM)");
});

for (const width of [390, 1280]) {
  test(`filter families fit and show keyboard focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/players?country=CAN", "/drafts", "/analytics?type=skaters", "/history?section=careers&country=CAN", "/games", "/lines"]) {
      await page.goto(route);
      for (const theme of ["dark", "light"]) {
        await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        for (const control of await page.locator('main select, main input:not([type="hidden"])').all()) {
          if (!await control.isVisible() || !await control.isEnabled()) continue;
          await control.focus();
          const state = await control.evaluate(element => ({
            outline: getComputedStyle(element).outlineStyle,
            height: element.getBoundingClientRect().height,
            label: (element as HTMLInputElement).labels?.length,
            right: element.getBoundingClientRect().right,
          }));
          expect(state.label).toBeGreaterThan(0);
          expect(state.outline).not.toBe("none");
          expect(state.height).toBeGreaterThanOrEqual(40);
          expect(state.right).toBeLessThanOrEqual(width);
        }
      }
    }
  });
}

test("draft refinements and clear preserve sorting and compatible rounds", async ({ page }) => {
  await page.goto("/drafts?year=2025&round=1&sort=player&dir=desc");
  await page.locator('select[name="year"][data-navigation-ready="true"]').waitFor();
  await page.locator('select[name="year"]').selectOption("2026");
  await expect(page).toHaveURL(/year=2026/);
  await expect(page.locator('select[name="round"]')).toHaveValue("1");
  await expect(page).toHaveURL(/sort=player/);
  await page.getByRole("link", { name: "Clear Filters", exact: true }).click();
  await expect(page).not.toHaveURL(/round=1/);
  await expect(page).toHaveURL(/sort=player/);
  await expect(page).toHaveURL(/dir=desc/);
});

test("draft range clear keeps team context and hides when already clear", async ({ page }) => {
  await page.goto("/drafts?view=teams&from=2015&to=2020&team=EDM");
  await expect(page.getByRole("link", { name: "Clear Filters", exact: true })).toHaveAttribute("href", /team=EDM/);
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "Clear Filters", exact: true }).click();
  await expect(page.getByRole("link", { name: "Clear Filters", exact: true })).toHaveCount(0);
});
