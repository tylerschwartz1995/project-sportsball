"use client";
import type {
  PlayoffSeriesPlayerStatsPackage
} from "@/contracts/playoffs";
import { useEffect, useId, useRef, useState } from "react";
import { SeriesTeam } from './cells';
import { SeriesGames } from './games';
import { SelectedSeries, SeriesTab, formatMatchup, formatSeriesMastheadStatus, seriesTabLabel } from './logic';
import { SeriesOverview } from './overview';
import { SeriesAdvancedStats, SeriesPlayerStats } from './players';
export function SeriesDialog({
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
    const panel = panelRef.current;
    if (!panel) return;

    panel.scrollTo({ top: 0, left: 0 });
    panel
      .querySelector<HTMLElement>(".workspace-series-table-scroll")
      ?.scrollTo({ top: 0, left: 0 });
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
      data-view={activeTab}
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
            className={`workspace-series-panel ${needsPlayerStats ? "is-table-view" : ""}`}
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

export function SeriesTabs({
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
