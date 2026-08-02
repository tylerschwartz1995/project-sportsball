import Link from "next/link";

import { PlayerDirectComparisonChart } from "@/app/_components/player-direct-comparison-chart";
import { PlayerComparisonPicker } from "@/app/_components/player-comparison-picker";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SeasonPhaseFilter } from "@/app/_components/season-phase-filter";
import { SiteHeader } from "@/app/_components/site-header";
import { TeamLogoStack } from "@/app/_components/team-logo";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
import type { MoneyPuckPlayerSeason } from "@/contracts/advanced";
import type {
  PlayerComparisonEntry,
  PlayerComparisonMetric,
} from "@/contracts/player-comparison-view";
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
import { getMoneyPuckPlayerSeason } from "@/data/advanced";
import { listPlayersBySeason } from "@/data/players";
import { listSeasons } from "@/data/seasons";
import { firstQueryValue } from "@/lib/directory";
import { formatComparisonValue } from "@/lib/player-comparison";
import { formatPlayerPosition } from "@/lib/player-position";

export const dynamic = "force-dynamic";

type PlayerCategory = "skaters" | "goalies";

type PlayerComparePageProps = {
  searchParams: Promise<{
    season?: string | string[];
    phase?: string | string[];
    type?: string | string[];
    players?: string | string[];
  }>;
};

export default async function PlayerComparePage({
  searchParams,
}: PlayerComparePageProps) {
  const params = await searchParams;
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const phase = parseSeasonPhase(firstQueryValue(params.phase));
  const category: PlayerCategory =
    firstQueryValue(params.type) === "goalies" ? "goalies" : "skaters";
  const index = selectedSeason
    ? await listPlayersBySeason(
        selectedSeason.id,
        gameTypeForPhase(phase),
      )
    : { seasonId: 0, skaters: [], goalies: [] };
  const availablePlayers =
    category === "skaters" ? index.skaters : index.goalies;
  const requestedIds = parsePlayerIds(firstQueryValue(params.players));
  const availableIds = new Set(
    availablePlayers.map((player) => player.nhlPlayerId),
  );
  const selectedIds = requestedIds.filter((id) => availableIds.has(id));
  const selectedRows = selectedIds
    .map((id) =>
      availablePlayers.find((player) => player.nhlPlayerId === id),
    )
    .filter(
      (
        player,
      ): player is SkaterSeasonSummary | GoalieSeasonSummary =>
        player !== undefined,
    );
  const advanced =
    selectedSeason && phase === "regular"
      ? await Promise.all(
          selectedRows.map((player) =>
            getMoneyPuckPlayerSeason(
              player.nhlPlayerId,
              selectedSeason.id,
            ),
          ),
        )
      : [];
  const metrics =
    category === "skaters" ? SKATER_METRICS : GOALIE_METRICS;
  const comparisonEntries =
    category === "skaters"
      ? (selectedRows as SkaterSeasonSummary[]).map((player) =>
          buildSkaterEntry(
            player,
            advanced.find(
              (data) => data.nhlPlayerId === player.nhlPlayerId,
            ),
          ),
        )
      : (selectedRows as GoalieSeasonSummary[]).map((player) =>
          buildGoalieEntry(
            player,
            advanced.find(
              (data) => data.nhlPlayerId === player.nhlPlayerId,
            ),
          ),
        );

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="players" />
      <section className="py-8 sm:py-10">
        <Link
          href={`/players${selectedSeason ? `?season=${selectedSeason.id}&phase=${phase}&type=${category}` : ""}`}
          className="workspace-back-link"
        >
          ← Player Directory
        </Link>
        <div className="mt-5">
          <WorkspacePageHeader
            eyebrow="Players / Comparison"
            title={`${selectedSeason?.label ?? "Season"} Player Comparison`}
            description={`Build a side-by-side ${seasonPhaseLabel(phase).toLowerCase()} comparison using official totals and available advanced metrics.`}
            action={
              <SeasonPicker
                seasons={seasons}
                selectedSeasonId={selectedSeason?.id}
                params={{
                  phase,
                  type: category,
                  players: selectedIds.join(",") || undefined,
                }}
              />
            }
          />
        </div>

        {selectedSeason ? (
          <>
            <SeasonPhaseFilter
              active={phase}
              path="/players/compare"
              params={{
                season: selectedSeason.id,
                type: category,
                players: selectedIds.join(",") || undefined,
              }}
            />
            <nav
              className="workspace-standings-scope"
              aria-label="Player comparison type"
            >
              {(["skaters", "goalies"] as const).map((type) => (
                <Link
                  key={type}
                  href={`/players/compare?season=${selectedSeason.id}&phase=${phase}&type=${type}`}
                  aria-current={category === type ? "page" : undefined}
                >
                  {type === "skaters" ? "Skaters" : "Goalies"}
                </Link>
              ))}
            </nav>

            <div className="mt-6">
              <PlayerComparisonPicker
                options={availablePlayers.map((player) => ({
                  nhlPlayerId: player.nhlPlayerId,
                  name: player.name,
                  position: player.position,
                }))}
                initialPlayerIds={selectedIds}
                seasonId={selectedSeason.id}
                phase={phase}
                category={category}
              />
            </div>

            {comparisonEntries.length >= 2 ? (
              <>
                <div className="mt-7">
                  <PlayerDirectComparisonChart
                    players={comparisonEntries}
                    metrics={metrics}
                  />
                </div>
                <WorkspacePanel
                  className="mt-7"
                  width="compact"
                  title="Complete Comparison"
                  description="A dash means the metric is unavailable for that player, season, phase, or MoneyPuck coverage."
                >
                  <ComparisonTable
                    players={comparisonEntries}
                    metrics={metrics}
                    seasonId={selectedSeason.id}
                    phase={phase}
                  />
                </WorkspacePanel>
              </>
            ) : (
              <div className="workspace-empty-state">
                Select at least two {category === "skaters" ? "skaters" : "goalies"} to
                generate the comparison.
              </div>
            )}
          </>
        ) : (
          <div className="workspace-empty-state">
            No player data is available.
          </div>
        )}
      </section>
    </main>
  );
}

const SKATER_METRICS: PlayerComparisonMetric[] = [
  { key: "gamesPlayed", label: "Games Played", shortLabel: "GP", unit: "integer" },
  { key: "goals", label: "Goals", shortLabel: "G", unit: "integer" },
  { key: "assists", label: "Assists", shortLabel: "A", unit: "integer" },
  { key: "points", label: "Points", shortLabel: "PTS", unit: "integer" },
  { key: "pointsPerGame", label: "Points per Game", shortLabel: "PTS/GP", unit: "decimal" },
  { key: "plusMinus", label: "Plus / Minus", shortLabel: "+/-", unit: "signed" },
  { key: "shotsOnGoal", label: "Shots on Goal", shortLabel: "S", unit: "integer" },
  { key: "individualExpectedGoals", label: "5-on-5 Individual Expected Goals", shortLabel: "ixG", unit: "decimal" },
  { key: "gameScore", label: "5-on-5 Game Score", shortLabel: "Game Score", unit: "decimal" },
  { key: "expectedGoalsPercentage", label: "5-on-5 On-Ice Expected-Goal Share", shortLabel: "xG%", unit: "percentage" },
  { key: "corsiPercentage", label: "5-on-5 On-Ice Corsi Share", shortLabel: "CF%", unit: "percentage" },
];

const GOALIE_METRICS: PlayerComparisonMetric[] = [
  { key: "gamesPlayed", label: "Games Played", shortLabel: "GP", unit: "integer" },
  { key: "gamesStarted", label: "Games Started", shortLabel: "GS", unit: "integer" },
  { key: "wins", label: "Wins", shortLabel: "W", unit: "integer" },
  { key: "losses", label: "Losses", shortLabel: "L", unit: "integer" },
  { key: "overtimeLosses", label: "Overtime Losses", shortLabel: "OTL", unit: "integer" },
  { key: "savePercentage", label: "Save Percentage", shortLabel: "SV%", unit: "savePercentage" },
  { key: "saves", label: "Saves", shortLabel: "SV", unit: "integer" },
  { key: "goalsAgainst", label: "Goals Against", shortLabel: "GA", unit: "integer" },
  { key: "expectedGoalsAgainst", label: "Expected Goals Against", shortLabel: "xGA", unit: "decimal" },
  { key: "goalsSavedAboveExpected", label: "Goals Saved Above Expected", shortLabel: "GSAx", unit: "decimal" },
];

