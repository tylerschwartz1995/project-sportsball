import Link from "next/link";

import { AnalyticsSectionTabs } from "@/app/_components/analytics-section-tabs";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { DataTableShell } from "@/app/_components/ui-primitives";
import {
  WorkspaceMetric,
  WorkspacePageHeader,
} from "@/app/_components/workspace-primitives";
import type {
  AdvancedGoalieLeaderboardRow,
  AdvancedSkaterLeaderboardRow,
  AdvancedTeamLeaderboardRow,
} from "@/contracts/advanced-leaderboard";
import { parseSeasonId } from "@/contracts/season";
import {
  listAdvancedGoalieLeaders,
  listAdvancedSkaterLeaders,
  listAdvancedTeamLeaders,
} from "@/data/advanced-leaderboard";
import { listSeasons } from "@/data/seasons";
import { firstQueryValue } from "@/lib/directory";

export const dynamic = "force-dynamic";

const LEADERBOARD_TYPES = ["teams", "skaters", "goalies"] as const;
const SITUATIONS = ["all", "5on5", "5on4", "4on5"] as const;
const MINIMUM_MINUTES = [0, 100, 300, 500, 1000] as const;

type LeaderboardType = (typeof LEADERBOARD_TYPES)[number];
type Situation = (typeof SITUATIONS)[number];

type AnalyticsPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    type?: string | string[];
    situation?: string | string[];
    minimum?: string | string[];
  }>;
};

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const params = await searchParams;
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const type = parseLeaderboardType(firstQueryValue(params.type));
  const defaultSituation = type === "goalies" ? "all" : "5on5";
  const situation = parseSituation(
    firstQueryValue(params.situation),
    defaultSituation,
  );
  const defaultMinimum = type === "goalies" ? 500 : 300;
  const minimumMinutes = parseMinimumMinutes(
    firstQueryValue(params.minimum),
    defaultMinimum,
  );
  const hasCoverage = Boolean(
    selectedSeason && selectedSeason.id >= 20082009,
  );
  const rows =
    selectedSeason && hasCoverage
      ? await loadLeaderboard(
          type,
          selectedSeason.id,
          situation,
          minimumMinutes * 60,
        )
      : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="analytics" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="MoneyPuck leaderboards"
          title={`${selectedSeason?.label ?? "No season"} advanced analytics`}
          description="Compare shot quality, possession, individual creation, and goalie performance across the league. Player results remain split by team so traded-player context is preserved."
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
              params={{
                type,
                situation,
                minimum: type === "teams" ? undefined : minimumMinutes,
              }}
            />
          }
        />

        {selectedSeason ? (
          <>
            <AnalyticsSectionTabs seasonId={selectedSeason.id} active={type} />

            {hasCoverage ? (
              <>
                <AnalyticsFilters
                  seasonId={selectedSeason.id}
                  type={type}
                  situation={situation}
                  minimumMinutes={minimumMinutes}
                />
                <LeaderboardSummary
                  type={type}
                  rows={rows}
                  seasonId={selectedSeason.id}
                />
                <LeaderboardTable
                  type={type}
                  rows={rows}
                  seasonId={selectedSeason.id}
                />
                <AnalyticsGuide seasonId={selectedSeason.id} />
              </>
            ) : (
              <CoverageNotice />
            )}
          </>
        ) : (
          <CoverageNotice />
        )}
      </section>
    </main>
  );
}

function AnalyticsFilters({
  seasonId,
  type,
  situation,
  minimumMinutes,
}: {
  seasonId: number;
  type: LeaderboardType;
  situation: Situation;
  minimumMinutes: number;
}) {
  return (
    <form
      method="get"
      className="workspace-analytics-filters"
      data-type={type}
    >
      <input type="hidden" name="season" value={seasonId} />
      <input type="hidden" name="type" value={type} />
      <label>
        Game situation
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
          Minimum ice time
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
      <button type="submit">
        Apply
      </button>
    </form>
  );
}

function LeaderboardSummary({
  type,
  rows,
  seasonId,
}: {
  type: LeaderboardType;
  rows: LeaderboardRows;
  seasonId: number;
}) {
  const leaders = rows.slice(0, 3);
  if (leaders.length === 0) {
    return null;
  }

  return (
    <div className="workspace-metric-grid">
      {leaders.map((row, index) => {
        const summary = leaderboardSummary(type, row);
        return (
          <WorkspaceMetric
            key={summary.key}
            label={`#${index + 1} ${summary.metric}`}
            value={summary.name}
            detail={summary.value}
            href={summaryHref(type, row, seasonId)}
            tone="violet"
          />
        );
      })}
    </div>
  );
}

