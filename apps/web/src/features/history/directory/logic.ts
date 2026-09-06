import type {
  HistoryFilters as HistoryFilterValues,
  HistoryMetric,
  HistorySection,
  HistoryView
} from "@/contracts/history";
import {
  type SeasonPhase
} from "@/contracts/season-phase";
import {
  parseHistoryFilters
} from "@/data/history";

export const PAGE_SIZE = 25;

export type HistoryPageProps = {
  searchParams: Promise<{
    section?: string | string[];
    entity?: string | string[];
    view?: string | string[];
    display?: string | string[];
    phase?: string | string[];
    metric?: string | string[];
    startYear?: string | string[];
    endYear?: string | string[];
    minimumGames?: string | string[];
    position?: string | string[];
    team?: string | string[];
    country?: string | string[];
    page?: string | string[];
    window?: string | string[];
  }>;
};

export function historySectionTabs(active: HistorySection, phase: SeasonPhase) {
  const tabs: Array<{ id: HistorySection; label: string }> = [
    { id: "overview", label: "Record Book" },
    { id: "careers", label: "Careers" },
    { id: "seasons", label: "Single Seasons" },
    { id: "peaks", label: "Peaks" },
    { id: "eras", label: "Era Adjusted" },
  ];
  return tabs.map((tab) => ({ ...tab, href: `/history?section=${tab.id}&phase=${phase}`, active }));
}

export function parseHistorySection(value: string | undefined, legacyDisplay: string | undefined, legacyView: string | undefined): HistorySection {
  if (value === "careers" || value === "seasons" || value === "peaks" || value === "eras") return value;
  if (value === "overview") return value;
  if (legacyDisplay === "seasons") return "seasons";
  if (legacyView) return "careers";
  return "overview";
}

export function historyFiltersFromParams(params: Awaited<HistoryPageProps["searchParams"]>, defaultMinimum: number): HistoryFilterValues {
  return parseHistoryFilters({
    startYear: firstValue(params.startYear),
    endYear: firstValue(params.endYear),
    minimumGames: firstValue(params.minimumGames) ?? String(defaultMinimum),
    position: firstValue(params.position),
    team: firstValue(params.team),
    country: firstValue(params.country),
  });
}

export function metricOptions(view: HistoryView): Array<{ metric: HistoryMetric; label: string }> {
  if (view === "goalies") return [{ metric: "wins", label: "Wins" }, { metric: "games", label: "Games" }, { metric: "shutouts", label: "Shutouts" }, { metric: "savePercentage", label: "Save %" }];
  if (view === "teams") return [{ metric: "points", label: "Points" }, { metric: "wins", label: "Wins" }, { metric: "pointPercentage", label: "Points %" }];
  return [{ metric: "points", label: "Points" }, { metric: "goals", label: "Goals" }, { metric: "assists", label: "Assists" }, { metric: "games", label: "Games" }, { metric: "pointsPerGame", label: "Points / Game" }];
}

export function peakMetricOptions(view: "skaters" | "goalies") {
  return view === "goalies"
    ? [{ metric: "wins" as const, label: "Wins" }, { metric: "shutouts" as const, label: "Shutouts" }]
    : [{ metric: "points" as const, label: "Points" }, { metric: "goals" as const, label: "Goals" }, { metric: "assists" as const, label: "Assists" }];
}

export function parsePeakMetric(view: "skaters" | "goalies", value: string | undefined): HistoryMetric {
  if (view === "goalies") return value === "shutouts" ? "shutouts" : "wins";
  return value === "goals" || value === "assists" ? value : "points";
}

export function metricLabel(metric: HistoryMetric): string {
  return ({ points: "Points", goals: "Goals", assists: "Assists", games: "Games Played", pointsPerGame: "Points Per Game", wins: "Wins", shutouts: "Shutouts", savePercentage: "Save Percentage", pointPercentage: "Points Percentage" } as Record<HistoryMetric, string>)[metric];
}

export function entityLinks(
  section: HistorySection,
  phase: SeasonPhase,
  filters: HistoryFilterValues,
  qualificationIsDefault: boolean,
): Record<HistoryView, string> {
  return {
    skaters: historyHref({ section, phase, view: "skaters", metric: "points", filters, omitMinimum: qualificationIsDefault }),
    goalies: historyHref({ section, phase, view: "goalies", metric: "wins", filters, omitMinimum: qualificationIsDefault }),
    teams: historyHref({ section, phase, view: "teams", metric: "points", filters, omitMinimum: qualificationIsDefault }),
  };
}

export function historyHref({ section, phase, view, metric, filters, window, omitMinimum = false }: { section: HistorySection; phase: SeasonPhase; view: HistoryView; metric: HistoryMetric; filters: HistoryFilterValues; window?: 3 | 5; omitMinimum?: boolean }) {
  const params = new URLSearchParams();
  const values: Record<string, string | number | undefined> = {
    ...historyQueryParams(section, phase, view, metric, filters),
    window,
  };
  if (omitMinimum) values.minimumGames = undefined;
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined) params.set(key, String(value)); });
  return `/history?${params.toString()}`;
}

export function historyQueryParams(section: HistorySection, phase: SeasonPhase, view: HistoryView, metric: HistoryMetric, filters: HistoryFilterValues): Record<string, string | number | undefined> {
  return { section, phase, entity: view, metric, startYear: filters.startYear, endYear: filters.endYear, minimumGames: filters.minimumGames, position: filters.position ?? undefined, team: filters.team ?? undefined, country: filters.country ?? undefined };
}

export function historyPhaseParams(
  section: HistorySection,
  params: Awaited<HistoryPageProps["searchParams"]>,
): Record<string, string | number | undefined> {
  return {
    section,
    entity: firstValue(params.entity) ?? firstValue(params.view),
    metric: firstValue(params.metric),
    startYear: firstValue(params.startYear),
    endYear: firstValue(params.endYear),
    minimumGames: firstValue(params.minimumGames),
    position: firstValue(params.position),
    team: firstValue(params.team),
    country: firstValue(params.country),
    window: firstValue(params.window),
  };
}

export function hasCustomFilters(params: Awaited<HistoryPageProps["searchParams"]>, defaultMinimum: number): boolean {
  const minimum = firstValue(params.minimumGames);
  return Boolean(firstValue(params.startYear) || firstValue(params.endYear) || firstValue(params.position) || firstValue(params.team) || firstValue(params.country) || (minimum !== undefined && Number(minimum) !== defaultMinimum));
}

export function pageStart(page: number, count: number): number { return count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1; }

export function pageEnd(page: number, count: number): number { return count === 0 ? 0 : (page - 1) * PAGE_SIZE + count; }

export function firstValue(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }
