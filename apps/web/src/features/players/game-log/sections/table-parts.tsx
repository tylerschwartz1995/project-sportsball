import Link from "@/components/ui/exploration-link";
import { SortableHeader } from "@/components/ui/sortable-header";
import type {
  GoalieGameLogEntry,
  SkaterGameLogEntry,
} from "@/contracts/game-log";
import { TeamLogo } from "@/features/teams/team-logo";
import { formatDate } from '../logic';
export function LogHeaders({ goalie }: { goalie: boolean }) {
  return (
    <>
      <SortableHeader label="Date" sortKey="date" align="left" />
      <SortableHeader label="Type" sortKey="type" align="left" />
      <SortableHeader
        label="Team"
        sortKey="team"
        align="left"
        defaultDirection="asc"
      />
      <SortableHeader
        label="Venue"
        sortKey="venue"
        align="left"
        defaultDirection="asc"
      />
      <SortableHeader
        label="Opponent"
        sortKey="opponent"
        align="left"
        defaultDirection="asc"
      />
      <SortableHeader label="Score" sortKey="score" />
      {goalie ? (
        <>
          <SortableHeader
            label="Start"
            sortKey="starter"
            align="center"
          />
          <SortableHeader
            label="Dec."
            sortKey="decision"
            align="center"
          />
          <SortableHeader label="GA" sortKey="goalsAgainst" />
          <SortableHeader label="SA" sortKey="shotsAgainst" />
          <SortableHeader label="SV" sortKey="saves" />
          <SortableHeader label="SV%" sortKey="savePercentage" />
          <SortableHeader label="TOI" sortKey="timeOnIce" />
          <SortableHeader label="xGA" sortKey="expectedGoalsAgainst" />
          <SortableHeader label="GSAx" sortKey="goalsSavedAboveExpected" />
        </>
      ) : (
        <>
          <SortableHeader label="G" sortKey="goals" />
          <SortableHeader label="A" sortKey="assists" />
          <SortableHeader label="PTS" sortKey="points" />
          <SortableHeader label="+/-" sortKey="plusMinus" />
          <SortableHeader label="SOG" sortKey="shotsOnGoal" />
          <SortableHeader label="HIT" sortKey="hits" />
          <SortableHeader label="BLK" sortKey="blockedShots" />
          <SortableHeader label="TOI" sortKey="timeOnIce" />
          <SortableHeader label="Game score" sortKey="gameScore" />
          <SortableHeader label="ixG" sortKey="individualXGoals" />
          <SortableHeader label="On-ice xG%" sortKey="onIceXGoalsPercentage" />
        </>
      )}
    </>
  );
}

export function GameIdentityCells({
  game,
  seasonId,
}: {
  game: SkaterGameLogEntry | GoalieGameLogEntry;
  seasonId: number;
}) {
  return (
    <>
      <td
        className="px-3 py-3"
        data-sort-value={game.gameDate.replaceAll("-", "")}
      >
        <Link
          href={`/games/${game.nhlGameId}`}
          className="font-medium text-[var(--foreground)] transition hover:text-[var(--accent)]"
        >
          {formatDate(game.gameDate)}
        </Link>
      </td>
      <td className="px-3 py-3">{game.gameType === 3 ? "Playoffs" : "Regular"}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <TeamLogo {...game.team} size="tiny" decorative />
          <Link
            href={`/teams/${game.team.nhlTeamId}?season=${seasonId}`}
            className="transition hover:text-[var(--accent)]"
          >
            {game.team.abbreviation}
          </Link>
        </div>
      </td>
      <td className="px-3 py-3">{game.isHome ? "Home" : "Away"}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <TeamLogo {...game.opponent} size="tiny" decorative />
          <Link
            href={`/teams/${game.opponent.nhlTeamId}?season=${seasonId}`}
            className="transition hover:text-[var(--accent)]"
          >
            {game.opponent.abbreviation}
          </Link>
        </div>
      </td>
      <NumericCell
        value={
          game.teamScore === null || game.opponentScore === null
            ? null
            : `${game.teamScore}–${game.opponentScore}`
        }
        sortValue={
          game.teamScore === null || game.opponentScore === null
            ? null
            : game.teamScore - game.opponentScore
        }
      />
    </>
  );
}

export function GameTableSection({
  eyebrow,
  title,
  detail,
  note,
  children,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12" id="game-log-results">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{title}</h3>
        </div>
        <p className="text-sm text-[var(--muted)]">{detail}</p>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--table-background)]">
        {children}
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">{note}</p>
    </section>
  );
}

export function NumericCell({
  value,
  sortValue,
  highlight = false,
}: {
  value: string | number | null;
  sortValue?: string | number | null;
  highlight?: boolean;
}) {
  return (
    <td
      className={`workspace-semantic-number px-3 py-3 text-center tabular-nums ${highlight ? "font-semibold text-[var(--foreground)]" : ""}`}
      data-sort-value={sortValue ?? value ?? ""}
    >
      {value ?? "—"}
    </td>
  );
}