type LeaderboardRows =
  | AdvancedTeamLeaderboardRow[]
  | AdvancedSkaterLeaderboardRow[]
  | AdvancedGoalieLeaderboardRow[];
type LeaderboardRow = LeaderboardRows[number];

function LeaderboardTable({
  type,
  rows,
  seasonId,
}: {
  type: LeaderboardType;
  rows: LeaderboardRows;
  seasonId: number;
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-sm text-slate-400">
        No records meet the selected situation and ice-time threshold.
      </p>
    );
  }

  if (type === "teams") {
    return (
      <TeamLeaderboard
        rows={rows as AdvancedTeamLeaderboardRow[]}
        seasonId={seasonId}
      />
    );
  }
  if (type === "goalies") {
    return (
      <GoalieLeaderboard
        rows={rows as AdvancedGoalieLeaderboardRow[]}
        seasonId={seasonId}
      />
    );
  }
  return (
    <SkaterLeaderboard
      rows={rows as AdvancedSkaterLeaderboardRow[]}
      seasonId={seasonId}
    />
  );
}

function TeamLeaderboard({
  rows,
  seasonId,
}: {
  rows: AdvancedTeamLeaderboardRow[];
  seasonId: number;
}) {
  return (
    <LeaderboardFrame
      count={rows.length}
      description="Team results"
      defaultSortKey="xgPercentage"
    >
      <table className="workspace-table min-w-[920px]">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
            <SortableHeader label="Team" sortKey="team" align="left" defaultDirection="asc" />
            <SortableHeader label="GP" sortKey="games" />
            <SortableHeader label="TOI" sortKey="iceTime" />
            <SortableHeader label="xG%" sortKey="xgPercentage" />
            <SortableHeader label="CF%" sortKey="corsiPercentage" />
            <SortableHeader label="FF%" sortKey="fenwickPercentage" />
            <SortableHeader label="xGF" sortKey="xGoalsFor" />
            <SortableHeader label="xGA" sortKey="xGoalsAgainst" defaultDirection="asc" />
            <SortableHeader label="GF" sortKey="goalsFor" />
            <SortableHeader label="GA" sortKey="goalsAgainst" defaultDirection="asc" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.team.nhlTeamId}
              className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.025]"
            >
              <EntityCell
                href={`/teams/${row.team.nhlTeamId}?season=${seasonId}`}
                name={row.team.name}
                detail={row.team.abbreviation}
              />
              <ValueCell value={String(row.gamesPlayed)} />
              <ValueCell value={formatMinutes(row.iceTimeSeconds)} />
              <ValueCell value={formatPercentage(row.expectedGoalsPercentage)} highlight />
              <ValueCell value={formatPercentage(row.corsiPercentage)} />
              <ValueCell value={formatPercentage(row.fenwickPercentage)} />
              <ValueCell value={formatDecimal(row.expectedGoalsFor)} />
              <ValueCell value={formatDecimal(row.expectedGoalsAgainst)} />
              <ValueCell value={formatDecimal(row.goalsFor, 0)} />
              <ValueCell value={formatDecimal(row.goalsAgainst, 0)} />
            </tr>
          ))}
        </tbody>
      </table>
    </LeaderboardFrame>
  );
}

