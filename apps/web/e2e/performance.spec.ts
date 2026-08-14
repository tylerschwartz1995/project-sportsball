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
    await expect(
      strengthLink.locator("xpath=.."),
      "view tabs hydrated",
    ).toHaveAttribute("data-navigation-ready", "true");
    await strengthLink.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 300));
    const elapsed = await clickUntilVisible(
      page,
      strengthLink,
      page.getByRole("heading", { name: "Strength of Schedule" }),
    );

    expect(elapsed).toBeLessThan(navigationLimitMs);
  });

  test("team tab navigation preserves scroll position", async ({ page }) => {
    await page.goto(teamUrl("overview"));
    await expect(
      page.getByRole("heading", { name: "Performance vs. NHL" }),
    ).toBeVisible();

    const strengthLink = page.getByRole("link", { name: "Strength", exact: true });
    await expect(
      strengthLink.locator("xpath=.."),
      "view tabs hydrated",
    ).toHaveAttribute("data-navigation-ready", "true");
    await strengthLink.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 300));
    const beforeScroll = await page.evaluate(() => window.scrollY);

    await clickUntilVisible(
      page,
      strengthLink,
      page.getByRole("heading", { name: "Strength of Schedule" }),
    );
    await page.waitForTimeout(750);

    expect(await page.evaluate(() => window.scrollY)).toBe(beforeScroll);
  });

  test("active view tabs remain visible without vertical scrolling on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(teamUrl("combinations"));

    const activeView = page.getByRole("link", {
      name: "Combinations",
      exact: true,
    });
    await expect(activeView).toHaveAttribute("aria-current", "page");
    await expectLinkInsideNavigation(activeView);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    const activePrimary = page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Teams", exact: true });
    await expect(activePrimary).toHaveAttribute("aria-current", "page");
    await expectLinkInsideNavigation(activePrimary);

    await page.goto("/drafts?view=classes");
    const activeDraftView = page.getByRole("link", {
      name: "Class Rankings",
      exact: true,
    });
    await expect(activeDraftView).toHaveAttribute("aria-current", "page");
    await expectLinkInsideNavigation(activeDraftView);

    const activeDraftPrimary = page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Drafts", exact: true });
    await expect(activeDraftPrimary).toHaveAttribute("aria-current", "page");
    await expectLinkInsideNavigation(activeDraftPrimary);
  });

  test("Draft class rankings keep the initial table and DOM bounded", async ({
    page,
  }) => {
    await page.goto("/drafts?view=classes");
    const rows = page.locator(".workspace-class-rankings-table tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeLessThanOrEqual(15);
    expect(await page.locator("*").count()).toBeLessThan(2_300);
    const sortByDraft = page.getByRole("link", { name: "Draft", exact: true });
    await expect(sortByDraft).toHaveAttribute("href", /sort=class/);
    const sortHref = await sortByDraft.getAttribute("href");
    expect(sortHref).not.toBeNull();
    await page.goto(sortHref!);
    await expect(page).toHaveURL(/sort=class/);
    await expect(page).toHaveURL(/direction=desc/);
    await expect(
      page.locator(".workspace-class-rankings-sort"),
    ).toHaveAttribute("data-sort-key", "class");
    expect(await rows.count()).toBeLessThanOrEqual(15);

    const firstClass = await rows.first().locator("td").first().innerText();
    const nextPage = page.getByRole("link", { name: "Next →" });
    await expect(nextPage).toHaveAttribute("href", /page=2/);
    const nextHref = await nextPage.getAttribute("href");
    expect(nextHref).not.toBeNull();
    await page.goto(nextHref!);
    await expect(page).toHaveURL(/page=2/);
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeLessThanOrEqual(15);
    expect(await rows.first().locator("td").first().innerText()).not.toBe(
      firstClass,
    );
  });

  test("season and draft filters navigate without replacing the document", async ({
    page,
  }) => {
    await page.goto(teamUrl("overview"));
    const seasonForm = page.locator(".workspace-season-picker");
    await expect(seasonForm).toHaveAttribute("data-navigation-ready", "true");
    const seasonSelect = seasonForm.getByRole("combobox", { name: "Season" });
    const selectedSeason = await seasonSelect.inputValue();
    const seasonOptions = await seasonSelect.locator("option").evaluateAll(
      (options) => options.map((option) => (option as HTMLOptionElement).value),
    );
    const nextSeason = seasonOptions.find((value) => value !== selectedSeason);
    expect(nextSeason).toBeDefined();
    await setDocumentMarker(page);
    await seasonSelect.selectOption(nextSeason!);
    await expect(page).toHaveURL(new RegExp(`season=${nextSeason}`));
    await expect(page.locator("html")).toHaveAttribute(
      "data-browser-document",
      "preserved",
    );

    await page.goto("/drafts?view=board&year=2021");
    const roundSelect = page.locator('select[name="round"]');
    await expect(roundSelect).toHaveAttribute("data-navigation-ready", "true");
    await setDocumentMarker(page);
    await roundSelect.selectOption("1");
    await expect(page).toHaveURL(/round=1/);
    await expect(page.locator("html")).toHaveAttribute(
      "data-browser-document",
      "preserved",
    );
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
    await expect(page).toHaveURL(/sos=expected-goals/);

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Expected goals" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("Strength metric remains responsive with the completed table open", async ({
    page,
  }) => {
    await page.goto(`${teamUrl("strength")}&sos=standings`);
    await page.getByText(/Completed games/).click();
    const rows = page.locator(".workspace-schedule-strength-table tbody tr");
    await expect(rows.first()).toBeVisible();
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    const startedAt = Date.now();
    await page.getByRole("button", { name: "Goal differential" }).click();
    await expect(
      page.getByRole("button", { name: "Goal differential" }),
    ).toHaveAttribute("aria-current", "page");

    expect(Date.now() - startedAt).toBeLessThan(interactionLimitMs);
    expect(await rows.count()).toBe(rowCount);
    await expect(
      page.getByRole("columnheader", { name: /Goal diff\. \/ game/ }),
    ).toBeVisible();
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

async function expectLinkInsideNavigation(link: Locator) {
  const linkBox = await link.boundingBox();
  const navigationBox = await link.locator("xpath=..").boundingBox();
  expect(linkBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(linkBox!.x).toBeGreaterThanOrEqual(navigationBox!.x - 1);
  expect(linkBox!.x + linkBox!.width).toBeLessThanOrEqual(
    navigationBox!.x + navigationBox!.width + 1,
  );
}

async function setDocumentMarker(page: Page) {
  await page.locator("html").evaluate((element) => {
    element.setAttribute("data-browser-document", "preserved");
  });
}
