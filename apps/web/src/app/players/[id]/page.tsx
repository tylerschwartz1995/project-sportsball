import Link from "next/link";
import { notFound } from "next/navigation";

import { PlayerAdvancedAnalytics } from "@/app/_components/advanced-analytics";
import { PlayerRollingPerformanceChart } from "@/app/_components/player-rolling-performance-chart";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SeasonPhaseFilter } from "@/app/_components/season-phase-filter";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogoStack } from "@/app/_components/team-logo";
import { ViewTabs } from "@/app/_components/view-tabs";
import { parseNhlId } from "@/contracts/entity";
import type {
  GoalieSeasonSummary,
  SkaterSeasonSummary,
} from "@/contracts/player";
import type {
  HistoricalGoalieSeason,
  HistoricalSkaterSeason,
} from "@/contracts/history";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase,
  seasonPhaseLabel,
} from "@/contracts/season-phase";
import { getMoneyPuckPlayerSeason } from "@/data/advanced";
import { getPlayerGameLog } from "@/data/game-logs";
import { getPlayerDetail } from "@/data/players";
import { getHistoricalPlayerSeasons } from "@/data/history";
import { listSeasons } from "@/data/seasons";

export const dynamic = "force-dynamic";

type PlayerView =
  | "overview"
  | "trends"
  | "advanced"
  | "records"
  | "seasons";

type PlayerPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    season?: string | string[];
    phase?: string | string[];
    view?: string | string[];
  }>;
};