function SkaterLeaderboard({
  rows,
  seasonId,
}: {
  rows: AdvancedSkaterLeaderboardRow[];
  seasonId: number;
}) {
  return (
    <LeaderboardFrame
      count={rows.length}
      description="Player-team rows"
      defaultSortKey="gameScore"
    >
      <table className="workspace-table min-w-[1080px]">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
            <SortableHeader label="Player" sortKey="player" align="left" defaultDirection="asc" />
            <SortableHeader label="Team" sortKey="team" align="left" defaultDirection="asc" />
            <SortableHeader label="GP" sortKey="games" />
            <SortableHeader label="TOI" sortKey="iceTime" />
            <SortableHeader label="Game score" sortKey="gameScore" />
            <SortableHeader label="xG%" sortKey="xgPercentage" />
            <SortableHeader label="CF%" sortKey="corsiPercentage" />
            <SortableHeader label="ixG" sortKey="individualXGoals" />
            <SortableHeader label="Goals" sortKey="goals" />
            <SortableHeader label="Points" sortKey="points" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.player.nhlPlayerId}-${row.team.nhlTeamId}`}
              className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.025]"
            >
              <EntityCell
                href={`/players/${row.player.nhlPlayerId}?season=${seasonId}`}
                name={row.player.name}
                detail={row.player.position ?? "Skater"}
              />
              <EntityCell
                href={`/teams/${row.team.nhlTeamId}?season=${seasonId}`}
                name={row.team.abbreviation}
                detail={row.team.name}
              />
              <ValueCell value={String(row.gamesPlayed)} />
              <ValueCell value={formatMinutes(row.iceTimeSeconds)} />
              <ValueCell value={formatDecimal(row.gameScore)} highlight />
              <ValueCell value={formatPercentage(row.onIceExpectedGoalsPercentage)} />
              <ValueCell value={formatPercentage(row.onIceCorsiPercentage)} />
              <ValueCell value={formatDecimal(row.individualExpectedGoals)} />
              <ValueCell value={formatDecimal(row.individualGoals, 0)} />
              <ValueCell value={formatDecimal(row.individualPoints, 0)} />
            </tr>
          ))}
        </tbody>
      </table>
    </LeaderboardFrame>
  );
}

function GoalieLeaderboard({
  rows,
  seasonId,
}: {
  rows: AdvancedGoalieLeaderboardRow[];
  seasonId: number;
}) {
  return (
    <LeaderboardFrame
      count={rows.length}
      description="Goalie-team rows"
      defaultSortKey="goalsSaved"
    >
      <table className="workspace-table min-w-[900px]">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
            <SortableHeader label="Goalie" sortKey="goalie" align="left" defaultDirection="asc" />
            <SortableHeader label="Team" sortKey="team" align="left" defaultDirection="asc" />
            <SortableHeader label="GP" sortKey="games" />
            <SortableHeader label="TOI" sortKey="iceTime" />
            <SortableHeader label="GSAx" sortKey="goalsSaved" />
            <SortableHeader label="xGA" sortKey="xGoalsAgainst" />
            <SortableHeader label="GA" sortKey="goalsAgainst" defaultDirection="asc" />
            <SortableHeader label="Expected SOG" sortKey="expectedShots" />
            <SortableHeader label="SOG" sortKey="shots" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.player.nhlPlayerId}-${row.team.nhlTeamId}`}
              className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.025]"
            >
              <EntityCell
                href={`/players/${row.player.nhlPlayerId}?season=${seasonId}`}
                name={row.player.name}
                detail="Goalie"
              />
              <EntityCell
                href={`/teams/${row.team.nhlTeamId}?season=${seasonId}`}
                name={row.team.abbreviation}
                detail={row.team.name}
              />
              <ValueCell value={String(row.gamesPlayed)} />
              <ValueCell value={formatMinutes(row.iceTimeSeconds)} />
              <ValueCell value={formatSignedDecimal(row.goalsSavedAboveExpected)} highlight />
              <ValueCell value={formatDecimal(row.expectedGoalsAgainst)} />
              <ValueCell value={formatDecimal(row.goalsAgainst, 0)} />
              <ValueCell value={formatDecimal(row.expectedShotsOnGoalAgainst)} />
              <ValueCell value={formatDecimal(row.shotsOnGoalAgainst, 0)} />
            </tr>
          ))}
        </tbody>
      </table>
    </LeaderboardFrame>
  );
}

function LeaderboardFrame({
  count,
  description,
  defaultSortKey,
  children,
}: {
  count: number;
  description: string;
  defaultSortKey: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3 text-sm text-slate-500">
        <p>{description}</p>
        <p>{count === 200 ? "Top 200 qualifying rows" : `${count} qualifying rows`}</p>
      </div>
      <DataTableShell>
        <SortableTable defaultSortKey={defaultSortKey}>
          <div className="workspace-table-scroll">{children}</div>
        </SortableTable>
      </DataTableShell>
    </section>
  );
}

function EntityCell({
  href,
  name,
  detail,
}: {
  href: string;
  name: string;
  detail: string;
}) {
  return (
    <td className="px-4 py-3 text-left">
      <Link
        href={href}
        className="font-medium text-white transition hover:text-violet-200"
      >
        {name}
      </Link>
      <span className="mt-0.5 block max-w-48 truncate text-xs text-slate-600">
        {detail}
      </span>
    </td>
  );
}

