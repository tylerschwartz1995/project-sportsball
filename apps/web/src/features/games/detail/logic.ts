import {
  type GameAdvancedView
} from "@/features/games/game-advanced-analytics";

export type GameView = "scoring" | "box-score" | "advanced";

export type GamePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    view?: string | string[];
    advancedView?: string | string[];
    timelinePeriod?: string | string[];
  }>;
};

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatTimeOnIce(seconds: number | null): string {
  if (seconds === null) {
    return "—";
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

export function finalLabel(lastPeriodType: string | null): string {
  return lastPeriodType && lastPeriodType !== "REG"
    ? `Final · ${lastPeriodType}`
    : "Final";
}

export function parseGameView(value: string | undefined): GameView {
  return value === "scoring" || value === "box-score" || value === "advanced"
    ? value
    : "scoring";
}

export function normalizeGameView(
  view: GameView,
  availability: {
    scoring: boolean;
    boxScore: boolean;
    advanced: boolean;
  },
): GameView {
  if (view === "scoring" && availability.scoring) return view;
  if (view === "box-score" && availability.boxScore) return view;
  if (view === "advanced" && availability.advanced) return view;
  if (availability.scoring) return "scoring";
  if (availability.boxScore) return "box-score";
  return "advanced";
}

export function parseGameAdvancedView(value: string | undefined): GameAdvancedView {
  return value === "shots" ||
    value === "players" ||
    value === "combinations"
    ? value
    : "teams";
}

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
