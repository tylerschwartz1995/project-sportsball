"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
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
import type { DraftTeamPerformance } from "@/contracts/draft";

type TeamDraftingChartRow = DraftTeamPerformance & {
  noAppearancePlayers: number;
  noAppearanceRate: number;
  underHundredPlayers: number;
  underHundredRate: number;
};

export function TeamDraftingVisuals({
  rows,
  fromYear,
  toYear,
}: {
  rows: DraftTeamPerformance[];
  fromYear: number | null;
  toYear: number | null;
}) {
  const chartRows = useMemo(
    () =>
      rows.map((row) => {
        const noAppearancePlayers = row.selections - row.playersWithNhlGames;
        const underHundredPlayers =
          row.playersWithNhlGames - row.hundredGamePlayers;
        return {
          ...row,
          noAppearancePlayers,
          noAppearanceRate: noAppearancePlayers / row.selections,
          underHundredPlayers,
          underHundredRate: underHundredPlayers / row.selections,
        };
      }),
    [rows],
  );
  const medianHundredGameRate = median(
    chartRows.map((row) => row.hundredGameRate),
  );
  const medianAverageGames = median(
    chartRows.map((row) => row.averageGames),
  );
  const outcomeChartHeight = Math.max(34, chartRows.length * 1.55);
  const windowLabel =
    fromYear === null || toYear === null
      ? "the selected draft window"
      : `${fromYear}–${toYear}`;

  if (chartRows.length === 0) {
    return null;
  }

  return (
    <div className="workspace-team-drafting-visuals mt-7">
      <section className="workspace-chart-panel">
        <header className="workspace-player-chart-header">
          <div>
            <p>Team Drafting Landscape</p>
            <h3>Efficiency and Long-Term Hits</h3>
          </div>
          <p>
            Teams farther up and right produced more games per pick and a
            larger share of 100-game players. Bubble size represents total
            selections in {windowLabel}.
          </p>
        </header>
        <div
          className="workspace-chart workspace-team-drafting-scatter"
          role="img"
          aria-label={`Scatterplot comparing ${chartRows.length} teams by 100-game player rate and average games per selection for ${windowLabel}.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 28, right: 28, bottom: 34, left: 20 }}
              accessibilityLayer
            >
              <CartesianGrid
                stroke="var(--chart-grid)"
                strokeDasharray="3 5"
              />
              <XAxis
                type="number"
                dataKey="hundredGameRate"
                name="100-Game Rate"
                domain={["auto", "auto"]}
                tickFormatter={formatPercentage}
                tick={{ fill: "var(--chart-label)", fontSize: "0.84rem" }}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-axis)" }}
                label={{
                  value: "100-Game Player Rate",
                  position: "insideBottom",
                  offset: -20,
                  fill: "var(--chart-label)",
                  fontSize: "0.8rem",
                }}
              />
              <YAxis
                type="number"
                dataKey="averageGames"
                name="Games per Pick"
                domain={[0, "auto"]}
                tickFormatter={(value: number) => Math.round(value).toString()}
                tick={{ fill: "var(--chart-label)", fontSize: "0.84rem" }}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-axis)" }}
                width={58}
                label={{
                  value: "Games per Pick",
                  angle: -90,
                  position: "insideLeft",
                  fill: "var(--chart-label)",
                  fontSize: "0.8rem",
                }}
              />
              <ZAxis dataKey="selections" range={[350, 900]} />
              <ReferenceLine
                x={medianHundredGameRate}
                stroke="var(--chart-reference)"
                strokeDasharray="5 5"
              />
              <ReferenceLine
                y={medianAverageGames}
                stroke="var(--chart-reference)"
                strokeDasharray="5 5"
              />
              <Tooltip
                content={<TeamDraftingTooltip />}
                cursor={{ stroke: "var(--chart-reference)" }}
              />
              <Scatter
                data={chartRows}
                fill="var(--chart-primary)"
                fillOpacity={0.72}
                isAnimationActive={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="workspace-team-drafting-chart-note">
          Dashed lines mark the team medians:{" "}
          {formatPercentage(medianHundredGameRate)} for 100-game rate and{" "}
          {Math.round(medianAverageGames)} games per pick.
        </p>
        <AccessibleEfficiencyTable rows={chartRows} windowLabel={windowLabel} />
      </section>

      <section className="workspace-chart-panel">
        <header className="workspace-player-chart-header">
          <div>
            <p>Pick Outcome Breakdown</p>
            <h3>How Each Team&apos;s Selections Developed</h3>
          </div>
          <p>
            Each bar accounts for every official selection. Percentages make
            teams with different pick totals comparable; hover for counts.
          </p>
        </header>
        <div
          className="workspace-chart-legend workspace-team-drafting-legend"
          aria-label="Pick outcome key"
        >
          <span>
            <i
              style={{ background: "var(--muted)", opacity: 0.55 }}
              aria-hidden="true"
            />
            No NHL Appearance
          </span>
          <span>
            <i
              style={{
                background: "var(--chart-secondary)",
                opacity: 0.78,
              }}
              aria-hidden="true"
            />
            1–99 Games
          </span>
          <span>
            <i
              style={{ background: "var(--chart-primary)" }}
              aria-hidden="true"
            />
            100+ Games
          </span>
        </div>
        <div
          className="workspace-chart workspace-team-drafting-bars"
          style={{ height: `${outcomeChartHeight}rem` }}
          role="img"
          aria-label={`Stacked bar chart showing NHL appearance outcomes for ${chartRows.length} teams in ${windowLabel}.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartRows}
              layout="vertical"
              margin={{ top: 10, right: 28, bottom: 28, left: 12 }}
              accessibilityLayer
            >
              <CartesianGrid
                stroke="var(--chart-grid)"
                strokeDasharray="3 5"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, 1]}
                tickFormatter={formatPercentage}
                tick={{ fill: "var(--chart-label)", fontSize: "0.8rem" }}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-axis)" }}
              />
              <YAxis
                type="category"
                dataKey="teamAbbreviation"
                interval={0}
                width={52}
                tick={{ fill: "var(--chart-label)", fontSize: "0.82rem" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<TeamOutcomeTooltip />} />
              <Bar
                dataKey="noAppearanceRate"
                name="No NHL Appearance"
                stackId="outcome"
                fill="var(--muted)"
                fillOpacity={0.55}
                isAnimationActive={false}
              />
              <Bar
                dataKey="underHundredRate"
                name="1–99 Games"
                stackId="outcome"
                fill="var(--chart-secondary)"
                fillOpacity={0.78}
                isAnimationActive={false}
              />
              <Bar
                dataKey="hundredGameRate"
                name="100+ Games"
                stackId="outcome"
                fill="var(--chart-primary)"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <AccessibleOutcomeTable rows={chartRows} windowLabel={windowLabel} />
      </section>
    </div>
  );
}

