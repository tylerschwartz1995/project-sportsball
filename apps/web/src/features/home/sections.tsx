import Link from "@/components/ui/exploration-link";
import type { GameSummary } from "@/contracts/game";
import { TeamLogo } from "@/features/teams/team-logo";
import { finalLabel, formatSeason, formatUpcomingTime } from './logic';

export function UpcomingGame({ game }: { game: GameSummary }) {
  return (
    <Link href={`/games/${game.nhlGameId}`}>
      <time dateTime={game.startTimeUtc}>{formatUpcomingTime(game.startTimeUtc)}</time>
      <span className="inline-flex items-center gap-1.5">
        <TeamLogo {...game.awayTeam} size="tiny" decorative />
        <b>{game.awayTeam.abbreviation}</b>
        at
        <TeamLogo {...game.homeTeam} size="tiny" decorative />
        <b>{game.homeTeam.abbreviation}</b>
      </span>
      <small>{game.gameType === 3 ? "Playoffs" : formatSeason(game.seasonId)}</small>
    </Link>
  );
}

export function GameResult({ game }: { game: GameSummary }) {
  return (
    <Link href={`/games/${game.nhlGameId}`} className="workspace-result-row">
      <span className="workspace-result-status">
        <small>{game.gameType === 3 ? "Playoffs" : "Regular"}</small>
        <b>{finalLabel(game.lastPeriodType)}</b>
      </span>
      <span className="workspace-result-matchup">
        <span>
          <TeamLogo {...game.awayTeam} size="tiny" decorative />
          <b>{game.awayTeam.abbreviation}</b>
          <strong>{game.awayTeam.score ?? "—"}</strong>
        </span>
        <span aria-hidden="true">–</span>
        <span>
          <strong>{game.homeTeam.score ?? "—"}</strong>
          <b>{game.homeTeam.abbreviation}</b>
          <TeamLogo {...game.homeTeam} size="tiny" decorative />
        </span>
      </span>
    </Link>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="workspace-empty-state">{message}</div>;
}
