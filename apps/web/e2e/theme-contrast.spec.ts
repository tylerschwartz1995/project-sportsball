import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  test(`${theme} heatmap values retain readable contrast across ranked cells`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem("sportsball-theme", value), theme);
    await page.goto("/drafts?view=classes");
    await page.locator(".workspace-class-rankings-table").scrollIntoViewIfNeeded();
    const results = await page.locator(".workspace-class-rankings-sort").evaluate(root => {
      const sort = root.getAttribute("data-sort-key");
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d")!;
      const luminance = (color: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const values = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(value => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
      };
      return [...root.querySelectorAll<HTMLElement>(`td[data-metric="${sort}"][data-heat-level]`)].map(cell => {
        const style = getComputedStyle(cell);
        const foreground = luminance(style.color);
        const background = luminance(style.backgroundColor);
        return { value: cell.textContent, contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05) };
      });
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.filter(result => result.contrast < 4.5)).toEqual([]);
  });

  test(`${theme} analytical categories have distinct colours and shapes`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem("sportsball-theme", value), theme);
    await page.goto("/analytics");
    const key = page.locator(".workspace-comparison-key");
    await key.scrollIntoViewIfNeeded();
    const markers = await key.locator("[data-chart-shape]").evaluateAll(elements => elements.map(element => ({
      color: getComputedStyle(element).backgroundColor,
      shape: element.getAttribute("data-chart-shape"),
    })));
    expect(markers).toHaveLength(4);
    expect(new Set(markers.map(marker => marker.color)).size).toBe(4);
    expect(new Set(markers.map(marker => marker.shape)).size).toBe(4);
    await expect(page.locator(".recharts-scatter-symbol").first()).toBeVisible();
  });
}
