"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  type TooltipContentProps,
} from "recharts";

import { TeamLogo } from "@/app/_components/team-logo";

type DraftMetric = "careerGames" | "careerPoints" | "careerWins";
type RoundGroup = "all" | "1" | "2" | "3plus";

export type DraftPlotOutcome = {
  name: string;
  position: string | null;
  draftYear: number;
  draftTeamAbbreviation: string;
  draftRound: number | null;
  draftOverallPick: number;
  careerGames: number;
  careerPoints: number;
  careerWins: number;
};

type DraftPlotPoint = DraftPlotOutcome & {
  value: number;
};

const METRICS: Array<{
  key: DraftMetric;
  label: string;
  shortLabel: string;
}> = [
  { key: "careerGames", label: "Regular-Season NHL Games", shortLabel: "Games" },
  { key: "careerPoints", label: "Regular-Season Career Points", shortLabel: "Points" },
  { key: "careerWins", label: "Regular-Season Goalie Wins", shortLabel: "Wins" },
];

export function DraftOutcomePlot({
  outcomes,
}: {
  outcomes: DraftPlotOutcome[];
}) {
  const [metricKey, setMetricKey] = useState<DraftMetric>("careerGames");
  const [roundGroup, setRoundGroup] = useState<RoundGroup>("all");
  const metric = METRICS.find((option) => option.key === metricKey) ?? METRICS[0];
  const points = useMemo<DraftPlotPoint[]>(
    () =>
      outcomes
        .filter(
          (outcome) =>
            matchesRound(outcome.draftRound, roundGroup) &&
            (metricKey !== "careerWins" || outcome.position === "G"),
        )
        .map((outcome) => ({
          ...outcome,
          value: outcome[metricKey],
        })),
    [metricKey, outcomes, roundGroup],
  );

  if (outcomes.length === 0) {
    return null;
  }

  return (
    <section className="workspace-chart-panel">
      <header className="workspace-player-chart-header">
        <div>
          <p>Pick Value</p>
          <h3>Draft Position and NHL Outcome</h3>
        </div>
        <p>
          Each point is an official selection. Players without a stored NHL
          appearance remain visible at zero; earlier picks appear to the left.
        </p>
      </header>
      <div className="workspace-chart-toolbar">
        <div className="workspace-draft-plot-controls">
          <label className="workspace-chart-metric-select">
            Outcome Metric
            <select
              value={metricKey}
              onChange={(event) =>
                setMetricKey(event.target.value as DraftMetric)
              }
            >
              {METRICS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="workspace-chart-metric-select">
            Draft Round
            <select
              value={roundGroup}
              onChange={(event) =>
                setRoundGroup(event.target.value as RoundGroup)
              }
            >
              <option value="all">All Rounds</option>
              <option value="1">Round 1</option>
              <option value="2">Round 2</option>
              <option value="3plus">Round 3 or Later</option>
            </select>
          </label>
        </div>
      </div>
      <div
        className="workspace-chart workspace-draft-outcome-chart"
        role="img"
        aria-label={`${metric.label} by overall draft position for ${points.length} players.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 14, right: 20, bottom: 34, left: 14 }}
            accessibilityLayer
          >
            <CartesianGrid
              stroke="var(--chart-grid)"
              strokeDasharray="3 5"
            />
            <XAxis
              type="number"
              dataKey="draftOverallPick"
              name="Overall Pick"
              domain={["dataMin", "dataMax"]}
              tick={{ fill: "var(--chart-label)", fontSize: 15 }}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-axis)" }}
              label={{
                value: "Overall Draft Pick",
                position: "insideBottom",
                offset: -20,
                fill: "var(--chart-label)",
                fontSize: 15,
              }}
            />
            <YAxis
              type="number"
              dataKey="value"
              name={metric.shortLabel}
              allowDecimals={false}
              tick={{ fill: "var(--chart-label)", fontSize: 15 }}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-axis)" }}
              width={58}
              label={{
                value: metric.shortLabel,
                angle: -90,
                position: "insideLeft",
                offset: 0,
                fill: "var(--chart-label)",
                fontSize: 15,
              }}
            />
            <ZAxis range={[38, 38]} />
            <Tooltip
              content={<DraftTooltip metricLabel={metric.shortLabel} />}
              cursor={{ strokeDasharray: "3 5" }}
            />
            <Scatter
              data={points}
              fill="var(--chart-primary)"
              fillOpacity={0.72}
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function DraftTooltip({
  active,
  payload = [],
  metricLabel,
}: Partial<TooltipContentProps<number, string>> & {
  metricLabel: string;
}) {
  const point = payload[0]?.payload as DraftPlotPoint | undefined;
  if (!active || !point) return null;

  return (
    <div className="workspace-chart-tooltip">
      <p className="workspace-chart-tooltip-date inline-flex items-center gap-1.5">
        <TeamLogo
          abbreviation={point.draftTeamAbbreviation}
          size="tiny"
          decorative
        />
        <span>
          {point.draftYear} · {point.draftTeamAbbreviation} · Pick #
          {point.draftOverallPick}
        </span>
      </p>
      <p className="workspace-chart-tooltip-game">{point.name}</p>
      <dl>
        <div>
          <dt>{metricLabel}</dt>
          <dd>{point.value.toLocaleString("en-CA")}</dd>
        </div>
        <div>
          <dt>Round / Position</dt>
          <dd>
            {point.draftRound ?? "—"} / {point.position ?? "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function matchesRound(
  draftRound: number | null,
  roundGroup: RoundGroup,
): boolean {
  if (roundGroup === "all") return true;
  if (roundGroup === "3plus") return (draftRound ?? 0) >= 3;
  return draftRound === Number(roundGroup);
}