export default async function PlayerPage({
  params,
  searchParams,
}: PlayerPageProps) {
  const [routeParams, pageParams] = await Promise.all([params, searchParams]);
  const nhlPlayerId = parseNhlId(routeParams.id);
  if (nhlPlayerId === null) {
    notFound();
  }

  const view = parsePlayerView(firstValue(pageParams.view));

  const [detail, seasons, historical] = await Promise.all([
    getPlayerDetail(nhlPlayerId),
    listSeasons(),
    view === "records"
      ? getHistoricalPlayerSeasons(nhlPlayerId)
      : Promise.resolve({ skaters: [], goalies: [] }),
  ]);
  if (!detail) {
    notFound();
  }

  const careerSeasonIds = new Set([
    ...detail.skaterSeasons.map((row) => row.seasonId),
    ...detail.goalieSeasons.map((row) => row.seasonId),
  ]);
  const careerSeasons = seasons.filter((season) =>
    careerSeasonIds.has(season.id),
  );
  const requestedSeason = parseSeasonId(firstValue(pageParams.season));
  const phase = parseSeasonPhase(firstValue(pageParams.phase));
  const selectedSeason =
    careerSeasons.find((season) => season.id === requestedSeason) ??
    careerSeasons[0];
  const selectedSkaterRows = detail.skaterSeasons.filter(
    (row) => row.seasonId === selectedSeason?.id,
  );
  const selectedGoalieRows = detail.goalieSeasons.filter(
    (row) => row.seasonId === selectedSeason?.id,
  );
  const regularSkater = selectedSkaterRows.find((row) => row.gameType === 2);
  const playoffSkater = selectedSkaterRows.find((row) => row.gameType === 3);
  const regularGoalie = selectedGoalieRows.find((row) => row.gameType === 2);
  const playoffGoalie = selectedGoalieRows.find((row) => row.gameType === 3);
  const selectedTeams =
    (phase === "playoffs" ? playoffSkater?.teams : regularSkater?.teams) ??
    (phase === "playoffs" ? playoffGoalie?.teams : regularGoalie?.teams) ?? [];
  const profile = detail.profile;
  const [advanced, gameLog] = selectedSeason
    ? await Promise.all([
        view === "advanced" && phase === "regular"
          ? getMoneyPuckPlayerSeason(nhlPlayerId, selectedSeason.id)
          : Promise.resolve(null),
        view === "trends"
          ? getPlayerGameLog(nhlPlayerId, selectedSeason.id)
          : Promise.resolve(null),
      ])
    : [null, null];
  const gameType = gameTypeForPhase(phase);
  const skaterPerformanceGames =
    gameLog?.skaterGames
      .filter((game) => game.gameType === gameType)
      .map((game) => ({
        nhlGameId: game.nhlGameId,
        gameDate: game.gameDate,
        isHome: game.isHome,
        team: game.team,
        opponent: game.opponent,
        teamScore: game.teamScore,
        opponentScore: game.opponentScore,
        points: game.points,
        goals: game.goals,
        assists: game.assists,
        shotsOnGoal: game.shotsOnGoal,
        gameScore: game.gameScore,
        individualXGoals: game.individualXGoals,
        onIceXGoalsPercentage: game.onIceXGoalsPercentage,
      })) ?? [];
  const goaliePerformanceGames =
    gameLog?.goalieGames
      .filter((game) => game.gameType === gameType)
      .map((game) => ({
        nhlGameId: game.nhlGameId,
        gameDate: game.gameDate,
        isHome: game.isHome,
        team: game.team,
        opponent: game.opponent,
        teamScore: game.teamScore,
        opponentScore: game.opponentScore,
        saves: game.saves,
        shotsAgainst: game.shotsAgainst,
        goalsAgainst: game.goalsAgainst,
        expectedGoalsAgainst: game.expectedGoalsAgainst,
        goalsSavedAboveExpected: game.goalsSavedAboveExpected,
      })) ?? [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="players" />

      <section className="py-10">
        <Link
          href={`/players${selectedSeason ? `?season=${selectedSeason.id}&phase=${phase}` : ""}`}
          className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
        >
          ← All players
        </Link>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-4 sm:gap-5">
              <TeamLogoStack
                teams={selectedTeams}
                size="profile"
                prominent
              />
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
                  {profile.name}
                </h1>
                <span className="rounded-full border border-cyan-300/25 bg-cyan-300/[0.08] px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
                  {profile.position ?? "Player"}
                </span>
              </div>
            </div>
            <p className="mt-4 text-base text-slate-400">
              {selectedSeason
                ? `${selectedSeason.label} and career statistics`
                : "Player profile"}
            </p>
          </div>
          {careerSeasons.length > 0 ? (
            <div className="workspace-page-actions">
              {selectedSeason ? (
                <Link
                  href={`/players/compare?season=${selectedSeason.id}&phase=${phase}&type=${profile.position === "G" ? "goalies" : "skaters"}&players=${profile.nhlPlayerId}`}
                  className="workspace-secondary-action"
                >
                  Compare Player
                </Link>
              ) : null}
              <SeasonPicker
                seasons={careerSeasons}
                selectedSeasonId={selectedSeason?.id}
                params={{ phase, view }}
              />
            </div>
          ) : null}
        </div>

        {selectedSeason ? (
          <SeasonPhaseFilter
            active={phase}
            path={`/players/${profile.nhlPlayerId}`}
            params={{ season: selectedSeason.id, view }}
          />
        ) : null}

        {selectedSeason ? (
          <ViewTabs
            active={view}
            ariaLabel={`${profile.name} views`}
            tabs={playerViewTabs({
              nhlPlayerId: profile.nhlPlayerId,
              seasonId: selectedSeason.id,
              phase,
            })}
          />
        ) : null}

        {view === "overview" ? (
        <>
        <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ProfileStat
            label="Born"
            value={
              [profile.birthDate, profile.birthPlace]
                .filter(Boolean)
                .join(" · ") || "Unavailable"
            }
          />
          <ProfileStat
            label="Size"
            value={
              profile.heightInInches && profile.weightInPounds
                ? `${formatHeight(profile.heightInInches)} · ${profile.weightInPounds} lb`
                : "Unavailable"
            }
          />
          <ProfileStat
            label="Shoots / catches"
            value={profile.shootsCatches ?? "Unavailable"}
          />
          <ProfileStat label="Draft" value={formatDraft(profile)} />
        </dl>

        {regularSkater || playoffSkater ? (
          <section className="mt-12">
            <SectionTitle
              eyebrow="Selected season"
              title="Skater Totals"
              detail="Combined across teams played for"
            />
            <div className="mt-5">
              <SkaterPanel
                title={seasonPhaseLabel(phase)}
                stats={phase === "playoffs" ? playoffSkater : regularSkater}
              />
            </div>
          </section>
        ) : null}

        {regularGoalie || playoffGoalie ? (
          <section className="mt-12">
            <SectionTitle
              eyebrow="Selected season"
              title="Goalie Totals"
              detail="Combined across teams played for"
            />
            <div className="mt-5">
              <GoaliePanel
                title={seasonPhaseLabel(phase)}
                stats={phase === "playoffs" ? playoffGoalie : regularGoalie}
              />
            </div>
          </section>
        ) : null}

        {selectedSeason ? (
          <Link
            href={`/players/${profile.nhlPlayerId}/games?season=${selectedSeason.id}&phase=${phase}`}
            className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] px-5 py-4 transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.09]"
          >
            <span>
              <span className="block font-medium text-white">
                Explore the {selectedSeason.label} game log
              </span>
              <span className="mt-1 block text-sm text-slate-400">
                Game-by-game performance, recent form, and available advanced
                metrics.
              </span>
            </span>
            <span className="shrink-0 text-cyan-300">View games →</span>
          </Link>
        ) : null}
        </>
        ) : null}

        {view === "trends" ? (
        <>
        {skaterPerformanceGames.length > 0 ||
        goaliePerformanceGames.length > 0 ? (
          <section className="mt-12">
            <SectionTitle
              eyebrow="Rolling performance"
              title="Player Form"
              detail={`${seasonPhaseLabel(phase)} · rates update after every appearance`}
            />
            <div className="mt-5 grid gap-6">
              {skaterPerformanceGames.length > 0 ? (
                <PlayerRollingPerformanceChart
                  kind="skater"
                  games={skaterPerformanceGames}
                  playerName={profile.name}
                />
              ) : null}
              {goaliePerformanceGames.length > 0 ? (
                <PlayerRollingPerformanceChart
                  kind="goalie"
                  games={goaliePerformanceGames}
                  playerName={profile.name}
                />
              ) : null}
            </div>
          </section>
        ) : null}
        {skaterPerformanceGames.length === 0 &&
        goaliePerformanceGames.length === 0 ? (
          <div className="workspace-empty-state mt-8">
            No game-by-game performance is available for this selection.
          </div>
        ) : null}
        </>
        ) : null}

        {view === "advanced" ? (
        <>
        {advanced ? (
          <PlayerAdvancedAnalytics
            key={`${profile.nhlPlayerId}-${selectedSeason?.id}`}
            data={advanced}
          />
        ) : null}
        {phase === "playoffs" ? (
          <p className="mt-8 rounded-2xl border border-violet-300/20 bg-violet-300/[0.06] p-5 text-sm text-slate-300">
            Player-level MoneyPuck playoff files are not available, so advanced
            skater and goalie panels remain regular-season only.
          </p>
        ) : null}
        {phase === "regular" && !advanced ? (
          <div className="workspace-empty-state mt-8">
            Advanced player data is not available for this selection.
          </div>
        ) : null}
        </>
        ) : null}

        {view === "records" ? (
        <>
        {historical.skaters.length > 0 ? (
          <section className="mt-12">
            <SectionTitle
              eyebrow="All-time NHL record"
              title="Historical Skater Seasons"
              detail={`${new Set(historical.skaters.map((row) => row.seasonId)).size} seasons · 1917–18 onward`}
            />
            <div className="mt-5 grid gap-6">
              <HistoryGroup title="Regular Season">
                <HistoricalSkaterTable rows={historical.skaters.filter((row) => row.gameType === 2)} />
              </HistoryGroup>
              <HistoryGroup title="Playoffs">
                <HistoricalSkaterTable rows={historical.skaters.filter((row) => row.gameType === 3)} />
              </HistoryGroup>
            </div>
          </section>
        ) : null}

        {historical.goalies.length > 0 ? (
          <section className="mt-12">
            <SectionTitle
              eyebrow="All-time NHL record"
              title="Historical Goalie Seasons"
              detail={`${new Set(historical.goalies.map((row) => row.seasonId)).size} seasons · 1917–18 onward`}
            />
            <div className="mt-5 grid gap-6">
              <HistoryGroup title="Regular Season">
                <HistoricalGoalieTable rows={historical.goalies.filter((row) => row.gameType === 2)} />
              </HistoryGroup>
              <HistoryGroup title="Playoffs">
                <HistoricalGoalieTable rows={historical.goalies.filter((row) => row.gameType === 3)} />
              </HistoryGroup>
            </div>
          </section>
        ) : null}
        {historical.skaters.length === 0 && historical.goalies.length === 0 ? (
          <div className="workspace-empty-state mt-8">
            No all-time season records are available for this player.
          </div>
        ) : null}
        </>
        ) : null}

        {view === "seasons" ? (
        <>
        {detail.skaterSeasons.length > 0 ? (
          <section className="mt-12">
            <SectionTitle
              eyebrow="Career history"
              title="Skater Seasons"
              detail={`${careerSeasonIds.size} NHL seasons`}
            />
            <div className="mt-5 grid gap-6">
              <HistoryGroup title="Regular Season">
                <SkaterHistory
                  rows={detail.skaterSeasons.filter(
                    (row) => row.gameType === 2,
                  )}
                  seasonLabels={new Map(
                    seasons.map((season) => [season.id, season.label]),
                  )}
                />
              </HistoryGroup>
              <HistoryGroup title="Playoffs">
                <SkaterHistory
                  rows={detail.skaterSeasons.filter(
                    (row) => row.gameType === 3,
                  )}
                  seasonLabels={new Map(
                    seasons.map((season) => [season.id, season.label]),
                  )}
                />
              </HistoryGroup>
            </div>
          </section>
        ) : null}
        {detail.goalieSeasons.length > 0 ? (
          <section className="mt-12">
            <SectionTitle
              eyebrow="Career history"
              title="Goalie Seasons"
              detail={`${careerSeasonIds.size} NHL seasons`}
            />
            <div className="mt-5 grid gap-6">
              <HistoryGroup title="Regular Season">
                <GoalieHistory
                  rows={detail.goalieSeasons.filter(
                    (row) => row.gameType === 2,
                  )}
                  seasonLabels={new Map(
                    seasons.map((season) => [season.id, season.label]),
                  )}
                />
              </HistoryGroup>
              <HistoryGroup title="Playoffs">
                <GoalieHistory
                  rows={detail.goalieSeasons.filter(
                    (row) => row.gameType === 3,
                  )}
                  seasonLabels={new Map(
                    seasons.map((season) => [season.id, season.label]),
                  )}
                />
              </HistoryGroup>
            </div>
          </section>
        ) : null}
        </>
        ) : null}
      </section>
    </main>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <dt className="text-xs uppercase tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-medium text-white">{value}</dd>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-300">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
      </div>
      <p className="text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function SkaterPanel({
  title,
  stats,
}: {
  title: string;
  stats: SkaterSeasonSummary | undefined;
}) {
  if (!stats) {
    return <EmptyPanel title={title} />;
  }
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <div className="flex items-baseline justify-between">
        <h4 className="font-semibold text-white">{title}</h4>
        <span className="font-mono text-lg text-cyan-200">
          {stats.points} PTS
        </span>
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4">
        <Metric label="GP" value={stats.gamesPlayed} />
        <Metric label="G" value={stats.goals} />
        <Metric label="A" value={stats.assists} />
        <Metric label="+/-" value={formatSigned(stats.plusMinus)} />
        <Metric label="PIM" value={stats.penaltyMinutes} />
        <Metric label="PPG" value={stats.powerPlayGoals} />
        <Metric label="Shots" value={stats.shotsOnGoal} />
        <Metric label="Teams" value={stats.teamsPlayedFor} />
      </dl>
    </article>
  );
}

