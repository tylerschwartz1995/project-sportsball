import { expect, test } from "@playwright/test";

test("chart choices follow URL changes and browser history", async ({ page }) => {
  await page.goto("/teams/26?season=20252026&view=trends");
  const venue = page.getByRole("group", { name: "Venue", exact: true });
  const away = venue.getByRole("button", { name: "Away", exact: true });
  const home = venue.getByRole("button", { name: "Home", exact: true });
  await away.click();
  await expect(away).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/chartVenue=away/);
  await page.evaluate(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("chartVenue", "home");
    window.history.pushState(null, "", url);
  });
  await expect(home).toHaveAttribute("aria-pressed", "true");
  await page.goBack();
  await expect(away).toHaveAttribute("aria-pressed", "true");
  await page.goForward();
  await expect(home).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(home).toHaveAttribute("aria-pressed", "true");
});

test("theme controls work when browser storage is blocked", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Blocked", "SecurityError"); };
  });
  await page.goto("/");
  const theme = page.getByRole("button", { name: "Switch between light and dark mode" });
  await theme.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await theme.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

for (const width of [390, 1101, 1280, 1440]) {
  test(`schedule controls stay inside the panel at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/games");
    const panel = page.getByRole("region", { name: "Schedule controls" });
    const bounds = await panel.boundingBox();
    expect(bounds).not.toBeNull();
    for (const control of await panel.locator("select, input[type=date], nav a").all()) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(bounds!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
      expect(await control.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
  });
}
