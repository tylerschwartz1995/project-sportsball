import { ViewTabs } from "@/components/ui/view-tabs";
import type { SeasonPhase } from "@/contracts/season-phase";

export function StatsTabs({ subject, advanced = false, seasonId, phase = "regular", type = "skaters" }: {
  subject: "teams" | "players"; advanced?: boolean; seasonId: number;
  phase?: SeasonPhase; type?: "skaters" | "goalies";
}) {
  const params = new URLSearchParams({ season: String(seasonId), phase });
  if (subject === "players") params.set("type", type);
  const advancedParams = new URLSearchParams(params);
  advancedParams.set("type", subject === "teams" ? "teams" : type);
  return <ViewTabs active={advanced ? "advanced" : "basic"} ariaLabel={`${subject === "teams" ? "Team" : "Player"} statistics`} tabs={[
    { id: "basic", label: "Basic Stats", prefetch: advanced, href: `/${subject}?${params}` },
    { id: "advanced", label: "Advanced Stats", prefetch: !advanced, href: `/analytics?${advancedParams}` },
  ]} />;
}
