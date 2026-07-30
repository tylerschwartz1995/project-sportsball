import Link from "next/link";

import { DirectoryControls } from "@/app/_components/directory-controls";
import { Pagination } from "@/app/_components/pagination";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { parseSeasonId } from "@/contracts/season";
import type { TeamSeasonSummary } from "@/contracts/team";
import { listSeasons } from "@/data/seasons";
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
  const requestedSeason = firstQueryValue(params.season);
  const parsedSeason = parseSeasonId(requestedSeason);
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const teams = selectedSeason
    ? await listTeamsBySeason(selectedSeason.id)
    : [];
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
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-cyan-300">
              Team statistics
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              {selectedSeason?.label ?? "No season"} teams
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
              Polars-derived regular-season records, scoring, and shot totals.
              Open a team for playoff results and its official player splits.
            </p>
          </div>
          <SeasonPicker
            seasons={seasons}
            selectedSeasonId={selectedSeason?.id}
          />
        </div>

        {pointsLeader ? (
          <>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <SummaryCard
                label="Points leader"
                value={pointsLeader.team.name}
                detail={`${pointsLeader.stats.standingsPoints} points`}
              />
              <SummaryCard
                label="Most goals"
                value={goalsLeader.team.name}
                detail={`${goalsLeader.stats.goalsFor} goals`}
              />
              <SummaryCard
                label="Fewest goals allowed"
                value={defenseLeader.team.name}
                detail={`${defenseLeader.stats.goalsAgainst} goals against`}
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
            />

            <p className="mt-5 text-sm text-slate-500" aria-live="polite">
              {teamPage.totalItems === 0
                ? "No matching teams"
                : `Showing ${teamPage.firstItem}–${teamPage.lastItem} of ${teamPage.totalItems} teams`}
            </p>

            {teamPage.items.length > 0 ? (
              <>
                <div className="mt-4 grid gap-3 md:hidden">
                  {teamPage.items.map((entry) => (
                    <MobileTeamCard
                      key={entry.team.id}
                      entry={entry}
                      seasonId={selectedSeason.id}
                    />
                  ))}
                </div>

                <div className="mt-4 hidden overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 md:block">
              <SortableTable
                defaultSortKey={sort}
                defaultDirection={direction}
              >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                      <SortableHeader
                        label="Team"
                        sortKey="name"
                        align="left"
                        defaultDirection="asc"
                      />
                      {teamTableColumns.map((column) => (
                        <SortableHeader
                          key={column.key}
                          label={column.label}
                          sortKey={column.key}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teamPage.items.map((entry) => (
                      <tr
                        key={entry.team.id}
                        className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.035]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/teams/${entry.team.nhlTeamId}?season=${selectedSeason.id}`}
                            className="font-medium text-white transition hover:text-cyan-200"
                          >
                            {entry.team.name}
                          </Link>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {entry.team.abbreviation}
                          </div>
                        </td>
                        <NumericCell value={entry.stats.gamesPlayed} />
                        <NumericCell value={entry.stats.wins} />
                        <NumericCell value={entry.stats.regulationLosses} />
                        <NumericCell
                          value={
                            entry.stats.overtimeLosses +
                            entry.stats.shootoutLosses
                          }
                        />
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-cyan-200">
                          {entry.stats.standingsPoints}
                        </td>
                        <NumericCell value={entry.stats.goalsFor} />
                        <NumericCell value={entry.stats.goalsAgainst} />
                        <NumericCell value={entry.stats.shotsFor} />
                        <NumericCell value={entry.stats.shotsAgainst} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </SortableTable>
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

const teamTableColumns = [
  { key: "games", label: "GP" },
  { key: "wins", label: "W" },
  { key: "losses", label: "L" },
  { key: "overtimeLosses", label: "OTL" },
  { key: "points", label: "PTS" },
  { key: "goalsFor", label: "GF" },
  { key: "goalsAgainst", label: "GA" },
  { key: "shotsFor", label: "SF" },
  { key: "shotsAgainst", label: "SA" },
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

function MobileTeamCard({
  entry,
  seasonId,
}: {
  entry: TeamSeasonSummary;
  seasonId: number;
}) {
  const overtimeLosses =
    entry.stats.overtimeLosses + entry.stats.shootoutLosses;

  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/teams/${entry.team.nhlTeamId}?season=${seasonId}`}
            className="font-semibold text-white transition hover:text-cyan-200"
          >
            {entry.team.name}
          </Link>
          <p className="mt-1 text-xs text-slate-500">
            {entry.team.abbreviation} · {entry.stats.gamesPlayed} games
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums text-cyan-200">
            {entry.stats.standingsPoints}
          </p>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-600">
            points
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4 text-sm">
        <MobileStat
          label="Record"
          value={`${entry.stats.wins}-${entry.stats.regulationLosses}-${overtimeLosses}`}
        />
        <MobileStat label="Goals" value={entry.stats.goalsFor} />
        <MobileStat label="Allowed" value={entry.stats.goalsAgainst} />
      </dl>
    </article>
  );
}

function MobileStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.1em] text-slate-600">
        {label}
      </dt>
      <dd className="mt-1 font-medium tabular-nums text-slate-200">{value}</dd>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </article>
  );
}

function NumericCell({ value }: { value: number }) {
  return (
    <td className="px-3 py-3 text-right tabular-nums text-slate-300">
      {value}
    </td>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-10 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
      {message}
    </div>
  );
}
