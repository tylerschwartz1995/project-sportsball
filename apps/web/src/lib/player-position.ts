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
