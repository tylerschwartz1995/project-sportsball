import Link from "@/components/ui/exploration-link";
import type {
  GoalieGameLogEntry,
  SkaterGameLogEntry,
} from "@/contracts/game-log";
import { formatDate, formatSavePercentage } from '../logic';
export function SkaterRecentForm({ games }: { games: SkaterGameLogEntry[] }) {
  return (
    <RecentFormSection gameCount={games.length}>
      <div
        className="grid grid-cols-5 gap-2 sm:grid-cols-10"
        aria-label="Points in recent games"
      >
        {games.map((game) => (
          <Link
            key={game.nhlGameId}
            href={`/games/${game.nhlGameId}`}
            title={`${formatDate(game.gameDate)}: ${game.points} ${game.points === 1 ? "point" : "points"} vs ${game.opponent.name}`}
            className="group flex min-h-20 flex-col justify-end rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-2 transition hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:bg-[var(--accent-soft)]"
          >
            <span
              className="block rounded-sm bg-[var(--accent)] transition group-hover:bg-[var(--foreground)]"
              style={{ height: `${Math.max(4, Math.min(48, game.points * 14))}px` }}
            />
            <span className="mt-2 text-center text-xs font-semibold text-[var(--foreground)]">
              {game.points} P
            </span>
          </Link>
        ))}
      </div>
    </RecentFormSection>
  );
}

export function GoalieRecentForm({ games }: { games: GoalieGameLogEntry[] }) {
  return (
    <RecentFormSection gameCount={games.length}>
      <div
        className="grid grid-cols-5 gap-2 sm:grid-cols-10"
        aria-label="Save percentage in recent games"
      >
        {games.map((game) => (
          <Link
            key={game.nhlGameId}
            href={`/games/${game.nhlGameId}`}
            title={`${formatDate(game.gameDate)}: ${formatSavePercentage(game.savePercentage)} vs ${game.opponent.name}`}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-2 py-4 text-center transition hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:bg-[var(--accent-soft)]"
          >
            <span className="block text-xs text-[var(--muted)]">
              {game.decision ?? "—"}
            </span>
            <span className="mt-1 block text-xs font-semibold text-[var(--foreground)]">
              {formatSavePercentage(game.savePercentage)}
            </span>
          </Link>
        ))}
      </div>
    </RecentFormSection>
  );
}

export function RecentFormSection({
  gameCount,
  children,
}: {
  gameCount: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
            Recent form
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            Last {gameCount} Games
          </h3>
        </div>
      </div>
      {children}
    </section>
  );
}
