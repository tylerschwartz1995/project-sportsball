import { ReturnLink } from "@/app/_components/exploration-link";
import { getPlayerCareer } from "@/data/player-career";
import { PlayerCareer } from "@/app/_components/player-career";
import Link from "@/app/_components/exploration-link";
import { notFound } from "next/navigation";

import { PlayerAdvancedAnalytics } from "@/app/_components/advanced-analytics";
import { PlayerRollingPerformanceChart } from "@/app/_components/lazy-charts";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SeasonPhaseFilter } from "@/app/_components/season-phase-filter";
import { SiteHeader } from "@/app/_components/site-header";
import { TeamLogoStack } from "@/app/_components/team-logo";
import { ViewTabs } from "@/app/_components/view-tabs";
import { parseNhlId } from "@/contracts/entity";
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
import { getPlayerGameLog } from "@/data/game-logs";
import { getPlayerDetail } from "@/data/players";
import { listCachedSeasons } from "@/data/page-cache";
import { countryName } from "@/lib/country-name";
import { formatPlayerPositionLong } from "@/lib/player-position";

export const dynamic = "force-dynamic";

type PlayerView =
  | "overview"
  | "trends"
  | "advanced"
  | "seasons";

type PlayerPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    season?: string | string[];
    phase?: string | string[];
    view?: string | string[];
    chartWindow?: string | string[];
    chartVenue?: string | string[];
    chartMetric?: string | string[];
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
  const chartParams = {
    chartWindow: firstValue(pageParams.chartWindow),
    chartVenue: firstValue(pageParams.chartVenue),
    chartMetric: firstValue(pageParams.chartMetric),
  };

  const [detail, seasons, careerArchive] = await Promise.all([
    getPlayerDetail(nhlPlayerId),
    listCachedSeasons(),
    getPlayerCareer(nhlPlayerId),
  ]);
  if (!detail) {
    notFound();
  }

  const careerKeys = new Set(
    careerArchive.map((row) => `${row.kind}-${row.seasonId}-${row.gameType}`),
  );
  const career = [
    ...careerArchive,
    ...detail.skaterSeasons
      .filter(
        (row) => !careerKeys.has(`skater-${row.seasonId}-${row.gameType}`),
      )
      .map((row) => ({
        kind: "skater" as const,
        seasonId: row.seasonId,
        gameType: row.gameType,
        teams: row.teams.map((team) => team.abbreviation).join(","),
        games: row.gamesPlayed,
        goals: row.goals,
        assists: row.assists,
        points: row.points,
        wins: null,
        saves: null,
        shotsAgainst: null,
      })),
    ...detail.goalieSeasons
      .filter(
        (row) => !careerKeys.has(`goalie-${row.seasonId}-${row.gameType}`),
      )
      .map((row) => ({
        kind: "goalie" as const,
        seasonId: row.seasonId,
        gameType: row.gameType,
        teams: row.teams.map((team) => team.abbreviation).join(","),
        games: row.gamesPlayed,
        goals: null,
        assists: null,
        points: null,
        wins: row.wins,
        saves: row.saves,
        shotsAgainst: row.shotsAgainst,
      })),
  ].sort((left, right) => right.seasonId - left.seasonId);
  const careerSeasonIds = new Set([
    ...career.map((row) => row.seasonId),
    ...detail.skaterSeasons.map((row) => row.seasonId),
    ...detail.goalieSeasons.map((row) => row.seasonId),
  ]);
  const careerSeasons = [...careerSeasonIds]
    .sort((a, b) => b - a)
    .map((id) => ({
      id,
      startYear: Math.floor(id / 10000),
      endYear: id % 10000,
      label: `${Math.floor(id / 10000)}–${String(id % 10000).slice(-2)}`,
    }));
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
    (phase === "playoffs" ? playoffGoalie?.teams : regularGoalie?.teams) ??
    [];
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
        <ReturnLink
          fallback={`/players${selectedSeason ? `?season=${selectedSeason.id}&phase=${phase}` : ""}`}
        >
          ← All players
        </ReturnLink>

        <div className="modern-profile-identity modern-player-identity mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-4 sm:gap-5">
              <TeamLogoStack teams={selectedTeams} size="profile" prominent />
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-4xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-5xl">
                  {profile.name}
                </h1>
                <span className="rounded-full border border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                  {formatPlayerPositionLong(profile.position)}
                </span>
              </div>
            </div>
            <p className="mt-4 text-base text-[var(--muted)]">
              {selectedSeason
                ? view === "seasons"
                  ? "Career statistics"
                  : `${selectedSeason.label} statistics`
                : "Player profile"}
            </p>
          </div>
          {careerSeasons.length > 0 ? (
            <div className="workspace-page-actions">
              {selectedSeason &&
              seasons.some((season) => season.id === selectedSeason.id) ? (
                <Link
                  href={`/players/compare?season=${selectedSeason.id}&phase=${phase}&type=${profile.position === "G" ? "goalies" : "skaters"}&players=${profile.nhlPlayerId}`}
                  className="workspace-secondary-action"
                >
                  Compare Player
                </Link>
              ) : null}
              {view !== "seasons" ? (
                <SeasonPicker
                  seasons={careerSeasons}
                  selectedSeasonId={selectedSeason?.id}
                  params={{ phase, view, ...chartParams }}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {selectedSeason ? (
          <ViewTabs
            active={view}
            ariaLabel={`${profile.name} views`}
            label="Profile view"
            tabs={playerViewTabs({
              nhlPlayerId: profile.nhlPlayerId,
              seasonId: selectedSeason.id,
              phase,
              chartParams,
            }).filter(
              (tab) =>
                (tab.id !== "advanced" ||
                  (phase === "regular" && selectedSeason.id >= 20082009)) &&
                (tab.id !== "trends" ||
                  seasons.some((season) => season.id === selectedSeason.id)),
            )}
          />
        ) : null}

        {selectedSeason ? (
          <SeasonPhaseFilter
            active={phase}
            path={`/players/${profile.nhlPlayerId}`}
            params={{ season: selectedSeason.id, view, ...chartParams }}
          />
        ) : null}

        {view === "overview" ? (
          <>
            {!regularSkater &&
            !playoffSkater &&
            !regularGoalie &&
            !playoffGoalie &&
            career.length > 0 ? (
              <PlayerCareer
                rows={career}
                playerId={nhlPlayerId}
                phase={phase}
                selectedSeason={selectedSeason?.id}
              />
            ) : null}
            {regularSkater || playoffSkater ? (
              <section className="workspace-player-overview-block mt-8">
                <SectionTitle eyebrow="Selected season" title="Skater Totals" />
                <div className="mt-4">
                  <SkaterPanel
                    title={seasonPhaseLabel(phase)}
                    stats={phase === "playoffs" ? playoffSkater : regularSkater}
                  />
                </div>
              </section>
            ) : null}

            {regularGoalie || playoffGoalie ? (
              <section className="workspace-player-overview-block mt-8">
                <SectionTitle eyebrow="Selected season" title="Goalie Totals" />
                <div className="mt-4">
                  <GoaliePanel
                    title={seasonPhaseLabel(phase)}
                    stats={phase === "playoffs" ? playoffGoalie : regularGoalie}
                  />
                </div>
              </section>
            ) : null}

            <dl className="workspace-player-overview-block workspace-player-profile-facts mt-8">
              <ProfileStat
                label="Born"
                value={formatBirthDetails(
                  profile.birthDate,
                  profile.birthPlace,
                )}
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
                label={profile.position === "G" ? "Catches" : "Shoots"}
                value={formatHandedness(profile.shootsCatches)}
              />
              <ProfileStat
                label="Draft"
                value={
                  profile.draftYear ? (
                    <Link href={`/drafts?view=board&year=${profile.draftYear}`}>
                      {formatDraft(profile)} →
                    </Link>
                  ) : (
                    formatDraft(profile)
                  )
                }
              />
            </dl>
            {selectedSeason &&
            seasons.some((season) => season.id === selectedSeason.id) ? (
              <Link
                href={`/players/${profile.nhlPlayerId}/games?season=${selectedSeason.id}&phase=${phase}`}
                className="workspace-secondary-action mt-5"
              >
                Detailed Game Log →
              </Link>
            ) : null}
          </>
        ) : null}

        {view === "trends" ? (
          <>
            {skaterPerformanceGames.length > 0 ||
            goaliePerformanceGames.length > 0 ? (
              <section className="workspace-width-standard mt-8">
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
              <p className="mt-8 rounded-2xl border border-[color-mix(in_srgb,var(--accent-secondary)_42%,var(--border))] bg-[var(--accent-secondary-soft)] p-5 text-sm text-[var(--foreground-soft)]">
                Player-level MoneyPuck playoff files are not available, so
                advanced skater and goalie panels remain regular-season only.
              </p>
            ) : null}
            {phase === "regular" && !advanced ? (
              <div className="workspace-empty-state mt-8">
                Advanced player data is not available for this selection.
              </div>
            ) : null}
          </>
        ) : null}

        {view === "seasons" ? (
          <PlayerCareer rows={career} playerId={nhlPlayerId} phase={phase} />
        ) : null}
      </section>
    </main>
  );
}

function ProfileStat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (value === "Unavailable") return null;
  return (
    <div className="workspace-player-profile-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
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
  detail?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{title}</h3>
      </div>
      {detail ? <p className="text-sm text-[var(--muted)]">{detail}</p> : null}
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
    <article className="workspace-player-season-totals">
      <div className="workspace-player-season-totals-header">
        <h4>{title}</h4>
        <span>
          {stats.points} PTS
        </span>
      </div>
      <dl className="workspace-player-season-totals-grid">
        <Metric label="GP" value={stats.gamesPlayed} />
        <Metric label="G" value={stats.goals} />
        <Metric label="A" value={stats.assists} />
        <Metric label="PPG" value={stats.powerPlayGoals} />
        <Metric label="Shots" value={stats.shotsOnGoal} />
      </dl>
      <details className="mt-3"><summary>More Season Stats</summary><dl className="workspace-player-season-totals-grid"><Metric label="+/-" value={formatSigned(stats.plusMinus)} /><Metric label="PIM" value={stats.penaltyMinutes} /></dl></details>
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
    <article className="workspace-player-season-totals">
      <div className="workspace-player-season-totals-header">
        <h4>{title}</h4>
        <span>
          {formatSavePercentage(stats.savePercentage)} SV%
        </span>
      </div>
      <dl className="workspace-player-season-totals-grid">
        <Metric label="GP" value={stats.gamesPlayed} />
        <Metric label="W" value={stats.wins} />
      </dl>
      <details className="mt-3"><summary>More Season Stats</summary><dl className="workspace-player-season-totals-grid"><Metric label="GS" value={stats.gamesStarted} /><Metric label="L" value={stats.losses} /><Metric label="OTL" value={stats.overtimeLosses} /><Metric label="GA" value={stats.goalsAgainst} /><Metric label="Saves" value={stats.saves} /></dl></details>
    </article>
  );
}

function EmptyPanel({ title }: { title: string }) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-6">
      <h4 className="font-semibold text-[var(--foreground)]">{title}</h4>
      <p className="mt-5 text-sm text-[var(--muted)]">Did not participate.</p>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="workspace-player-season-metric">
      <dt>{label}</dt>
      <dd>{value}</dd>
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
    return "Unavailable";
  }
  const parts = [
    String(profile.draftYear),
    profile.draftTeamAbbreviation,
    profile.draftRound ? `Round ${profile.draftRound}` : null,
    profile.draftOverallPick
      ? `${formatOrdinal(profile.draftOverallPick)} overall`
      : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

function formatBirthDetails(
  birthDate: string | null,
  birthPlace: string | null,
): string {
  const date = birthDate
    ? new Intl.DateTimeFormat("en-CA", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(`${birthDate}T00:00:00Z`))
    : null;
  const place = birthPlace ? formatBirthPlace(birthPlace) : null;
  return [date, place].filter(Boolean).join(" · ") || "Unavailable";
}

function formatBirthPlace(value: string): string {
  const parts = value.split(", ");
  const country = parts.at(-1);
  if (!country || !/^[A-Z]{2,3}$/.test(country)) {
    return value;
  }

  try {
    parts[parts.length - 1] = countryName(country);
  } catch {
    return value;
  }
  return parts.join(", ");
}

function formatHandedness(value: string | null): string {
  if (value === "L") return "Left";
  if (value === "R") return "Right";
  return value ?? "Unavailable";
}

function formatOrdinal(value: number): string {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
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

function playerViewTabs({
  nhlPlayerId,
  seasonId,
  phase,
  chartParams,
}: {
  nhlPlayerId: number;
  seasonId: number;
  phase: "regular" | "playoffs";
  chartParams: Record<string, string | undefined>;
}) {
  return [
    { id: "overview" as const, label: "Overview" },
    { id: "trends" as const, label: "Recent Form" },
    { id: "advanced" as const, label: "Shot Quality" },
    { id: "seasons" as const, label: "Season History" },
  ].map((tab) => {
    const params = new URLSearchParams({
      season: String(seasonId),
      phase,
      view: tab.id,
    });
    if (tab.id === "trends")
      Object.entries(chartParams).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
    return { ...tab, href: `/players/${nhlPlayerId}?${params.toString()}` };
  });
}

function parsePlayerView(value: string | undefined): PlayerView {
  if (value === "records") {
    return "seasons";
  }

  return value === "trends" ||
    value === "advanced" ||
    value === "seasons"
    ? value
    : "overview";
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
