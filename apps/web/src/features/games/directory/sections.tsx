import Link from "@/components/ui/exploration-link";
import {
  formatGameState,
  type GameSummary
} from "@/contracts/game";
import { LocalGameTime } from "@/features/games/local-game-time";
import { TeamGameRecord } from "@/features/teams/team-game-record";
import { TeamLogo } from "@/features/teams/team-logo";
import { finalLabel, hasFinalScore } from './logic';

export function GameCard({ game }: { game: GameSummary }) {
  const completed = hasFinalScore(game);

  return (
    <article className="workspace-game-card">
      <div className="workspace-game-card-header">
        <strong data-complete={completed}>
          {completed ? finalLabel(game.lastPeriodType) : formatGameState(game.state)}
        </strong>
      </div>
      <div className="workspace-game-card-teams">
        <TeamLine team={game.awayTeam} seasonId={game.seasonId} side="away" />
        <TeamLine team={game.homeTeam} seasonId={game.seasonId} side="home" />
      </div>
      <div className="workspace-game-card-footer">
        <span>
          <LocalGameTime value={game.startTimeUtc} /> start
        </span>
        <Link
          href={`/games/${game.nhlGameId}`}
          aria-label={`${completed ? "View box score" : "Open game preview"}: ${game.awayTeam.name} at ${game.homeTeam.name}`}
        >
          {completed ? "View box score" : "Game preview"} →
        </Link>
      </div>
    </article>
  );
}

export function TeamLine({
  team,
  seasonId,
  side,
}: {
  team: GameSummary["awayTeam"];
  seasonId: number;
  side: "away" | "home";
}) {
  return (
    <div className="workspace-game-team">
      <TeamLogo
        nhlTeamId={team.nhlTeamId}
        abbreviation={team.abbreviation}
        name={team.name}
        size="compact"
        decorative
        prominent
      />
      <div>
        <div className="workspace-game-team-name">
          <span className="workspace-game-team-venue">{side}</span>
          <Link href={`/teams/${team.nhlTeamId}?season=${seasonId}`}>
            {team.name}
          </Link>
          {team.score !== null ? <TeamGameRecord record={team.record} /> : null}
        </div>
        <p>
          {team.shotsOnGoal === null
            ? team.score !== null ? "Shots unavailable" : null
            : `${team.shotsOnGoal} shots`}
        </p>
      </div>
      <strong>
        {team.score ?? ""}
      </strong>
    </div>
  );
}
