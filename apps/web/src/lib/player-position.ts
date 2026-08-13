const DISPLAY_POSITIONS: Record<string, string> = {
  L: "LW",
  R: "RW",
};

const LONG_POSITIONS: Record<string, string> = {
  C: "Center",
  D: "Defenseman",
  G: "Goalie",
  L: "Left Wing",
  R: "Right Wing",
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

export function formatPlayerPositionLong(
  position: string | null | undefined,
  fallback = "Player",
): string {
  if (!position) {
    return fallback;
  }

  return LONG_POSITIONS[position.trim().toUpperCase()] ?? position;
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
