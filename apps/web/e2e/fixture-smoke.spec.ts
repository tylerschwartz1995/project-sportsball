import { expect, test } from "@playwright/test";

test.skip(process.env.SPORTSBALL_RUN_WEB_FIXTURE_TESTS !== "1", "Requires synthetic database fixtures");

for (const theme of ["dark", "light"]) {
  test(`${theme}: simple stats navigation and completed games`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("sportsball-theme", value), theme);
    await page.goto("/?season=20252026");
    await expect(page).toHaveURL(/games\?season=20252026/);
    await expect(page.getByRole("heading", { name: "2025–26 NHL Schedule", exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator('.site-navigation a')).toHaveText(["Games", "Standings", "Teams", "Players"]);
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Teams", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Team Stats", exact: true })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await page.getByRole("link", { name: "Advanced Stats", exact: true }).click();
    await expect(page).toHaveURL(/analytics.*type=teams/);
    await expect(page.getByRole("combobox", { name: "Game Situation", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Charts", exact: true })).toHaveCount(0);
    await page.goto("/players?season=20252026");
    await expect(page.getByText("Fixture Skater", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Advanced Filters", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Table columns", exact: true })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Player Type", exact: true })).toBeVisible();
    const firstRow = page.locator("tbody tr").first();
    if ((page.viewportSize()?.width ?? 1280) <= 767) {
      expect(await firstRow.evaluate(row => row.getBoundingClientRect().height)).toBeLessThan(60);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByText("Fixture Skater", { exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Fixture Skater", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Season/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Recent Form", exact: true })).toHaveCount(0);
    await page.goto("/games/2025020001");
    await expect(page.getByText("Fixture Skater", { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto("/drafts?season=20252026");
    await expect(page).toHaveURL(/teams\?season=20252026/);
    expect(errors).toEqual([]);
  });
}
