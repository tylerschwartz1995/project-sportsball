import {
  type ViewTab
} from "@/components/ui/view-tabs";
import {
  type TeamScheduleFilter
} from "@/features/teams/team-full-schedule";

export type TeamView =
  | "overview"
  | "schedule"
  | "strength"
  | "trends"
  | "skaters"
  | "goalies"
  | "advanced"
  | "combinations";

export type TeamPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    season?: string | string[];
    phase?: string | string[];
    sos?: string | string[];
    view?: string | string[];
    chartWindow?: string | string[];
    chartVenue?: string | string[];
    showGoals?: string | string[];
    showExpectedGoals?: string | string[];
    scheduleState?: string | string[];
  }>;
};

export function teamViewTabs({
  nhlTeamId,
  seasonId,
  phase,
  scheduleStrengthMetric,
  chartParams,
}: {
  nhlTeamId: number;
  seasonId: number;
  phase: "regular" | "playoffs";
  scheduleStrengthMetric: string;
  chartParams: Record<string, string | undefined>;
}): ViewTab<TeamView>[] {
  const tabs: Array<{ id: TeamView; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "schedule", label: "Schedule" },
    { id: "strength", label: "Strength" },
    { id: "trends", label: "Recent Form" },
    { id: "skaters", label: "Skaters" },
    { id: "goalies", label: "Goalies" },
    { id: "advanced", label: "Shot Quality" },
    { id: "combinations", label: "Lines & Pairings" },
  ];

  return tabs
    .filter(
      (tab) =>
        (tab.id !== "strength" || phase === "regular") &&
        (tab.id !== "combinations" ||
          (seasonId >= 20082009 && phase === "regular")),
    )
    .map((tab) => {
      const params = new URLSearchParams({
        season: String(seasonId),
        phase,
        view: tab.id,
      });
      if (tab.id === "strength") {
        params.set("sos", scheduleStrengthMetric);
      }
      if (tab.id === "trends") {
        Object.entries(chartParams).forEach(([key, value]) => {
          if (value) params.set(key, value);
        });
      }
      return {
        ...tab,
        href: `/teams/${nhlTeamId}?${params.toString()}`,
        prefetch: tab.id === "strength" ? true : undefined,
        preservedSearchParameters: tab.id === "strength" ? ["sos"] : undefined,
      };
    });
}

export function parseTeamView(value: string | undefined): TeamView {
  const views: TeamView[] = [
    "overview",
    "schedule",
    "strength",
    "trends",
    "skaters",
    "goalies",
    "advanced",
    "combinations",
  ];
  return views.includes(value as TeamView) ? (value as TeamView) : "overview";
}

export function parseTeamScheduleFilter(value: string | undefined): TeamScheduleFilter {
  return value === "completed" || value === "upcoming" ? value : "all";
}

export function normalizeTeamView(
  view: TeamView,
  seasonId: number,
  phase: "regular" | "playoffs",
): TeamView {
  if (view === "strength" && phase !== "regular") return "overview";
  if (
    view === "combinations" &&
    (phase !== "regular" || seasonId < 20082009)
  ) {
    return "overview";
  }
  return view;
}

export function formatSigned(value: number | null): string | null {
  return value === null ? null : value > 0 ? `+${value}` : String(value);
}

export function formatDecimal(value: number | null, digits: number): string | null {
  return value === null ? null : value.toFixed(digits);
}

export function formatSavePercentage(value: number | null): string | null {
  return value === null ? null : value.toFixed(3).replace(/^0/, "");
}

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
