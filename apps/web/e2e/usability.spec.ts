import { expect, test } from "@playwright/test";

test("historical player discovery and return to search", async ({ page }) => {
  await page.goto("/search?q=Wayne+Gretzky");
  await page.getByRole("link", { name: /Wayne Gretzky/ }).click();
  await expect(page).toHaveURL(/view=seasons/);
  await expect(page.locator("tfoot")).toContainText("2857");
  await page
    .getByRole("link", { name: "← Back to Results", exact: true })
    .click();
  await expect(
    page.getByRole("searchbox", { name: "Player Name" }),
  ).toHaveValue("Wayne Gretzky");
});

test("playoff game to team preserves the investigation", async ({ page }) => {
  await page.goto("/games/2025030416");
  await page
    .getByRole("link", { name: "Carolina Hurricanes", exact: true })
    .click();
  await expect(page).toHaveURL(/phase=playoffs/);
  await page.getByRole("link", { name: "Recent Form", exact: true }).click();
  await page
    .getByRole("link", { name: "← Back to Results", exact: true })
    .click();
  await expect(page).toHaveURL(/games\/2025030416$/);
});

test("mobile menu, visible sorting, and compact player results", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/players");
  await expect(
    page.getByRole("button", { name: "Switch between light and dark mode" }),
  ).toBeEnabled();
  await page.locator("#main-content .site-mobile-menu > summary").click();
  await expect(
    page
      .getByRole("navigation", { name: "All sections" })
      .getByRole("link", { name: "History", exact: true }),
  ).toBeVisible();
  await page
    .locator("#main-content .site-mobile-menu > summary")
    .press("Escape");
  await expect(
    page.getByRole("combobox", { name: "Sort By", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Sort By", exact: true })
    .selectOption("goals");
  await page
    .getByRole("button", { name: "Apply Filters", exact: true })
    .click();
  await expect(page).toHaveURL(/sort=goals/);
  await expect(page.locator(".ux-player-results table").first()).toBeVisible();
  await page.getByRole("button", { name: "Player Cards", exact: true }).click();
  await expect(
    page.locator(".ux-player-results article").first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("team chart only exposes controls which affect it", async ({ page }) => {
  await page.goto("/analytics?situation=5on4&display=charts");
  await expect(
    page.getByRole("combobox", { name: "Game Situation", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Find a Team in the Plot" })
    .selectOption({ label: "Anaheim Ducks" });
  await expect(page.locator(".ux-chart-reading").first()).toContainText(
    "Same plotted position",
  );
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Game Situation", exact: true }),
  ).toHaveValue("5on4");
});

test("trend interpretation follows metric and venue", async ({ page }) => {
  await page.goto("/players/8478402?season=20252026&view=trends");
  await expect(page.locator(".ux-chart-reading")).toContainText(
    "Season average",
  );
  await expect(page.locator(".ux-chart-reading")).toContainText("1.68");
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.locator(".ux-chart-reading")).toContainText(
    "Season home average",
  );
});

test("shot filters and attempt selection remain synchronized", async ({
  page,
}) => {
  await page.goto("/games/2025030416?view=advanced&advancedView=shots");
  await page
    .getByRole("combobox", { name: "Shot Result", exact: true })
    .selectOption("goal");
  await expect(page.locator(".ux-chart-reading").first()).toContainText(
    "3 of 73 attempts",
  );
  const attempts = page
    .getByRole("combobox", { name: "Select an Attempt", exact: true })
    .first();
  await attempts.selectOption({ index: 1 });
  await expect(page.locator(".modern-shot-map").first()).toContainText(
    "Taylor Hall",
  );
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Shot Result", exact: true }),
  ).toHaveValue("goal");
});

test("unplayed draft class offers a useful alternative", async ({ page }) => {
  await page.goto("/drafts?view=outcomes&year=2026");
  await expect(
    page.getByRole("heading", { name: "Outcomes Begin With NHL Appearances" }),
  ).toBeVisible();
  await page
    .getByRole("link", {
      name: "Explore the Latest Mature Class →",
      exact: true,
    })
    .click();
  await expect(page.locator(".ux-empty-guidance")).toHaveCount(0);
});

test("filtered player results survive a detail visit", async ({ page }) => {
  await page.goto("/players?season=20252026&q=Connor&sort=goals&dir=desc");
  await page.locator("table").getByRole("link", { name: /Connor McDavid/ }).click();
  await page.getByRole("link", { name: "← Back to Results", exact: true }).click();
  await expect(page).toHaveURL(/q=Connor/);
  await expect(page).toHaveURL(/sort=goals/);
});

test("standings highlight remains shareable", async ({ page }) => {
  await page.goto("/standings?display=progress");
  const highlight = page.getByRole("combobox", { name: "Highlight Team" });
  await highlight.selectOption({ index: 1 });
  await expect(page.locator(".workspace-chart-legend button[aria-pressed=true]")).toHaveCount(1);
  await page.reload();
  await expect(highlight).not.toHaveValue("");
});
