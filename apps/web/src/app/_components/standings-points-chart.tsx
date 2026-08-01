"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { TeamLogo } from "@/app/_components/team-logo";

import type {
  StandingsEntry,
  StandingsPointsHistoryPoint,
} from "@/contracts/standings";

type StandingsPointsChartProps = {
  history: StandingsPointsHistoryPoint[];
  standings: StandingsEntry[];
};

const COLORS = [
  "#67e8f9",
  "#fbbf24",
  "#a78bfa",
  "#34d399",
  "#fb7185",
  "#60a5fa",
  "#f97316",
  "#c084fc",
];

export function StandingsPointsChart({
  history,
  standings,
}: StandingsPointsChartProps) {
  const groups = useMemo(
    () => [
      { value: "league", label: "League" },
      ...uniqueOptions(standings, "conferenceName", "Conference"),
      ...uniqueOptions(standings, "divisionName", "Division"),
    ],
    [standings],
  );
  const [group, setGroup] = useState("league");
  const [teamSelection, setTeamSelection] = useState("leaders");
  const eligibleTeams = useMemo(
    () =>
      standings
        .filter((team) => matchesGroup(team, group))
        .sort((left, right) => left.leagueRank - right.leagueRank),
    [group, standings],
  );
  const selectedTeams =
    teamSelection === "leaders"
      ? eligibleTeams.slice(0, 8)
      : eligibleTeams.filter(
          (team) => String(team.nhlTeamId) === teamSelection,
        );
  const chartData = useMemo(
    () => buildChartData(history, selectedTeams),
    [history, selectedTeams],
  );

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="workspace-chart-panel">
      <header className="workspace-player-chart-header">
        <div>
          <p>Season Progress</p>
          <h3>Points Over Time</h3>
        </div>
        <p>
          Follow the current leaders together or isolate one club. Points are
          accumulated from stored regular-season results.
        </p>
      </header>
      <div className="workspace-chart-toolbar">
        <label className="workspace-chart-metric-select">
          Group
          <select
            value={group}
            onChange={(event) => {
              setGroup(event.target.value);
              setTeamSelection("leaders");
            }}
          >
            {groups.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="workspace-chart-metric-select">
          Teams
          <select
            value={teamSelection}
            onChange={(event) => setTeamSelection(event.target.value)}
          >
            <option value="leaders">Current Top 8</option>
            {eligibleTeams.map((team) => (
              <option key={team.nhlTeamId} value={team.nhlTeamId}>
                {team.teamName}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="workspace-chart h-[430px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 14, right: 20, bottom: 8, left: 4 }}
          >
            <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              minTickGap={42}
              tick={{ fill: "#94a3b8", fontSize: 15 }}
              axisLine={{ stroke: "rgba(148,163,184,0.2)" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              width={42}
              tick={{ fill: "#94a3b8", fontSize: 15 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              labelFormatter={(label) => formatLongDate(String(label))}
              contentStyle={{
                background: "#081626",
                border: "1px solid rgba(148,163,184,0.24)",
                borderRadius: 12,
                fontSize: 15,
              }}
            />
            {selectedTeams.map((team, index) => (
              <Line
                key={team.nhlTeamId}
                type="monotone"
                dataKey={String(team.nhlTeamId)}
                name={team.teamAbbreviation}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="workspace-chart-legend">
        {selectedTeams.map((team, index) => (
          <span key={team.nhlTeamId}>
            <TeamLogo
              nhlTeamId={team.nhlTeamId}
              abbreviation={team.teamAbbreviation}
              name={team.teamName}
              size="tiny"
              decorative
            />
            <i style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            {team.teamAbbreviation}
          </span>
        ))}
      </div>
    </div>
  );
}

function uniqueOptions(
  standings: StandingsEntry[],
  key: "conferenceName" | "divisionName",
  suffix: string,
) {
  return [
    ...new Set(
      standings
        .map((team) => team[key])
        .filter((value): value is string => Boolean(value)),
    ),
  ]
    .sort()
    .map((value) => ({
      value: `${key}:${value}`,
      label: `${value} ${suffix}`,
    }));
}

function matchesGroup(team: StandingsEntry, group: string): boolean {
  if (group === "league") return true;
  const [key, value] = group.split(":", 2);
  return key === "conferenceName"
    ? team.conferenceName === value
    : team.divisionName === value;
}

function buildChartData(
  history: StandingsPointsHistoryPoint[],
  selectedTeams: StandingsEntry[],
): Array<Record<string, string | number>> {
  const selectedIds = new Set(selectedTeams.map((team) => team.nhlTeamId));
  const pointsByDate = new Map<string, Map<number, number>>();
  for (const point of history) {
    if (!selectedIds.has(point.nhlTeamId)) continue;
    const datePoints = pointsByDate.get(point.gameDate) ?? new Map();
    datePoints.set(point.nhlTeamId, point.points);
    pointsByDate.set(point.gameDate, datePoints);
  }

  const latest = new Map<number, number>();
  return [...pointsByDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, updates]) => {
      for (const [teamId, points] of updates) latest.set(teamId, points);
      const row: Record<string, string | number> = { date };
      for (const team of selectedTeams) {
        if (latest.has(team.nhlTeamId)) {
          row[String(team.nhlTeamId)] = latest.get(team.nhlTeamId)!;
        }
      }
      return row;
    });
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatLongDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
