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
import { formatPlayerPosition } from "@/lib/player-position";

type DraftMetric =
  | "careerGames"
  | "careerPoints"
  | "careerWins"
  | "careerGameScore"
  | "careerIndividualExpectedGoals"
  | "careerOnIceExpectedGoalsPercentage"
  | "careerGoalsSavedAboveExpected";
type RoundGroup = "all" | "1" | "2" | "3plus";
type MetricFormat = "integer" | "decimal" | "percentage";
type MetricPlayerType = "all" | "skater" | "goalie";
type MetricGroup = "Career Outcomes" | "Advanced Skaters" | "Advanced Goalies";

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
  careerGameScore: number | null;
  careerIndividualExpectedGoals: number | null;
  careerOnIceExpectedGoalsPercentage: number | null;
  careerGoalsSavedAboveExpected: number | null;
};

type DraftPlotPoint = DraftPlotOutcome & {
  value: number;
};

const METRICS: Array<{
  key: DraftMetric;
  label: string;
  shortLabel: string;
  format: MetricFormat;
  playerType: MetricPlayerType;
  group: MetricGroup;
  advanced: boolean;
}> = [
  {
    key: "careerGames",
    label: "Regular-Season NHL Games",
    shortLabel: "Games",
    format: "integer",
    playerType: "all",
    group: "Career Outcomes",
    advanced: false,
  },
  {
    key: "careerPoints",
    label: "Regular-Season Career Points",
    shortLabel: "Points",
    format: "integer",
    playerType: "skater",
    group: "Career Outcomes",
    advanced: false,
  },
  {
    key: "careerWins",
    label: "Regular-Season Goalie Wins",
    shortLabel: "Wins",
    format: "integer",
    playerType: "goalie",
    group: "Career Outcomes",
    advanced: false,
  },
  {
    key: "careerGameScore",
    label: "Stored Career Game Score",
    shortLabel: "Game Score",
    format: "decimal",
    playerType: "skater",
    group: "Advanced Skaters",
    advanced: true,
  },
  {
    key: "careerIndividualExpectedGoals",
    label: "Stored Individual Expected Goals",
    shortLabel: "Individual xG",
    format: "decimal",
    playerType: "skater",
    group: "Advanced Skaters",
    advanced: true,
  },
  {
    key: "careerOnIceExpectedGoalsPercentage",
    label: "Stored On-Ice Expected Goals Share",
    shortLabel: "On-Ice xG%",
    format: "percentage",
    playerType: "skater",
    group: "Advanced Skaters",
    advanced: true,
  },
  {
    key: "careerGoalsSavedAboveExpected",
    label: "Stored Goalie Goals Saved Above Expected",
    shortLabel: "GSAx",
    format: "decimal",
    playerType: "goalie",
    group: "Advanced Goalies",
    advanced: true,
  },
];

const METRIC_GROUPS: MetricGroup[] = [
  "Career Outcomes",
  "Advanced Skaters",
  "Advanced Goalies",
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
            matchesPlayerType(outcome.position, metric.playerType) &&
            outcome[metricKey] !== null,
        )
        .map((outcome) => ({
          ...outcome,
          value: scaleMetricValue(
            outcome[metricKey] ?? 0,
            metric.format,
          ),
        })),
    [metric, metricKey, outcomes, roundGroup],
  );

  if (outcomes.length === 0) {
    return null;
  }

  return (
    <section className="workspace-chart-panel">
      <header className="workspace-player-chart-header">
        <div>
          <p>Player Outcomes</p>
          <h3>Draft Position and Career Outcome</h3>
        </div>
        {metric.advanced ? (
          <p>
            Advanced outcomes use stored MoneyPuck regular-season,
            all-situations data from 2008–09 onward. Players without coverage
            are omitted. On-ice xG% is expected-goal share; goalie GSAx is
            expected goals against minus goals against.
          </p>
        ) : (
          <p>
            Each point is an official selection. Players without a stored NHL
            appearance remain visible at zero; use the class leaders below to
            continue into player profiles.
          </p>
        )}
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
              {METRIC_GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {METRICS.filter((option) => option.group === group).map(
                    (option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ),
                  )}
                </optgroup>
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
      {points.length > 0 ? (
        <>
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
                  tick={{ fill: "var(--chart-label)", fontSize: "0.84rem" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--chart-axis)" }}
                  label={{
                    value: "Overall Draft Pick",
                    position: "insideBottom",
                    offset: -20,
                    fill: "var(--chart-label)",
                    fontSize: "0.84rem",
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="value"
                  name={metric.shortLabel}
                  allowDecimals={metric.format !== "integer"}
                  tick={{ fill: "var(--chart-label)", fontSize: "0.84rem" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--chart-axis)" }}
                  width={58}
                  label={{
                    value: metric.shortLabel,
                    angle: -90,
                    position: "insideLeft",
                    offset: 0,
                    fill: "var(--chart-label)",
                    fontSize: "0.84rem",
                  }}
                />
                <ZAxis range={[38, 38]} />
                <Tooltip
                  content={
                    <DraftTooltip
                      metricLabel={metric.shortLabel}
                      metricFormat={metric.format}
                    />
                  }
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
          <table className="sr-only">
            <caption>
              {metric.label} by overall draft position for the selected round
              group
            </caption>
            <thead>
              <tr>
                <th scope="col">Player</th>
                <th scope="col">Draft Year</th>
                <th scope="col">Team</th>
                <th scope="col">Overall Pick</th>
                <th scope="col">{metric.shortLabel}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={`${point.draftYear}-${point.draftOverallPick}`}>
                  <td>{point.name}</td>
                  <td>{point.draftYear}</td>
                  <td>{point.draftTeamAbbreviation}</td>
                  <td>{point.draftOverallPick}</td>
                  <td>{formatMetricValue(point.value, metric.format)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="workspace-empty-state">
          No players in this draft-round group have stored data for this
          metric.
        </div>
      )}
    </section>
  );
}

function DraftTooltip({
  active,
  payload = [],
  metricLabel,
  metricFormat,
}: Partial<TooltipContentProps<number, string>> & {
  metricLabel: string;
  metricFormat: MetricFormat;
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
          <dd>{formatMetricValue(point.value, metricFormat)}</dd>
        </div>
        <div>
          <dt>Round / Position</dt>
          <dd>
            {point.draftRound ?? "—"} / {formatPlayerPosition(point.position)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function matchesPlayerType(
  position: string | null,
  playerType: MetricPlayerType,
): boolean {
  if (playerType === "all") return true;
  if (playerType === "goalie") return position === "G";
  return position !== "G";
}

function scaleMetricValue(value: number, format: MetricFormat): number {
  return format === "percentage" ? value * 100 : value;
}

function formatMetricValue(value: number, format: MetricFormat): string {
  if (format === "percentage") {
    return `${value.toFixed(1)}%`;
  }
  if (format === "decimal") {
    return value.toLocaleString("en-CA", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    });
  }
  return value.toLocaleString("en-CA");
}

function matchesRound(
  draftRound: number | null,
  roundGroup: RoundGroup,
): boolean {
  if (roundGroup === "all") return true;
  if (roundGroup === "3plus") return (draftRound ?? 0) >= 3;
  return draftRound === Number(roundGroup);
}
