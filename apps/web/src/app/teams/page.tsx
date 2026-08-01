import Link from "next/link";

import { DirectoryControls } from "@/app/_components/directory-controls";
import { Pagination } from "@/app/_components/pagination";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SeasonPhaseFilter } from "@/app/_components/season-phase-filter";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogo } from "@/app/_components/team-logo";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase,
  seasonPhaseLabel,
} from "@/contracts/season-phase";
import type { StandingsEntry } from "@/contracts/standings";
import type { TeamSeasonSummary } from "@/contracts/team";
import { listSeasons } from "@/data/seasons";
import { getStandings } from "@/data/standings";
import { listTeamsBySeason } from "@/data/teams";
import {
  applySortDirection,
  firstQueryValue,
  paginate,
  parsePage,
  parseSortDirection,
} from "@/lib/directory";

export const dynamic = "force-dynamic";

type TeamsPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
    page?: string | string[];
    phase?: string | string[];
  }>;
};

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
  const params = await searchParams;
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const phase = parseSeasonPhase(firstQueryValue(params.phase));
  const gameType = gameTypeForPhase(phase);
  const [teams, standings] = selectedSeason
    ? await Promise.all([
        listTeamsBySeason(selectedSeason.id, gameType),
        getStandings(selectedSeason.id),
      ])
    : [[], []];
  const standingsByTeam = new Map(
    standings.map((entry) => [entry.nhlTeamId, entry]),
  );
  const requestedSort = firstQueryValue(params.sort);
  const sort = teamSortOptions.some(
    (option) => option.value === requestedSort,
  )
    ? requestedSort!
    : phase === "playoffs"
      ? "wins"
      : "points";
  const direction = parseSortDirection(
    firstQueryValue(params.dir),
    sort === "name" ? "asc" : "desc",
  );
  const filteredTeams = sortTeams(teams, sort, direction);
  const teamPage = paginate(
    filteredTeams,
    parsePage(firstQueryValue(params.page)),
    40,
  );
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="teams" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="Team directory"
          title={`${selectedSeason?.label ?? "No Season"} Teams`}
          description={`Compare every club's ${seasonPhaseLabel(phase).toLowerCase()} results, scoring, and shot totals. Select a team for its full profile.`}
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
              params={{ phase }}
            />
          }
        />

        {selectedSeason ? (
          <>
            <SeasonPhaseFilter
              active={phase}
              path="/teams"
              params={{ season: selectedSeason.id }}
            />

            <DirectoryControls
              action="/teams"
              seasonId={selectedSeason.id}
              sort={sort}
              sortOptions={teamSortOptions}
              direction={direction}
              showSearch={false}
              alwaysShowSort
              phase={phase}
            />

            <p className="mt-5 text-sm text-slate-500" aria-live="polite">
              {teamPage.totalItems === 0
                ? "No matching teams"
                : `Showing ${teamPage.firstItem}–${teamPage.lastItem} of ${teamPage.totalItems} teams`}
            </p>

            {teamPage.items.length > 0 ? (
              <>
                <WorkspacePanel
                  className="mt-5"
                  title={`${seasonPhaseLabel(phase)} Comparison`}
                  description="Select any heading to sort."
                >
                  <SortableTable
                    defaultSortKey={sort}
                    defaultDirection={direction}
                  >
                    <div className="workspace-table-scroll">
                      <table className="workspace-table min-w-[850px]">
                        <thead>
                          <tr>
                            <SortableHeader
                              label="Team"
                              sortKey="name"
                              align="left"
                              defaultDirection="asc"
                            />
                            <SortableHeader
                              label="Div"
                              sortKey="division"
                              align="left"
                              defaultDirection="asc"
                            />
                            <SortableHeader label="GP" sortKey="games" />
                            <SortableHeader label="W" sortKey="wins" />
                            <SortableHeader label="L" sortKey="losses" />
                            {phase === "regular" ? (
                              <>
                                <SortableHeader
                                  label="OTL"
                                  sortKey="overtimeLosses"
                                />
                                <SortableHeader
                                  label="PTS"
                                  sortKey="points"
                                />
                              </>
                            ) : null}
                            <SortableHeader label="GF" sortKey="goalsFor" />
                            <SortableHeader
                              label="GA"
                              sortKey="goalsAgainst"
                              defaultDirection="asc"
                            />
                            <SortableHeader
                              label="DIFF"
                              sortKey="goalDifferential"
                            />
                            <SortableHeader
                              label="SHOT DIFF"
                              sortKey="shotDifferential"
                            />
                          </tr>
                        </thead>
                        <tbody>
                          {teamPage.items.map((entry) => (
                            <TeamRow
                              key={entry.team.id}
                              entry={entry}
                              seasonId={selectedSeason.id}
                              phase={phase}
                              standings={standingsByTeam.get(
                                entry.team.nhlTeamId,
                              )}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="workspace-table-note">
                      {phase === "playoffs"
                        ? "Only teams that participated in the playoffs are shown. Points and overtime-loss points do not apply."
                        : "Official NHL regular-season totals. Division labels come from the final standings snapshot."}
                    </div>
                  </SortableTable>
                </WorkspacePanel>

                <Pagination
                  path="/teams"
                  currentPage={teamPage.currentPage}
                  totalPages={teamPage.totalPages}
                  params={{
                    season: selectedSeason.id,
                    sort,
                    dir: direction,
                    phase,
                  }}
                />
              </>
            ) : (
              <EmptyState message="No team statistics are available for this season." />
            )}
          </>
        ) : (
          <EmptyState message="No team statistics are available for this season." />
        )}
      </section>
    </main>
  );
}

const teamSortOptions = [
  { value: "points", label: "Points" },
  { value: "wins", label: "Wins" },
  { value: "losses", label: "Losses" },
  { value: "overtimeLosses", label: "Overtime losses" },
  { value: "games", label: "Games played" },
  { value: "goalsFor", label: "Goals scored" },
  { value: "goalsAgainst", label: "Goals allowed" },
  { value: "shotsFor", label: "Shots for" },
  { value: "shotsAgainst", label: "Shots against" },
  { value: "goalDifferential", label: "Goal differential" },
  { value: "shotDifferential", label: "Shot differential" },
  { value: "name", label: "Team name" },
];

function sortTeams(
  teams: TeamSeasonSummary[],
  sort: string,
  direction: "asc" | "desc",
): TeamSeasonSummary[] {
  return [...teams].sort((left, right) => {
    let comparison: number;
    switch (sort) {
      case "wins":
        comparison =
          right.stats.wins - left.stats.wins ||
          right.stats.standingsPoints - left.stats.standingsPoints ||
          left.team.name.localeCompare(right.team.name);
        break;
      case "losses":
        comparison =
          right.stats.regulationLosses - left.stats.regulationLosses ||
          left.team.name.localeCompare(right.team.name);
        break;
      case "overtimeLosses":
        comparison =
          right.stats.overtimeLosses +
            right.stats.shootoutLosses -
            (left.stats.overtimeLosses + left.stats.shootoutLosses) ||
          left.team.name.localeCompare(right.team.name);
        break;
      case "games":
        comparison =
          right.stats.gamesPlayed - left.stats.gamesPlayed ||
          left.team.name.localeCompare(right.team.name);
        break;
      case "goalsFor":
        comparison =
          right.stats.goalsFor - left.stats.goalsFor ||
          left.team.name.localeCompare(right.team.name);
        break;
      case "goalsAgainst":
        comparison =
          right.stats.goalsAgainst - left.stats.goalsAgainst ||
          left.team.name.localeCompare(right.team.name);
        break;
      case "shotsFor":
        comparison =
          right.stats.shotsFor - left.stats.shotsFor ||
          left.team.name.localeCompare(right.team.name);
        break;
      case "shotsAgainst":
        comparison =
          right.stats.shotsAgainst - left.stats.shotsAgainst ||
          left.team.name.localeCompare(right.team.name);
        break;
      case "goalDifferential":
        comparison =
          right.stats.goalsFor -
            right.stats.goalsAgainst -
            (left.stats.goalsFor - left.stats.goalsAgainst) ||
          left.team.name.localeCompare(right.team.name);
        break;
      case "shotDifferential":
        comparison =
          right.stats.shotsFor -
            right.stats.shotsAgainst -
            (left.stats.shotsFor - left.stats.shotsAgainst) ||
          left.team.name.localeCompare(right.team.name);
        break;
      case "name":
        comparison = right.team.name.localeCompare(left.team.name);
        break;
      default:
        comparison =
          right.stats.standingsPoints - left.stats.standingsPoints ||
          right.stats.wins - left.stats.wins ||
          left.team.name.localeCompare(right.team.name);
    }
    return applySortDirection(comparison, direction);
  });
}

function TeamRow({
  entry,
  seasonId,
  phase,
  standings,
}: {
  entry: TeamSeasonSummary;
  seasonId: number;
  phase: "regular" | "playoffs";
  standings: StandingsEntry | undefined;
}) {
  const overtimeLosses =
    entry.stats.overtimeLosses + entry.stats.shootoutLosses;
  const losses =
    entry.stats.regulationLosses +
    entry.stats.overtimeLosses +
    entry.stats.shootoutLosses;

  return (
    <tr>
      <td className="workspace-team-cell workspace-sticky-team-cell">
        <Link
          href={`/teams/${entry.team.nhlTeamId}?season=${seasonId}&phase=${phase}`}
        >
          <TeamLogo
            name={entry.team.name}
            abbreviation={entry.team.abbreviation}
            nhlTeamId={entry.team.nhlTeamId}
            size="compact"
          />
          <span>
            {entry.team.name}
          </span>
          <small>{entry.team.abbreviation}</small>
        </Link>
      </td>
      <td className="px-3 py-3 text-left text-slate-400">
        {standings?.divisionName ?? "—"}
      </td>
      <NumericCell value={entry.stats.gamesPlayed} />
      <NumericCell value={entry.stats.wins} />
      <NumericCell value={losses} />
      {phase === "regular" ? (
        <>
          <NumericCell value={overtimeLosses} />
          <td className="workspace-points-cell">
            {entry.stats.standingsPoints}
          </td>
        </>
      ) : null}
      <NumericCell value={entry.stats.goalsFor} />
      <NumericCell value={entry.stats.goalsAgainst} />
      <NumericCell
        value={formatSigned(
          entry.stats.goalsFor - entry.stats.goalsAgainst,
        )}
      />
      <NumericCell
        value={formatSigned(
          entry.stats.shotsFor - entry.stats.shotsAgainst,
        )}
      />
    </tr>
  );
}

function NumericCell({ value }: { value: number | string }) {
  return <td className="workspace-number-cell">{value}</td>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-10 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
      {message}
    </div>
  );
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
