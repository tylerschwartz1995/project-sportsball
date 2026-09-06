import type {
  GoalieSeasonSummary,
  SkaterSeasonSummary,
} from "@/contracts/player";
import { formatSavePercentage, formatSigned } from './logic';

export function ProfileStat({
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

export function SectionTitle({
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

export function SkaterPanel({
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

export function GoaliePanel({
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

export function EmptyPanel({ title }: { title: string }) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-6">
      <h4 className="font-semibold text-[var(--foreground)]">{title}</h4>
      <p className="mt-5 text-sm text-[var(--muted)]">Did not participate.</p>
    </article>
  );
}

export function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="workspace-player-season-metric">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