function ValueCell({
  value,
  highlight = false,
}: {
  value: string;
  highlight?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 text-right tabular-nums ${
        highlight ? "font-semibold text-violet-200" : "text-slate-300"
      }`}
    >
      {value}
    </td>
  );
}

function AnalyticsGuide({ seasonId }: { seasonId: number }) {
  return (
    <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-sm leading-6 text-slate-400">
        <p>
          <strong className="text-slate-200">xG%</strong> is the share of
          expected goals. <strong className="text-slate-200">CF%</strong> is the
          share of all shot attempts, while{" "}
          <strong className="text-slate-200">FF%</strong> excludes blocked
          attempts. <strong className="text-slate-200">ixG</strong> estimates
          the goals created by an individual player&apos;s shots.{" "}
          <strong className="text-slate-200">GSAx</strong> is expected goals
          against minus actual goals against; positive is better.
        </p>
        <Link
          href={`/analytics/guide?season=${seasonId}`}
          className="mt-3 inline-block font-medium text-violet-300 transition hover:text-violet-200"
        >
          Open the full metric guide →
        </Link>
      </div>
      <a
        href="https://moneypuck.com/"
        target="_blank"
        rel="noreferrer"
        className="rounded-lg border border-violet-300/20 px-4 py-3 text-sm font-medium text-violet-300 transition hover:border-violet-300/40 hover:text-violet-200"
      >
        Data: MoneyPuck.com ↗
      </a>
    </section>
  );
}

function CoverageNotice() {
  return (
    <p className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-sm leading-6 text-slate-400">
      MoneyPuck season-summary coverage begins in 2008–09. Earlier seasons
      retain traditional NHL statistics, results, box scores, and play-by-play.
    </p>
  );
}

async function loadLeaderboard(
  type: LeaderboardType,
  seasonId: number,
  situation: Situation,
  minimumIceTimeSeconds: number,
): Promise<LeaderboardRows> {
  if (type === "teams") {
    return listAdvancedTeamLeaders(seasonId, situation);
  }
  if (type === "goalies") {
    return listAdvancedGoalieLeaders(
      seasonId,
      situation,
      minimumIceTimeSeconds,
    );
  }
  return listAdvancedSkaterLeaders(
    seasonId,
    situation,
    minimumIceTimeSeconds,
  );
}

function leaderboardSummary(
  type: LeaderboardType,
  row: LeaderboardRow,
): {
  key: string;
  metric: string;
  name: string;
  value: string;
} {
  if (type === "teams") {
    const team = row as AdvancedTeamLeaderboardRow;
    return {
      key: String(team.team.nhlTeamId),
      metric: "xG share",
      name: team.team.name,
      value: formatPercentage(team.expectedGoalsPercentage),
    };
  }
  if (type === "goalies") {
    const goalie = row as AdvancedGoalieLeaderboardRow;
    return {
      key: `${goalie.player.nhlPlayerId}-${goalie.team.nhlTeamId}`,
      metric: "GSAx",
      name: goalie.player.name,
      value: `${formatSignedDecimal(goalie.goalsSavedAboveExpected)} · ${goalie.team.abbreviation}`,
    };
  }
  const skater = row as AdvancedSkaterLeaderboardRow;
  return {
    key: `${skater.player.nhlPlayerId}-${skater.team.nhlTeamId}`,
    metric: "game score",
    name: skater.player.name,
    value: `${formatDecimal(skater.gameScore)} · ${skater.team.abbreviation}`,
  };
}

function summaryHref(
  type: LeaderboardType,
  row: LeaderboardRow,
  seasonId: number,
): string {
  if (type === "teams") {
    const team = row as AdvancedTeamLeaderboardRow;
    return `/teams/${team.team.nhlTeamId}?season=${seasonId}`;
  }
  const player = row as
    | AdvancedSkaterLeaderboardRow
    | AdvancedGoalieLeaderboardRow;
  return `/players/${player.player.nhlPlayerId}?season=${seasonId}`;
}

function parseLeaderboardType(value: string | undefined): LeaderboardType {
  return LEADERBOARD_TYPES.includes(value as LeaderboardType)
    ? (value as LeaderboardType)
    : "teams";
}

function parseSituation(
  value: string | undefined,
  fallback: Situation,
): Situation {
  return SITUATIONS.includes(value as Situation)
    ? (value as Situation)
    : fallback;
}

function parseMinimumMinutes(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return MINIMUM_MINUTES.includes(
    parsed as (typeof MINIMUM_MINUTES)[number],
  )
    ? parsed
    : fallback;
}

function situationLabel(value: string): string {
  switch (value) {
    case "all":
      return "All situations";
    case "5on5":
      return "5-on-5";
    case "5on4":
      return "5-on-4 power play";
    case "4on5":
      return "4-on-5 penalty kill";
    default:
      return value;
  }
}

function formatMinutes(seconds: number): string {
  return Math.round(seconds / 60).toLocaleString("en-CA");
}

function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatDecimal(value: number | null, digits = 2): string {
  return value === null ? "—" : value.toFixed(digits);
}

function formatSignedDecimal(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}
