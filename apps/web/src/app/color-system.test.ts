import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const globalsPath = path.join(appDirectory, "globals.css");
const globalsSource = readFileSync(globalsPath, "utf8");

const legacyThemeUtility =
  /(?:text-(?:white|slate-(?:200|300|400|500|600|700)|cyan-(?:100|200|300)|violet-(?:200|300)|emerald-(?:200|300)|rose-(?:200|300)|amber-(?:100|200|300))|bg-slate-950(?:\/[^\s"'`]+)?|(?:bg|border)-white\/[^\s"'`]+|(?:bg|border)-(?:emerald|rose|amber)-300\/[^\s"'`]+)/;

describe("color system", () => {
  it("keeps application components on semantic theme tokens", () => {
    const offenders = sourceFiles(appDirectory)
      .filter((file) => file.endsWith(".tsx"))
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return legacyThemeUtility.test(source)
          ? [path.relative(appDirectory, file)]
          : [];
      });

    expect(offenders).toEqual([]);
    expect(globalsSource).not.toContain("Temporary compatibility");
  });

  it("keeps categorical chart colors distinguishable from their surfaces", () => {
    const darkTokens = tokenBlock(":root");
    const lightTokens = tokenBlock('html[data-theme="light"]');

    for (const tokens of [darkTokens, lightTokens]) {
      const surface = token(tokens, "--surface");
      const chartLabel = token(tokens, "--chart-label");
      const foregroundSoft = token(tokens, "--foreground-soft");

      expect(contrastRatio(chartLabel, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(foregroundSoft, surface)).toBeGreaterThanOrEqual(
        4.5,
      );

      for (let index = 1; index <= 8; index += 1) {
        expect(
          contrastRatio(token(tokens, `--chart-series-${index}`), surface),
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(entryPath) : [entryPath];
  });
}

function tokenBlock(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = globalsSource.match(
    new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`),
  );
  if (!match) throw new Error(`Missing token block for ${selector}`);
  return match[1];
}

function token(block: string, name: string): string {
  const match = block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,6})`));
  if (!match) throw new Error(`Missing hexadecimal token ${name}`);
  return match[1];
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(color: string): number {
  const value = color.slice(1);
  const expanded =
    value.length === 3
      ? [...value].map((character) => character.repeat(2)).join("")
      : value;
  const channels = [0, 2, 4].map((index) =>
    Number.parseInt(expanded.slice(index, index + 2), 16),
  );
  const [red, green, blue] = channels.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
