import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`essential content remains accessible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "NHL Overview" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Scoring Leaders" }),
    ).toBeVisible();
    const scoring = page.getByRole("table", {
      name: "Scoring Leaders · Regular season · Top five",
      exact: true,
    });
    await expect(scoring.locator("tbody tr")).toHaveCount(5);
    await expect(
      page.getByRole("heading", { name: "Goaltending", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".home-player-leader-link")).toHaveCount(3);
    await scoring.getByRole("button", { name: "G", exact: true }).click();
    const goals = await scoring
      .locator("tbody tr td:nth-child(3)")
      .allTextContents();
    expect(goals.map(Number)).toEqual(goals.map(Number).sort((a, b) => b - a));
    await expect(
      page.getByRole("heading", { name: "Recent Form" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Explore More" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    await page.goto("/standings");
    await expect(
      page.getByRole("columnheader", { name: "PTS", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "GF", exact: true }).first(),
    ).toBeHidden();
    await page
      .getByRole("button", { name: "Show all columns", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("columnheader", { name: "GF", exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "GF", exact: true }).first().click();
    await page
      .getByRole("link", { name: "Points Progression", exact: true })
      .click();
    await expect(
      page.getByRole("navigation", { name: "Standings grouping" }),
    ).toHaveCount(0);
  });
}

test("historical profiles expose complete phase-separated career totals", async ({ page }) => {
  await page.goto("/players/8447400?view=seasons");
  await expect(page.getByRole("heading", { name: "Wayne Gretzky" })).toBeVisible();
  await expect(page.locator("tfoot")).toContainText("2857");
  await expect(page.getByRole("combobox", { name: "Season", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Advanced", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Playoffs", exact: true }).last().click();
  await expect(page.locator("tfoot")).toContainText("382");
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.getByText("Undrafted", { exact: true })).toHaveCount(0);
});

test("scheduled game avoids empty postgame information", async ({ page }) => {
  await page.goto("/games/2026020001");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Florida Panthers");
  await expect(page.getByText("Shots unavailable", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Game views" })).toHaveCount(0);
  await expect(page.getByText("MoneyPuck game data unavailable", { exact: true })).toHaveCount(0);
});

test("empty schedule preserves recovery controls", async ({ page }) => {
  await page.goto("/games?season=20262027&phase=playoffs");
  await expect(page.getByText("No schedule is available.", { exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Season", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Season phase" })).toBeVisible();
});

test("analytics separates charts from sortable tables", async ({ page }) => {
  await page.goto("/analytics?type=teams");
  await expect(page.getByRole("table").first()).toBeVisible();
  await expect(page.getByRole("group", { name: "Visible table columns" })).toHaveCount(0);
  for (const metric of ["CF%", "FF%", "xGF", "xGA", "GF", "GA"]) {
    await expect(page.getByRole("columnheader", { name: metric, exact: true })).toBeVisible();
  }
  const tableButton = page.getByRole("button", { name: "Table", exact: true });
  const chartsButton = page.getByRole("button", { name: "Charts", exact: true });
  const tableBox = await tableButton.boundingBox();
  const chartsBox = await chartsButton.boundingBox();
  expect(Math.abs(tableBox!.y - chartsBox!.y)).toBeLessThan(2);
  expect(chartsBox!.x - tableBox!.x - tableBox!.width).toBeLessThan(12);
  await chartsButton.click();
  await expect(page.getByRole("heading", { name: "Results vs. Five-on-Five Process" })).toBeVisible();
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Results vs. Five-on-Five Process" })).toHaveCount(0);
});

test("game flow stays visible with both analysis modes", async ({ page }) => {
  await page.goto("/games/2025030416?view=scoring");
  await expect(page.getByRole("heading", { name: "Game Flow", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Game Pressure", exact: true })).toBeVisible();
  const cumulative = page.getByRole("button", { name: "Cumulative Chances", exact: true });
  await cumulative.click();
  await expect(cumulative).toHaveAttribute("aria-pressed", "true");
});
