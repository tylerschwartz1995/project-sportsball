"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { TeamLogo } from "@/app/_components/team-logo";
import { formatGameState } from "@/contracts/game";
import type {
  PlayoffBracketTeam,
  PlayoffRound,
  PlayoffSeries,
  PlayoffSeriesGame,
  PlayoffSeriesGameTeam,
  PlayoffSeriesSituationAnalytics,
  PlayoffSeriesTeamAnalytics,
} from "@/contracts/playoffs";
import { summarizePlayoffSeries } from "@/lib/playoff-series";

type SelectedSeries = {
  roundName: string;
  series: PlayoffSeries;
};

type SeriesTab = "overview" | "games" | "analytics" | "leaders";

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
        key={selected?.series.id ?? "closed"}
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
  const tabPanelId = useId();
  const [activeTab, setActiveTab] = useState<SeriesTab>("overview");

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

          <SeriesTabs
            activeTab={activeTab}
            gameCount={series.games.length}
            panelId={tabPanelId}
            onSelect={setActiveTab}
          />
          <div
            id={tabPanelId}
            className="workspace-series-panel"
            role="tabpanel"
            aria-label={`${seriesTabLabel(activeTab)} series details`}
          >
            {activeTab === "overview" ? (
              <SeriesOverview series={series} isProjection={isProjection} />
            ) : null}
            {activeTab === "games" ? (
              <SeriesGames series={series} isProjection={isProjection} />
            ) : null}
            {activeTab === "analytics" ? (
              <SeriesAnalytics series={series} />
            ) : null}
            {activeTab === "leaders" ? (
              <SeriesLeaders series={series} seasonId={seasonId} />
            ) : null}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

