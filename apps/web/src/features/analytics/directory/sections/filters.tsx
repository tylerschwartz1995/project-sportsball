import { FilterForm } from "@/components/ui/filter-form";
import {
  FilterActions,
  FilterHeader,
} from "@/components/ui/filter-primitives";
import { LeaderboardType, MINIMUM_MINUTES, Situation, situationLabel, SITUATIONS } from '../logic';
export function AnalyticsFilters({
  seasonId,
  type,
  situation,
  minimumMinutes,
  phase,
  chartParams,
}: {
  seasonId: number;
  type: LeaderboardType;
  situation: Situation;
  minimumMinutes: number;
  phase: "regular" | "playoffs";
  chartParams: Record<string, string | undefined>;
}) {
  const defaultSituation = type === "goalies" ? "all" : "5on5";
  const defaultMinimum = type === "teams" ? 0 : type === "goalies" ? 500 : 300;
  const activeFilterCount =
    (situation === defaultSituation ? 0 : 1) +
    (type === "teams" || minimumMinutes === defaultMinimum ? 0 : 1);
  const clearParams = new URLSearchParams({
    season: String(seasonId),
    phase,
    type,
  });
  Object.entries(chartParams).forEach(([name, value]) => {
    if (value) clearParams.set(name, value);
  });
  return (
    <FilterForm
      key={`${seasonId}:${type}:${phase}:${situation}:${minimumMinutes}`}
      className="workspace-analytics-filters"
      data-type={type}
    >
      <input type="hidden" name="season" value={seasonId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="phase" value={phase} />
      {Object.entries(chartParams).map(([name, value]) => <input key={name} type="hidden" name={name} value={value ?? ""} disabled={!value} />)}
      <FilterHeader
        description={
          type === "teams"
            ? "Choose the game state for this leaderboard."
            : "Choose the game state and minimum workload for this leaderboard."
        }
        activeCount={activeFilterCount}
      />
      <label>
        Game Situation
        <select
          name="situation"
          defaultValue={situation}
        >
          {SITUATIONS.map((value) => (
            <option key={value} value={value}>
              {situationLabel(value)}
            </option>
          ))}
        </select>
      </label>
      {type === "teams" ? null : (
        <label>
          Minimum Ice Time
          <select
            name="minimum"
            defaultValue={minimumMinutes}
          >
            {MINIMUM_MINUTES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes === 0 ? "No minimum" : `${minutes} minutes`}
              </option>
            ))}
          </select>
        </label>
      )}
      <FilterActions
        clearHref={`/analytics?${clearParams.toString()}`}
        canClear={activeFilterCount > 0}
      />
    </FilterForm>
  );
}
