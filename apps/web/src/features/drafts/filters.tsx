import { AutoSubmitSelect } from "@/components/ui/auto-submit-select";
import { ContextLink as Link } from "@/components/ui/context-link";
import { FilterHeader } from "@/components/ui/filter-primitives";
import type { DraftTeamOption } from "@/contracts/draft";
import { TEAM_DRAFT_WINDOW_YEARS } from "@/contracts/draft";
import { DraftSort } from "@/features/drafts/logic";

export function DraftBoardFilters({
  years,
  teams,
  rounds,
  selectedYear,
  selectedTeam,
  selectedRound,
  allYears,
  query,
  fromYear,
  toYear,
  sort,
  direction,
}: {
  years: number[];
  teams: DraftTeamOption[];
  rounds: number[];
  selectedYear: number | null;
  selectedTeam: string;
  selectedRound: number | null;
  allYears: boolean;
  query: string;
  fromYear: number | null;
  toYear: number | null;
  sort: DraftSort;
  direction: "asc" | "desc";
}) {
  const resetYear = allYears ? "all" : selectedYear;
  const resetParams = new URLSearchParams({ view: "board", sort, dir: direction });
  if (resetYear !== null) resetParams.set("year", String(resetYear));
  if (fromYear !== null) resetParams.set("from", String(fromYear));
  if (toYear !== null) resetParams.set("to", String(toYear));
  const resetHref = `/drafts?${resetParams.toString()}`;
  const activeFilterCount =
    (selectedTeam ? 1 : 0) + (selectedRound ? 1 : 0) + (query ? 1 : 0);

  return (
    <form method="get" className="workspace-draft-filters is-board">
      <input type="hidden" name="view" value="board" />
      <input type="hidden" name="sort" value={sort} />
      <input type="hidden" name="dir" value={direction} />
      <input type="hidden" name="q" value={query} />
      <input type="hidden" name="from" value={fromYear ?? ""} />
      <input type="hidden" name="to" value={toYear ?? ""} />
      <FilterHeader
        description=""
        activeCount={activeFilterCount}
        autoApply
      />
      <label>
        Draft Year
        <AutoSubmitSelect
          name="year"
          defaultValue={allYears ? "all" : (selectedYear ?? "")}
          resetFields={["team"]}
        >
          <option value="all">
            {fromYear !== null && toYear !== null
              ? `${fromYear}–${toYear} Window`
              : "All Drafts"}
          </option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year} Draft
            </option>
          ))}
        </AutoSubmitSelect>
      </label>
      <label>
        Drafting Team
        <AutoSubmitSelect name="team" defaultValue={selectedTeam}>
          <option value="">All Teams</option>
          {teams.map((team) => (
            <option key={team.abbreviation} value={team.abbreviation}>
              {team.name} ({team.abbreviation})
            </option>
          ))}
        </AutoSubmitSelect>
      </label>
      <label>
        Round
        <AutoSubmitSelect name="round" defaultValue={selectedRound ?? ""}>
          <option value="">All Rounds</option>
          {rounds.map((round) => (
            <option key={round} value={round}>
              Round {round}
            </option>
          ))}
        </AutoSubmitSelect>
      </label>
      <div className="workspace-draft-filter-actions">
        {activeFilterCount > 0 ? (
          <Link href={resetHref}>Clear Filters</Link>
        ) : null}
      </div>
    </form>
  );
}

export function DraftYearFilter({
  years,
  selectedYear,
  matureThrough,
}: {
  years: number[];
  selectedYear: number | null;
  matureThrough: number | null;
}) {
  return (
    <form method="get" className="workspace-draft-filters is-compact">
      <input type="hidden" name="view" value="outcomes" />
      <label>
        Draft Class
        <AutoSubmitSelect name="year" defaultValue={selectedYear ?? ""}>
          {years.map((year) => (
            <option key={year} value={year}>
              {year} Draft{matureThrough !== null && year > matureThrough ? " · developing" : ""}
            </option>
          ))}
        </AutoSubmitSelect>
      </label>
      <div className="workspace-draft-filter-actions">
        <Link href="/drafts?view=outcomes">Latest Mature Class</Link>
      </div>
    </form>
  );
}

export function DraftRangeFilter({
  years,
  fromYear,
  toYear,
  matureThrough,
  selectedTeam,
}: {
  years: number[];
  fromYear: number | null;
  toYear: number | null;
  matureThrough: number | null;
  selectedTeam: string;
}) {
  const matureYears = years.filter(
    (year) => matureThrough === null || year <= matureThrough,
  );
  const defaultEnd = matureThrough;
  const defaultStart = defaultEnd === null ? null : Math.max(
    years.at(-1) ?? defaultEnd, defaultEnd - TEAM_DRAFT_WINDOW_YEARS + 1,
  );
  const hasCustomWindow = fromYear !== defaultStart || toYear !== defaultEnd;
  const clearParams = new URLSearchParams({ view: "teams" });
  if (selectedTeam) clearParams.set("team", selectedTeam);
  return (
    <form method="get" className="workspace-draft-filters is-range">
      <input type="hidden" name="view" value="teams" />
      <input type="hidden" name="team" value={selectedTeam} />
      <label>
        From Draft
        <AutoSubmitSelect name="from" defaultValue={fromYear ?? ""}>
          {matureYears.toReversed().map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </AutoSubmitSelect>
      </label>
      <label>
        Through Draft
        <AutoSubmitSelect name="to" defaultValue={toYear ?? ""}>
          {matureYears.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </AutoSubmitSelect>
      </label>
      <div className="workspace-draft-filter-actions">
        {hasCustomWindow ? <Link href={`/drafts?${clearParams.toString()}`}>Clear Filters</Link> : null}
      </div>
    </form>
  );
}
