import { expect, test, type Locator, type Page } from "@playwright/test";

const teamId = process.env.SPORTSBALL_E2E_TEAM_ID ?? "26";
const seasonId = process.env.SPORTSBALL_E2E_SEASON_ID ?? "20252026";
const gameId = process.env.SPORTSBALL_E2E_GAME_ID ?? "2025020003";
const navigationLimitMs = Number(
  process.env.SPORTSBALL_E2E_NAVIGATION_LIMIT_MS ?? "1500",
);
const interactionLimitMs = Number(
  process.env.SPORTSBALL_E2E_INTERACTION_LIMIT_MS ?? "250",
);

test.describe("production navigation performance", () => {
  test("team tab content appears promptly", async ({
    page,
  }) => {
    await page.goto(teamUrl("overview"));
    await expect(
      page.getByRole("heading", { name: "Performance vs. NHL" }),
    ).toBeVisible();

    const strengthLink = page.getByRole("link", { name: "Strength", exact: true });
    await strengthLink.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 600));
    const elapsed = await clickUntilVisible(
      page,
      strengthLink,
      page.getByRole("heading", { name: "Strength of Schedule" }),
    );

    expect(elapsed).toBeLessThan(navigationLimitMs);
  });

  test("team tab navigation preserves scroll position", async ({ page }) => {
    test.fail(
      true,
      "Known regression: shared view navigation currently jumps toward the page header.",
    );
    await page.goto(teamUrl("overview"));
    await expect(
      page.getByRole("heading", { name: "Performance vs. NHL" }),
    ).toBeVisible();

    const strengthLink = page.getByRole("link", { name: "Strength", exact: true });
    await strengthLink.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 600));
    const beforeScroll = await page.evaluate(() => window.scrollY);

    await clickUntilVisible(
      page,
      strengthLink,
      page.getByRole("heading", { name: "Strength of Schedule" }),
    );

    expect(await page.evaluate(() => window.scrollY)).toBe(beforeScroll);
  });

  test("Strength metric selection updates promptly and preserves scroll", async ({
    page,
  }) => {
    await page.goto(`${teamUrl("strength")}&sos=standings`);
    await expect(
      page.getByRole("heading", { name: "Strength of Schedule" }),
    ).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 600));
    const beforeScroll = await page.evaluate(() => window.scrollY);

    const startedAt = Date.now();
    await page.getByRole("button", { name: "Expected goals" }).click();
    await expect(
      page.getByRole("button", { name: "Expected goals" }),
    ).toHaveAttribute("aria-current", "page");

    expect(Date.now() - startedAt).toBeLessThan(interactionLimitMs);
    expect(await page.evaluate(() => window.scrollY)).toBe(beforeScroll);
  });

  test("Box Score content appears promptly without changing scroll position", async ({
    page,
  }) => {
    await page.goto(`/games/${gameId}?view=scoring`);
    const boxScoreLink = page.getByRole("link", {
      name: "Box Score",
      exact: true,
    });
    await expect(boxScoreLink).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 400));
    const beforeScroll = await page.evaluate(() => window.scrollY);

    const elapsed = await clickUntilVisible(
      page,
      boxScoreLink,
      page.getByRole("heading", { name: /Skaters$/ }).first(),
    );

    expect(elapsed).toBeLessThan(navigationLimitMs);
    expect(await page.evaluate(() => window.scrollY)).toBe(beforeScroll);
  });
});

function teamUrl(view: string) {
  return `/teams/${teamId}?season=${seasonId}&phase=regular&view=${view}`;
}

async function clickUntilVisible(
  page: Page,
  trigger: Locator,
  target: Locator,
) {
  const startedAt = Date.now();
  const click = trigger.click();
  await target.waitFor({ state: "visible" });
  const elapsed = Date.now() - startedAt;
  await click;
  return elapsed;
}
