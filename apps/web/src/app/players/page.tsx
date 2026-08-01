import Link from "next/link";

import { Pagination } from "@/app/_components/pagination";
import { PlayerDirectoryFilters } from "@/app/_components/player-directory-filters";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SeasonPhaseFilter } from "@/app/_components/season-phase-filter";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogoStack } from "@/app/_components/team-logo";
import {
  WorkspacePageHeader,
} from "@/app/_components/workspace-primitives";
import type {
  GoalieSeasonSummary,
  SkaterSeasonSummary,
} from "@/contracts/player";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase,
  seasonPhaseLabel,
} from "@/contracts/season-phase";
import { listPlayersBySeason } from "@/data/players";
import { listSeasons } from "@/data/seasons";
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

type PlayersPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    q?: string | string[];
    type?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
    page?: string | string[];
    phase?: string | string[];
    minGames?: string | string[];
    minGoals?: string | string[];
    minAssists?: string | string[];
    minPoints?: string | string[];
    minWins?: string | string[];
    minSavePercentage?: string | string[];
    country?: string | string[];
    region?: string | string[];
    city?: string | string[];
  }>;
};

export default async function PlayersPage({ searchParams }: PlayersPageProps) {
  const params = await searchParams;
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const phase = parseSeasonPhase(firstQueryValue(params.phase));
  const players = selectedSeason
    ? await listPlayersBySeason(
        selectedSeason.id,
        gameTypeForPhase(phase),
      )
    : { seasonId: 0, skaters: [], goalies: [] };
  const query = normalizeSearch(firstQueryValue(params.q));
  const category =
    firstQueryValue(params.type) === "goalies" ? "goalies" : "skaters";
  const sortOptions =
    category === "goalies" ? goalieSortOptions : skaterSortOptions;
  const requestedSort = firstQueryValue(params.sort);
  const sort = sortOptions.some((option) => option.value === requestedSort)
    ? requestedSort!
    : category === "goalies"
      ? "savePercentage"
      : "points";
  const direction = parseSortDirection(
    firstQueryValue(params.dir),
    sort === "name" ? "asc" : "desc",
  );
  const requestedPage = parsePage(firstQueryValue(params.page));
  const filters = {
    minGames: firstQueryValue(params.minGames) ?? "",
    minGoals: firstQueryValue(params.minGoals) ?? "",
    minAssists: firstQueryValue(params.minAssists) ?? "",
    minPoints: firstQueryValue(params.minPoints) ?? "",
    minWins: firstQueryValue(params.minWins) ?? "",
    minSavePercentage: firstQueryValue(params.minSavePercentage) ?? "",
    country: firstQueryValue(params.country) ?? "",
    region: firstQueryValue(params.region) ?? "",
    city: firstQueryValue(params.city) ?? "",
  };
  const minGames = parseMinimum(filters.minGames);
  const minGoals = parseMinimum(filters.minGoals);
  const minAssists = parseMinimum(filters.minAssists);
  const minPoints = parseMinimum(filters.minPoints);
  const minWins = parseMinimum(filters.minWins);
  const minSavePercentage = parseMinimum(filters.minSavePercentage);
  const allPlayers =
    category === "skaters" ? players.skaters : players.goalies;
  const locations = uniqueLocations(
    allPlayers.map((player) => ({
      country: player.birthCountry,
      region: player.birthStateProvince,
      city: player.birthCity,
    })),
  );
  const skaterPage = paginate(
    sortSkaters(
      players.skaters.filter(
        (player) =>
          matchesSearch(query, player.name, player.position) &&
          matchesBirthplace(player, filters) &&
          player.gamesPlayed >= minGames &&
          player.goals >= minGoals &&
          player.assists >= minAssists &&
          player.points >= minPoints,
      ),
      sort,
      direction,
    ),
    requestedPage,
    50,
  );
  const goaliePage = paginate(
    sortGoalies(
      players.goalies.filter(
        (player) =>
          matchesSearch(query, player.name, player.position) &&
          matchesBirthplace(player, filters) &&
          player.gamesPlayed >= minGames &&
          player.wins >= minWins &&
          (player.savePercentage ?? 0) >= minSavePercentage,
      ),
      sort,
      direction,
    ),
    requestedPage,
    50,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="players" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="Player statistics"
          title={`${selectedSeason?.label ?? "No Season"} Players`}
          description={`Complete Polars-derived ${seasonPhaseLabel(phase).toLowerCase()} totals for every participating skater and goalie. Traded-player rows combine all teams.`}
          action={
            <div className="workspace-page-actions">
              {selectedSeason ? (
                <Link
                  href={`/players/compare?season=${selectedSeason.id}&phase=${phase}&type=${category}`}
                  className="workspace-secondary-action"
                >
                  Compare Players
                </Link>
              ) : null}
              <SeasonPicker
                seasons={seasons}
                selectedSeasonId={selectedSeason?.id}
                params={{ phase }}
              />
            </div>
          }
        />

        {selectedSeason ? (
          <>
            <SeasonPhaseFilter
              active={phase}
              path="/players"
              params={{ season: selectedSeason.id, type: category }}
            />
            <PlayerDirectoryFilters
              seasonId={selectedSeason.id}
              phase={phase}
              category={category}
              query={query}
              sort={sort}
              sortOptions={sortOptions}
              direction={direction}
              locations={locations}
              filters={filters}
            />

            {category === "skaters" ? (
              <>
                <PlayerSectionHeader
                  title="Skaters"
                  count={skaterPage.totalItems}
                  description="Combined totals across all teams played for."
                />
                {skaterPage.items.length > 0 ? (
                  <>
                    <div className="mt-5 grid gap-3 md:hidden">
                      {skaterPage.items.map((player) => (
                        <MobileSkaterCard
                          key={player.nhlPlayerId}
                          player={player}
                          seasonId={selectedSeason.id}
                          phase={phase}
                        />
                      ))}
                    </div>
                    <div className="mt-5 hidden overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 md:block">
                      <SortableTable
                        defaultSortKey={sort}
                        defaultDirection={direction}
                      >
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[880px] text-sm">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                              <SortableHeader
                                label="Player"
                                sortKey="name"
                                align="left"
                                defaultDirection="asc"
                              />
                              {skaterTableColumns.map((column) => (
                                <SortableHeader
                                  key={column.key}
                                  label={column.label}
                                  sortKey={column.key}
                                />
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {skaterPage.items.map((player) => (
                              <tr
                                key={player.nhlPlayerId}
                                className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.035]"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <TeamLogoStack
                                      teams={player.teams}
                                      size="compact"
                                      prominent
                                    />
                                    <div>
                                      <PlayerLink
                                        playerId={player.nhlPlayerId}
                                        seasonId={selectedSeason.id}
                                        name={player.name}
                                        phase={phase}
                                      />
                                      <span className="ml-2 text-xs text-slate-500">
                                        {player.position}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <NumericCell value={player.gamesPlayed} />
                                <NumericCell value={player.goals} />
                                <NumericCell value={player.assists} />
                                <NumericCell value={player.points} highlight />
                                <NumericCell
                                  value={formatSigned(player.plusMinus)}
                                />
                                <NumericCell value={player.penaltyMinutes} />
                                <NumericCell value={player.shotsOnGoal} />
                                <NumericCell value={player.teamsPlayedFor} />
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      </SortableTable>
                    </div>
                    <Pagination
                      path="/players"
                      currentPage={skaterPage.currentPage}
                      totalPages={skaterPage.totalPages}
                      params={{
                        season: selectedSeason.id,
                        q: query,
                        type: category,
                        sort,
                        dir: direction,
                        phase,
                        ...filters,
                      }}
                    />
                  </>
                ) : (
                  <DirectoryEmptyState />
                )}
              </>
            ) : (
              <>
                <PlayerSectionHeader
                  title="Goalies"
                  count={goaliePage.totalItems}
                  description="Participating goalies only; dressed backups are excluded."
                />
                {goaliePage.items.length > 0 ? (
                  <>
                    <div className="mt-5 grid gap-3 md:hidden">
                      {goaliePage.items.map((player) => (
                        <MobileGoalieCard
                          key={player.nhlPlayerId}
                          player={player}
                          seasonId={selectedSeason.id}
                          phase={phase}
                        />
                      ))}
                    </div>
                    <div className="mt-5 hidden overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 md:block">
                      <SortableTable
                        defaultSortKey={sort}
                        defaultDirection={direction}
                      >
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[880px] text-sm">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                              <SortableHeader
                                label="Goalie"
                                sortKey="name"
                                align="left"
                                defaultDirection="asc"
                              />
                              {goalieTableColumns.map((column) => (
                                <SortableHeader
                                  key={column.key}
                                  label={column.label}
                                  sortKey={column.key}
                                />
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {goaliePage.items.map((player) => (
                              <tr
                                key={player.nhlPlayerId}
                                className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.035]"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <TeamLogoStack
                                      teams={player.teams}
                                      size="compact"
                                      prominent
                                    />
                                    <PlayerLink
                                      playerId={player.nhlPlayerId}
                                      seasonId={selectedSeason.id}
                                      name={player.name}
                                      phase={phase}
                                    />
                                  </div>
                                </td>
                                <NumericCell value={player.gamesPlayed} />
                                <NumericCell value={player.gamesStarted} />
                                <NumericCell value={player.wins} />
                                <NumericCell value={player.losses} />
                                <NumericCell value={player.overtimeLosses} />
                                <NumericCell value={player.goalsAgainst} />
                                <NumericCell value={player.saves} />
                                <NumericCell
                                  value={formatSavePercentage(
                                    player.savePercentage,
                                  )}
                                  highlight
                                />
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      </SortableTable>
                    </div>
                    <Pagination
                      path="/players"
                      currentPage={goaliePage.currentPage}
                      totalPages={goaliePage.totalPages}
                      params={{
                        season: selectedSeason.id,
                        q: query,
                        type: category,
                        sort,
                        dir: direction,
                        phase,
                        ...filters,
                      }}
                    />
                  </>
                ) : (
                  <DirectoryEmptyState />
                )}
              </>
            )}
          </>
        ) : (
          <div className="mt-10 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
            No player statistics are available for this season.
          </div>
        )}
      </section>
    </main>
  );
}

const skaterSortOptions = [
  { value: "points", label: "Points" },
  { value: "goals", label: "Goals" },
  { value: "assists", label: "Assists" },
  { value: "games", label: "Games played" },
  { value: "plusMinus", label: "Plus/minus" },
  { value: "penaltyMinutes", label: "Penalty minutes" },
  { value: "shotsOnGoal", label: "Shots" },
  { value: "teamsPlayedFor", label: "Teams played for" },
  { value: "name", label: "Player name" },
];

const goalieSortOptions = [
  { value: "savePercentage", label: "Save percentage" },
  { value: "wins", label: "Wins" },
  { value: "games", label: "Games played" },
  { value: "gamesStarted", label: "Games started" },
  { value: "losses", label: "Losses" },
  { value: "overtimeLosses", label: "Overtime losses" },
  { value: "goalsAgainst", label: "Goals against" },
  { value: "saves", label: "Saves" },
  { value: "name", label: "Player name" },
];

const skaterTableColumns = [
  { key: "games", label: "GP" },
  { key: "goals", label: "G" },
  { key: "assists", label: "A" },
  { key: "points", label: "PTS" },
  { key: "plusMinus", label: "+/-" },
  { key: "penaltyMinutes", label: "PIM" },
  { key: "shotsOnGoal", label: "S" },
  { key: "teamsPlayedFor", label: "Teams" },
];

const goalieTableColumns = [
  { key: "games", label: "GP" },
  { key: "gamesStarted", label: "GS" },
  { key: "wins", label: "W" },
  { key: "losses", label: "L" },
  { key: "overtimeLosses", label: "OTL" },
  { key: "goalsAgainst", label: "GA" },
  { key: "saves", label: "SV" },
  { key: "savePercentage", label: "SV%" },
];

function sortSkaters(
  players: SkaterSeasonSummary[],
  sort: string,
  direction: "asc" | "desc",
): SkaterSeasonSummary[] {
  return [...players].sort((left, right) => {
    let comparison: number;
    switch (sort) {
      case "goals":
        comparison = right.goals - left.goals || right.points - left.points;
        break;
      case "assists":
        comparison =
          right.assists - left.assists || right.points - left.points;
        break;
      case "games":
        comparison =
          right.gamesPlayed - left.gamesPlayed || right.points - left.points;
        break;
      case "plusMinus":
        comparison = right.plusMinus - left.plusMinus || right.points - left.points;
        break;
      case "penaltyMinutes":
        comparison =
          right.penaltyMinutes - left.penaltyMinutes ||
          right.points - left.points;
        break;
      case "shotsOnGoal":
        comparison =
          right.shotsOnGoal - left.shotsOnGoal || right.points - left.points;
        break;
      case "teamsPlayedFor":
        comparison =
          right.teamsPlayedFor - left.teamsPlayedFor ||
          right.points - left.points;
        break;
      case "name":
        comparison = right.name.localeCompare(left.name);
        break;
      default:
        comparison =
          right.points - left.points ||
          right.goals - left.goals ||
          left.name.localeCompare(right.name);
    }
    return applySortDirection(comparison, direction);
  });
}

function sortGoalies(
  players: GoalieSeasonSummary[],
  sort: string,
  direction: "asc" | "desc",
): GoalieSeasonSummary[] {
  return [...players].sort((left, right) => {
    let comparison: number;
    switch (sort) {
      case "wins":
        comparison =
          right.wins - left.wins || right.gamesPlayed - left.gamesPlayed;
        break;
      case "games":
        comparison =
          right.gamesPlayed - left.gamesPlayed || right.wins - left.wins;
        break;
      case "gamesStarted":
        comparison =
          right.gamesStarted - left.gamesStarted ||
          right.gamesPlayed - left.gamesPlayed;
        break;
      case "losses":
        comparison =
          right.losses - left.losses || right.gamesPlayed - left.gamesPlayed;
        break;
      case "overtimeLosses":
        comparison =
          right.overtimeLosses - left.overtimeLosses ||
          right.gamesPlayed - left.gamesPlayed;
        break;
      case "goalsAgainst":
        comparison =
          right.goalsAgainst - left.goalsAgainst ||
          right.gamesPlayed - left.gamesPlayed;
        break;
      case "saves":
        comparison =
          right.saves - left.saves || right.gamesPlayed - left.gamesPlayed;
        break;
      case "name":
        comparison = right.name.localeCompare(left.name);
        break;
      default:
        comparison =
          (right.savePercentage ?? -1) - (left.savePercentage ?? -1) ||
          right.gamesPlayed - left.gamesPlayed ||
          left.name.localeCompare(right.name);
    }
    return applySortDirection(comparison, direction);
  });
}

function MobileSkaterCard({
  player,
  seasonId,
  phase,
}: {
  player: SkaterSeasonSummary;
  seasonId: number;
  phase: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <TeamLogoStack teams={player.teams} size="compact" prominent />
          <div>
            <PlayerLink
              playerId={player.nhlPlayerId}
              seasonId={seasonId}
              name={player.name}
              phase={phase}
            />
            <p className="mt-1 text-xs text-slate-500">
              {player.position ?? "Skater"} · {player.gamesPlayed} games
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums text-cyan-200">
            {player.points}
          </p>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-600">
            points
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-4 gap-3 border-t border-white/[0.06] pt-4">
        <MobilePlayerStat label="Goals" value={player.goals} />
        <MobilePlayerStat label="Assists" value={player.assists} />
        <MobilePlayerStat label="+/-" value={formatSigned(player.plusMinus)} />
        <MobilePlayerStat label="Shots" value={player.shotsOnGoal} />
      </dl>
    </article>
  );
}

function MobileGoalieCard({
  player,
  seasonId,
  phase,
}: {
  player: GoalieSeasonSummary;
  seasonId: number;
  phase: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <TeamLogoStack teams={player.teams} size="compact" prominent />
          <div>
            <PlayerLink
              playerId={player.nhlPlayerId}
              seasonId={seasonId}
              name={player.name}
              phase={phase}
            />
            <p className="mt-1 text-xs text-slate-500">
              {player.gamesPlayed} games · {player.gamesStarted} starts
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums text-cyan-200">
            {formatSavePercentage(player.savePercentage)}
          </p>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-600">
            save %
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-4 gap-3 border-t border-white/[0.06] pt-4">
        <MobilePlayerStat label="Wins" value={player.wins} />
        <MobilePlayerStat label="Losses" value={player.losses} />
        <MobilePlayerStat label="OTL" value={player.overtimeLosses} />
        <MobilePlayerStat label="Saves" value={player.saves} />
      </dl>
    </article>
  );
}

function MobilePlayerStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <dt className="text-[0.65rem] uppercase tracking-[0.1em] text-slate-600">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium tabular-nums text-slate-200">
        {value}
      </dd>
    </div>
  );
}

function DirectoryEmptyState() {
  return (
    <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
      No players match the current search.
    </div>
  );
}

function PlayerSectionHeader({
  title,
  count,
  description,
}: {
  title: string;
  count: number;
  description: string;
}) {
  return (
    <div className="mt-12 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="text-2xl font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <p className="text-sm text-slate-500">
        {count} {count === 1 ? "player" : "players"}
      </p>
    </div>
  );
}

function PlayerLink({
  playerId,
  seasonId,
  name,
  phase,
}: {
  playerId: number;
  seasonId: number | undefined;
  name: string;
  phase?: string;
}) {
  return (
    <Link
      href={`/players/${playerId}${seasonId ? `?season=${seasonId}${phase ? `&phase=${phase}` : ""}` : ""}`}
      className="font-medium text-white transition hover:text-cyan-200"
    >
      {name}
    </Link>
  );
}

function NumericCell({
  value,
  highlight = false,
}: {
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <td
      className={`px-3 py-3 text-right tabular-nums ${
        highlight ? "font-semibold text-cyan-200" : "text-slate-300"
      }`}
    >
      {value}
    </td>
  );
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

function parseMinimum(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function uniqueLocations(
  values: Array<{
    country: string | null;
    region: string | null;
    city: string | null;
  }>,
) {
  const locations = new Map<
    string,
    { country: string; region: string | null; city: string | null }
  >();
  for (const value of values) {
    if (!value.country) continue;
    const key = `${value.country}|${value.region ?? ""}|${value.city ?? ""}`;
    locations.set(key, {
      country: value.country,
      region: value.region,
      city: value.city,
    });
  }
  return [...locations.values()].sort(
    (left, right) =>
      left.country.localeCompare(right.country) ||
      (left.region ?? "").localeCompare(right.region ?? "") ||
      (left.city ?? "").localeCompare(right.city ?? ""),
  );
}

function matchesBirthplace(
  player: {
    birthCountry: string | null;
    birthStateProvince: string | null;
    birthCity: string | null;
  },
  filters: {
    country: string;
    region: string;
    city: string;
  },
): boolean {
  return (
    (!filters.country || player.birthCountry === filters.country) &&
    (!filters.region || player.birthStateProvince === filters.region) &&
    (!filters.city || player.birthCity === filters.city)
  );
}
