"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
  if (chartRows.length === 0) {
    return null;
  }

  const medianHundredGameRate = median(
    chartRows.map((row) => row.hundredGameRate),
  );
  const medianAverageGames = median(
    chartRows.map((row) => row.averageGames),
  );
  const scatterPlot = buildScatterPlot(
    chartRows,
    medianHundredGameRate,
    medianAverageGames,
  );
  const outcomeChartHeight = Math.max(34, chartRows.length * 1.55);
  const windowLabel =
    fromYear === null || toYear === null
      ? "the selected draft window"
      : `${fromYear}–${toYear}`;

  return (
    <div className="workspace-team-drafting-visuals mt-7">
      <section className="workspace-chart-panel">
        <header className="workspace-player-chart-header">
          <div>
            <p>Team Drafting Landscape</p>
            <h3>Where Each Team Stands</h3>
          </div>
          <p>
            Team logos mark the exact relationship between long-term hit rate
            and career volume in {windowLabel}. Higher and farther right is
            stronger on both measures.
          </p>
        </header>
        <div
          className="workspace-team-drafting-scatter-shell"
          role="group"
          aria-label={`Four-quadrant scatterplot of team 100-game player rate and games per pick for ${windowLabel}`}
        >
          <span className="workspace-team-drafting-y-title">
            Games per Pick
          </span>
          <div className="workspace-team-drafting-scatter">
            <span
              className="workspace-team-drafting-median-line is-vertical"
              style={{ left: `${scatterPlot.medianX}%` }}
              aria-hidden="true"
            />
            <span
              className="workspace-team-drafting-median-line is-horizontal"
              style={{ top: `${scatterPlot.medianY}%` }}
              aria-hidden="true"
            />
            <span className="workspace-team-drafting-quadrant-label is-volume">
              More Career Volume
            </span>
            <span className="workspace-team-drafting-quadrant-label is-leaders">
              Strong on Both
            </span>
            <span className="workspace-team-drafting-quadrant-label is-below">
              Below Both Medians
            </span>
            <span className="workspace-team-drafting-quadrant-label is-hits">
              More Long-Term Hits
            </span>
            <span className="workspace-team-drafting-y-tick is-high">
              {Math.round(scatterPlot.maxGames)}
            </span>
            <span
              className="workspace-team-drafting-y-tick is-median"
              style={{ top: `${scatterPlot.medianY}%` }}
            >
              {Math.round(medianAverageGames)}
            </span>
            <span className="workspace-team-drafting-y-tick is-low">
              {Math.round(scatterPlot.minGames)}
            </span>
            {scatterPlot.points.map(({ team, left, top }) => (
              <Link
                key={team.teamAbbreviation}
                className="workspace-team-drafting-point"
                href={teamSelectionsHref(team.teamAbbreviation, fromYear, toYear)}
                style={{ left: `${left}%`, top: `${top}%` }}
                aria-label={`${team.teamName}: ${formatPercentage(team.hundredGameRate)} 100-game player rate and ${Math.round(team.averageGames)} games per pick. Open selections.`}
              >
                <TeamLogo
                  nhlTeamId={team.teamNhlId}
                  abbreviation={team.teamAbbreviation}
                  name={team.teamName}
                  size="tiny"
                  decorative
                  prominent
                />
                <span className="workspace-team-drafting-point-label">
                  <strong>{team.teamAbbreviation}</strong>
                  <small>
                    {formatPercentage(team.hundredGameRate)} ·{" "}
                    {Math.round(team.averageGames)} GP/pick
                  </small>
                </span>
              </Link>
            ))}
          </div>
          <div className="workspace-team-drafting-x-ticks" aria-hidden="true">
            <span>{formatPercentage(scatterPlot.minRate)}</span>
            <span style={{ left: `${scatterPlot.medianX}%` }}>
              Median {formatPercentage(medianHundredGameRate)}
            </span>
            <span>{formatPercentage(scatterPlot.maxRate)}</span>
          </div>
          <span className="workspace-team-drafting-x-title">
            100-Game Player Rate
          </span>
        </div>
        <p className="workspace-team-drafting-chart-note">
          Dashed lines mark the team medians: {formatPercentage(medianHundredGameRate)}
          {" "}for 100-game rate and {Math.round(medianAverageGames)} games per
          pick. Logos are equal-sized because selection volume is shown in the
          table rather than encoded here.
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

function buildScatterPlot(
  rows: TeamDraftingChartRow[],
  medianHundredGameRate: number,
  medianAverageGames: number,
) {
  const rates = rows.map((row) => row.hundredGameRate);
  const games = rows.map((row) => row.averageGames);
  const [minRate, maxRate] = extent(rates);
  const [minGames, maxGames] = extent(games);
  const ratePadding = Math.max((maxRate - minRate) * 0.08, 0.01);
  const gamesPadding = Math.max((maxGames - minGames) * 0.08, 5);
  const rateDomain = [minRate - ratePadding, maxRate + ratePadding] as const;
  const gamesDomain = [minGames - gamesPadding, maxGames + gamesPadding] as const;
  return {
    minRate,
    maxRate,
    minGames,
    maxGames,
    medianX: scaleToPercent(medianHundredGameRate, ...rateDomain),
    medianY: 100 - scaleToPercent(medianAverageGames, ...gamesDomain),
    points: rows.map((team) => ({
      team,
      left: scaleToPercent(team.hundredGameRate, ...rateDomain),
      top: 100 - scaleToPercent(team.averageGames, ...gamesDomain),
    })),
  };
}

function extent(values: number[]): [number, number] {
  return [Math.min(...values), Math.max(...values)];
}

function scaleToPercent(value: number, minimum: number, maximum: number) {
  if (minimum === maximum) return 50;
  return ((value - minimum) / (maximum - minimum)) * 100;
}

function teamSelectionsHref(
  abbreviation: string,
  fromYear: number | null,
  toYear: number | null,
) {
  const params = new URLSearchParams({
    view: "board",
    year: "all",
    team: abbreviation,
  });
  if (fromYear !== null) params.set("from", String(fromYear));
  if (toYear !== null) params.set("to", String(toYear));
  return `/drafts?${params.toString()}`;
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
