import type { DraftPlayerOutcome } from "@/contracts/draft";
import { applySortDirection } from "@/lib/directory";
import { formatPlayerPosition } from "@/lib/player-position";

export type DraftView = "board" | "outcomes" | "teams" | "classes";

export type DraftSort =
  | "player"
  | "year"
  | "team"
  | "round"
  | "overall"
  | "position"
  | "country";

export function buildOutcomeInsights(
  outcomes: DraftPlayerOutcome[],
  isDeveloping: boolean,
) {
  const selections = outcomes.length;
  const appearances = outcomes.filter((player) => player.careerGames > 0).length;
  const hundredGamePlayers = outcomes.filter((player) => player.careerGames >= 100).length;
  const totalGames = outcomes.reduce((total, player) => total + player.careerGames, 0);
  if (isDeveloping) {
    return [
      {
        label: "Official Selections",
        value: selections.toLocaleString("en-CA"),
        detail: "Complete draft class",
      },
      {
        label: "NHL Players So Far",
        value: appearances.toLocaleString("en-CA"),
        detail: "At least one stored NHL game",
      },
      {
        label: "NHL Games So Far",
        value: totalGames.toLocaleString("en-CA"),
        detail: "Combined regular-season games",
      },

    ];
  }

  return [
    {
      label: "Official Selections",
      value: selections.toLocaleString("en-CA"),
      detail: "Complete draft class",
    },
    {
      label: "NHL Appearance Rate",
      value: formatPercentage(appearances / selections),
      detail: `${appearances.toLocaleString("en-CA")} players reached one game`,
    },
    {
      label: "100-Game Rate",
      value: formatPercentage(hundredGamePlayers / selections),
      detail: `${hundredGamePlayers.toLocaleString("en-CA")} players reached 100 games`,
    },
    {
      label: "Games per Pick",
      value: Math.round(totalGames / selections).toLocaleString("en-CA"),
      detail: "Average regular-season games",
    },
  ];
}

export function sortDraftOutcomes(
  outcomes: DraftPlayerOutcome[],
  sort: DraftSort,
  direction: "asc" | "desc",
): DraftPlayerOutcome[] {
  return [...outcomes].sort((left, right) => {
    const comparison = compareDraftOutcomes(left, right, sort);
    return applySortDirection(comparison, direction) ||
      right.draftYear - left.draftYear ||
      left.draftOverallPick - right.draftOverallPick;
  });
}

export function compareDraftOutcomes(
  left: DraftPlayerOutcome,
  right: DraftPlayerOutcome,
  sort: DraftSort,
): number {
  switch (sort) {
    case "player":
      return right.name.localeCompare(left.name);
    case "year":
      return left.draftYear - right.draftYear;
    case "team":
      return right.draftTeamName.localeCompare(left.draftTeamName);
    case "round":
      return right.draftRound - left.draftRound;
    case "position":
      return formatPlayerPosition(right.position).localeCompare(formatPlayerPosition(left.position));
    case "country":
      return (right.birthCountry ?? "").localeCompare(left.birthCountry ?? "");
    case "overall":
    default:
      return right.draftOverallPick - left.draftOverallPick;
  }
}

export function draftViewTabs({
  view,
  selectedYear,
  selectedTeam,
  selectedDraftingTeam,
  selectedFromYear,
  selectedToYear,
  outcomeMetric,
  roundGroup,
}: {
  view: DraftView;
  selectedYear: number | null;
  selectedTeam: string;
  selectedDraftingTeam: string;
  selectedFromYear: number | null;
  selectedToYear: number | null;
  outcomeMetric: string | undefined;
  roundGroup: string | undefined;
}) {
  const boardParams = new URLSearchParams({ view: "board" });
  if (view !== "teams" && selectedYear !== null) {
    boardParams.set("year", String(selectedYear));
  }
  if (selectedTeam) boardParams.set("team", selectedTeam);

  const outcomeParams = new URLSearchParams({ view: "outcomes" });
  if (view !== "teams" && selectedYear !== null) {
    outcomeParams.set("year", String(selectedYear));
  }
  if (outcomeMetric) outcomeParams.set("outcomeMetric", outcomeMetric);
  if (roundGroup) outcomeParams.set("roundGroup", roundGroup);

  const teamParams = new URLSearchParams({ view: "teams" });
  if (selectedFromYear !== null) teamParams.set("from", String(selectedFromYear));
  if (selectedToYear !== null) teamParams.set("to", String(selectedToYear));
  if (selectedDraftingTeam) teamParams.set("team", selectedDraftingTeam);

  const classParams = new URLSearchParams({ view: "classes" });

  return [
    { id: "board" as const, label: "Draft Board", href: `/drafts?${boardParams.toString()}` },
    { id: "outcomes" as const, label: "Player Outcomes", href: `/drafts?${outcomeParams.toString()}` },
    { id: "teams" as const, label: "Team Drafting", href: `/drafts?${teamParams.toString()}` },
    { id: "classes" as const, label: "Class Rankings", href: `/drafts?${classParams.toString()}` },
  ];
}

export function parseDraftView(value: string | undefined): DraftView {
  if (value === "teams") return "teams";
  if (value === "classes") return "classes";
  if (value === "outcomes" || value === "pick-value") return "outcomes";
  return "board";
}

export function parseDraftSort(value: string | undefined, fallback: DraftSort): DraftSort {
  return value === "player" ||
    value === "year" ||
    value === "team" ||
    value === "round" ||
    value === "overall" ||
    value === "position" ||
    value === "country"
    ? value
    : fallback;
}

export function parseDraftYear(value: string | undefined): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= 1963 ? parsed : null;
}

export function parseRound(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 30 ? parsed : null;
}

export function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatSignedNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : rounded.toString();
}

export function formatSignedDecimal(value: number): string {
  const formatted = value.toFixed(1);
  return value > 0 ? `+${formatted}` : formatted;
}

export function sortedValues(values: Array<number | null>): number[] {
  return values
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);
}

export function relativeRangePosition(sortedNumbers: number[], value: number): number {
  const minimum = sortedNumbers[0] ?? value;
  const maximum = sortedNumbers.at(-1) ?? value;

  if (maximum === minimum) return 0.5;

  return (value - minimum) / (maximum - minimum);
}
