import Link from "next/link";

import { TeamLogo } from "@/app/_components/team-logo";
import type {
  OpponentLedgerEntry,
  SeasonMoment,
  SeasonRecord,
  TeamSeasonIdentity as TeamSeasonIdentityData,
} from "@/lib/team-season-identity";

type TeamSeasonIdentityProps = {
  identity: TeamSeasonIdentityData;
  seasonId: number;
  phase: "regular" | "playoffs";
  phaseLabel: string;
};

export function TeamSeasonIdentity({
  identity,
  seasonId,
  phase,
  phaseLabel,
}: TeamSeasonIdentityProps) {
  const seriesSummary = countOpponentOutcomes(identity.opponents);

  return (
    <section className="workspace-width-data mt-8 space-y-6">
      <article className="surface-panel relative overflow-hidden p-5 sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full bg-[var(--accent)] opacity-[0.07] blur-3xl"
        />
        <div className="relative">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
              League comparison
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-2xl">
              Performance vs. NHL
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {phaseLabel} · {identity.fingerprint[0]?.teamCount ?? 0} teams
            </p>
          </div>

          <dl className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div
              aria-hidden="true"
              className="hidden grid-cols-[minmax(0,1.35fr)_minmax(9rem,0.5fr)_minmax(8rem,0.38fr)_minmax(12rem,0.8fr)] gap-4 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.13em] text-[var(--muted)] md:grid"
            >
              <span>Metric</span>
              <span>Team result</span>
              <span>NHL rank</span>
              <span>League position</span>
            </div>
            {identity.fingerprint.map((metric) => {
              const rankPosition =
                metric.teamCount <= 1
                  ? 0
                  : ((metric.rank - 1) / (metric.teamCount - 1)) * 100;

              return (
                <div
                  key={metric.key}
                  className="grid grid-cols-2 items-start gap-3 border-b border-[var(--border)] p-4 last:border-b-0 md:grid-cols-[minmax(0,1.35fr)_minmax(9rem,0.5fr)_minmax(8rem,0.38fr)_minmax(12rem,0.8fr)] md:items-center md:gap-4 md:py-3"
                >
                  <div className="col-span-full md:col-span-1">
                    <dt className="font-medium text-[var(--foreground)]">
                      {metric.label}
                    </dt>
                    <p className="mt-0.5 text-[0.7rem] leading-4 text-[var(--muted)]">
                      {metric.description}
                    </p>
                  </div>
                  <dd>
                    <span className="block font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[var(--muted)] md:hidden">
                      Team result
                    </span>
                    <span className="mt-1 block whitespace-nowrap font-semibold text-[var(--foreground)] tabular-nums md:mt-0">
                      {metric.formattedValue}
                    </span>
                  </dd>
                  <dd>
                    <span className="block font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[var(--muted)] md:hidden">
                      NHL rank
                    </span>
                    <span className="mt-1 block whitespace-nowrap font-semibold text-[var(--foreground)] tabular-nums md:mt-0">
                      {ordinal(metric.rank)} of {metric.teamCount}
                    </span>
                  </dd>
                  <dd className="col-span-full md:col-span-1">
                    <div className="flex items-center gap-2 font-mono text-[0.62rem] text-[var(--muted)] tabular-nums">
                      <span>1st</span>
                      <div
                        className="relative h-1.5 flex-1 rounded-full bg-[var(--border)]"
                        role="img"
                        aria-label={`${metric.label}: ${metric.formattedValue}; ranked ${metric.rank} of ${metric.teamCount}`}
                      >
                        <span
                          aria-hidden="true"
                          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--surface)] bg-[var(--accent)] shadow-sm"
                          style={{ left: `${rankPosition}%` }}
                        />
                      </div>
                      <span>{ordinal(metric.teamCount)}</span>
                    </div>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </article>

      {identity.gamesAnalyzed > 0 ? (
        <div className="space-y-6">
          <article className="surface-panel p-6">
            <SectionIntroduction
              eyebrow="Situational breakdown"
              title="Where the record came from"
              description={`${identity.gamesAnalyzed} stored ${phaseLabel.toLowerCase()} games, separated by setting and game state.`}
            />
            <dl className="mt-5 grid gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 xl:grid-cols-4">
              {identity.records.map((record) => (
                <SituationalRecord
                  key={record.key}
                  record={record}
                  includeOvertimeLosses={phase === "regular"}
                />
              ))}
            </dl>
            <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
              One game may appear in more than one situation. Extra-time losses
              combine overtime and shootout decisions.
            </p>
          </article>

          <article className="surface-panel p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionIntroduction
                eyebrow="Opponent ledger"
                title="The season, team by team"
                description={
                  phase === "regular"
                    ? "Series outcomes compare the standings points earned by each team. Every score links to its supporting game."
                    : "Series outcomes compare wins. Every score links to its supporting game."
                }
              />
              <p className="text-xs text-[var(--muted)] tabular-nums">
                <span className="text-[var(--positive)]">
                  {seriesSummary.won} won
                </span>
                <span aria-hidden="true"> · </span>
                {seriesSummary.tied} tied
                <span aria-hidden="true"> · </span>
                <span className="text-[var(--negative)]">
                  {seriesSummary.lost} lost
                </span>
              </p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {identity.opponents.map((entry) => (
                <OpponentLedgerCard
                  key={entry.opponent.nhlTeamId}
                  entry={entry}
                  seasonId={seasonId}
                  phase={phase}
                />
              ))}
            </div>
          </article>
        </div>
      ) : (
        <div className="workspace-empty-state">
          Game-level context is not stored for this season. The league
          fingerprint above remains available from the season totals.
        </div>
      )}

      {identity.moments.length > 0 ? (
        <section>
          <SectionIntroduction
            eyebrow="Game extremes"
            title="Selected Single-Game Highs"
            description="Statistical extremes from the selected phase, each linked to the full game record."
          />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {identity.moments.map((moment, index) => (
              <SeasonMomentCard
                key={moment.key}
                moment={moment}
                index={index}
              />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function SectionIntroduction({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">
        {title}
      </h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
        {description}
      </p>
    </div>
  );
}

function SituationalRecord({
  record,
  includeOvertimeLosses,
}: {
  record: SeasonRecord;
  includeOvertimeLosses: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-[var(--surface)] p-4">
      <dt>
        <span className="block font-medium text-[var(--foreground)]">
          {record.label}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--muted)]">
          {record.description}
        </span>
      </dt>
      <dd className="shrink-0 text-right">
        <span className="block whitespace-nowrap text-lg font-semibold text-[var(--foreground)] tabular-nums">
          {formatRecord(record, includeOvertimeLosses)}
        </span>
        <span className="block text-xs text-[var(--muted)] tabular-nums">
          {record.gamesPlayed} games
        </span>
      </dd>
    </div>
  );
}

function OpponentLedgerCard({
  entry,
  seasonId,
  phase,
}: {
  entry: OpponentLedgerEntry;
  seasonId: number;
  phase: "regular" | "playoffs";
}) {
  const outcomeClass =
    entry.outcome === "won"
      ? "text-[var(--positive)]"
      : entry.outcome === "lost"
        ? "text-[var(--negative)]"
        : "text-[var(--muted)]";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
      <Link
        href={`/teams/${entry.opponent.nhlTeamId}?season=${seasonId}&phase=${phase}`}
        className="inline-flex min-h-10 items-center gap-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--accent)]"
      >
        <TeamLogo {...entry.opponent} size="tiny" decorative />
        <span className="truncate">
          {entry.opponent.abbreviation}
          <span className="sr-only"> {entry.opponent.name}</span>
        </span>
      </Link>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className={`text-[0.68rem] capitalize ${outcomeClass}`}>
          <span className="sr-only">Series </span>
          {entry.outcome}
        </p>
        <p className="whitespace-nowrap text-sm font-semibold text-[var(--foreground)] tabular-nums">
          {formatRecord(entry, phase === "regular")}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-2.5">
        {entry.games.map((game) => (
          <Link
            key={game.nhlGameId}
            href={`/games/${game.nhlGameId}`}
            title={formatLongDate(game.gameDate)}
            aria-label={`${game.result} ${game.score} to ${game.opponentScore} against ${entry.opponent.name} on ${formatLongDate(game.gameDate)}`}
            className={`inline-flex min-h-10 items-center rounded-md border border-[var(--border)] px-2 py-1 font-mono text-[0.62rem] transition hover:border-[var(--accent)] hover:text-[var(--accent)] ${resultClass(game.result)}`}
          >
            {game.result} {game.score}–{game.opponentScore}
          </Link>
        ))}
      </div>
    </div>
  );
}

function SeasonMomentCard({
  moment,
  index,
}: {
  moment: SeasonMoment;
  index: number;
}) {
  return (
    <Link
      href={`/games/${moment.nhlGameId}`}
      className="surface-panel group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)]"
    >
      <span
        aria-hidden="true"
        className="absolute right-4 top-2 font-mono text-5xl font-semibold text-[var(--border)]"
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <p className="relative font-mono text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
        {moment.label}
      </p>
      <div className="relative mt-5 flex items-center gap-3">
        <TeamLogo {...moment.opponent} size="compact" decorative />
        <div>
          <p className="text-xl font-semibold text-[var(--foreground)] tabular-nums">
            {moment.score}–{moment.opponentScore}
          </p>
          <p className="text-sm text-[var(--muted)]">
            {moment.isHome ? "vs" : "at"} {moment.opponent.abbreviation}
          </p>
        </div>
      </div>
      <p className="relative mt-5 text-sm text-[var(--foreground)]">
        {moment.detail}
      </p>
      <p className="relative mt-1 text-xs text-[var(--muted)]">
        {formatLongDate(moment.gameDate)}
      </p>
      <span className="relative mt-5 inline-flex text-sm font-medium text-[var(--accent)] transition group-hover:translate-x-0.5">
        Open game →
      </span>
    </Link>
  );
}

function formatRecord(record: {
  wins: number;
  regulationLosses: number;
  overtimeLosses: number;
}, includeOvertimeLosses = true) {
  return includeOvertimeLosses
    ? `${record.wins}–${record.regulationLosses}–${record.overtimeLosses}`
    : `${record.wins}–${record.regulationLosses}`;
}

function countOpponentOutcomes(opponents: OpponentLedgerEntry[]) {
  return opponents.reduce(
    (summary, opponent) => {
      summary[opponent.outcome] += 1;
      return summary;
    },
    { won: 0, tied: 0, lost: 0 },
  );
}

function resultClass(result: "W" | "L" | "OTL") {
  if (result === "W") return "text-[var(--positive)]";
  if (result === "L") return "text-[var(--negative)]";
  return "text-[var(--muted)]";
}

function formatLongDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function ordinal(value: number): string {
  const remainder100 = value % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}