function SeriesTabs({
  activeTab,
  gameCount,
  panelId,
  onSelect,
}: {
  activeTab: SeriesTab;
  gameCount: number;
  panelId: string;
  onSelect: (tab: SeriesTab) => void;
}) {
  const tabs: { id: SeriesTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "games", label: `Games (${gameCount})` },
    { id: "analytics", label: "Team Analytics" },
    { id: "leaders", label: "Player Leaders" },
  ];

  return (
    <div className="workspace-series-tabs" role="tablist" aria-label="Series details">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={panelId}
          className={activeTab === tab.id ? "is-active" : ""}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function SeriesOverview({
  series,
  isProjection,
}: {
  series: PlayoffSeries;
  isProjection: boolean;
}) {
  const summary = summarizePlayoffSeries(series);

  if (!summary) {
    return (
      <SeriesEmptyState>
        {isProjection
          ? "Series statistics will appear after the matchup begins."
          : "Completed box scores are not available for this series yet."}
      </SeriesEmptyState>
    );
  }

  return (
    <section className="workspace-series-overview" aria-label="Series overview">
      <div className="workspace-series-context">
        <span>{summary.gamesPlayed} games</span>
        <span>
          {summary.oneGoalGames} one-goal {pluralizeGame(summary.oneGoalGames)}
        </span>
        <span>
          {summary.overtimeGames} overtime {pluralizeGame(summary.overtimeGames)}
        </span>
      </div>
      <div className="workspace-series-comparison">
        <ComparisonTeamHeader team={summary.teamOne.team} />
        <span>Series Total</span>
        <ComparisonTeamHeader team={summary.teamTwo.team} align="right" />
        <ComparisonRow
          left={String(summary.teamOne.wins)}
          label="Wins"
          right={String(summary.teamTwo.wins)}
        />
        <ComparisonRow
          left={String(summary.teamOne.goals)}
          label="Goals"
          right={String(summary.teamTwo.goals)}
        />
        <ComparisonRow
          left={summary.teamOne.goalsPerGame.toFixed(2)}
          label="Goals Per Game"
          right={summary.teamTwo.goalsPerGame.toFixed(2)}
        />
        <ComparisonRow
          left={formatCount(summary.teamOne.shotsOnGoal)}
          label="Shots On Goal"
          right={formatCount(summary.teamTwo.shotsOnGoal)}
        />
        <ComparisonRow
          left={formatDecimal(summary.teamOne.shotsPerGame)}
          label="Shots Per Game"
          right={formatDecimal(summary.teamTwo.shotsPerGame)}
        />
        <ComparisonRow
          left={formatPercentage(summary.teamOne.shotShare)}
          label="Shot Share"
          right={formatPercentage(summary.teamTwo.shotShare)}
        />
      </div>
    </section>
  );
}

function ComparisonTeamHeader({
  team,
  align = "left",
}: {
  team: PlayoffBracketTeam;
  align?: "left" | "right";
}) {
  return (
    <div className={`workspace-series-comparison-team is-${align}`}>
      <TeamLogo
        nhlTeamId={team.nhlTeamId}
        abbreviation={team.abbreviation}
        name={team.name}
        size="tiny"
        decorative
        prominent
      />
      <strong>{team.abbreviation}</strong>
    </div>
  );
}

function ComparisonRow({
  left,
  label,
  right,
}: {
  left: string;
  label: string;
  right: string;
}) {
  return (
    <div className="workspace-series-stat-row">
      <strong>{left}</strong>
      <span>{label}</span>
      <strong>{right}</strong>
    </div>
  );
}

function SeriesGames({
  series,
  isProjection,
}: {
  series: PlayoffSeries;
  isProjection: boolean;
}) {
  return (
    <section className="workspace-series-games" aria-label="Series games">
      <div className="workspace-series-games-heading">
        <h3>Series Games</h3>
        <span>
          {series.games.length} {series.games.length === 1 ? "game" : "games"}
        </span>
      </div>
      {series.games.length > 0 ? (
        <div>
          {series.games.map((game) => (
            <SeriesGame key={game.nhlGameId} game={game} />
          ))}
        </div>
      ) : (
        <SeriesEmptyState>
          {isProjection
            ? "Games will appear here once the playoff schedule is available."
            : "No games are stored for this series yet."}
        </SeriesEmptyState>
      )}
    </section>
  );
}

function SeriesAnalytics({ series }: { series: PlayoffSeries }) {
  if (series.teamAnalytics.length === 0) {
    return (
      <SeriesEmptyState>
        Advanced team-game data is unavailable for this series. MoneyPuck
        playoff coverage begins in 2008–09.
      </SeriesEmptyState>
    );
  }

  const orderedTeams = [series.teamOne, series.teamTwo]
    .filter((team): team is PlayoffBracketTeam => Boolean(team))
    .map((team) =>
      series.teamAnalytics.find(
        (analytics) => analytics.nhlTeamId === team.nhlTeamId,
      ),
    )
    .filter((team): team is PlayoffSeriesTeamAnalytics => Boolean(team));

  return (
    <section className="workspace-series-analytics" aria-label="Series team analytics">
      <div className="workspace-series-section-heading">
        <div>
          <h3>Team Analytics</h3>
          <p>Aggregated across every stored game in this series.</p>
        </div>
        <a href="https://moneypuck.com/" target="_blank" rel="noreferrer">
          Data: MoneyPuck.com ↗
        </a>
      </div>
      <div className="workspace-series-analytics-grid">
        {orderedTeams.map((team) => (
          <SeriesAnalyticsTeam key={team.nhlTeamId} team={team} />
        ))}
      </div>
    </section>
  );
}

function SeriesAnalyticsTeam({ team }: { team: PlayoffSeriesTeamAnalytics }) {
  return (
    <article className="workspace-series-analytics-team">
      <header>
        <TeamLogo
          nhlTeamId={team.nhlTeamId}
          abbreviation={team.abbreviation}
          name={team.name}
          size="compact"
          decorative
          prominent
        />
        <span>
          <small>{team.abbreviation}</small>
          <strong>{team.name}</strong>
        </span>
      </header>
      <AnalyticsGroup title="All Situations" metrics={team.allSituations} />
      <AnalyticsGroup title="Five-On-Five" metrics={team.fiveOnFive} />
    </article>
  );
}

function AnalyticsGroup({
  title,
  metrics,
}: {
  title: string;
  metrics: PlayoffSeriesSituationAnalytics | null;
}) {
  return (
    <div className="workspace-series-analytics-group">
      <h4>{title}</h4>
      {metrics ? (
        <dl>
          <div>
            <dt>Expected Goals</dt>
            <dd>{formatDecimal(metrics.expectedGoalsFor)}</dd>
          </div>
          <div>
            <dt>xG Share</dt>
            <dd>{formatPercentage(metrics.expectedGoalsShare)}</dd>
          </div>
          <div>
            <dt>Shot-Attempt Share</dt>
            <dd>{formatPercentage(metrics.shotAttemptShare)}</dd>
          </div>
        </dl>
      ) : (
        <p>Not available</p>
      )}
    </div>
  );
}

function SeriesLeaders({
  series,
  seasonId,
}: {
  series: PlayoffSeries;
  seasonId: number;
}) {
  if (series.playerLeaders.length === 0) {
    return (
      <SeriesEmptyState>
        Player leaders will appear when official series box scores are stored.
      </SeriesEmptyState>
    );
  }

  return (
    <section className="workspace-series-leaders" aria-label="Series player leaders">
      <div className="workspace-series-section-heading">
        <div>
          <h3>Series Scoring Leaders</h3>
          <p>Official totals from games in this matchup only.</p>
        </div>
      </div>
      <ol>
        {series.playerLeaders.map((player, index) => (
          <li key={player.nhlPlayerId}>
            <span className="workspace-series-leader-rank">#{index + 1}</span>
            <TeamLogo
              nhlTeamId={player.nhlTeamId}
              abbreviation={player.teamAbbreviation}
              name={player.teamAbbreviation}
              size="tiny"
              decorative
              prominent
            />
            <Link
              href={`/players/${player.nhlPlayerId}?season=${seasonId}&phase=playoffs`}
            >
              <strong>{player.name}</strong>
              <small>{player.teamAbbreviation}</small>
            </Link>
            <span className="workspace-series-leader-line">
              {player.goals} G · {player.assists} A
            </span>
            <b>{player.points} PTS</b>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SeriesEmptyState({ children }: { children: ReactNode }) {
  return <p className="workspace-series-empty">{children}</p>;
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

function seriesTabLabel(tab: SeriesTab): string {
  return tab === "analytics"
    ? "Team analytics"
    : tab === "leaders"
      ? "Player leaders"
      : tab[0].toUpperCase() + tab.slice(1);
}

function formatCount(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("en-CA");
}

function formatDecimal(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function pluralizeGame(value: number): string {
  return value === 1 ? "game" : "games";
}
