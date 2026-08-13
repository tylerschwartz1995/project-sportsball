"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import type { DraftOutcomePlot as DraftOutcomePlotComponent } from "@/app/_components/draft-outcome-plot";
import type { GameFlowChart as GameFlowChartComponent } from "@/app/_components/game-flow-chart";
import type {
  HistoryRecordProgression as HistoryRecordProgressionComponent,
  HistoryScoringEnvironment as HistoryScoringEnvironmentComponent,
} from "@/app/_components/history-visuals";
import type { PlayerComparisonPlots as PlayerComparisonPlotsComponent } from "@/app/_components/player-comparison-plots";
import type { PlayerDirectComparisonChart as PlayerDirectComparisonChartComponent } from "@/app/_components/player-direct-comparison-chart";
import type { PlayerRollingPerformanceChart as PlayerRollingPerformanceChartComponent } from "@/app/_components/player-rolling-performance-chart";
import type { StandingsPointsChart as StandingsPointsChartComponent } from "@/app/_components/standings-points-chart";
import type { TeamDraftingVisuals as TeamDraftingVisualsComponent } from "@/app/_components/team-drafting-visuals";
import type { TeamComparisonScatterplot as TeamComparisonScatterplotComponent } from "@/app/_components/team-comparison-scatterplot";
import type { TeamPerformanceResultMap as TeamPerformanceResultMapComponent } from "@/app/_components/team-performance-result-map";
import type { TeamRollingPerformanceChart as TeamRollingPerformanceChartComponent } from "@/app/_components/team-rolling-performance-chart";

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
    import("@/app/_components/game-flow-chart").then(
      (module) => module.GameFlowChart,
    ),
  { ssr: false, loading: ChartLoading },
);
export const DraftOutcomePlot = dynamic<
  ComponentProps<typeof DraftOutcomePlotComponent>
>(
  () =>
    import("@/app/_components/draft-outcome-plot").then(
      (module) => module.DraftOutcomePlot,
    ),
  { ssr: false, loading: ChartLoading },
);
export const HistoryRecordProgression = dynamic<
  ComponentProps<typeof HistoryRecordProgressionComponent>
>(
  () =>
    import("@/app/_components/history-visuals").then(
      (module) => module.HistoryRecordProgression,
    ),
  { ssr: false, loading: ChartLoading },
);
export const HistoryScoringEnvironment = dynamic<
  ComponentProps<typeof HistoryScoringEnvironmentComponent>
>(
  () =>
    import("@/app/_components/history-visuals").then(
      (module) => module.HistoryScoringEnvironment,
    ),
  { ssr: false, loading: ChartLoading },
);
export const PlayerComparisonPlots = dynamic<
  ComponentProps<typeof PlayerComparisonPlotsComponent>
>(
  () =>
    import("@/app/_components/player-comparison-plots").then(
      (module) => module.PlayerComparisonPlots,
    ),
  { ssr: false, loading: ChartLoading },
);
export const PlayerDirectComparisonChart = dynamic<
  ComponentProps<typeof PlayerDirectComparisonChartComponent>
>(
  () =>
    import("@/app/_components/player-direct-comparison-chart").then(
      (module) => module.PlayerDirectComparisonChart,
    ),
  { ssr: false, loading: ChartLoading },
);
export const PlayerRollingPerformanceChart = dynamic<
  ComponentProps<typeof PlayerRollingPerformanceChartComponent>
>(
  () =>
    import("@/app/_components/player-rolling-performance-chart").then(
      (module) => module.PlayerRollingPerformanceChart,
    ),
  { ssr: false, loading: ChartLoading },
);
export const StandingsPointsChart = dynamic<
  ComponentProps<typeof StandingsPointsChartComponent>
>(
  () =>
    import("@/app/_components/standings-points-chart").then(
      (module) => module.StandingsPointsChart,
    ),
  { ssr: false, loading: ChartLoading },
);
export const TeamComparisonScatterplot = dynamic<
  ComponentProps<typeof TeamComparisonScatterplotComponent>
>(
  () =>
    import("@/app/_components/team-comparison-scatterplot").then(
      (module) => module.TeamComparisonScatterplot,
    ),
  { ssr: false, loading: ChartLoading },
);
export const TeamPerformanceResultMap = dynamic<
  ComponentProps<typeof TeamPerformanceResultMapComponent>
>(
  () =>
    import("@/app/_components/team-performance-result-map").then(
      (module) => module.TeamPerformanceResultMap,
    ),
  { ssr: false, loading: ChartLoading },
);
export const TeamRollingPerformanceChart = dynamic<
  ComponentProps<typeof TeamRollingPerformanceChartComponent>
>(
  () =>
    import("@/app/_components/team-rolling-performance-chart").then(
      (module) => module.TeamRollingPerformanceChart,
    ),
  { ssr: false, loading: ChartLoading },
);
export const TeamDraftingVisuals = dynamic<
  ComponentProps<typeof TeamDraftingVisualsComponent>
>(
  () =>
    import("@/app/_components/team-drafting-visuals").then(
      (module) => module.TeamDraftingVisuals,
    ),
  { ssr: false, loading: ChartLoading },
);
