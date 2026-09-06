import Link from "@/components/ui/exploration-link";
import type {
  GoalieSeasonSummary,
  SkaterSeasonSummary
} from "@/contracts/player";
import { TeamLogoStack } from "@/features/teams/team-logo";
import {
  formatPlayerPosition
} from "@/lib/player-position";
import { formatSavePercentage, formatSigned } from './logic';

export function MobileSkaterCard({
  player,
  seasonId,
  phase,
}: {
  player: SkaterSeasonSummary;
  seasonId: number;
  phase: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--table-background)] p-4">
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
            <p className="mt-1 text-xs text-[var(--muted)]">
              {formatPlayerPosition(player.position, "Skater")} ·{" "}
              {player.gamesPlayed} games
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums text-[var(--accent)]">
            {player.points}
          </p>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
            points
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-4 gap-3 border-t border-[var(--border)] pt-4">
        <MobilePlayerStat label="Goals" value={player.goals} />
        <MobilePlayerStat label="Assists" value={player.assists} />
        <MobilePlayerStat label="+/-" value={formatSigned(player.plusMinus)} />
        <MobilePlayerStat label="Shots" value={player.shotsOnGoal} />
      </dl>
    </article>
  );
}

export function MobileGoalieCard({
  player,
  seasonId,
  phase,
}: {
  player: GoalieSeasonSummary;
  seasonId: number;
  phase: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--table-background)] p-4">
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
            <p className="mt-1 text-xs text-[var(--muted)]">
              {player.gamesPlayed} games · {player.gamesStarted} starts
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums text-[var(--accent)]">
            {formatSavePercentage(player.savePercentage)}
          </p>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
            save %
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-4 gap-3 border-t border-[var(--border)] pt-4">
        <MobilePlayerStat label="Wins" value={player.wins} />
        <MobilePlayerStat label="Losses" value={player.losses} />
        <MobilePlayerStat label="OTL" value={player.overtimeLosses} />
        <MobilePlayerStat label="Saves" value={player.saves} />
      </dl>
    </article>
  );
}

export function MobilePlayerStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <dt className="text-[0.8125rem] uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium tabular-nums text-[var(--foreground-soft)]">
        {value}
      </dd>
    </div>
  );
}

export function DirectoryEmptyState({
  clearHref,
  query,
}: {
  clearHref: string;
  query: string;
}) {
  return (
    <div className="workspace-empty-state mt-5">
      <strong>No players match these filters.</strong>
      <span>
        Try a broader search or remove optional filters for this season.
      </span>
      <Link href={`/search?q=${encodeURIComponent(query)}`}>
        Search All Seasons for {query || "a Player"} →
      </Link>
      <Link href={clearHref}>Clear filters</Link>
    </div>
  );
}

export function PlayerSectionHeader({
  id,
  title,
  count,
  description,
}: {
  id: string;
  title: string;
  count: number;
  description: string;
}) {
  return (
    <div
      id={id}
      className="mt-4 scroll-mt-6 flex flex-wrap items-end justify-between gap-3"
    >
      <div>
        <h3 className="text-2xl font-semibold text-[var(--foreground)]">
          {title}
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      </div>
      <p className="text-sm text-[var(--muted)]">
        {count} {count === 1 ? "player" : "players"}
      </p>
    </div>
  );
}

export function PlayerLink({
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
      className="font-medium text-[var(--foreground)] transition hover:text-[var(--accent)]"
    >
      {name}
    </Link>
  );
}

export function NumericCell({
  value,
  highlight = false,
}: {
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <td
      className={`workspace-semantic-number px-3 py-3 text-center tabular-nums ${highlight ? "font-semibold text-[var(--accent)]" : "text-[var(--foreground-soft)]"
        }`}
    >
      {value}
    </td>
  );
}