function buildSkaterEntry(
  player: SkaterSeasonSummary,
  advanced: MoneyPuckPlayerSeason | undefined,
): PlayerComparisonEntry {
  const rows =
    advanced?.skaterSituations.filter(
      (row) => row.situation === "5on5",
    ) ?? [];
  return {
    nhlPlayerId: player.nhlPlayerId,
    name: player.name,
    position: player.position,
    teams: player.teams,
    values: {
      gamesPlayed: player.gamesPlayed,
      goals: player.goals,
      assists: player.assists,
      points: player.points,
      pointsPerGame:
        player.gamesPlayed === 0 ? null : player.points / player.gamesPlayed,
      plusMinus: player.plusMinus,
      shotsOnGoal: player.shotsOnGoal,
      individualExpectedGoals: sumNullable(
        rows.map((row) => row.individualExpectedGoals),
      ),
      gameScore: sumNullable(rows.map((row) => row.gameScore)),
      expectedGoalsPercentage: weightedAverage(
        rows,
        (row) => row.onIceExpectedGoalsPercentage,
      ),
      corsiPercentage: weightedAverage(
        rows,
        (row) => row.onIceCorsiPercentage,
      ),
    },
  };
}

function buildGoalieEntry(
  player: GoalieSeasonSummary,
  advanced: MoneyPuckPlayerSeason | undefined,
): PlayerComparisonEntry {
  const rows =
    advanced?.goalieSituations.filter(
      (row) => row.situation === "all",
    ) ?? [];
  const expectedGoalsAgainst = sumNullable(
    rows.map((row) => row.expectedGoalsAgainst),
  );
  const advancedGoalsAgainst = sumNullable(
    rows.map((row) => row.goalsAgainst),
  );
  return {
    nhlPlayerId: player.nhlPlayerId,
    name: player.name,
    position: player.position,
    teams: player.teams,
    values: {
      gamesPlayed: player.gamesPlayed,
      gamesStarted: player.gamesStarted,
      wins: player.wins,
      losses: player.losses,
      overtimeLosses: player.overtimeLosses,
      savePercentage: player.savePercentage,
      saves: player.saves,
      goalsAgainst: player.goalsAgainst,
      expectedGoalsAgainst,
      goalsSavedAboveExpected:
        expectedGoalsAgainst === null || advancedGoalsAgainst === null
          ? null
          : expectedGoalsAgainst - advancedGoalsAgainst,
    },
  };
}

function ComparisonTable({
  players,
  metrics,
  seasonId,
  phase,
}: {
  players: PlayerComparisonEntry[];
  metrics: PlayerComparisonMetric[];
  seasonId: number;
  phase: string;
}) {
  return (
    <div className="workspace-table-scroll">
      <table className="workspace-table workspace-comparison-matrix min-w-[720px]">
        <thead>
          <tr>
            <th>Metric</th>
            {players.map((player) => (
              <th key={player.nhlPlayerId}>
                <TeamLogoStack teams={player.teams} />
                <Link
                  href={`/players/${player.nhlPlayerId}?season=${seasonId}&phase=${phase}`}
                >
                  {player.name}
                </Link>
                <small>{formatPlayerPosition(player.position, "Player")}</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.key}>
              <th>{metric.label}</th>
              {players.map((player) => (
                <td key={player.nhlPlayerId}>
                  {formatComparisonValue(
                    player.values[metric.key] ?? null,
                    metric,
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parsePlayerIds(value: string | undefined): number[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map(Number)
        .filter(
          (candidate) =>
            Number.isSafeInteger(candidate) && candidate > 0,
        ),
    ),
  ].slice(0, 4);
}

function weightedAverage<T extends { iceTimeSeconds: number }>(
  rows: T[],
  getValue: (row: T) => number | null,
): number | null {
  let numerator = 0;
  let denominator = 0;
  for (const row of rows) {
    const value = getValue(row);
    if (value === null) continue;
    numerator += value * row.iceTimeSeconds;
    denominator += row.iceTimeSeconds;
  }
  return denominator === 0 ? null : numerator / denominator;
}

function sumNullable(values: Array<number | null>): number | null {
  const available = values.filter(
    (value): value is number => value !== null,
  );
  return available.length === 0
    ? null
    : available.reduce((total, value) => total + value, 0);
}
