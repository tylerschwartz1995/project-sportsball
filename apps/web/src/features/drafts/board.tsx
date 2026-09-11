import { TableScroll } from "@/components/ui/table-scroll";
import { ContextLink as Link } from "@/components/ui/context-link";
import { FilterForm } from "@/components/ui/filter-form";
import { Pagination } from "@/components/ui/pagination";
import { SortIndicator } from "@/components/ui/sizing-icons";
import { WorkspacePanel } from "@/components/ui/workspace-primitives";
import type { DraftAnalytics, DraftPlayerOutcome } from "@/contracts/draft";
import { NumberCell } from "@/features/drafts/cells";
import { DraftBoardFilters } from "@/features/drafts/filters";
import { DraftSort, parseDraftSort, parseRound, sortDraftOutcomes } from "@/features/drafts/logic";
import { DraftsPageProps } from "@/features/drafts/route-state";
import { TeamLogo } from "@/features/teams/team-logo";
import { firstQueryValue, matchesSearch, normalizeSearch, paginate, parsePage, parseSortDirection } from "@/lib/directory";
import { formatPlayerPosition } from "@/lib/player-position";
import { redirect } from "next/navigation";

export function DraftBoardView({
  analytics,
  params,
  selectedTeam,
}: {
  analytics: DraftAnalytics;
  params: Awaited<DraftsPageProps["searchParams"]>;
  selectedTeam: string;
}) {
  const query = normalizeSearch(firstQueryValue(params.q));
  const requestedRound = parseRound(firstQueryValue(params.round));
  const availableRounds = [
    ...new Set(analytics.outcomes.map((outcome) => outcome.draftRound)),
  ].sort((left, right) => left - right);
  if (requestedRound !== null && !availableRounds.includes(requestedRound)) {
    const corrected = new URLSearchParams();
    for (const [key, raw] of Object.entries(params)) {
      const value = firstQueryValue(raw);
      if (key !== "round" && value) corrected.set(key, value);
    }
    redirect(`/drafts?${corrected.toString()}`);
  }
  const selectedRound = requestedRound;
  const defaultSort: DraftSort = analytics.allYears ? "year" : "overall";
  const sort = parseDraftSort(firstQueryValue(params.sort), defaultSort);
  const direction = parseSortDirection(
    firstQueryValue(params.dir),
    sort === "year" ? "desc" : "asc",
  );
  const filteredOutcomes = analytics.outcomes.filter(
    (outcome) =>
      (selectedRound === null || outcome.draftRound === selectedRound) &&
      matchesSearch(
        query,
        outcome.name,
        outcome.draftTeamName,
        outcome.draftTeamAbbreviation,
        outcome.amateurClubName,
        outcome.amateurLeague,
        outcome.birthCountry,
        formatPlayerPosition(outcome.position),
      ),
  );
  const outcomePage = paginate(
    sortDraftOutcomes(filteredOutcomes, sort, direction),
    parsePage(firstQueryValue(params.page)),
    25,
  );
  const selectedYear = analytics.allYears
    ? "all"
    : (analytics.selectedDraftYear ?? "all");
  const fromYear = analytics.selectedFromYear;
  const toYear = analytics.selectedToYear;
  const tableParams = {
    view: "board",
    year: selectedYear,
    team: selectedTeam || undefined,
    round: selectedRound ?? undefined,
    q: query || undefined,
    from: fromYear ?? undefined,
    to: toYear ?? undefined,
  };

  return (
    <>
      <DraftBoardFilters
        sort={sort}
        direction={direction}
        years={analytics.draftYears}
        teams={analytics.teamOptions}
        rounds={availableRounds}
        selectedYear={analytics.selectedDraftYear}
        selectedTeam={selectedTeam}
        selectedRound={selectedRound}
        allYears={analytics.allYears}
        query={query}
        fromYear={fromYear}
        toYear={toYear}
      />

      <WorkspacePanel
        id="draft-results"
        className="mt-7 scroll-mt-6"
        title={
          analytics.allYears
            ? fromYear !== null && toYear !== null
              ? `${fromYear}–${toYear} Draft Board`
              : "Complete Draft Archive"
            : `${analytics.selectedDraftYear ?? "NHL"} Draft Board`
        }
        description={
          outcomePage.totalItems > 0
            ? `Showing ${outcomePage.firstItem}–${outcomePage.lastItem} of ${outcomePage.totalItems} matching selections.`
            : "No selections match the current filters."
        }
        action={
          <DraftBoardSearch
            sort={sort}
            direction={direction}
            selectedYear={selectedYear}
            selectedTeam={selectedTeam}
            selectedRound={selectedRound}
            query={query}
            fromYear={fromYear}
            toYear={toYear}
          />
        }
      >
        {outcomePage.items.length > 0 ? (
          <>
            <DraftBoardTable
              rows={outcomePage.items}
              showYear={analytics.allYears}
              sort={sort}
              direction={direction}
              params={tableParams}
            />
          </>
        ) : (
          <div className="workspace-empty-state">
            Try a different player, team, round, or draft year.
          </div>
        )}
      </WorkspacePanel>
      {outcomePage.items.length > 0 ? (
        <Pagination
          path="/drafts"
          currentPage={outcomePage.currentPage}
          totalPages={outcomePage.totalPages}
          params={{ ...tableParams, sort, dir: direction }}
          scrollTarget="draft-results"
        />
      ) : null}
    </>
  );
}

