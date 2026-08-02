"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { TeamLogo } from "@/app/_components/team-logo";
import { formatGameState } from "@/contracts/game";
import type {
  PlayoffBracketTeam,
  PlayoffRound,
  PlayoffSeries,
  PlayoffSeriesGame,
  PlayoffSeriesGameTeam,
} from "@/contracts/playoffs";

type SelectedSeries = {
  roundName: string;
  series: PlayoffSeries;
};

const gameDateFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function PlayoffBracket({
  rounds,
  seasonId,
  isProjection,
}: {
  rounds: PlayoffRound[];
  seasonId: number;
  isProjection: boolean;
}) {
  const [selected, setSelected] = useState<SelectedSeries | null>(null);
  const firstRound = rounds.find((round) => round.round === 1)?.series ?? [];
  const secondRound = rounds.find((round) => round.round === 2)?.series ?? [];
  const conferenceFinals =
    rounds.find((round) => round.round === 3)?.series ?? [];
  const final = rounds.find((round) => round.round === 4)?.series ?? [];
  const stages = [
    {
      id: "western-first",
      name: "West First Round",
      series: firstRound.filter((series) => series.matchup >= 5),
    },
    {
      id: "western-second",
      name: "West Second Round",
      series: secondRound.filter((series) => series.matchup >= 3),
    },
    {
      id: "western-final",
      name: "West Final",
      series: conferenceFinals.filter((series) => series.matchup === 2),
    },
    { id: "stanley-cup-final", name: "Stanley Cup Final", series: final },
    {
      id: "eastern-final",
      name: "East Final",
      series: conferenceFinals.filter((series) => series.matchup === 1),
    },
    {
      id: "eastern-second",
      name: "East Second Round",
      series: secondRound.filter((series) => series.matchup <= 2),
    },
    {
      id: "eastern-first",
      name: "East First Round",
      series: firstRound.filter((series) => series.matchup <= 4),
    },
  ];

  return (
    <>
      <div className="workspace-bracket-scroll">
        <div className="workspace-bracket">
          {stages.map((stage) => (
            <section key={stage.id} className="workspace-bracket-round">
              <h3>{stage.name}</h3>
              <div>
                {stage.series.map((series) => (
                  <SeriesButton
                    key={series.id}
                    series={series}
                    isProjection={isProjection}
                    onSelect={() =>
                      setSelected({ roundName: stage.name, series })
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <SeriesDialog
        selected={selected}
        seasonId={seasonId}
        isProjection={isProjection}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function SeriesButton({
  series,
  isProjection,
  onSelect,
}: {
  series: PlayoffSeries;
  isProjection: boolean;
  onSelect: () => void;
}) {
  const empty = !series.teamOne && !series.teamTwo;
  const matchup = formatMatchup(series);

  return (
    <button
      type="button"
      className={`workspace-bracket-series ${empty ? "is-empty" : ""}`}
      disabled={empty}
      aria-haspopup={empty ? undefined : "dialog"}
      aria-label={empty ? "Matchup to be determined" : `View ${matchup}`}
      onClick={onSelect}
    >
      <BracketTeam
        team={series.teamOne}
        wins={series.teamOneWins}
        winner={series.winnerNhlTeamId === series.teamOne?.nhlTeamId}
        showWins={!isProjection}
      />
      <BracketTeam
        team={series.teamTwo}
        wins={series.teamTwoWins}
        winner={series.winnerNhlTeamId === series.teamTwo?.nhlTeamId}
        showWins={!isProjection}
      />
    </button>
  );
}

function BracketTeam({
  team,
  wins,
  winner,
  showWins,
}: {
  team: PlayoffSeries["teamOne"];
  wins: number;
  winner: boolean;
  showWins: boolean;
}) {
  return (
    <span className={winner ? "is-winner" : ""}>
      {team ? (
        <>
          <small>{team.seedLabel ?? ""}</small>
          <TeamLogo
            nhlTeamId={team.nhlTeamId}
            abbreviation={team.abbreviation}
            name={team.name}
            size="tiny"
            decorative
            prominent
          />
          <span className="workspace-bracket-team-name">
            {team.abbreviation}
          </span>
          {showWins ? <strong>{wins}</strong> : null}
        </>
      ) : (
        <span className="workspace-bracket-tbd">To Be Determined</span>
      )}
    </span>
  );
}

function SeriesDialog({
  selected,
  seasonId,
  isProjection,
  onClose,
}: {
  selected: SelectedSeries | null;
  seasonId: number;
  isProjection: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selected && !dialog.open) {
      dialog.showModal();
    } else if (!selected && dialog.open) {
      dialog.close();
    }
  }, [selected]);

  const series = selected?.series ?? null;

  return (
    <dialog
      ref={dialogRef}
      className="workspace-series-dialog"
      aria-labelledby={series ? titleId : undefined}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.close();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          event.currentTarget.close();
        }
      }}
    >
      {series ? (
        <div className="workspace-series-dialog-card">
          <header>
            <div>
              <p>{selected?.roundName}</p>
              <h2 id={titleId}>{formatMatchup(series)}</h2>
              <span>{formatSeriesStatus(series, isProjection)}</span>
            </div>
            <button
              type="button"
              aria-label="Close series details"
              onClick={() => dialogRef.current?.close()}
            >
              ×
            </button>
          </header>

          <div className="workspace-series-matchup">
            <SeriesTeam
              team={series.teamOne}
              wins={series.teamOneWins}
              winner={series.winnerNhlTeamId === series.teamOne?.nhlTeamId}
              seasonId={seasonId}
              isProjection={isProjection}
            />
            <span className="workspace-series-versus">
              {isProjection ? "VS" : "Series"}
            </span>
            <SeriesTeam
              team={series.teamTwo}
              wins={series.teamTwoWins}
              winner={series.winnerNhlTeamId === series.teamTwo?.nhlTeamId}
              seasonId={seasonId}
              isProjection={isProjection}
              align="right"
            />
          </div>

          <section className="workspace-series-games" aria-label="Series games">
            <div className="workspace-series-games-heading">
              <h3>Series Games</h3>
              <span>
                {series.games.length}{" "}
                {series.games.length === 1 ? "game" : "games"}
              </span>
            </div>
            {series.games.length > 0 ? (
              <div>
                {series.games.map((game) => (
                  <SeriesGame key={game.nhlGameId} game={game} />
                ))}
              </div>
            ) : (
              <p className="workspace-series-games-empty">
                {isProjection
                  ? "Games will appear here once the playoff schedule is available."
                  : "No games are stored for this series yet."}
              </p>
            )}
          </section>
        </div>
      ) : null}
    </dialog>
  );
}

function SeriesTeam({
  team,
  wins,
  winner,
  seasonId,
  isProjection,
  align = "left",
}: {
  team: PlayoffBracketTeam | null;
  wins: number;
  winner: boolean;
  seasonId: number;
  isProjection: boolean;
  align?: "left" | "right";
}) {
  if (!team) {
    return <div className="workspace-series-team is-empty">To Be Determined</div>;
  }

  return (
    <Link
      href={`/teams/${team.nhlTeamId}?season=${seasonId}`}
      className={`workspace-series-team is-${align}${
        winner ? " is-winner" : ""
      }`}
    >
      <TeamLogo
        nhlTeamId={team.nhlTeamId}
        abbreviation={team.abbreviation}
        name={team.name}
        size="compact"
        decorative
        prominent
      />
      <span>
        <small>{team.seedLabel ?? team.abbreviation}</small>
        <strong>{team.name}</strong>
      </span>
      <b>{isProjection ? "—" : wins}</b>
    </Link>
  );
}

function SeriesGame({ game }: { game: PlayoffSeriesGame }) {
  const gameNumber = game.nhlGameId % 10;
  const state = formatSeriesGameState(game);

  return (
    <Link
      href={`/games/${game.nhlGameId}`}
      className="workspace-series-game"
      aria-label={`View Game ${gameNumber}: ${game.awayTeam.name} at ${game.homeTeam.name}`}
    >
      <div className="workspace-series-game-meta">
        <strong>Game {gameNumber}</strong>
        <time dateTime={game.startTimeUtc}>{formatGameDate(game)}</time>
        <span>{state}</span>
      </div>
      <div className="workspace-series-game-score">
        <SeriesGameTeam team={game.awayTeam} location="Away" />
        <span className="workspace-series-game-at">at</span>
        <SeriesGameTeam team={game.homeTeam} location="Home" />
      </div>
      <span className="workspace-series-game-link">View Game →</span>
    </Link>
  );
}

function SeriesGameTeam({
  team,
  location,
}: {
  team: PlayoffSeriesGameTeam;
  location: "Away" | "Home";
}) {
  return (
    <span className="workspace-series-game-team">
      <TeamLogo
        nhlTeamId={team.nhlTeamId}
        abbreviation={team.abbreviation}
        name={team.name}
        size="tiny"
        decorative
        prominent
      />
      <span>
        <small>{location}</small>
        <strong>{team.abbreviation}</strong>
      </span>
      <b>{team.score ?? "—"}</b>
    </span>
  );
}

function formatMatchup(series: PlayoffSeries): string {
  const teamOne = series.teamOne?.name ?? "To Be Determined";
  const teamTwo = series.teamTwo?.name ?? "To Be Determined";
  return `${teamOne} vs. ${teamTwo}`;
}

function formatSeriesStatus(
  series: PlayoffSeries,
  isProjection: boolean,
): string {
  if (isProjection) return "Projected matchup";

  const winner =
    series.teamOne?.nhlTeamId === series.winnerNhlTeamId
      ? series.teamOne
      : series.teamTwo?.nhlTeamId === series.winnerNhlTeamId
        ? series.teamTwo
        : null;
  if (winner) {
    const winnerWins = Math.max(series.teamOneWins, series.teamTwoWins);
    const loserWins = Math.min(series.teamOneWins, series.teamTwoWins);
    return `${winner.name} won ${winnerWins}–${loserWins}`;
  }
  if (series.games.length === 0) return "Series not started";
  if (series.teamOneWins === series.teamTwoWins) {
    return `Series tied ${series.teamOneWins}–${series.teamTwoWins}`;
  }

  const leader =
    series.teamOneWins > series.teamTwoWins ? series.teamOne : series.teamTwo;
  const leaderWins = Math.max(series.teamOneWins, series.teamTwoWins);
  const trailerWins = Math.min(series.teamOneWins, series.teamTwoWins);
  return `${leader?.name ?? "Series leader"} leads ${leaderWins}–${trailerWins}`;
}

function formatSeriesGameState(game: PlayoffSeriesGame): string {
  const state = formatGameState(game.state);
  if (state === "FINAL" || state === "OFF") {
    return game.lastPeriodType && game.lastPeriodType !== "REG"
      ? `Final · ${game.lastPeriodType}`
      : "Final";
  }
  return state;
}

function formatGameDate(game: PlayoffSeriesGame): string {
  return gameDateFormatter.format(new Date(`${game.gameDate}T12:00:00Z`));
}
