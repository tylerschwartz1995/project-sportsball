"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogo } from "@/app/_components/team-logo";
import { formatGameState } from "@/contracts/game";
import type {
  PlayoffBracketTeam,
  PlayoffRound,
  PlayoffSeries,
  PlayoffSeriesAdvancedGoalieStats,
  PlayoffSeriesAdvancedSkaterStats,
  PlayoffSeriesGame,
  PlayoffSeriesGameTeam,
  PlayoffSeriesGoalieStats,
  PlayoffSeriesPlayerStatsPackage,
  PlayoffSeriesSkaterStats,
} from "@/contracts/playoffs";
import { formatPlayerPosition } from "@/lib/player-position";
import { summarizePlayoffSeries } from "@/lib/playoff-series";

type SelectedSeries = {
  roundName: string;
  series: PlayoffSeries;
};

type SeriesTab = "overview" | "games" | "players" | "advanced";
type PlayerStatsView = "skaters" | "goalies";

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
  const panelRef = useRef<HTMLDivElement>(null);
  const tabPanelId = useId();
  const [activeTab, setActiveTab] = useState<SeriesTab>("overview");
  const [playerStats, setPlayerStats] =
    useState<PlayoffSeriesPlayerStatsPackage | null>(null);
  const [playerStatsError, setPlayerStatsError] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selected && !dialog.open) {
      dialog.showModal();
      dialog.focus();
    } else if (!selected && dialog.open) {
      dialog.close();
    }
  }, [selected]);

  const series = selected?.series ?? null;
  const needsPlayerStats = activeTab === "players" || activeTab === "advanced";
  const resetPanelScroll = () => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  };
  const selectTab = (tab: SeriesTab) => {
    resetPanelScroll();
    setActiveTab(tab);
  };

  useEffect(() => {
    if (!series || !needsPlayerStats || playerStats || playerStatsError) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      season: String(seasonId),
      round: String(series.round),
      matchup: String(series.matchup),
    });

    fetch(`/api/playoffs/series?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Series stats request failed: ${response.status}`);
        return (await response.json()) as {
          data: PlayoffSeriesPlayerStatsPackage;
        };
      })
      .then((response) => setPlayerStats(response.data))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPlayerStatsError(true);
      });

    return () => controller.abort();
  }, [needsPlayerStats, playerStats, playerStatsError, seasonId, series]);

  return (
    <dialog
      ref={dialogRef}
      className="workspace-series-dialog"
      tabIndex={-1}
      aria-label={series ? `${formatMatchup(series)} series details` : undefined}
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
          <header className="workspace-series-masthead">
            <div className="workspace-series-masthead-bar">
              <p>{selected?.roundName}</p>
              <button
                type="button"
                aria-label="Close series details"
                onClick={() => dialogRef.current?.close()}
              >
                ×
              </button>
            </div>
            <div className="workspace-series-matchup">
              <SeriesTeam
                team={series.teamOne}
                winner={series.winnerNhlTeamId === series.teamOne?.nhlTeamId}
                seasonId={seasonId}
              />
              <span className="workspace-series-score">
                <strong>
                  {isProjection
                    ? "VS"
                    : `${series.teamOneWins}–${series.teamTwoWins}`}
                </strong>
                <small>{formatSeriesMastheadStatus(series, isProjection)}</small>
              </span>
              <SeriesTeam
                team={series.teamTwo}
                winner={series.winnerNhlTeamId === series.teamTwo?.nhlTeamId}
                seasonId={seasonId}
                align="right"
              />
            </div>
          </header>

          <SeriesTabs
            activeTab={activeTab}
            gameCount={series.games.length}
            hasStarted={series.games.some(
              (game) => game.awayTeam.score !== null && game.homeTeam.score !== null,
            )}
            hasAdvancedAnalytics={seasonId >= 20072008}
            panelId={tabPanelId}
            onSelect={selectTab}
          />
          <div
            ref={panelRef}
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
            {activeTab === "players" ? (
              <SeriesPlayerStats
                data={playerStats}
                hasError={playerStatsError}
                seasonId={seasonId}
                onViewChange={resetPanelScroll}
              />
            ) : null}
            {activeTab === "advanced" ? (
              <SeriesAdvancedStats
                data={playerStats}
                hasError={playerStatsError}
                seasonId={seasonId}
                onViewChange={resetPanelScroll}
              />
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
  hasStarted,
  hasAdvancedAnalytics,
  panelId,
  onSelect,
}: {
  activeTab: SeriesTab;
  gameCount: number;
  hasStarted: boolean;
  hasAdvancedAnalytics: boolean;
  panelId: string;
  onSelect: (tab: SeriesTab) => void;
}) {
  const tabs: { id: SeriesTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "games", label: `Games (${gameCount})` },
    ...(hasStarted
      ? [
          { id: "players" as const, label: "Player Stats" },
          ...(hasAdvancedAnalytics
            ? [{ id: "advanced" as const, label: "Advanced Analytics" }]
            : []),
        ]
      : []),
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
  const teamOneAnalytics = series.teamAnalytics.find(
    (team) => team.nhlTeamId === series.teamOne?.nhlTeamId,
  );
  const teamTwoAnalytics = series.teamAnalytics.find(
    (team) => team.nhlTeamId === series.teamTwo?.nhlTeamId,
  );
  const hasTeamAnalytics = Boolean(teamOneAnalytics && teamTwoAnalytics);

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
      <div className="workspace-series-comparison">
        <ComparisonTeamHeader team={summary.teamOne.team} />
        <span>Series Results</span>
        <ComparisonTeamHeader team={summary.teamTwo.team} align="right" />
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
          label="Shot-on-Goal Share"
          right={formatPercentage(summary.teamTwo.shotShare)}
        />
        {hasTeamAnalytics ? (
          <>
            <ComparisonDivider />
            <ComparisonRow
              left={formatDecimal(
                teamOneAnalytics?.allSituations?.expectedGoalsFor ?? null,
              )}
              label="Expected Goals"
              right={formatDecimal(
                teamTwoAnalytics?.allSituations?.expectedGoalsFor ?? null,
              )}
            />
            <ComparisonRow
              left={formatPercentage(
                teamOneAnalytics?.allSituations?.expectedGoalsShare ?? null,
              )}
              label="Expected Goal Share"
              right={formatPercentage(
                teamTwoAnalytics?.allSituations?.expectedGoalsShare ?? null,
              )}
            />
            <ComparisonRow
              left={formatDecimal(
                teamOneAnalytics?.fiveOnFive?.expectedGoalsFor ?? null,
              )}
              label="Five-On-Five Expected Goals"
              right={formatDecimal(
                teamTwoAnalytics?.fiveOnFive?.expectedGoalsFor ?? null,
              )}
            />
            <ComparisonRow
              left={formatPercentage(
                teamOneAnalytics?.fiveOnFive?.expectedGoalsShare ?? null,
              )}
              label="Five-On-Five Expected Goal Share"
              right={formatPercentage(
                teamTwoAnalytics?.fiveOnFive?.expectedGoalsShare ?? null,
              )}
            />
            <ComparisonRow
              left={formatPercentage(
                teamOneAnalytics?.fiveOnFive?.shotAttemptShare ?? null,
              )}
              label="Five-On-Five Shot-Attempt Share"
              right={formatPercentage(
                teamTwoAnalytics?.fiveOnFive?.shotAttemptShare ?? null,
              )}
            />
          </>
        ) : null}
      </div>
      {hasTeamAnalytics ? (
        <a
          className="workspace-series-data-source"
          href="https://moneypuck.com/"
          target="_blank"
          rel="noreferrer"
        >
          Team analytics: MoneyPuck.com ↗
        </a>
      ) : (
        <p className="workspace-series-overview-note">
          Advanced team metrics are unavailable for this series.
        </p>
      )}
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

function ComparisonDivider() {
  return (
    <div className="workspace-series-comparison-divider">
      <span>Team Analytics</span>
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
  const { gamesWithProgress } = series.games.reduce<{
    teamOneWins: number;
    teamTwoWins: number;
    gamesWithProgress: Array<{
      game: PlayoffSeriesGame;
      seriesProgress: string | null;
    }>;
  }>(
    (progress, game) => {
      const isCompleted =
        game.awayTeam.score !== null && game.homeTeam.score !== null;
      const winningTeamId = isCompleted
        ? game.awayTeam.score! > game.homeTeam.score!
          ? game.awayTeam.nhlTeamId
          : game.homeTeam.nhlTeamId
        : null;
      const teamOneWins =
        progress.teamOneWins +
        (winningTeamId === series.teamOne?.nhlTeamId ? 1 : 0);
      const teamTwoWins =
        progress.teamTwoWins +
        (winningTeamId === series.teamTwo?.nhlTeamId ? 1 : 0);

      return {
        teamOneWins,
        teamTwoWins,
        gamesWithProgress: [
          ...progress.gamesWithProgress,
          {
            game,
            seriesProgress: isCompleted
              ? formatSeriesProgress(series, teamOneWins, teamTwoWins)
              : null,
          },
        ],
      };
    },
    { teamOneWins: 0, teamTwoWins: 0, gamesWithProgress: [] },
  );

  return (
    <section className="workspace-series-games" aria-label="Series games">
      {series.games.length > 0 ? (
        <div>
          {gamesWithProgress.map(({ game, seriesProgress }) => (
            <SeriesGame
              key={game.nhlGameId}
              game={game}
              seriesProgress={seriesProgress}
            />
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

function SeriesPlayerStats({
  data,
  hasError,
  seasonId,
  onViewChange,
}: {
  data: PlayoffSeriesPlayerStatsPackage | null;
  hasError: boolean;
  seasonId: number;
  onViewChange: () => void;
}) {
  const [view, setView] = useState<PlayerStatsView>("skaters");

  if (hasError) {
    return (
      <SeriesEmptyState>
        Series player statistics are temporarily unavailable.
      </SeriesEmptyState>
    );
  }
  if (!data) return <SeriesLoadingState />;
  if (data.skaters.length === 0 && data.goalies.length === 0) {
    return (
      <SeriesEmptyState>
        Official player statistics are not available for this series.
      </SeriesEmptyState>
    );
  }

  return (
    <section className="workspace-series-player-stats" aria-label="Series player statistics">
      <div className="workspace-series-section-heading">
        <p>Official NHL totals from this series only.</p>
        <StatsViewToggle
          value={view}
          onChange={(nextView) => {
            onViewChange();
            setView(nextView);
          }}
        />
      </div>
      {view === "skaters" ? (
        <SeriesSkaterTable players={data.skaters} seasonId={seasonId} />
      ) : (
        <SeriesGoalieTable players={data.goalies} seasonId={seasonId} />
      )}
    </section>
  );
}

function SeriesAdvancedStats({
  data,
  hasError,
  seasonId,
  onViewChange,
}: {
  data: PlayoffSeriesPlayerStatsPackage | null;
  hasError: boolean;
  seasonId: number;
  onViewChange: () => void;
}) {
  const [view, setView] = useState<PlayerStatsView>("skaters");

  if (hasError) {
    return (
      <SeriesEmptyState>
        Advanced player analytics are temporarily unavailable.
      </SeriesEmptyState>
    );
  }
  if (!data) return <SeriesLoadingState />;
  if (data.advancedSkaters.length === 0 && data.advancedGoalies.length === 0) {
    return (
      <SeriesEmptyState>
        Advanced player analytics are unavailable for this series. MoneyPuck
        playoff shot coverage begins in 2007–08.
      </SeriesEmptyState>
    );
  }

  return (
    <section
      className="workspace-series-player-stats"
      aria-label="Series advanced player analytics"
    >
      <div className="workspace-series-section-heading">
        <p>MoneyPuck shot-model results from this series only.</p>
        <StatsViewToggle
          value={view}
          onChange={(nextView) => {
            onViewChange();
            setView(nextView);
          }}
        />
      </div>
      {view === "skaters" ? (
        <SeriesAdvancedSkaterTable
          players={data.advancedSkaters}
          seasonId={seasonId}
        />
      ) : (
        <SeriesAdvancedGoalieTable
          players={data.advancedGoalies}
          seasonId={seasonId}
        />
      )}
      <a
        className="workspace-series-data-source"
        href="https://moneypuck.com/"
        target="_blank"
        rel="noreferrer"
      >
        Data: MoneyPuck.com ↗
      </a>
    </section>
  );
}

function StatsViewToggle({
  value,
  onChange,
}: {
  value: PlayerStatsView;
  onChange: (view: PlayerStatsView) => void;
}) {
  return (
    <div className="workspace-series-stats-toggle" role="group" aria-label="Player type">
      <button
        type="button"
        className={value === "skaters" ? "is-active" : ""}
        aria-pressed={value === "skaters"}
        onClick={() => onChange("skaters")}
      >
        Skaters
      </button>
      <button
        type="button"
        className={value === "goalies" ? "is-active" : ""}
        aria-pressed={value === "goalies"}
        onClick={() => onChange("goalies")}
      >
        Goalies
      </button>
    </div>
  );
}

function SeriesSkaterTable({
  players,
  seasonId,
}: {
  players: PlayoffSeriesSkaterStats[];
  seasonId: number;
}) {
  if (players.length === 0) return <SeriesEmptyState>No skater totals are available.</SeriesEmptyState>;
  return (
    <SortableTable defaultSortKey="points">
      <div className="workspace-series-table-scroll">
        <table className="workspace-series-table min-w-[920px]">
          <thead>
            <tr>
              <SortableHeader label="Player" sortKey="player" align="left" />
              <SortableHeader label="Pos" sortKey="position" description="Position" />
              <SortableHeader label="GP" sortKey="games" description="Games played" />
              <SortableHeader label="G" sortKey="goals" description="Goals" />
              <SortableHeader label="A" sortKey="assists" description="Assists" />
              <SortableHeader label="PTS" sortKey="points" description="Points" />
              <SortableHeader label="+/-" sortKey="plusMinus" description="Plus/minus" />
              <SortableHeader label="PIM" sortKey="penaltyMinutes" description="Penalty minutes" />
              <SortableHeader label="SOG" sortKey="shots" description="Shots on goal" />
              <SortableHeader label="HIT" sortKey="hits" description="Hits" />
              <SortableHeader label="BLK" sortKey="blocks" description="Blocked shots" />
              <SortableHeader label="TOI" sortKey="timeOnIce" description="Total time on ice" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.nhlPlayerId}>
                <SeriesPlayerCell player={player} seasonId={seasonId} />
                <SeriesNumberCell value={player.position}>
                  {formatPlayerPosition(player.position)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.gamesPlayed} />
                <SeriesNumberCell value={player.goals} />
                <SeriesNumberCell value={player.assists} />
                <SeriesNumberCell value={player.points} highlight />
                <SeriesNumberCell value={player.plusMinus} signed />
                <SeriesNumberCell value={player.penaltyMinutes} />
                <SeriesNumberCell value={player.shotsOnGoal} />
                <SeriesNumberCell value={player.hits} />
                <SeriesNumberCell value={player.blockedShots} />
                <SeriesNumberCell value={player.timeOnIceSeconds}>
                  {formatTimeOnIce(player.timeOnIceSeconds)}
                </SeriesNumberCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SortableTable>
  );
}

function SeriesGoalieTable({
  players,
  seasonId,
}: {
  players: PlayoffSeriesGoalieStats[];
  seasonId: number;
}) {
  if (players.length === 0) return <SeriesEmptyState>No goalie totals are available.</SeriesEmptyState>;
  return (
    <SortableTable defaultSortKey="wins">
      <div className="workspace-series-table-scroll">
        <table className="workspace-series-table min-w-[760px]">
          <thead>
            <tr>
              <SortableHeader label="Goalie" sortKey="player" align="left" />
              <SortableHeader label="GP" sortKey="games" description="Games played" />
              <SortableHeader label="GS" sortKey="starts" description="Games started" />
              <SortableHeader label="W" sortKey="wins" description="Wins" />
              <SortableHeader label="L" sortKey="losses" description="Losses" />
              <SortableHeader label="GA" sortKey="goalsAgainst" description="Goals against" />
              <SortableHeader label="SA" sortKey="shotsAgainst" description="Shots against" />
              <SortableHeader label="SV" sortKey="saves" description="Saves" />
              <SortableHeader label="SV%" sortKey="savePercentage" description="Save percentage" />
              <SortableHeader label="TOI" sortKey="timeOnIce" description="Total time on ice" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.nhlPlayerId}>
                <SeriesPlayerCell player={player} seasonId={seasonId} />
                <SeriesNumberCell value={player.gamesPlayed} />
                <SeriesNumberCell value={player.gamesStarted} />
                <SeriesNumberCell value={player.wins} highlight />
                <SeriesNumberCell value={player.losses} />
                <SeriesNumberCell value={player.goalsAgainst} />
                <SeriesNumberCell value={player.shotsAgainst} />
                <SeriesNumberCell value={player.saves} />
                <SeriesNumberCell value={player.savePercentage}>
                  {formatSavePercentage(player.savePercentage)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.timeOnIceSeconds}>
                  {formatTimeOnIce(player.timeOnIceSeconds)}
                </SeriesNumberCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SortableTable>
  );
}

function SeriesAdvancedSkaterTable({
  players,
  seasonId,
}: {
  players: PlayoffSeriesAdvancedSkaterStats[];
  seasonId: number;
}) {
  if (players.length === 0) return <SeriesEmptyState>No modeled skater shots are available.</SeriesEmptyState>;
  return (
    <SortableTable defaultSortKey="expectedGoals">
      <div className="workspace-series-table-scroll">
        <table className="workspace-series-table min-w-[850px]">
          <thead>
            <tr>
              <SortableHeader label="Player" sortKey="player" align="left" />
              <SortableHeader label="xG" sortKey="expectedGoals" description="Individual expected goals" />
              <SortableHeader label="G" sortKey="goals" />
              <SortableHeader label="G-xG" sortKey="goalsAboveExpected" description="Goals scored above expected" />
              <SortableHeader label="SOG" sortKey="shotsOnGoal" description="Shots on goal" />
              <SortableHeader label="ATT" sortKey="attempts" description="Shot attempts" />
              <SortableHeader label="SH%" sortKey="shootingPercentage" description="Shooting percentage" />
              <SortableHeader label="Rush" sortKey="rushAttempts" description="Rush shot attempts" />
              <SortableHeader label="REB" sortKey="reboundAttempts" description="Rebound attempts" />
              <SortableHeader label="Avg Dist" sortKey="averageDistance" description="Average shot distance" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.nhlPlayerId}>
                <SeriesPlayerCell player={player} seasonId={seasonId} />
                <SeriesNumberCell value={player.expectedGoals} highlight>
                  {player.expectedGoals.toFixed(2)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.goals} />
                <SeriesNumberCell value={player.goalsAboveExpected} signed>
                  {formatSignedDecimal(player.goalsAboveExpected)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.shotsOnGoal} />
                <SeriesNumberCell value={player.shotAttempts} />
                <SeriesNumberCell value={player.shootingPercentage}>
                  {formatPercentage(player.shootingPercentage)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.rushAttempts} />
                <SeriesNumberCell value={player.reboundAttempts} />
                <SeriesNumberCell value={player.averageShotDistance}>
                  {formatDistance(player.averageShotDistance)}
                </SeriesNumberCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SortableTable>
  );
}

function SeriesAdvancedGoalieTable({
  players,
  seasonId,
}: {
  players: PlayoffSeriesAdvancedGoalieStats[];
  seasonId: number;
}) {
  if (players.length === 0) return <SeriesEmptyState>No modeled goalie shots are available.</SeriesEmptyState>;
  return (
    <SortableTable defaultSortKey="goalsSavedAboveExpected">
      <div className="workspace-series-table-scroll">
        <table className="workspace-series-table min-w-[720px]">
          <thead>
            <tr>
              <SortableHeader label="Goalie" sortKey="player" align="left" />
              <SortableHeader label="SA" sortKey="shotsAgainst" description="Shots against" />
              <SortableHeader label="GA" sortKey="goalsAgainst" description="Goals against" />
              <SortableHeader label="xGA" sortKey="expectedGoalsAgainst" description="Expected goals against" />
              <SortableHeader label="GSAx" sortKey="goalsSavedAboveExpected" description="Goals saved above expected" />
              <SortableHeader label="SV" sortKey="saves" description="Saves" />
              <SortableHeader label="SV%" sortKey="savePercentage" description="Save percentage" />
              <SortableHeader label="xSV%" sortKey="expectedSavePercentage" description="Expected save percentage" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.nhlPlayerId}>
                <SeriesPlayerCell player={player} seasonId={seasonId} />
                <SeriesNumberCell value={player.shotsAgainst} />
                <SeriesNumberCell value={player.goalsAgainst} />
                <SeriesNumberCell value={player.expectedGoalsAgainst}>
                  {player.expectedGoalsAgainst.toFixed(2)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.goalsSavedAboveExpected} highlight signed>
                  {formatSignedDecimal(player.goalsSavedAboveExpected)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.saves} />
                <SeriesNumberCell value={player.savePercentage}>
                  {formatSavePercentage(player.savePercentage)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.expectedSavePercentage}>
                  {formatSavePercentage(player.expectedSavePercentage)}
                </SeriesNumberCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SortableTable>
  );
}

type SeriesPlayerIdentity = {
  nhlPlayerId: number;
  name: string;
  nhlTeamId: number;
  teamAbbreviation: string;
};

function SeriesPlayerCell({
  player,
  seasonId,
}: {
  player: SeriesPlayerIdentity;
  seasonId: number;
}) {
  return (
    <td className="workspace-series-player-cell" data-sort-value={player.name}>
      <span className="workspace-series-player-identity">
        <TeamLogo
          nhlTeamId={player.nhlTeamId}
          abbreviation={player.teamAbbreviation}
          name={player.teamAbbreviation}
          size="tiny"
          decorative
          prominent
        />
        <Link href={`/players/${player.nhlPlayerId}?season=${seasonId}&phase=playoffs`}>
          <strong>{player.name}</strong>
          <small>{player.teamAbbreviation}</small>
        </Link>
      </span>
    </td>
  );
}

function SeriesNumberCell({
  value,
  children,
  highlight = false,
  signed = false,
}: {
  value: number | string | null;
  children?: ReactNode;
  highlight?: boolean;
  signed?: boolean;
}) {
  const display =
    children ??
    (value === null ? "—" : signed && typeof value === "number" ? formatSigned(value) : value);
  return (
    <td
      className={highlight ? "is-highlight" : undefined}
      data-sort-value={value ?? undefined}
    >
      {display}
    </td>
  );
}

function SeriesLoadingState() {
  return <p className="workspace-series-loading">Loading series statistics…</p>;
}

function SeriesEmptyState({ children }: { children: ReactNode }) {
  return <p className="workspace-series-empty">{children}</p>;
}

function SeriesTeam({
  team,
  winner,
  seasonId,
  align = "left",
}: {
  team: PlayoffBracketTeam | null;
  winner: boolean;
  seasonId: number;
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
    </Link>
  );
}

function SeriesGame({
  game,
  seriesProgress,
}: {
  game: PlayoffSeriesGame;
  seriesProgress: string | null;
}) {
  const gameNumber = game.nhlGameId % 10;
  const state = formatSeriesGameState(game);
  const isFinal = state.startsWith("Final");
  const awayWon =
    game.awayTeam.score !== null &&
    game.homeTeam.score !== null &&
    game.awayTeam.score > game.homeTeam.score;
  const homeWon =
    game.awayTeam.score !== null &&
    game.homeTeam.score !== null &&
    game.homeTeam.score > game.awayTeam.score;

  return (
    <Link
      href={`/games/${game.nhlGameId}`}
      className="workspace-series-game"
      aria-label={`View Game ${gameNumber}: ${game.awayTeam.name} at ${game.homeTeam.name}`}
    >
      <div className="workspace-series-game-meta">
        <strong>Game {gameNumber}</strong>
        <time dateTime={game.startTimeUtc}>{formatGameDate(game)}</time>
        <span className="workspace-series-game-result">
          <span
            className={`workspace-series-game-state${isFinal ? " is-final" : ""}`}
          >
            {state}
          </span>
          {seriesProgress ? <small>{seriesProgress}</small> : null}
        </span>
      </div>
      <div className="workspace-series-game-score">
        <SeriesGameTeam team={game.awayTeam} location="Away" winner={awayWon} />
        <span className="workspace-series-game-at">at</span>
        <SeriesGameTeam team={game.homeTeam} location="Home" winner={homeWon} />
      </div>
      <span className="workspace-series-game-link">View Game →</span>
    </Link>
  );
}

function SeriesGameTeam({
  team,
  location,
  winner,
}: {
  team: PlayoffSeriesGameTeam;
  location: "Away" | "Home";
  winner: boolean;
}) {
  return (
    <span className={`workspace-series-game-team${winner ? " is-winner" : ""}`}>
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

function formatSeriesMastheadStatus(
  series: PlayoffSeries,
  isProjection: boolean,
): string {
  if (isProjection) return "Projected Matchup";
  if (series.winnerNhlTeamId) {
    const winner =
      series.teamOne?.nhlTeamId === series.winnerNhlTeamId
        ? series.teamOne
        : series.teamTwo;
    return `${winner?.abbreviation ?? "Series"} Wins`;
  }
  if (series.games.length === 0) return "Not Started";
  if (series.teamOneWins === series.teamTwoWins) return "Series Tied";

  const leader =
    series.teamOneWins > series.teamTwoWins ? series.teamOne : series.teamTwo;
  return `${leader?.abbreviation ?? "Leader"} Leads`;
}

function formatSeriesProgress(
  series: PlayoffSeries,
  teamOneWins: number,
  teamTwoWins: number,
): string {
  if (teamOneWins === teamTwoWins) {
    return `Series Tied ${teamOneWins}–${teamTwoWins}`;
  }

  const teamOneLeads = teamOneWins > teamTwoWins;
  const leader = teamOneLeads ? series.teamOne : series.teamTwo;
  const leaderWins = Math.max(teamOneWins, teamTwoWins);
  const trailerWins = Math.min(teamOneWins, teamTwoWins);
  return leaderWins === 4
    ? `${leader?.abbreviation ?? "Winner"} Wins Series ${leaderWins}–${trailerWins}`
    : `${leader?.abbreviation ?? "Leader"} Leads ${leaderWins}–${trailerWins}`;
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
  return tab === "advanced"
    ? "Advanced analytics"
    : tab === "players"
      ? "Player stats"
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

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatSignedDecimal(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

function formatDistance(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)} ft`;
}

function formatTimeOnIce(value: number | null): string {
  if (value === null) return "—";
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