export function DraftBoardSearch({
  selectedYear,
  selectedTeam,
  selectedRound,
  query,
  fromYear,
  toYear,
  sort,
  direction,
}: {
  selectedYear: number | "all";
  selectedTeam: string;
  selectedRound: number | null;
  query: string;
  fromYear: number | null;
  toYear: number | null;
  sort: DraftSort;
  direction: "asc" | "desc";
}) {
  return (
    <FilterForm key={JSON.stringify([selectedYear, selectedTeam, selectedRound, query, fromYear, toYear])} className="workspace-draft-table-search">
      <input type="hidden" name="view" value="board" />
      <input type="hidden" name="sort" value={sort} />
      <input type="hidden" name="dir" value={direction} />
      <input type="hidden" name="year" value={selectedYear} />
      <input type="hidden" name="team" value={selectedTeam} />
      <input type="hidden" name="round" value={selectedRound ?? ""} />
      <input type="hidden" name="from" value={fromYear ?? ""} />
      <input type="hidden" name="to" value={toYear ?? ""} />
      <label>
        <span className="sr-only">Search Selections</span>
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Player or amateur club…"
        />
      </label>
      <button type="submit">Apply Filters</button>
    </FilterForm>
  );
}

export function DraftBoardTable({
  rows,
  showYear,
  sort,
  direction,
  params,
}: {
  rows: DraftPlayerOutcome[];
  showYear: boolean;
  sort: DraftSort;
  direction: "asc" | "desc";
  params: Record<string, string | number | undefined>;
}) {
  return (
    <TableScroll className="workspace-table-scroll">
      <table className="modern-draft-board workspace-table workspace-table-dense min-w-[930px]">
        <thead>
          <tr>
            <DraftSortHeader label="Pick" sortKey="overall" {...{ sort, direction, params }} />
            <DraftSortHeader label="Player" sortKey="player" align="left" {...{ sort, direction, params }} />
            {showYear ? (
              <DraftSortHeader label="Year" sortKey="year" {...{ sort, direction, params }} />
            ) : null}
            <DraftSortHeader label="Team" sortKey="team" align="left" {...{ sort, direction, params }} />
            <DraftSortHeader label="Round" sortKey="round" {...{ sort, direction, params }} />
            <DraftSortHeader label="Pos" sortKey="position" {...{ sort, direction, params }} />
            <DraftSortHeader label="Country" sortKey="country" {...{ sort, direction, params }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((player) => (
            <tr key={`${player.draftYear}-${player.draftOverallPick}`}>
              <NumberCell value={player.draftOverallPick} />
              <td className="workspace-team-cell">
                <div>
                  {player.nhlPlayerId === null ? (
                    <strong>{player.name}</strong>
                  ) : (
                    <Link href={`/players/${player.nhlPlayerId}`}>{player.name}</Link>
                  )}
                  <small>
                    {[player.amateurClubName, player.amateurLeague]
                      .filter(Boolean)
                      .join(" · ") || "No amateur club recorded"}
                  </small>
                </div>
              </td>
              {showYear ? <NumberCell value={player.draftYear} /> : null}
              <td className="workspace-team-cell">
                <div>
                  <span className="inline-flex items-center gap-2">
                    <TeamLogo abbreviation={player.draftTeamAbbreviation} size="tiny" decorative />
                    {player.draftTeamNhlId === null ? (
                      <strong>{player.draftTeamAbbreviation}</strong>
                    ) : (
                      <Link href={`/teams/${player.draftTeamNhlId}`}>
                        {player.draftTeamAbbreviation}
                      </Link>
                    )}
                  </span>
                  {player.originalPickOwnerAbbreviation !== player.draftTeamAbbreviation ? (
                    <small title={player.pickOwnerHistory}>
                      Pick from {player.originalPickOwnerAbbreviation}
                    </small>
                  ) : null}
                </div>
              </td>
              <NumberCell value={player.draftRound} />
              <NumberCell value={formatPlayerPosition(player.position)} />
              <NumberCell value={player.birthCountry ?? "—"} />
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

export function DraftSortHeader({
  label,
  sortKey,
  align = "center",
  sort,
  direction,
  params,
}: {
  label: string;
  sortKey: DraftSort;
  align?: "left" | "center";
  sort: DraftSort;
  direction: "asc" | "desc";
  params: Record<string, string | number | undefined>;
}) {
  const active = sort === sortKey;
  const nextDirection = active
    ? direction === "asc"
      ? "desc"
      : "asc"
    : sortKey === "year"
      ? "desc"
      : "asc";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  search.set("sort", sortKey);
  search.set("dir", nextDirection);
  search.set("page", "1");
  return (
    <th
      scope="col"
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={align === "left" ? "text-left" : "text-center"}
    >
      <Link
        href={`/drafts?${search.toString()}`}
        className={`workspace-draft-sort-link ${align === "left" ? "justify-start" : "justify-center"}`}
        scroll={false}
      >
        {label}
        <SortIndicator direction={active ? direction : undefined} />
      </Link>
    </th>
  );
}
