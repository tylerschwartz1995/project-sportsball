"use client";

import { Fragment, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import {
  ChartFilterButton,
  ChartFilterGroup,
} from "@/app/_components/chart-controls";
import { TeamLogo } from "@/app/_components/team-logo";
import { CopyViewLink } from "@/app/_components/copy-view-link";
import { useUrlChoice } from "@/app/_components/use-shareable-state";
import type {
  GameFlow,
  GameFlowPoint,
} from "@/contracts/game-flow";
import { smoothPressureTrend } from "@/lib/game-flow";

type GameFlowView = "pressure" | "cumulative";

type ChartPoint = GameFlowPoint & {
  awayPressureArea: number | null;
  homePressureArea: number | null;
  pressureDisplayDifferential: number;
  awayCumulativeDisplayExpectedGoals: number;
  homeCumulativeDisplayExpectedGoals: number;
};

export function GameFlowChart({ flow }: { flow: GameFlow }) {
  const [view, setView] = useUrlChoice<GameFlowView>("flowChart", ["pressure", "cumulative"], "pressure");
  const points = useMemo<ChartPoint[]>(
    () => {
      const pressureTrend = smoothPressureTrend(flow.points);
      return flow.points.map((point, index) => {
        const pressureDisplayDifferential = pressureTrend[index];
        return {
          ...point,
          awayPressureArea:
            pressureDisplayDifferential >= 0
              ? pressureDisplayDifferential
              : null,
          homePressureArea:
            pressureDisplayDifferential <= 0
              ? pressureDisplayDifferential
              : null,
          pressureDisplayDifferential,
          awayCumulativeDisplayExpectedGoals:
            point.awayCumulativeExpectedGoals,
          homeCumulativeDisplayExpectedGoals:
            point.homeCumulativeExpectedGoals,
        };
      });
    },
    [flow.points],
  );
  const pressureAxisMaximum = relativeAxisMaximum(
    Math.max(...points.map((point) => Math.abs(point.pressureDisplayDifferential))),
    0.5,
  );
  const cumulativeAxisMaximum = relativeAxisMaximum(
    Math.max(
      ...points.flatMap((point) => [
        point.awayCumulativeExpectedGoals,
        point.homeCumulativeExpectedGoals,
      ]),
    ),
    1,
  );
  const yAxisMaximum = view === "pressure"
    ? pressureAxisMaximum
    : cumulativeAxisMaximum;
  const yAxisTicks = view === "pressure"
    ? [-yAxisMaximum, -yAxisMaximum / 2, 0, yAxisMaximum / 2, yAxisMaximum]
    : [0, yAxisMaximum / 4, yAxisMaximum / 2, yAxisMaximum * 0.75, yAxisMaximum];
  const periodBoundaries = flow.periods
    .slice(1)
    .map((period) => (period.period - 1) * 1_200)
    .filter((time) => time < flow.gameEndSeconds);
  const totalAwayExpectedGoals = flow.periods.reduce(
    (total, period) => total + period.awayExpectedGoals,
    0,
  );
  const totalHomeExpectedGoals = flow.periods.reduce(
    (total, period) => total + period.homeExpectedGoals,
    0,
  );

  return (
    <section className="workspace-game-flow" aria-labelledby="game-flow-title">
      <header className="workspace-game-flow-header">
        <div>
          <p>MoneyPuck chance quality</p>
          <h3 id="game-flow-title">Game Flow</h3>
          <p>
            {view === "pressure"
              ? "Follow which team created the more dangerous chances during each five-minute stretch."
              : "Follow each team’s total chance quality as it accumulated from puck drop to the final horn."}
          </p>
        </div>
      </header>

      <div className="workspace-game-flow-controls">
        <CopyViewLink />
        <ChartFilterGroup label="View">
          <ChartFilterButton
            active={view === "pressure"}
            label="Game Pressure"
            onClick={() => setView("pressure")}
          />
          <ChartFilterButton
            active={view === "cumulative"}
            label="Cumulative Chances"
            onClick={() => setView("cumulative")}
          />
        </ChartFilterGroup>
        <p>
          {view === "pressure"
            ? "Farther from centre means a stronger edge. Game-relative scale; hover for exact values."
            : "A steeper rise means better chances. Scale adapts to this game."}
        </p>
      </div>

      <div
        className="workspace-game-flow-chart"
        role="img"
        aria-label={chartAriaLabel(flow, view)}
      >
        {view === "pressure" ? (
          <div className="workspace-game-flow-pressure-axis" aria-hidden="true">
            <span data-chart-side="above">
              <strong>{flow.awayTeam.abbreviation}</strong>
              <b>↑</b>
            </span>
            <small>Even</small>
            <span data-chart-side="below">
              <strong>{flow.homeTeam.abbreviation}</strong>
              <b>↓</b>
            </span>
          </div>
        ) : null}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={points}
            margin={{
              top: 12,
              right: view === "pressure" ? 78 : 20,
              bottom: 8,
              left: 4,
            }}
            accessibilityLayer
          >
            <CartesianGrid
              stroke="var(--chart-grid)"
              vertical={false}
            />
            <XAxis
              dataKey="gameTimeSeconds"
              type="number"
              domain={[0, flow.gameEndSeconds]}
              padding={{ left: 12, right: 0 }}
              ticks={periodTicks(flow.gameEndSeconds)}
              tickFormatter={(time) => periodTickLabel(Number(time))}
              stroke="var(--chart-axis)"
              tick={{ fill: "var(--chart-label)", fontSize: "0.82rem" }}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-axis)" }}
              allowDataOverflow
            />
            <YAxis
              domain={view === "pressure" ? [-yAxisMaximum, yAxisMaximum] : [0, yAxisMaximum]}
              ticks={yAxisTicks}
              tickFormatter={(value: number) =>
                formatAxisTick(view === "pressure" ? Math.abs(value) : value)
              }
              stroke="var(--chart-axis)"
              tick={{ fill: "var(--chart-label)", fontSize: "0.82rem" }}
              tickLine={false}
              axisLine={false}
              allowDataOverflow
              width={68}
              label={{
                value: "Expected goals",
                angle: -90,
                position: "insideLeft",
                fill: "var(--chart-label)",
                fontSize: "0.78rem",
              }}
            />

            {periodBoundaries.map((time) => (
              <ReferenceLine
                key={time}
                x={time}
                stroke="var(--chart-reference)"
                strokeWidth={1}
              />
            ))}

            {view === "pressure" ? (
              <>
                <ReferenceLine
                  y={0}
                  stroke="var(--chart-reference)"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="awayPressureArea"
                  name={`${flow.awayTeam.abbreviation} pressure`}
                  baseValue={0}
                  fill="var(--chart-primary)"
                  fillOpacity={0.23}
                  stroke="var(--chart-primary)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="homePressureArea"
                  name={`${flow.homeTeam.abbreviation} pressure`}
                  baseValue={0}
                  fill="var(--chart-secondary)"
                  fillOpacity={0.23}
                  stroke="var(--chart-secondary)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="pressureDisplayDifferential"
                  name="Pressure edge"
                  stroke="var(--foreground)"
                  strokeWidth={2.3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="awayCumulativeDisplayExpectedGoals"
                  name={flow.awayTeam.abbreviation}
                  stroke="var(--chart-primary)"
                  strokeWidth={2.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="homeCumulativeDisplayExpectedGoals"
                  name={flow.homeTeam.abbreviation}
                  stroke="var(--chart-secondary)"
                  strokeWidth={2.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </>
            )}

            {flow.goals.map((goal) => {
              const point = pointAt(points, goal.gameTimeSeconds);
              const lineY =
                view === "pressure"
                  ? point?.pressureDisplayDifferential ?? 0
                  : goal.team.nhlTeamId === flow.awayTeam.nhlTeamId
                    ? point?.awayCumulativeDisplayExpectedGoals ?? 0
                    : point?.homeCumulativeDisplayExpectedGoals ?? 0;
              const railY = view === "pressure"
                ? -yAxisMaximum * 0.88
                : yAxisMaximum * 0.06;
              const goalSeries = goal.team.nhlTeamId === flow.awayTeam.nhlTeamId
                ? "primary"
                : "secondary";
              const goalColor = goalSeries === "primary"
                ? "var(--chart-primary)"
                : "var(--chart-secondary)";
              return (
                <Fragment key={goal.sourceShotId}>
                  <ReferenceLine
                    segment={[
                      { x: goal.gameTimeSeconds, y: railY },
                      { x: goal.gameTimeSeconds, y: lineY },
                    ]}
                    stroke={goalColor}
                    strokeDasharray="2 3"
                    strokeOpacity={0.68}
                    strokeWidth={1.25}
                    ifOverflow="hidden"
                  />
                  <ReferenceDot
                    x={goal.gameTimeSeconds}
                    y={railY}
                    r={12}
                    shape={<PuckGoalMarker series={goalSeries} />}
                    ifOverflow="hidden"
                  />
                </Fragment>
              );
            })}
            <Tooltip
              content={<GameFlowTooltip flow={flow} view={view} />}
              cursor={{
                stroke: "var(--chart-reference)",
                strokeWidth: 1,
              }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="workspace-game-flow-key" aria-label="Chart legend">
        {view === "cumulative" ? (
          <>
            <span><i data-series="primary" />{flow.awayTeam.name}</span>
            <span><i data-series="secondary" />{flow.homeTeam.name}</span>
          </>
        ) : null}
        <span><i data-series="goal" />Goal</span>
      </div>

      <PeriodChanceTable
        flow={flow}
        totalAwayExpectedGoals={totalAwayExpectedGoals}
        totalHomeExpectedGoals={totalHomeExpectedGoals}
      />

      <p className="workspace-game-flow-source">
        Expected goals estimate how likely each unblocked shot was to score.
        Game Pressure compares those chances over the previous five minutes of
        play and does not predict the winner.
        {flow.endedInShootout
          ? " Shootout attempts are not included."
          : ""} Data: {" "}
        <a href="https://moneypuck.com/" target="_blank" rel="noreferrer">
          MoneyPuck.com ↗
        </a>
      </p>
    </section>
  );
}

function PuckGoalMarker({
  cx = 0,
  cy = 0,
  series,
}: {
  cx?: number;
  cy?: number;
  series: "primary" | "secondary";
}) {
  return (
    <g
      className="workspace-game-flow-goal-marker"
      data-goal-series={series}
      transform={`translate(${cx} ${cy})`}
    >
      <circle r="12" />
      <ellipse cy="3" rx="6.25" ry="4" />
      <path d="M -6.25 0 L -6.25 3.5 Q 0 7.5 6.25 3.5 L 6.25 0" />
      <ellipse cy="0" rx="6.25" ry="4" />
      <path d="M -3.3 -0.6 Q 0 -2.3 3.3 -0.6" />
    </g>
  );
}

function PeriodChanceTable({
  flow,
  totalAwayExpectedGoals,
  totalHomeExpectedGoals,
}: {
  flow: GameFlow;
  totalAwayExpectedGoals: number;
  totalHomeExpectedGoals: number;
}) {
  return (
    <div className="workspace-game-flow-periods">
      <table>
        <caption>Chance quality by period</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">
              <span><TeamLogo {...flow.awayTeam} size="tiny" decorative />{flow.awayTeam.abbreviation}</span>
            </th>
            <th scope="col">
              <span><TeamLogo {...flow.homeTeam} size="tiny" decorative />{flow.homeTeam.abbreviation}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {flow.periods.map((period) => (
            <tr key={period.period}>
              <th scope="row">{periodLabel(period.period, period.periodType)}</th>
              <td>{period.awayExpectedGoals.toFixed(2)} xG</td>
              <td>{period.homeExpectedGoals.toFixed(2)} xG</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Game</th>
            <td>{totalAwayExpectedGoals.toFixed(2)} xG</td>
            <td>{totalHomeExpectedGoals.toFixed(2)} xG</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function GameFlowTooltip({
  active,
  payload = [],
  flow,
  view,
}: Partial<TooltipContentProps<number, string>> & {
  flow: GameFlow;
  view: GameFlowView;
}) {
  const point = payload.find((entry) => entry.payload)?.payload as
    | ChartPoint
    | undefined;
  if (!active || !point) return null;

  const goal = flow.goals.find(
    (candidate) => candidate.gameTimeSeconds === point.gameTimeSeconds,
  );
  const chance = point.biggestChance;

  return (
    <div className="workspace-chart-tooltip workspace-game-flow-tooltip">
      <p className="workspace-chart-tooltip-date">
        {periodLabel(point.period, point.period > 3 ? "OT" : "REG")} · {formatClock(point.periodTimeSeconds)}
      </p>
      <p className="workspace-chart-tooltip-game">
        {flow.awayTeam.abbreviation} {point.awayScore}–{point.homeScore} {flow.homeTeam.abbreviation}
      </p>
      {goal ? null : (
        <dl>
          <div>
            <dt>{flow.awayTeam.abbreviation} {view === "pressure" ? "last 5 min" : "total"}</dt>
            <dd>{(view === "pressure" ? point.awayPressureExpectedGoals : point.awayCumulativeExpectedGoals).toFixed(2)} xG</dd>
          </div>
          <div>
            <dt>{flow.homeTeam.abbreviation} {view === "pressure" ? "last 5 min" : "total"}</dt>
            <dd>{(view === "pressure" ? point.homePressureExpectedGoals : point.homeCumulativeExpectedGoals).toFixed(2)} xG</dd>
          </div>
          {view === "pressure" ? (
            <div>
              <dt>Shots in window</dt>
              <dd>{point.awayShotsInWindow}–{point.homeShotsInWindow}</dd>
            </div>
          ) : null}
        </dl>
      )}
      {goal ? (
        <p className="workspace-game-flow-tooltip-event">
          <strong>Goal · {goal.team.abbreviation}</strong>
          <span>{goal.shooterName ?? "Unknown scorer"}</span>
          <span>
            {goal.assists === null
              ? "Assist data unavailable"
              : goal.assists.length > 0
              ? `Assists: ${goal.assists.join(", ")}`
              : "Unassisted"}
          </span>
        </p>
      ) : chance ? (
        <p className="workspace-game-flow-tooltip-event">
          <strong>Best recent chance</strong>
          <span>
            {chance.team.abbreviation} · {chance.shooterName ?? "Unknown shooter"} · {(chance.expectedGoal * 100).toFixed(1)}%
          </span>
        </p>
      ) : (
        <p className="workspace-chart-tooltip-sample">No modeled shots in this stretch.</p>
      )}
    </div>
  );
}

function pointAt(points: ChartPoint[], time: number): ChartPoint | undefined {
  return points.find((point) => point.gameTimeSeconds === time);
}

function periodTicks(gameEndSeconds: number): number[] {
  const ticks = [0];
  for (let time = 1_200; time < gameEndSeconds; time += 1_200) {
    ticks.push(time);
  }
  return ticks;
}

function relativeAxisMaximum(value: number, minimum: number): number {
  const target = Math.max(value * 1.12, minimum);
  const step = target <= 1 ? 0.25 : target <= 3 ? 0.5 : target <= 8 ? 1 : 2;
  return Math.ceil(target / step) * step;
}

function formatAxisTick(value: number): string {
  const tenths = value * 10;
  return Math.abs(tenths - Math.round(tenths)) > 0.001
    ? value.toFixed(2)
    : value.toFixed(1);
}

function periodTickLabel(time: number): string {
  if (time === 0) return "1st";
  const period = Math.floor(time / 1_200) + 1;
  if (period === 2) return "2nd";
  if (period === 3) return "3rd";
  return period === 4 ? "OT" : `${period - 3}OT`;
}

function periodLabel(period: number, periodType: string): string {
  if (periodType === "OT" || period > 3) return "Overtime";
  if (period === 1) return "First period";
  if (period === 2) return "Second period";
  return "Third period";
}

function formatClock(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.round(seconds));
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

function chartAriaLabel(flow: GameFlow, view: GameFlowView): string {
  const awayTotal = flow.periods.reduce(
    (total, period) => total + period.awayExpectedGoals,
    0,
  );
  const homeTotal = flow.periods.reduce(
    (total, period) => total + period.homeExpectedGoals,
    0,
  );
  return view === "pressure"
    ? `Game Pressure for ${flow.awayTeam.name} and ${flow.homeTeam.name}. Values above centre show ${flow.awayTeam.name} generated the better chances over the previous five minutes; values below centre show ${flow.homeTeam.name} did.`
    : `Cumulative chance quality for ${flow.awayTeam.name} and ${flow.homeTeam.name}. Final expected-goal totals were ${awayTotal.toFixed(2)} for ${flow.awayTeam.name} and ${homeTotal.toFixed(2)} for ${flow.homeTeam.name}.`;
}
