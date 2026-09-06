"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import type { DraftOutcomePlot as DraftOutcomePlotComponent } from "@/features/drafts/draft-outcome-plot";
import type { GameFlowChart as GameFlowChartComponent } from "@/features/games/game-flow-chart";
import type {
  HistoryRecordProgression as HistoryRecordProgressionComponent,
  HistoryScoringEnvironment as HistoryScoringEnvironmentComponent,
} from "@/features/history/history-visuals";
import type { PlayerComparisonPlots as PlayerComparisonPlotsComponent } from "@/features/players/player-comparison-plots";
import type { PlayerDirectComparisonChart as PlayerDirectComparisonChartComponent } from "@/features/players/player-direct-comparison-chart";
import type { PlayerRollingPerformanceChart as PlayerRollingPerformanceChartComponent } from "@/features/players/player-rolling-performance-chart";
import type { StandingsPointsChart as StandingsPointsChartComponent } from "@/features/standings/standings-points-chart";
import type { TeamDraftingVisuals as TeamDraftingVisualsComponent } from "@/features/drafts/team-drafting-visuals";
import type { TeamComparisonScatterplot as TeamComparisonScatterplotComponent } from "@/features/teams/team-comparison-scatterplot";
import type { TeamPerformanceResultMap as TeamPerformanceResultMapComponent } from "@/features/teams/team-performance-result-map";
import type { TeamRollingPerformanceChart as TeamRollingPerformanceChartComponent } from "@/features/teams/team-rolling-performance-chart";

function ChartLoading() {
  return (
    <div
      className="workspace-loading-panel h-72"
      aria-label="Loading chart"
    />
  );
}

export const GameFlowChart = dynamic<
  ComponentProps<typeof GameFlowChartComponent>
>(
  () =>
    import("@/features/games/game-flow-chart").then(
      (module) => module.GameFlowChart,
    ),
  { ssr: false, loading: ChartLoading },
);
export const DraftOutcomePlot = dynamic<
  ComponentProps<typeof DraftOutcomePlotComponent>
>(
  () =>
    import("@/features/drafts/draft-outcome-plot").then(
      (module) => module.DraftOutcomePlot,
    ),
  { ssr: false, loading: ChartLoading },
);
export const HistoryRecordProgression = dynamic<
  ComponentProps<typeof HistoryRecordProgressionComponent>
>(
  () =>
    import("@/features/history/history-visuals").then(
      (module) => module.HistoryRecordProgression,
    ),
  { ssr: false, loading: ChartLoading },
);
export const HistoryScoringEnvironment = dynamic<
  ComponentProps<typeof HistoryScoringEnvironmentComponent>
>(
  () =>
    import("@/features/history/history-visuals").then(
      (module) => module.HistoryScoringEnvironment,
    ),
  { ssr: false, loading: ChartLoading },
);
export const PlayerComparisonPlots = dynamic<
  ComponentProps<typeof PlayerComparisonPlotsComponent>
>(
  () =>
    import("@/features/players/player-comparison-plots").then(
      (module) => module.PlayerComparisonPlots,
    ),
  { ssr: false, loading: ChartLoading },
);
export const PlayerDirectComparisonChart = dynamic<
  ComponentProps<typeof PlayerDirectComparisonChartComponent>
>(
  () =>
    import("@/features/players/player-direct-comparison-chart").then(
      (module) => module.PlayerDirectComparisonChart,
    ),
  { ssr: false, loading: ChartLoading },
);
export const PlayerRollingPerformanceChart = dynamic<
  ComponentProps<typeof PlayerRollingPerformanceChartComponent>
>(
  () =>
    import("@/features/players/player-rolling-performance-chart").then(
      (module) => module.PlayerRollingPerformanceChart,
    ),
  { ssr: false, loading: ChartLoading },
);
export const StandingsPointsChart = dynamic<
  ComponentProps<typeof StandingsPointsChartComponent>
>(
  () =>
    import("@/features/standings/standings-points-chart").then(
      (module) => module.StandingsPointsChart,
    ),
  { ssr: false, loading: ChartLoading },
);
export const TeamComparisonScatterplot = dynamic<
  ComponentProps<typeof TeamComparisonScatterplotComponent>
>(
  () =>
    import("@/features/teams/team-comparison-scatterplot").then(
      (module) => module.TeamComparisonScatterplot,
    ),
  { ssr: false, loading: ChartLoading },
);
export const TeamPerformanceResultMap = dynamic<
  ComponentProps<typeof TeamPerformanceResultMapComponent>
>(
  () =>
    import("@/features/teams/team-performance-result-map").then(
      (module) => module.TeamPerformanceResultMap,
    ),
  { ssr: false, loading: ChartLoading },
);
export const TeamRollingPerformanceChart = dynamic<
  ComponentProps<typeof TeamRollingPerformanceChartComponent>
>(
  () =>
    import("@/features/teams/team-rolling-performance-chart").then(
      (module) => module.TeamRollingPerformanceChart,
    ),
  { ssr: false, loading: ChartLoading },
);
export const TeamDraftingVisuals = dynamic<
  ComponentProps<typeof TeamDraftingVisualsComponent>
>(
  () =>
    import("@/features/drafts/team-drafting-visuals").then(
      (module) => module.TeamDraftingVisuals,
    ),
  { ssr: false, loading: ChartLoading },
);
