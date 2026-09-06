"use client";
import { formatGameState } from "@/contracts/game";
import type {
  PlayoffSeries,
  PlayoffSeriesGame
} from "@/contracts/playoffs";
export type SelectedSeries = {
  roundName: string;
  series: PlayoffSeries;
};

export type SeriesTab = "overview" | "games" | "players" | "advanced";

export type PlayerStatsView = "skaters" | "goalies";

export const gameDateFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export type SeriesPlayerIdentity = {
  nhlPlayerId: number;
  name: string;
  nhlTeamId: number;
  teamAbbreviation: string;
};

export function formatMatchup(series: PlayoffSeries): string {
  const teamOne = series.teamOne?.name ?? "To Be Determined";
  const teamTwo = series.teamTwo?.name ?? "To Be Determined";
  return `${teamOne} vs. ${teamTwo}`;
}

export function formatSeriesMastheadStatus(
  series: PlayoffSeries,
  isProjection: boolean,
): string {
  if (isProjection) return "Projected Matchup";
  if (series.winnerNhlTeamId) {
    const winner =
      series.teamOne?.nhlTeamId === series.winnerNhlTeamId
        ? series.teamOne
        : series.teamTwo;
    return `${winner?.abbreviation ?? "Series"} Wins`;
  }
  if (series.games.length === 0) return "Not Started";
  if (series.teamOneWins === series.teamTwoWins) return "Series Tied";

  const leader =
    series.teamOneWins > series.teamTwoWins ? series.teamOne : series.teamTwo;
  return `${leader?.abbreviation ?? "Leader"} Leads`;
}

export function formatSeriesProgress(
  series: PlayoffSeries,
  teamOneWins: number,
  teamTwoWins: number,
): string {
  if (teamOneWins === teamTwoWins) {
    return `Series Tied ${teamOneWins}–${teamTwoWins}`;
  }

  const teamOneLeads = teamOneWins > teamTwoWins;
  const leader = teamOneLeads ? series.teamOne : series.teamTwo;
  const leaderWins = Math.max(teamOneWins, teamTwoWins);
  const trailerWins = Math.min(teamOneWins, teamTwoWins);
  return leaderWins === 4
    ? `${leader?.abbreviation ?? "Winner"} Wins Series ${leaderWins}–${trailerWins}`
    : `${leader?.abbreviation ?? "Leader"} Leads ${leaderWins}–${trailerWins}`;
}

export function formatSeriesGameState(game: PlayoffSeriesGame): string {
  const state = formatGameState(game.state);
  if (state === "FINAL" || state === "OFF") {
    return game.lastPeriodType && game.lastPeriodType !== "REG"
      ? `Final · ${game.lastPeriodType}`
      : "Final";
  }
  return state;
}

export function formatGameDate(game: PlayoffSeriesGame): string {
  return gameDateFormatter.format(new Date(`${game.gameDate}T12:00:00Z`));
}

export function seriesTabLabel(tab: SeriesTab): string {
  return tab === "advanced"
    ? "Advanced analytics"
    : tab === "players"
      ? "Player stats"
      : tab[0].toUpperCase() + tab.slice(1);
}

export function formatCount(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("en-CA");
}

export function formatDecimal(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

export function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function formatSignedDecimal(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

export function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

export function formatDistance(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)} ft`;
}

export function formatTimeOnIce(value: number | null): string {
  if (value === null) return "—";
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
