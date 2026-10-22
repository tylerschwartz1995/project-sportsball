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
    if ((page.viewportSize()?.width ?? 1280) <= 767) {
      const originalViewport = page.viewportSize()!;
      for (const width of [320, 390, 430]) {
        await page.setViewportSize({ width, height: originalViewport.height });
        const season = (await page.getByRole("combobox", { name: "Season", exact: true }).boundingBox())!;
        const calendar = page.getByRole("button", { name: "Calendar View", exact: true });
        const bounds = (await calendar.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(season.x + season.width + 6);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - 12);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(Math.abs(bounds.y - season.y)).toBeLessThan(1);
        const controlStyles = await page.locator('.workspace-schedule-toolbar select, .workspace-schedule-calendar-action button').evaluateAll(elements => elements.map(element => {
          const style = getComputedStyle(element);
          return [style.fontSize, style.fontWeight, style.color, style.borderRadius];
        }));
        expect(controlStyles[0]).toEqual(controlStyles[1]);
        await expect(page.getByLabel("Jump to Date", { exact: true })).toBeHidden();
        expect(await calendar.evaluate(button => button.scrollWidth <= button.clientWidth)).toBe(true);
      }
      await page.getByRole("button", { name: "Calendar View", exact: true }).click();
      await expect(page.locator("#schedule-month-calendar")).toBeVisible();
      await page.locator("#schedule-month-calendar a").first().click();
      await expect(page.locator("#schedule-month-calendar")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Calendar View", exact: true })).toHaveAttribute("aria-expanded", "false");
      await page.setViewportSize(originalViewport);
    }
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
      expect(await firstRow.locator("a").first().evaluate(link => getComputedStyle(link).fontSize)).toBe("13px");
      // Keep useful results on the first screen, with accessible touch controls.
      expect((await page.getByRole("table").boundingBox())!.y).toBeLessThan(480);
      expect((await page.getByRole("combobox", { name: "Season", exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole("button", { name: "GP", exact: true }).click();
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByText("Fixture Skater", { exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Fixture Skater", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Season/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Recent Form", exact: true })).toHaveCount(0);
    const careerAlignment = await page.locator('.reference-player-career').evaluate(table => {
      const body = [...table.querySelector('tbody tr')!.children];
      const footer = [...table.querySelector('tfoot tr')!.children];
      return footer.length === body.length && footer.every((cell, index) => {
        const a = cell.getBoundingClientRect(), b = body[index].getBoundingClientRect();
        return Math.abs(a.x - b.x) < 1 && Math.abs(a.width - b.width) < 1;
      });
    });
    expect(careerAlignment).toBe(true);
    await page.goto("/games/2025020001?view=box-score");
    if ((page.viewportSize()?.width ?? 1280) <= 767) {
      const filters = page.locator('.mobile-detail-filters');
      expect(await filters.locator('label').first().evaluate(element => getComputedStyle(element).fontSize)).toBe('12px');
      expect(await filters.locator('select').first().evaluate(element => getComputedStyle(element).fontSize)).toBe('14px');
      expect((await filters.locator('select').first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.goto("/games/2025020001");
    await expect(page.getByText("Fixture Skater", { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if ((page.viewportSize()?.width ?? 1280) <= 767) {
      const views = page.getByRole("navigation", { name: "Game views", exact: true });
      expect(await views.evaluate(nav => nav.scrollWidth <= nav.clientWidth)).toBe(true);
      for (const link of await views.getByRole("link").all()) {
        const bounds = (await link.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
      }
    }
    await page.goto("/drafts?season=20252026");
    await expect(page).toHaveURL(/teams\?season=20252026/);
    expect(errors).toEqual([]);
  });
}