function GoaliePanel({
  title,
  stats,
}: {
  title: string;
  stats: GoalieSeasonSummary | undefined;
}) {
  if (!stats) {
    return <EmptyPanel title={title} />;
  }
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <div className="flex items-baseline justify-between">
        <h4 className="font-semibold text-white">{title}</h4>
        <span className="font-mono text-lg text-cyan-200">
          {formatSavePercentage(stats.savePercentage)} SV%
        </span>
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4">
        <Metric label="GP" value={stats.gamesPlayed} />
        <Metric label="GS" value={stats.gamesStarted} />
        <Metric label="W" value={stats.wins} />
        <Metric label="L" value={stats.losses} />
        <Metric label="OTL" value={stats.overtimeLosses} />
        <Metric label="GA" value={stats.goalsAgainst} />
        <Metric label="Saves" value={stats.saves} />
        <Metric label="Teams" value={stats.teamsPlayedFor} />
      </dl>
    </article>
  );
}

function EmptyPanel({ title }: { title: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
      <h4 className="font-semibold text-white">{title}</h4>
      <p className="mt-5 text-sm text-slate-500">Did not participate.</p>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-semibold tabular-nums text-white">{value}</dd>
    </div>
  );
}

function SkaterHistory({
  rows,
  seasonLabels,
}: {
  rows: SkaterSeasonSummary[];
  seasonLabels: Map<number, string>;
}) {
  return (
    <HistoryTable
      headers={["Season", "Team(s)", "GP", "G", "A", "PTS", "+/-", "PIM"]}
      rows={rows.map((row) => [
        seasonLabels.get(row.seasonId) ?? String(row.seasonId),
        <TeamLogoStack
          key={`teams-${row.seasonId}-${row.gameType}`}
          teams={row.teams}
          size="compact"
          prominent
        />,
        row.gamesPlayed,
        row.goals,
        row.assists,
        row.points,
        formatSigned(row.plusMinus),
        row.penaltyMinutes,
      ])}
    />
  );
}

