import { FilterForm } from "@/components/ui/filter-form";
import {
  FilterActions,
  FilterHeader,
} from "@/components/ui/filter-primitives";
import { DEFAULT_MINIMUM_MINUTES, ICE_TIME_OPTIONS, UNIT_SORTS, UNIT_VIEWS, WINDOW_OPTIONS } from './logic';

export function CombinationFilters({
  seasonId,
  selectedMinutes,
  teams,
  selectedTeamId,
  rollingGames,
  view,
  pageSize,
  sort,
  direction,
}: {
  seasonId: number;
  selectedMinutes: number;
  teams: Array<{ nhlTeamId: number; name: string }>;
  selectedTeamId: number | undefined;
  rollingGames: (typeof WINDOW_OPTIONS)[number] | undefined;
  view: (typeof UNIT_VIEWS)[number];
  pageSize: number;
  sort: (typeof UNIT_SORTS)[number];
  direction: "asc" | "desc";
}) {
  const activeFilterCount =
    (selectedTeamId ? 1 : 0) +
    (rollingGames ? 1 : 0) +
    (selectedMinutes === DEFAULT_MINIMUM_MINUTES ? 0 : 1);
  return (
    <FilterForm
      key={`${seasonId}:${view}:${selectedTeamId}:${rollingGames}:${selectedMinutes}`}
      className="workspace-unit-filter"
    >
      <input type="hidden" name="season" value={seasonId} />
      <input type="hidden" name="view" value={view} />
      <input type="hidden" name="perPage" value={pageSize} />
      <input type="hidden" name="sort" value={sort} />
      <input type="hidden" name="direction" value={direction} />
      <FilterHeader
        description="Narrow combinations by team, sample window, and shared ice time."
        activeCount={activeFilterCount}
      />
      <label>
        Team
        <select name="team" defaultValue={selectedTeamId ?? ""}>
          <option value="">All Teams</option>
          {teams.map((team) => (
            <option key={team.nhlTeamId} value={team.nhlTeamId}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sample
        <select name="window" defaultValue={rollingGames ?? ""}>
          <option value="">Full Season</option>
          {WINDOW_OPTIONS.map((games) => (
            <option key={games} value={games}>
              Last {games} team games
            </option>
          ))}
        </select>
      </label>
      <label>
        Minimum 5-on-5 Ice Time
        <select
          name="minimum"
          defaultValue={selectedMinutes}
        >
          {ICE_TIME_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes === 0 ? "No minimum" : `${minutes} minutes`}
            </option>
          ))}
        </select>
      </label>
      <FilterActions
        clearHref={`/lines?season=${seasonId}&view=${view}&perPage=${pageSize}&sort=${sort}&direction=${direction}`}
        canClear={activeFilterCount > 0}
      />
    </FilterForm>
  );
}
