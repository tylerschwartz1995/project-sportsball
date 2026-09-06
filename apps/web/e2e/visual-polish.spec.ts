import { expect, test } from "@playwright/test";

for (const theme of ["dark", "light"]) {
  for (const width of [320, 390, 768, 1280]) {
    test(`${theme} layout contains bracket and calendar content at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (theme) => localStorage.setItem("sportsball-theme", theme),
        theme,
      );
      await page.goto("/playoffs?season=20252026");
      const bracket = page.getByRole("region", {
        name: "Playoff bracket rounds",
      });
      await expect(
        bracket.locator(".workspace-bracket-series").first(),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await bracket.evaluate(
          (element) => element.scrollHeight - element.clientHeight,
        ),
      ).toBeLessThanOrEqual(1);
      const bounds = await bracket.boundingBox();
      for (const card of await bracket
        .locator(".workspace-bracket-series")
        .all()) {
        const box = await card.boundingBox();
        expect(box!.y + box!.height).toBeLessThanOrEqual(
          bounds!.y + bounds!.height + 1,
        );
      }
      await bracket.locator(".workspace-bracket-series").last().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Close series details" }).click();

      await page.goto("/games?season=20262027&date=2026-09-29");
      await page
        .getByRole("button", { name: "Calendar View", exact: true })
        .click();
      const calendars = page.locator(
        ".workspace-schedule-week, .workspace-schedule-month-grid",
      );
      expect(
        await calendars.evaluateAll((calendars) =>
          calendars.every((calendar) =>
            [...calendar.children].every((cell) => {
              const bounds = cell.getBoundingClientRect();
              return [...cell.querySelectorAll("strong, small, span")].every(
                (label) => {
                  if (!label.getBoundingClientRect().width) return true;
                  const range = document.createRange();
                  range.selectNodeContents(label);
                  return [...range.getClientRects()].every(
                    (rect) =>
                      rect.left >= bounds.left - 1 &&
                      rect.right <= bounds.right + 1,
                  );
                },
              );
            }),
          ),
        ),
      ).toBe(true);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page
        .locator(".workspace-schedule-month-grid")
        .getByRole("link", { name: "Sep 30, 3 games", exact: true })
        .click();
      await expect(page).toHaveURL(/date=2026-09-30/);
    });
  }
}

test("phone pagination keeps both direction controls on the same row", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/drafts?year=2026");
  const pagination = page.getByRole("navigation", { name: "Pagination" });
  const previous = pagination.locator(':scope > [aria-disabled="true"]');
  const next = pagination.getByRole("link", { name: "Next →", exact: true });
  const previousBounds = await previous.boundingBox();
  const nextBounds = await next.boundingBox();
  expect(Math.abs(previousBounds!.y - nextBounds!.y)).toBeLessThanOrEqual(1);
  await next.click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    pagination.getByRole("link", { name: "← Previous", exact: true }),
  ).toBeVisible();
});

for (const width of [390, 1024]) {
  test(`dense table values fit their columns at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/drafts?view=classes",
      "/teams/26?view=advanced",
      "/history?section=peaks",
    ]) {
      await page.goto(route);
      await expect(page.locator("table tbody td").first()).toBeVisible();
      const assertCellWidths = async () => {
        expect(
          await page
            .locator("table")
            .first()
            .locator("th, td")
            .evaluateAll((cells) =>
              cells.every((cell) => {
                if (!cell.getBoundingClientRect().width) return true;
                return cell.scrollWidth <= cell.clientWidth + 1;
              }),
            ),
        ).toBe(true);
      };
      await assertCellWidths();
      const toggle = page.getByRole("button", { name: "Show all columns" });
      if (await toggle.count()) {
        await toggle.click();
        await assertCellWidths();
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  });
}

test("metric help escapes the table boundary and stays onscreen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/standings");
  const header = page.getByRole("button", { name: "GP", exact: true });
  await header.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("Games played");
  const bounds = await tooltip.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(8);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(382);
  await tooltip.hover();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  await header.focus();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);

  await page.goto("/drafts?view=classes");
  await page.getByRole("link", { name: "Draft", exact: true }).hover();
  await expect(tooltip).toContainText("Draft year");
});

test("metric help stays above a series dialog and Escape dismisses help first", async ({
  page,
}) => {
  await page.goto("/playoffs?season=20252026");
  await page.locator(".workspace-bracket-series").first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Player Stats", exact: true }).click();
  const gp = dialog.getByRole("button", { name: "GP", exact: true }).first();
  await gp.focus();
  const tooltip = dialog.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  expect(
    await tooltip.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return (
        document.elementFromPoint(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        ) === element
      );
    }),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
