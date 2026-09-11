import { expect, test, type Page } from "@playwright/test";

async function ready(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("[data-scroll-content-ready]")).toBeAttached();
  await page.waitForFunction(
    () =>
      history.scrollRestoration === "manual" &&
      [...document.querySelectorAll("[data-scroll-content-ready]")].some(
        (marker) => !marker.parentElement?.closest("[hidden]"),
      ),
  );
  await page.evaluate(() => document.fonts.ready);
}
async function settled(page: Page) {
  // Includes the scroll owner's layout-settling window.
  await page.waitForTimeout(400);
}
async function expectPosition(page: Page, y: number, tolerance = 3) {
  await expect
    .poll(async () => Math.abs((await page.evaluate(() => scrollY)) - y))
    .toBeLessThanOrEqual(tolerance);
}

for (const width of [390, 1280]) {
  test.describe(`scroll navigation at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });

    for (const path of [
      "/players?season=20252026",
      "/games/2025030416",
      "/analytics?type=skaters",
    ]) {
      test(`refresh restores reading position: ${path}`, async ({ page }) => {
        await ready(page, path);
        await page.evaluate(() =>
          scrollTo(
            0,
            document.documentElement.scrollHeight - innerHeight - 100,
          ),
        );
        await settled(page);
        const y = await page.evaluate(() => scrollY);
        expect(y).toBeGreaterThan(300);
        await page.reload();
        await expectPosition(page, y);
        await settled(page);
        await expectPosition(page, y);
      });
    }

    test("Apply and Clear keep the filter controls in place", async ({
      page,
    }) => {
      await ready(page, "/players?season=20252026");
      if (width < 768) await page.getByRole("button", { name: /Filters & Sort/ }).click();
      await page.getByText("Advanced Filters", { exact: true }).click();
      await page.locator('input[type="number"][name="minGames"]').fill("20");
      const apply = page.getByRole("button", {
        name: "Apply Filters",
        exact: true,
      });
      await apply.scrollIntoViewIfNeeded();
      const form = apply.locator("xpath=ancestor::form");
      const before = await form.evaluate(
        (el) => el.getBoundingClientRect().top,
      );
      const origin = await page.evaluate(() => performance.timeOrigin);
      await apply.click();
      await expect(page).toHaveURL(/minGames=20/);
      await settled(page);
      expect(
        Math.abs(
          (await form.evaluate((el) => el.getBoundingClientRect().top)) -
            before,
        ),
      ).toBeLessThan(4);
      const clear = page.getByRole("link", {
        name: "Clear Filters",
        exact: true,
      });
      await clear.scrollIntoViewIfNeeded();
      const clearY = await page.evaluate(() => scrollY);
      await clear.click();
      await expect(page).not.toHaveURL(/minGames=20/);
      await settled(page);
      await expectPosition(page, clearY, 25);
      expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
    });

    test("schedule controls use soft navigation and Next Day preserves position", async ({
      page,
    }) => {
      await ready(page, "/games?season=20262027&date=2026-09-29");
      const origin = await page.evaluate(() => performance.timeOrigin);
      const next = page.getByRole("link", {
        name: "Next Day · Sep 30 →",
        exact: true,
      });
      await next.scrollIntoViewIfNeeded();
      const y = await page.evaluate(() => scrollY);
      await next.click();
      await expect(page).toHaveURL(/date=2026-09-30/);
      await settled(page);
      await expectPosition(page, y);
      await page
        .getByRole("combobox", { name: "Find a Team" })
        .selectOption("12");
      await expect(page).toHaveURL(/team=12/);
      await settled(page);
      expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
      await page.goBack();
      await expect(page).not.toHaveURL(/team=12/);
      await expect(
        page.getByRole("combobox", { name: "Find a Team" }),
      ).toHaveValue("");
    });

    for (const kind of ["draft", "advanced"]) {
      test(`${kind} pagination shows the new results and Back restores the previous page`, async ({
        page,
      }) => {
        await ready(
          page,
          kind === "draft" ? "/drafts?year=2026" : "/analytics?type=skaters",
        );
        const nav = page.getByRole("navigation", {
          name: kind === "draft" ? "Pagination" : "Advanced results pages",
          exact: true,
        });
        const next =
          kind === "draft"
            ? nav.getByRole("link", { name: "Next →", exact: true })
            : nav.getByRole("button", { name: "Next →", exact: true });
        await next.scrollIntoViewIfNeeded();
        await settled(page);
        const y = await page.evaluate(() => scrollY);
        await next.click();
        await expect(page).toHaveURL(
          kind === "draft" ? /page=2/ : /tablePage=2/,
        );
        const results = page.locator(
          kind === "draft" ? "#draft-results" : "#advanced-results",
        );
        await expect
          .poll(async () =>
            Math.abs(
              (await results.evaluate((el) => el.getBoundingClientRect().top)) -
                16,
            ),
          )
          .toBeLessThan(3);
        await expect(results).toBeFocused();
        await settled(page);
        await page.goBack();
        await expect(page).not.toHaveURL(
          kind === "draft" ? /page=2/ : /tablePage=2/,
        );
        await expectPosition(page, y);
      });
    }

    test("browser Back and Back to Results restore the same list context", async ({
      page,
    }) => {
      await ready(page, "/players?season=20252026");
      const player = page.locator('table tbody a[href*="/players/"]').nth(20);
      await player.scrollIntoViewIfNeeded();
      await settled(page);
      const y = await page.evaluate(() => scrollY);
      await player.click();
      await expect(page).toHaveURL(/\/players\/\d+/);
      await expectPosition(page, 0);
      await settled(page);
      await page.goBack();
      await expectPosition(page, y);
      await settled(page);
      await player.click();
      await expect(page).toHaveURL(/\/players\/\d+/);
      await page
        .getByRole("link", { name: "← Back to Results", exact: true })
        .click();
      await expect(page).toHaveURL(/\/players\?season=20252026/);
      await expectPosition(page, y);
    });

    test("Lines and Pairings keep their tab strip visible without a results jump", async ({
      page,
    }) => {
      await ready(page, "/lines");
      const tab = page
        .getByRole("navigation", { name: "Combination type" })
        .getByRole("link", { name: /Defensive Pairings/ });
      await tab.scrollIntoViewIfNeeded();
      const y = await page.evaluate(() => scrollY);
      await tab.click();
      await expect(page).toHaveURL(/view=pairings/);
      await settled(page);
      await expectPosition(page, y);
      expect(new URL(page.url()).hash).toBe("");
      await expect(tab).toBeInViewport();
    });
  });
}

test("navigation works when session storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await ready(page, "/drafts?year=2026");
  await page
    .getByRole("navigation", { name: "Pagination", exact: true })
    .getByRole("link", { name: "Next →", exact: true })
    .click();
  await expect(page).toHaveURL(/page=2/);
  await expect
    .poll(async () =>
      Math.abs(
        (await page
          .locator("#draft-results")
          .evaluate((el) => el.getBoundingClientRect().top)) - 16,
      ),
    )
    .toBeLessThan(3);
});
