import {
  type ViewTab
} from "@/components/ui/view-tabs";
import {
  type TeamScheduleFilter
} from "@/features/teams/team-full-schedule";

export type TeamView =
  | "lines"
  | "schedule"
  | "skaters"
  | "goalies"
  | "advanced";

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
}: {
  nhlTeamId: number;
  seasonId: number;
  phase: "regular" | "playoffs";
}): ViewTab<TeamView>[] {
  const tabs: Array<{ id: TeamView; label: string }> = [
    { id: "schedule", label: "Games" },
    { id: "skaters", label: "Skaters" },
    { id: "goalies", label: "Goalies" },
    { id: "lines", label: "Lines" },
    { id: "advanced", label: "Advanced Stats" },
  ];

  return tabs.map(tab => ({ ...tab, href: `/teams/${nhlTeamId}?${new URLSearchParams({ season: String(seasonId), phase, view: tab.id })}` }));
}

export function parseTeamView(value: string | undefined): TeamView {
  const views: TeamView[] = [
    "lines",
    "schedule",
    "skaters",
    "goalies",
    "advanced",
  ];
  return views.includes(value as TeamView) ? (value as TeamView) : "schedule";
}

export function parseTeamScheduleFilter(value: string | undefined): TeamScheduleFilter {
  return value === "completed" || value === "upcoming" ? value : "all";
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
