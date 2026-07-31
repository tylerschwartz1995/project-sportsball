export const SEASON_PHASES = ["regular", "playoffs"] as const;

export type SeasonPhase = (typeof SEASON_PHASES)[number];
export type GamePhase = SeasonPhase | "all";

export function parseSeasonPhase(
  value: string | null | undefined,
): SeasonPhase {
  return value === "playoffs" ? "playoffs" : "regular";
}

export function parseGamePhase(value: string | null | undefined): GamePhase {
  return value === "regular" || value === "playoffs" ? value : "all";
}

export function gameTypeForPhase(phase: SeasonPhase): 2 | 3 {
  return phase === "playoffs" ? 3 : 2;
}

export function gameTypeForGamePhase(phase: GamePhase): 2 | 3 | undefined {
  return phase === "all" ? undefined : gameTypeForPhase(phase);
}

export function seasonPhaseLabel(phase: SeasonPhase): string {
  return phase === "playoffs" ? "Playoffs" : "Regular Season";
}
