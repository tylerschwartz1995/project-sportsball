import { FilterForm } from "@/components/ui/filter-form";
import {
  FilterActions,
} from "@/components/ui/filter-primitives";
import { LeaderboardType, MINIMUM_MINUTES, Situation, situationLabel, SITUATIONS } from '../logic';
export function AnalyticsFilters({
  seasonId,
  type,
  situation,
  minimumMinutes,
  phase,
  chartParams,
  query,
  position,
}: {
  query: string;
  position: string;
  seasonId: number;
  type: LeaderboardType;
  situation: Situation;
  minimumMinutes: number;
  phase: "regular" | "playoffs";
  chartParams: Record<string, string | undefined>;
}) {
  const defaultSituation = type === "goalies" ? "all" : "5on5";
  const defaultMinimum = 0;
  const activeFilterCount =
    (query ? 1 : 0) + (position ? 1 : 0) +
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
    <FilterForm autoApply
      key={`${seasonId}:${type}:${phase}:${situation}:${minimumMinutes}:${query}:${position}`}
      className="workspace-analytics-filters"
      data-type={type}
    >
      <input type="hidden" name="season" value={seasonId} />
      {type !== "teams" ? <label>
        Player Search
        <input type="search" name="q" defaultValue={query} placeholder="Search by name…" />
      </label> : null}
      {type === "teams" ? <input type="hidden" name="type" value={type} /> : (
        <label>
          Player Type
          <select name="type" defaultValue={type}>
            <option value="skaters">Skaters</option>
            <option value="goalies">Goalies</option>
          </select>
        </label>
      )}
      {type === "skaters" ? <label>
        Position
        <select name="position" defaultValue={position}>
          <option value="">All Positions</option>
          <option value="F">Forwards</option>
          <option value="D">Defensemen</option>
          <option value="C">Centers</option>
          <option value="R">Right Wings</option>
          <option value="L">Left Wings</option>
        </select>
      </label> : null}
      <input type="hidden" name="phase" value={phase} />
      {Object.entries(chartParams).map(([name, value]) => <input key={name} type="hidden" name={name} value={value ?? ""} disabled={!value} />)}
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
      <FilterActions autoApply
        clearHref={`/analytics?${clearParams.toString()}`}
        canClear={activeFilterCount > 0}
      />
    </FilterForm>
  );
}
