"use client";
import type {
  PlayoffRound,
  PlayoffSeries
} from "@/contracts/playoffs";
import { TeamLogo } from "@/features/teams/team-logo";
import { useState } from "react";
import { SeriesDialog } from './dialog';
import { SelectedSeries, formatMatchup } from './logic';
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
      <div className="workspace-bracket-container">
        <p className="workspace-bracket-scroll-hint">
          Scroll sideways to see every round →
        </p>
        <div
          className="workspace-bracket-scroll"
          role="region"
          aria-label="Playoff bracket rounds"
          tabIndex={0}
        >
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
      </div>

      <SeriesDialog
        key={selected?.series.id ?? "closed"}
        selected={selected}
        seasonId={seasonId}
        isProjection={isProjection}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

export function SeriesButton({
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

export function BracketTeam({
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
    <span className={winner ? "is-winner" : ""} data-seeded={Boolean(team?.seedLabel)}>
      {team ? (
        <>
          {team.seedLabel ? <small>{team.seedLabel}</small> : null}
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
