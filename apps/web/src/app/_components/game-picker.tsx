"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";

import type { GameDateSummary } from "@/contracts/game";
import type { GamePhase } from "@/contracts/season-phase";
import type { TeamIdentity } from "@/contracts/team";
import {
  clampScheduleDate,
  formatScheduleDay,
  formatScheduleMonthDay,
  scheduleWeek,
  shiftScheduleDate,
} from "@/lib/schedule-navigation";

type GamePickerProps = {
  seasons: Array<{ id: number; label: string }>;
  selectedSeasonId: number;
  gameDates: GameDateSummary[];
  selectedDate: string;
  phase: GamePhase;
  teams: TeamIdentity[];
  selectedTeamId?: number;
};

export function GamePicker({
  seasons,
  selectedSeasonId,
  gameDates,
  selectedDate,
  phase,
  teams,
  selectedTeamId,
}: GamePickerProps) {
  const counts = new Map(gameDates.map((entry) => [entry.date, entry.gameCount]));
  const chronologicalDates = gameDates
    .map((entry) => entry.date)
    .toSorted((left, right) => left.localeCompare(right));
  const firstDate = chronologicalDates[0];
  const lastDate = chronologicalDates.at(-1);

  if (!firstDate || !lastDate) return null;

  const week = scheduleWeek(selectedDate);
  const previousDay = shiftScheduleDate(selectedDate, -1);
  const nextDay = shiftScheduleDate(selectedDate, 1);
  const previousWeek = clampScheduleDate(
    shiftScheduleDate(selectedDate, -7),
    firstDate,
    lastDate,
  );
  const nextWeek = clampScheduleDate(
    shiftScheduleDate(selectedDate, 7),
    firstDate,
    lastDate,
  );
  const defaultDateLabel =
    gameDates[0].date === lastDate ? "Latest Results" : "Next Games";

  return (
    <section className="workspace-schedule-navigator" aria-label="Schedule controls">
      <div className="workspace-schedule-toolbar">
        <form method="get">
          <input type="hidden" name="phase" value={phase} />
          {selectedTeamId ? (
            <input type="hidden" name="team" value={selectedTeamId} />
          ) : null}
          <label>
            Season
            <select
              name="season"
              defaultValue={selectedSeasonId}
              onChange={submitSelect}
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.label}
                </option>
              ))}
            </select>
          </label>
        </form>

        <nav className="workspace-schedule-phase" aria-label="Schedule phase">
          <span>Season Phase</span>
          <div>
            {(["regular", "playoffs"] as const).map((option) => (
              <Link
                key={option}
                href={gamesHref({
                  seasonId: selectedSeasonId,
                  phase: option,
                  date: selectedDate,
                  teamId: selectedTeamId,
                })}
                aria-current={phase === option ? "page" : undefined}
              >
                {option === "regular" ? "Regular Season" : "Playoffs"}
              </Link>
            ))}
          </div>
        </nav>

        <form method="get">
          <input type="hidden" name="season" value={selectedSeasonId} />
          <input type="hidden" name="phase" value={phase} />
          <input type="hidden" name="date" value={selectedDate} />
          <label>
            Find a Team
            <select
              name="team"
              defaultValue={selectedTeamId ?? ""}
              onChange={submitSelect}
            >
              <option value="">All Teams</option>
              {teams.map((team) => (
                <option key={team.nhlTeamId} value={team.nhlTeamId}>
                  {team.name} ({team.abbreviation})
                </option>
              ))}
            </select>
          </label>
        </form>

        <form method="get" className="workspace-schedule-calendar">
          <input type="hidden" name="season" value={selectedSeasonId} />
          <input type="hidden" name="phase" value={phase} />
          {selectedTeamId ? (
            <input type="hidden" name="team" value={selectedTeamId} />
          ) : null}
          <label>
            Jump to Date
            <input
              type="date"
              name="date"
              min={firstDate}
              max={lastDate}
              defaultValue={selectedDate}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
            />
          </label>
        </form>
      </div>

      <div className="workspace-schedule-week-actions">
        <DateLink
          label="← Previous Week"
          date={previousWeek}
          disabled={selectedDate <= firstDate}
          seasonId={selectedSeasonId}
          phase={phase}
          teamId={selectedTeamId}
        />
        <p>
          {formatScheduleMonthDay(week[0])}–{formatScheduleMonthDay(week[6])}
        </p>
        <DateLink
          label="Next Week →"
          date={nextWeek}
          disabled={selectedDate >= lastDate}
          seasonId={selectedSeasonId}
          phase={phase}
          teamId={selectedTeamId}
        />
      </div>

      <div className="workspace-schedule-week" aria-label="Games by day">
        {week.map((date) => {
          const inRange = date >= firstDate && date <= lastDate;
          const gameCount = counts.get(date) ?? 0;
          const content = (
            <>
              <span>{formatScheduleDay(date)}</span>
              <strong>{formatScheduleMonthDay(date)}</strong>
              <small>
                {gameCount === 0
                  ? "No games"
                  : `${gameCount} ${gameCount === 1 ? "game" : "games"}`}
              </small>
            </>
          );

          return inRange ? (
            <Link
              key={date}
              href={gamesHref({
                seasonId: selectedSeasonId,
                phase,
                date,
                teamId: selectedTeamId,
              })}
              aria-current={date === selectedDate ? "date" : undefined}
              data-has-games={gameCount > 0}
            >
              {content}
            </Link>
          ) : (
            <span key={date} aria-disabled="true">
              {content}
            </span>
          );
        })}
      </div>

      <div className="workspace-schedule-day-actions">
        <DateLink
          label={`← Previous Day · ${formatScheduleMonthDay(previousDay)}`}
          date={previousDay}
          disabled={selectedDate <= firstDate}
          seasonId={selectedSeasonId}
          phase={phase}
          teamId={selectedTeamId}
        />
        <Link
          href={gamesHref({
            seasonId: selectedSeasonId,
            phase,
            date: gameDates[0].date,
            teamId: selectedTeamId,
          })}
        >
          {defaultDateLabel}
        </Link>
        <DateLink
          label={`Next Day · ${formatScheduleMonthDay(nextDay)} →`}
          date={nextDay}
          disabled={selectedDate >= lastDate}
          seasonId={selectedSeasonId}
          phase={phase}
          teamId={selectedTeamId}
        />
      </div>
    </section>
  );
}

function DateLink({
  label,
  date,
  disabled,
  seasonId,
  phase,
  teamId,
}: {
  label: string;
  date: string;
  disabled: boolean;
  seasonId: number;
  phase: GamePhase;
  teamId?: number;
}) {
  return disabled ? (
    <span aria-disabled="true">{label}</span>
  ) : (
    <Link href={gamesHref({ seasonId, phase, date, teamId })}>{label}</Link>
  );
}

function submitSelect(event: ChangeEvent<HTMLSelectElement>) {
  event.currentTarget.form?.requestSubmit();
}

function gamesHref({
  seasonId,
  phase,
  date,
  teamId,
}: {
  seasonId: number;
  phase: GamePhase;
  date: string;
  teamId?: number;
}): string {
  const search = new URLSearchParams({
    season: String(seasonId),
    phase,
    date,
  });
  if (teamId) search.set("team", String(teamId));
  return `/games?${search.toString()}`;
}
