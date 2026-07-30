import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { parseSeasonId } from "@/contracts/season";
import type { StandingsEntry } from "@/contracts/standings";
import { listSeasons } from "@/data/seasons";
import { getStandings } from "@/data/standings";
import {
  applySortDirection,
  firstQueryValue,
  parseSortDirection,
} from "@/lib/directory";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    season?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const requestedSort = firstQueryValue(params.sort);
  const sort = standingsColumns.some(
    (column) => column.key === requestedSort,
  );
  const activeSort = sort ? requestedSort! : "rank";
  const direction = parseSortDirection(
    firstQueryValue(params.dir),
    activeSort === "rank" || activeSort === "team" ? "asc" : "desc",
  );
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const standings = selectedSeason
    ? await getStandings(selectedSeason.id)
    : [];
  const sortedStandings = sortStandings(standings, activeSort, direction);
  const leader = standings[0];
  const winsLeader = standings.reduce(
    (best, team) => (!best || team.wins > best.wins ? team : best),
    leader,
  );
  const differentialLeader = standings.reduce(
    (best, team) =>
      !best || team.goalDifferential > best.goalDifferential ? team : best,
    leader,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="standings" />

      <section className="py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-cyan-300">
              League standings
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              {selectedSeason
                ? `${selectedSeason.label} NHL season`
                : "No seasons available"}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
              NHL-published final regular-season standings, joined to the team
              identity used during the selected season.
            </p>
          </div>

          <form
            method="get"
            className="flex w-full max-w-sm items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
          >
            <label className="flex-1 text-sm font-medium text-slate-300">
              Season
              <select
                name="season"
                defaultValue={selectedSeason?.id}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-300/60"
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              View
            </button>
          </form>
        </div>

        {leader ? (
          <>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <SummaryCard
                label="Presidents’ Trophy"
                value={leader.teamName}
                detail={`${leader.points} points · ${leader.wins} wins`}
              />
              <SummaryCard
                label="Most wins"
                value={winsLeader.teamName}
                detail={`${winsLeader.wins} wins in ${winsLeader.gamesPlayed} games`}
              />
              <SummaryCard
                label="Best goal differential"
                value={differentialLeader.teamName}
                detail={`${formatDifferential(differentialLeader.goalDifferential)} goals`}
              />
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                      {standingsColumns.map((column) => (
                        <SortableHeader
                          key={column.key}
                          label={column.label}
                          sortKey={column.key}
                          activeSort={activeSort}
                          direction={direction}
                          path="/"
                          params={{ season: selectedSeason.id }}
                          align={column.align}
                          defaultDirection={column.defaultDirection}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStandings.map((team) => (
                      <tr
                        key={team.teamId}
                        className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.035]"
                      >
                        <td className="px-4 py-3 text-center font-mono text-slate-500">
                          {team.leagueRank}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">
                            {team.teamName}
                            {team.clinchIndicator ? (
                              <span className="ml-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase text-cyan-200">
                                {team.clinchIndicator}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {team.teamAbbreviation} · {team.divisionName}
                          </div>
                        </td>
                        <NumericCell value={team.gamesPlayed} />
                        <NumericCell value={team.wins} />
                        <NumericCell value={team.losses} />
                        <NumericCell value={team.overtimeLosses} />
                        <NumericCell value={team.regulationWins} />
                        <NumericCell value={team.goalsFor} />
                        <NumericCell value={team.goalsAgainst} />
                        <NumericCell
                          value={formatDifferential(team.goalDifferential)}
                        />
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-cyan-200">
                          {team.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-white/10 px-4 py-3 text-xs text-slate-500">
                Snapshot: {leader.snapshotDate} · Source: NHL · p Presidents’
                Trophy · z conference · y division · x playoff berth · e
                eliminated
              </div>
            </div>
          </>
        ) : (
          <div className="mt-10 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
            No standings are available for this season.
          </div>
        )}
      </section>
    </main>
  );
}

const standingsColumns: Array<{
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  defaultDirection?: "asc" | "desc";
}> = [
  { key: "rank", label: "Rank", align: "center", defaultDirection: "asc" },
  { key: "team", label: "Team", align: "left", defaultDirection: "asc" },
  { key: "games", label: "GP" },
  { key: "wins", label: "W" },
  { key: "losses", label: "L" },
  { key: "overtimeLosses", label: "OT" },
  { key: "regulationWins", label: "RW" },
  { key: "goalsFor", label: "GF" },
  { key: "goalsAgainst", label: "GA" },
  { key: "goalDifferential", label: "DIFF" },
  { key: "points", label: "PTS" },
];

function sortStandings(
  standings: StandingsEntry[],
  sort: string,
  direction: "asc" | "desc",
): StandingsEntry[] {
  return [...standings].sort((left, right) => {
    let comparison: number;
    switch (sort) {
      case "team":
        comparison = right.teamName.localeCompare(left.teamName);
        break;
      case "games":
        comparison = right.gamesPlayed - left.gamesPlayed;
        break;
      case "wins":
        comparison = right.wins - left.wins;
        break;
      case "losses":
        comparison = right.losses - left.losses;
        break;
      case "overtimeLosses":
        comparison = right.overtimeLosses - left.overtimeLosses;
        break;
      case "regulationWins":
        comparison = right.regulationWins - left.regulationWins;
        break;
      case "goalsFor":
        comparison = right.goalsFor - left.goalsFor;
        break;
      case "goalsAgainst":
        comparison = right.goalsAgainst - left.goalsAgainst;
        break;
      case "goalDifferential":
        comparison = right.goalDifferential - left.goalDifferential;
        break;
      case "points":
        comparison = right.points - left.points;
        break;
      default:
        comparison = right.leagueRank - left.leagueRank;
    }
    if (comparison === 0) {
      comparison = right.teamName.localeCompare(left.teamName);
    }
    return applySortDirection(comparison, direction);
  });
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

function NumericCell({ value }: { value: number | string }) {
  return (
    <td className="px-3 py-3 text-right tabular-nums text-slate-300">
      {value}
    </td>
  );
}

function formatDifferential(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
