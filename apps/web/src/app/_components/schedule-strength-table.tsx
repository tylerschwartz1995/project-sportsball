"use client";

import Link from "next/link";
import { useState } from "react";

import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogo } from "@/app/_components/team-logo";
import type {
  ScheduleStrengthGame,
  ScheduleStrengthMetric,
} from "@/contracts/schedule-strength";
import {
  formatScheduleStrengthMetric,
  scheduleStrengthMetricDefinitions,
  scheduleStrengthMetricOptions,
  scheduleStrengthMetricRatingSeasonId,
  scheduleStrengthMetricValue,
} from "@/lib/schedule-strength-metrics";

const scheduleDateFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Vancouver",
});

export function ScheduleStrengthTable({
  title,
  games,
  seasonId,
  open = false,
}: {
  title: string;
  games: ScheduleStrengthGame[];
  seasonId: number;
  open?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(open);

  return (
    <details className="surface-panel mt-5 overflow-hidden" open={isOpen}>
      <summary
        className="cursor-pointer px-5 py-4 font-medium text-white marker:text-cyan-300"
        onClick={(event) => {
          event.preventDefault();
          setIsOpen((current) => !current);
        }}
      >
        {title}{" "}
        <span className="ml-2 text-sm text-slate-500">({games.length})</span>
      </summary>
      {isOpen ? (
        <SortableTable
          defaultSortKey="date"
          defaultDirection={open ? "asc" : "desc"}
        >
          <div className="workspace-table-scroll border-t border-white/[0.07]">
            <table className="workspace-table workspace-table-dense workspace-table-semantic workspace-schedule-strength-table min-w-[1040px]">
              <colgroup>
                <col className="workspace-col-date" />
                <col className="workspace-col-entity" />
                <col className="workspace-col-label" />
                <col className="workspace-col-split" />
                <col className="workspace-col-number" />
                <col className="workspace-col-time" />
                <col className="workspace-col-split" />
                <col className="workspace-col-split" />
              </colgroup>
              <thead>
                <tr>
                  <SortableHeader
                    label="Date"
                    sortKey="date"
                    align="left"
                    defaultDirection="asc"
                  />
                  <SortableHeader
                    label="Opponent"
                    sortKey="opponent"
                    align="left"
                    defaultDirection="asc"
                  />
                  <SortableHeader
                    label="Site"
                    sortKey="site"
                    align="left"
                    defaultDirection="asc"
                  />
                  <SortableHeader
                    label={<MetricLabels />}
                    description="Opponent strength before this game"
                    sortKey="strength"
                  />
                  <SortableHeader label="Prior GP" sortKey="sample" />
                  <SortableHeader label="Rest" sortKey="rest" />
                  <SortableHeader label="Travel" sortKey="travel" />
                  <SortableHeader
                    label="Result"
                    sortKey="result"
                    align="left"
                  />
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <ScheduleStrengthRow
                    key={game.nhlGameId}
                    game={game}
                    seasonId={seasonId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </SortableTable>
      ) : null}
    </details>
  );
}

function MetricLabels() {
  return scheduleStrengthMetricOptions.map((metric) => (
    <span key={metric} data-strength-inline={metric}>
      {scheduleStrengthMetricDefinitions[metric].shortLabel}
    </span>
  ));
}

function ScheduleStrengthRow({
  game,
  seasonId,
}: {
  game: ScheduleStrengthGame;
  seasonId: number;
}) {
  const result = game.completed
    ? `${game.teamScore! > game.opponentScore! ? "W" : "L"} ${game.teamScore}–${game.opponentScore}`
    : scheduleStateLabel(game.state);
  const values = Object.fromEntries(
    scheduleStrengthMetricOptions.map((metric) => [
      metric,
      scheduleStrengthMetricValue(game, metric),
    ]),
  ) as Record<ScheduleStrengthMetric, number | null>;

  return (
    <tr>
      <td data-sort-value={game.startTimeUtc}>
        <Link href={`/games/${game.nhlGameId}`}>{formatDate(game.startTimeUtc)}</Link>
      </td>
      <td data-sort-value={game.opponentName} className="workspace-team-cell">
        <div className="flex items-center gap-2">
          <TeamLogo
            nhlTeamId={game.opponentNhlTeamId}
            abbreviation={game.opponentAbbreviation}
            name={game.opponentName}
            size="tiny"
            decorative
          />
          <div>
            <Link href={`/teams/${game.opponentNhlTeamId}?season=${seasonId}`}>
              {game.opponentName}
            </Link>
            <small>{game.opponentAbbreviation}</small>
          </div>
        </div>
      </td>
      <td
        data-sort-value={game.isHome ? "home" : "away"}
        className="workspace-schedule-site-cell"
      >
        <strong>{game.isHome ? "Home" : "Away"}</strong>
        {game.siteName ? <small>{game.siteName}</small> : null}
      </td>
      <td
        data-sort-value={values.standings ?? ""}
        data-sort-standings={values.standings ?? ""}
        data-sort-goal-differential={values["goal-differential"] ?? ""}
        data-sort-expected-goals={values["expected-goals"] ?? ""}
        className="workspace-semantic-number text-center font-medium tabular-nums text-cyan-100"
      >
        {scheduleStrengthMetricOptions.map((metric) => (
          <span key={metric} data-strength-inline={metric}>
            {formatScheduleStrengthMetric(values[metric], metric)}
          </span>
        ))}
      </td>
      <td
        data-sort-value={game.opponentPriorGames}
        className="workspace-semantic-number text-center tabular-nums"
      >
        {game.opponentPriorGames}
        {scheduleStrengthMetricOptions.map((metric) => {
          const ratingSeasonId = scheduleStrengthMetricRatingSeasonId(
            game,
            metric,
          );
          return ratingSeasonId !== null && ratingSeasonId !== seasonId ? (
            <span
              key={metric}
              data-strength-inline={metric}
              className="ml-1 text-slate-500"
              title={`Rating uses the ${formatSeasonId(ratingSeasonId)} season`}
            >
              *
            </span>
          ) : null;
        })}
      </td>
      <td
        data-sort-value={game.restDays ?? ""}
        className="workspace-semantic-number text-center tabular-nums"
      >
        {game.isBackToBack
          ? "B2B"
          : game.restDays === null
            ? "—"
            : `${game.restDays}d`}
      </td>
      <td
        data-sort-value={game.travelDistanceKm ?? ""}
        className="workspace-semantic-number text-center tabular-nums"
      >
        {game.travelDistanceKm === null
          ? "—"
          : formatDistance(game.travelDistanceKm)}
      </td>
      <td data-sort-value={result}>{result}</td>
    </tr>
  );
}

function formatDistance(value: number): string {
  return `${Math.round(value).toLocaleString("en-CA")} km`;
}

function formatDate(value: string): string {
  return scheduleDateFormatter.format(new Date(value));
}

function formatSeasonId(seasonId: number): string {
  const start = Math.floor(seasonId / 10_000);
  const end = seasonId % 10_000;
  return `${start}–${String(end).slice(2)}`;
}

function scheduleStateLabel(state: string): string {
  if (state === "FUT" || state === "PRE") return "Scheduled";
  if (state === "LIVE" || state === "CRIT") return "Live";
  return state;
}
