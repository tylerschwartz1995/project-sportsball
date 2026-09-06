import { expect, test } from "@playwright/test";

test.skip(process.env.SPORTSBALL_RUN_WEB_FIXTURE_TESTS !== "1", "Requires synthetic database fixtures");

for (const theme of ["dark", "light"]) {
  test(`${theme}: draft views and game navigation use migrated local data`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("sportsball-theme", value), theme);
    await page.goto("/drafts?year=2020");
    await expect(page.getByRole("heading", { name: "NHL Drafts", exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByText("Fixture Prospect", { exact: true }).first()).toBeVisible();
    await page.getByRole("link", { name: "Team Drafting", exact: true }).click();
    await expect(page).toHaveURL(/view=teams/);
    await expect(page.getByRole("heading", { name: "Team Drafting", exact: true })).toBeVisible();
    await page.goto("/games/2025020001");
    await expect(page.getByText("Fixture Skater", { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
