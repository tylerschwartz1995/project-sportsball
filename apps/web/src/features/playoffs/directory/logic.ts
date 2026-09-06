
export type PlayoffView = "bracket" | "skaters" | "goalies";

export type PlayoffsPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    view?: string | string[];
  }>;
};

export function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

export function parsePlayoffView(value: string | undefined): PlayoffView {
  return value === "skaters" || value === "goalies" ? value : "bracket";
}
