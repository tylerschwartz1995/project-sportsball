import Link from "next/link";

import { DirectoryControls } from "@/app/_components/directory-controls";
import { Pagination } from "@/app/_components/pagination";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import {
  WorkspaceMetric,
  WorkspacePageHeader,
} from "@/app/_components/workspace-primitives";
import { parseSeasonId } from "@/contracts/season";
import type { StandingsEntry } from "@/contracts/standings";
import type { TeamSeasonSummary } from "@/contracts/team";
import { listSeasons } from "@/data/seasons";
import { getStandings } from "@/data/standings";
import { listTeamsBySeason } from "@/data/teams";
import {
  applySortDirection,
  firstQueryValue,
  matchesSearch,
  normalizeSearch,
  paginate,
  parsePage,
  parseSortDirection,
} from "@/lib/directory";

export const dynamic = "force-dynamic";

type TeamsPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    q?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
    page?: string | string[];
  }>;
};

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
  const params = await searchParams;
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const [teams, standings] = selectedSeason
    ? await Promise.all([
        listTeamsBySeason(selectedSeason.id),
        getStandings(selectedSeason.id),
      ])
    : [[], []];
  const standingsByTeam = new Map(
    standings.map((entry) => [entry.nhlTeamId, entry]),
  );
  const query = normalizeSearch(firstQueryValue(params.q));
  const requestedSort = firstQueryValue(params.sort);
  const sort = teamSortOptions.some(
    (option) => option.value === requestedSort,
  )
    ? requestedSort!
    : "points";
  const direction = parseSortDirection(
    firstQueryValue(params.dir),
    sort === "name" ? "asc" : "desc",
  );
  const filteredTeams = sortTeams(
    teams.filter((entry) =>
      matchesSearch(query, entry.team.name, entry.team.abbreviation),
    ),
    sort,
    direction,
  );
  const teamPage = paginate(
    filteredTeams,
    parsePage(firstQueryValue(params.page)),
    16,
  );
  const pointsLeader = teams[0];
  const goalsLeader = teams.reduce(
    (best, entry) =>
      !best || entry.stats.goalsFor > best.stats.goalsFor ? entry : best,
    pointsLeader,
  );
  const defenseLeader = teams.reduce(
    (best, entry) =>
      !best || entry.stats.goalsAgainst < best.stats.goalsAgainst
        ? entry
        : best,
    pointsLeader,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="teams" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="Team directory"
          title={`${selectedSeason?.label ?? "No season"} teams`}
          description="Browse every club from the selected season. Team profiles combine results, rosters, advanced analytics, and five-on-five units."
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
            />
          }
        />

        {pointsLeader && selectedSeason ? (
          <>
            <div className="workspace-metric-grid">
              <WorkspaceMetric
                label="Points leader"
                value={pointsLeader.team.name}
                detail={`${pointsLeader.stats.standingsPoints} points`}
                href={`/teams/${pointsLeader.team.nhlTeamId}?season=${selectedSeason.id}`}
              />
              <WorkspaceMetric
                label="Most goals"
                value={goalsLeader.team.name}
                detail={`${goalsLeader.stats.goalsFor} goals`}
                href={`/teams/${goalsLeader.team.nhlTeamId}?season=${selectedSeason.id}`}
              />
              <WorkspaceMetric
                label="Fewest goals allowed"
                value={defenseLeader.team.name}
                detail={`${defenseLeader.stats.goalsAgainst} goals against`}
                href={`/teams/${defenseLeader.team.nhlTeamId}?season=${selectedSeason.id}`}
              />
            </div>

            <DirectoryControls
              action="/teams"
              seasonId={selectedSeason.id}
              query={query}
              sort={sort}
              sortOptions={teamSortOptions}
              direction={direction}
              searchPlaceholder="Team name or abbreviation"
              alwaysShowSort
            />

            <p className="mt-5 text-sm text-slate-500" aria-live="polite">
              {teamPage.totalItems === 0
                ? "No matching teams"
                : `Showing ${teamPage.firstItem}–${teamPage.lastItem} of ${teamPage.totalItems} teams`}
            </p>

            {teamPage.items.length > 0 ? (
              <>
                <div className="workspace-team-grid">
                  {teamPage.items.map((entry) => (
                    <TeamCard
                      key={entry.team.id}
                      entry={entry}
                      seasonId={selectedSeason.id}
                      standings={standingsByTeam.get(entry.team.nhlTeamId)}
                    />
                  ))}
                </div>

                <Pagination
                  path="/teams"
                  currentPage={teamPage.currentPage}
                  totalPages={teamPage.totalPages}
                  params={{
                    season: selectedSeason.id,
                    q: query,
                    sort,
                    dir: direction,
                  }}
                />
              </>
            ) : (
              <EmptyState message="No teams match the current search." />
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

function TeamCard({
  entry,
  seasonId,
  standings,
}: {
  entry: TeamSeasonSummary;
  seasonId: number;
  standings: StandingsEntry | undefined;
}) {
  const overtimeLosses =
    entry.stats.overtimeLosses + entry.stats.shootoutLosses;

  return (
    <article className="workspace-team-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="workspace-team-card-kicker">
            {entry.team.abbreviation}
            {standings?.divisionName ? ` · ${standings.divisionName}` : ""}
          </p>
          <Link
            href={`/teams/${entry.team.nhlTeamId}?season=${seasonId}`}
            className="workspace-team-card-name"
          >
            {entry.team.name}
          </Link>
          <p className="workspace-team-card-rank">
            {standings
              ? `League rank #${standings.leagueRank}`
              : `${entry.stats.gamesPlayed} games`}
          </p>
        </div>
        <div className="text-right">
          <p className="workspace-team-card-points">
            {entry.stats.standingsPoints}
          </p>
          <p className="workspace-team-card-label">
            points
          </p>
        </div>
      </div>
      <dl>
        <CardStat
          label="Record"
          value={`${entry.stats.wins}-${entry.stats.regulationLosses}-${overtimeLosses}`}
        />
        <CardStat label="Goals" value={entry.stats.goalsFor} />
        <CardStat label="Allowed" value={entry.stats.goalsAgainst} />
      </dl>
      <div className="workspace-team-card-footer">
        <span className="workspace-team-card-meta">
          Shot differential{" "}
          {formatSigned(entry.stats.shotsFor - entry.stats.shotsAgainst)}
        </span>
        <span className="workspace-team-card-link">Team profile →</span>
      </div>
    </article>
  );
}

function CardStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <dt className="workspace-team-card-label">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
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