function GoalieHistory({
  rows,
  seasonLabels,
}: {
  rows: GoalieSeasonSummary[];
  seasonLabels: Map<number, string>;
}) {
  return (
    <HistoryTable
      headers={["Season", "Team(s)", "GP", "GS", "W", "L", "OTL", "SV%"]}
      rows={rows.map((row) => [
        seasonLabels.get(row.seasonId) ?? String(row.seasonId),
        <TeamLogoStack
          key={`teams-${row.seasonId}-${row.gameType}`}
          teams={row.teams}
          size="compact"
          prominent
        />,
        row.gamesPlayed,
        row.gamesStarted,
        row.wins,
        row.losses,
        row.overtimeLosses,
        formatSavePercentage(row.savePercentage),
      ])}
    />
  );
}

function HistoricalSkaterTable({ rows }: { rows: HistoricalSkaterSeason[] }) {
  return (
    <HistoryTable
      headers={["Season", "Team(s)", "GP", "G", "A", "PTS", "P/GP"]}
      rows={rows.map((row) => [
        formatHistoricalSeason(row.seasonId),
        <TeamLogoStack
          key={`teams-${row.seasonId}-${row.gameType}`}
          abbreviations={row.teamAbbreviations}
          size="compact"
          prominent
        />,
        row.gamesPlayed,
        row.goals,
        row.assists,
        row.points,
        row.pointsPerGame.toFixed(2),
      ])}
    />
  );
}

