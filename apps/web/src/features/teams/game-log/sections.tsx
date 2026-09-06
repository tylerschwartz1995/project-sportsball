import Link from "@/components/ui/exploration-link";
import type { TeamGameLogEntry } from "@/contracts/game-log";
import { TeamLogo } from "@/features/teams/team-logo";
import { formatDate, formatDecimal, formatPercentage, resultTextClassName } from './logic';

export function TeamGameRow({
  game,
  seasonId,
}: {
  game: TeamGameLogEntry;
  seasonId: number;
}) {
  return (
    <tr className="border-b border-[var(--border)] text-[var(--foreground-soft)] last:border-0 hover:bg-[var(--surface-subtle)]">
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
      <td className="px-3 py-3 font-semibold" data-sort-value={game.result}>
        <span className={resultTextClassName(game.result)}>{game.result}</span>
        {game.lastPeriodType === "OT" || game.lastPeriodType === "SO"
          ? ` ${game.lastPeriodType}`
          : ""}
      </td>
      <NumericCell
        value={`${game.score}–${game.opponentScore}`}
        sortValue={game.score - game.opponentScore}
        highlight
      />
      <NumericCell value={game.shotsOnGoal} />
      <NumericCell value={game.opponentShotsOnGoal} />
      <NumericCell
        value={formatPercentage(game.fiveOnFiveXGoalsPercentage)}
        sortValue={game.fiveOnFiveXGoalsPercentage}
      />
      <NumericCell
        value={formatDecimal(game.fiveOnFiveXGoalsFor)}
        sortValue={game.fiveOnFiveXGoalsFor}
      />
      <NumericCell
        value={formatDecimal(game.fiveOnFiveXGoalsAgainst)}
        sortValue={game.fiveOnFiveXGoalsAgainst}
      />
    </tr>
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
