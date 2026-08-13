const DISPLAY_POSITIONS: Record<string, string> = {
  L: "LW",
  R: "RW",
};

/**
 * Converts NHL source position codes into the abbreviations shown in the UI.
 * Keep the source value unchanged for filtering, sorting, and data logic.
 */
export function formatPlayerPosition(
  position: string | null | undefined,
  fallback = "—",
): string {
  if (!position) {
    return fallback;
  }

  return DISPLAY_POSITIONS[position] ?? position;
}

export type PlayerPositionFilter = "" | "F" | "D" | "C" | "R" | "L";

export function parsePlayerPositionFilter(
  value: string | undefined,
): PlayerPositionFilter {
  return value === "F" ||
    value === "D" ||
    value === "C" ||
    value === "R" ||
    value === "L"
    ? value
    : "";
}

export function matchesPlayerPosition(
  position: string | null | undefined,
  filter: PlayerPositionFilter,
): boolean {
  if (!filter) {
    return true;
  }

  const normalizedPosition = position?.trim().toUpperCase();
  return filter === "F"
    ? normalizedPosition === "C" ||
        normalizedPosition === "L" ||
        normalizedPosition === "R"
    : normalizedPosition === filter;
}