function HistoricalGoalieTable({ rows }: { rows: HistoricalGoalieSeason[] }) {
  return (
    <HistoryTable
      headers={["Season", "Team(s)", "GP", "W", "L", "SO", "GAA", "SV%"]}
      rows={rows.map((row) => [
        formatHistoricalSeason(row.seasonId),
        <TeamLogoStack
          key={`teams-${row.seasonId}-${row.gameType}`}
          abbreviations={row.teamAbbreviations}
          size="compact"
          prominent
        />,
        row.gamesPlayed,
        row.wins,
        row.losses,
        row.shutouts,
        row.goalsAgainstAverage?.toFixed(2) ?? "—",
        formatSavePercentage(row.savePercentage),
      ])}
    />
  );
}

function HistoryTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.025] p-5 text-sm text-slate-500">
        No appearances.
      </p>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
      <SortableTable defaultSortKey={headers[0]} defaultDirection="desc">
        <div className="min-w-0 max-w-full overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
                {headers.map((header, index) => (
                  <SortableHeader
                    key={header}
                    label={header}
                    sortKey={header}
                    align={index === 0 ? "left" : "right"}
                    defaultDirection={index === 0 ? "asc" : "desc"}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={`${String(row[0])}-${rowIndex}`}
                  className="border-b border-white/[0.06] text-slate-300 last:border-0"
                >
                  {row.map((value, index) => (
                    <td
                      key={`${headers[index]}-${index}`}
                      className={`px-4 py-3 tabular-nums ${
                        index === 0 ? "text-left" : "text-right"
                      } ${index === 4 ? "font-semibold text-cyan-200" : ""}`}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SortableTable>
    </div>
  );
}

function HistoryGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <h4 className="mb-3 text-sm font-semibold text-white">{title}</h4>
      {children}
    </div>
  );
}

function formatDraft(profile: {
  draftYear: number | null;
  draftTeamAbbreviation: string | null;
  draftRound: number | null;
  draftOverallPick: number | null;
}): string {
  if (!profile.draftYear) {
    return "Undrafted";
  }
  const parts = [
    String(profile.draftYear),
    profile.draftTeamAbbreviation,
    profile.draftRound ? `round ${profile.draftRound}` : null,
    profile.draftOverallPick ? `#${profile.draftOverallPick} overall` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

function formatHeight(inches: number): string {
  return `${Math.floor(inches / 12)}′${inches % 12}″`;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

function formatHistoricalSeason(seasonId: number): string {
  return `${Math.floor(seasonId / 10_000)}–${String(seasonId % 10_000).slice(-2)}`;
}

function playerViewTabs({
  nhlPlayerId,
  seasonId,
  phase,
}: {
  nhlPlayerId: number;
  seasonId: number;
  phase: "regular" | "playoffs";
}) {
  return [
    { id: "overview" as const, label: "Overview" },
    { id: "trends" as const, label: "Trends" },
    { id: "advanced" as const, label: "Advanced" },
    { id: "records" as const, label: "All-Time Records" },
    { id: "seasons" as const, label: "Season History" },
  ].map((tab) => ({
    ...tab,
    href: `/players/${nhlPlayerId}?season=${seasonId}&phase=${phase}&view=${tab.id}`,
  }));
}

function parsePlayerView(value: string | undefined): PlayerView {
  return value === "trends" ||
    value === "advanced" ||
    value === "records" ||
    value === "seasons"
    ? value
    : "overview";
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