function TeamDraftingTooltip({
  active,
  payload = [],
}: Partial<TooltipContentProps<number, string>>) {
  const team = payload[0]?.payload as TeamDraftingChartRow | undefined;
  if (!active || !team) {
    return null;
  }

  return (
    <div className="workspace-chart-tooltip">
      <p className="workspace-chart-tooltip-date">Drafting efficiency</p>
      <p className="workspace-chart-tooltip-game">
        <span className="inline-flex items-center gap-1.5">
          <TeamLogo
            nhlTeamId={team.teamNhlId}
            abbreviation={team.teamAbbreviation}
            name={team.teamName}
            size="tiny"
            decorative
          />
          {team.teamName} · {team.teamAbbreviation}
        </span>
      </p>
      <dl>
        <div>
          <dt>100-Game Rate</dt>
          <dd>{formatPercentage(team.hundredGameRate)}</dd>
        </div>
        <div>
          <dt>Games per Pick</dt>
          <dd>{Math.round(team.averageGames)}</dd>
        </div>
        <div>
          <dt>Selections</dt>
          <dd>{team.selections}</dd>
        </div>
      </dl>
    </div>
  );
}

function TeamOutcomeTooltip({
  active,
  payload = [],
}: Partial<TooltipContentProps<number, string>>) {
  const team = payload[0]?.payload as TeamDraftingChartRow | undefined;
  if (!active || !team) {
    return null;
  }

  return (
    <div className="workspace-chart-tooltip">
      <p className="workspace-chart-tooltip-date">Pick outcomes</p>
      <p className="workspace-chart-tooltip-game">
        <span className="inline-flex items-center gap-1.5">
          <TeamLogo
            nhlTeamId={team.teamNhlId}
            abbreviation={team.teamAbbreviation}
            name={team.teamName}
            size="tiny"
            decorative
          />
          {team.teamName} · {team.teamAbbreviation}
        </span>
      </p>
      <dl>
        <div>
          <dt>No NHL Appearance</dt>
          <dd>
            {team.noAppearancePlayers} ·{" "}
            {formatPercentage(team.noAppearanceRate)}
          </dd>
        </div>
        <div>
          <dt>1–99 Games</dt>
          <dd>
            {team.underHundredPlayers} ·{" "}
            {formatPercentage(team.underHundredRate)}
          </dd>
        </div>
        <div>
          <dt>100+ Games</dt>
          <dd>
            {team.hundredGamePlayers} · {formatPercentage(team.hundredGameRate)}
          </dd>
        </div>
        <div>
          <dt>Total Selections</dt>
          <dd>{team.selections}</dd>
        </div>
      </dl>
    </div>
  );
}

function AccessibleEfficiencyTable({
  rows,
  windowLabel,
}: {
  rows: TeamDraftingChartRow[];
  windowLabel: string;
}) {
  return (
    <div className="sr-only">
      <table>
        <caption>Team drafting efficiency for {windowLabel}</caption>
        <thead>
          <tr>
            <th>Team</th>
            <th>Selections</th>
            <th>100-Game Rate</th>
            <th>Games per Pick</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((team) => (
            <tr key={team.teamAbbreviation}>
              <td>{team.teamName}</td>
              <td>{team.selections}</td>
              <td>{formatPercentage(team.hundredGameRate)}</td>
              <td>{Math.round(team.averageGames)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccessibleOutcomeTable({
  rows,
  windowLabel,
}: {
  rows: TeamDraftingChartRow[];
  windowLabel: string;
}) {
  return (
    <div className="sr-only">
      <table>
        <caption>Team pick outcome breakdown for {windowLabel}</caption>
        <thead>
          <tr>
            <th>Team</th>
            <th>No NHL Appearance</th>
            <th>1–99 Games</th>
            <th>100+ Games</th>
            <th>Total Selections</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((team) => (
            <tr key={team.teamAbbreviation}>
              <td>{team.teamName}</td>
              <td>{team.noAppearancePlayers}</td>
              <td>{team.underHundredPlayers}</td>
              <td>{team.hundredGamePlayers}</td>
              <td>{team.selections}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[midpoint - 1] ?? 0) + (sorted[midpoint] ?? 0)) / 2;
  }
  return sorted[midpoint] ?? 0;
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
