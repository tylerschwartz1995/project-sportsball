"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { GameFlowChart as GameFlowChartComponent } from "@/features/games/game-flow-chart";

function ChartLoading() {
  return <div className="workspace-loading-panel h-72" aria-label="Loading chart" />;
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
