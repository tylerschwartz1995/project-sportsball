import Link from "@/components/ui/exploration-link";
import type {
  MoneyPuckUnitGameStats
} from "@/contracts/season-unit";
import { TeamLogo } from "@/features/teams/team-logo";
import { difference, formatDate, formatPair, formatPercentage, formatScore, formatTime, scoreDifferential } from './logic';

export function GameRow({
  game,
  seasonId,
}: {
  game: MoneyPuckUnitGameStats;
  seasonId: number;
}) {
  return (
    <tr>
      <td data-sort-value={game.gameDate}>
        <Link href={`/games/${game.nhlGameId}`} className="workspace-table-link">
          {formatDate(game.gameDate)}
        </Link>
      </td>
      <td data-sort-value={game.opponent.name}>
        <span className="inline-flex items-center gap-2">
          <TeamLogo {...game.opponent} size="tiny" decorative />
          {game.isHome ? "vs" : "at"}{" "}
          <Link
            href={`/teams/${game.opponent.nhlTeamId}?season=${seasonId}`}
            className="workspace-table-link"
          >
            {game.opponent.abbreviation}
          </Link>
        </span>
      </td>
      <Value value={formatScore(game)} sortValue={scoreDifferential(game)} />
      <Value
        value={formatTime(game.iceTimeSeconds)}
        sortValue={game.iceTimeSeconds}
      />
      <Value
        value={formatPercentage(game.expectedGoalsPercentage)}
        sortValue={game.expectedGoalsPercentage}
        highlight
      />
      <Value
        value={formatPercentage(game.corsiPercentage)}
        sortValue={game.corsiPercentage}
      />
      <Value
        value={formatPair(game.expectedGoalsFor, game.expectedGoalsAgainst)}
        sortValue={difference(
          game.expectedGoalsFor,
          game.expectedGoalsAgainst,
        )}
      />
      <Value
        value={formatPair(game.goalsFor, game.goalsAgainst, 0)}
        sortValue={difference(game.goalsFor, game.goalsAgainst)}
      />
      <Value
        value={formatPair(
          game.shotsOnGoalFor,
          game.shotsOnGoalAgainst,
          0,
        )}
        sortValue={difference(
          game.shotsOnGoalFor,
          game.shotsOnGoalAgainst,
        )}
      />
    </tr>
  );
}

export function Value({
  value,
  sortValue,
  highlight = false,
}: {
  value: string;
  sortValue: number | null;
  highlight?: boolean;
}) {
  return (
    <td
      data-sort-value={sortValue ?? ""}
      className={highlight ? "workspace-points-cell" : "workspace-semantic-number"}
    >
      {value}
    </td>
  );
}
