"use client";

import Link from "@/components/ui/exploration-link";
import { useGetFormNavigation } from "@/components/ui/use-get-form-navigation";
import type { ChangeEvent } from "react";
import { useState } from "react";

import { CalendarIcon } from "@/components/ui/sizing-icons";
import type { GameDateSummary } from "@/contracts/game";
import {
  clampScheduleDate,
  formatScheduleMonth,
  formatScheduleDay,
  formatScheduleMonthDay,
  scheduleMonth,
  scheduleMonthKey,
  scheduleWeek,
  shiftScheduleDate,
  shiftScheduleMonth,
} from "@/lib/schedule-navigation";

const CALENDAR_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type GamePickerProps = {
  seasons: Array<{ id: number; label: string }>;
  selectedSeasonId: number;
  gameDates: GameDateSummary[];
  selectedDate: string;
};

export function GamePicker({
  seasons,
  selectedSeasonId,
  gameDates,
  selectedDate,
}: GamePickerProps) {
  const { navigate, isPending } = useGetFormNavigation();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(
    `${scheduleMonthKey(selectedDate)}-01`,
  );
  const [previousDate, setPreviousDate] = useState(selectedDate);
  if (previousDate !== selectedDate) {
    setPreviousDate(selectedDate);
    setCalendarMonth(`${scheduleMonthKey(selectedDate)}-01`);
  }
  const counts = new Map(
    gameDates.map((entry) => [entry.date, entry.gameCount]),
  );
  const chronologicalDates = gameDates
    .map((entry) => entry.date)
    .toSorted((left, right) => left.localeCompare(right));
  const firstDate = chronologicalDates[0];
  const lastDate = chronologicalDates.at(-1);

  if (!firstDate || !lastDate) return null;

  const week = scheduleWeek(selectedDate);
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
  const calendarDays = scheduleMonth(calendarMonth);
  const firstMonth = scheduleMonthKey(firstDate);
  const lastMonth = scheduleMonthKey(lastDate);
  const activeMonth = scheduleMonthKey(calendarMonth);

  return (
    <section
      className="workspace-schedule-navigator"
      aria-label="Schedule controls"
    >
      <div className="workspace-schedule-toolbar">
        <form onSubmit={event => { event.preventDefault(); navigate(event.currentTarget); }} aria-busy={isPending || undefined} method="get">
          <label>
            Season
            <select
              key={selectedSeasonId}
              disabled={isPending}
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

        <form onSubmit={event => { event.preventDefault(); navigate(event.currentTarget); }} aria-busy={isPending || undefined} method="get" className="workspace-schedule-calendar">
          <input type="hidden" name="season" value={selectedSeasonId} />
          <label>
            Jump to Date
            <input
              type="date"
              key={selectedDate}
              disabled={isPending}
              name="date"
              min={firstDate}
              max={lastDate}
              defaultValue={selectedDate}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
            />
          </label>
        </form>
        <div className="workspace-schedule-calendar-action">
        <span className="schedule-mobile-date-label" aria-hidden="true">Date</span>
        <button
          type="button"
          aria-label={isCalendarOpen ? "Hide Calendar" : "Calendar View"}
          aria-describedby="schedule-selected-date"
          aria-expanded={isCalendarOpen}
          aria-controls="schedule-month-calendar"
          onClick={() => setIsCalendarOpen((current) => !current)}
        >
          <CalendarIcon />
          <span className="schedule-calendar-desktop-text">{isCalendarOpen ? "Hide Calendar" : "Calendar View"}</span>
          <span id="schedule-selected-date" className="schedule-mobile-date-text">{formatScheduleMonthDay(selectedDate)}, {selectedDate.slice(0, 4)}</span>
        </button>
        </div>
      </div>

      {isCalendarOpen ? (
        <section
          id="schedule-month-calendar"
          className="workspace-schedule-month"
          aria-labelledby="schedule-month-title"
        >
          <div className="workspace-schedule-month-heading">
            <button
              type="button"
              disabled={activeMonth <= firstMonth}
              aria-label="Previous month"
              onClick={() =>
                setCalendarMonth((current) => shiftScheduleMonth(current, -1))
              }
            >
              ←
            </button>
            <div>
              <span>Month Schedule</span>
              <h2 id="schedule-month-title">
                {formatScheduleMonth(calendarMonth)}
              </h2>
            </div>
            <button
              type="button"
              disabled={activeMonth >= lastMonth}
              aria-label="Next month"
              onClick={() =>
                setCalendarMonth((current) => shiftScheduleMonth(current, 1))
              }
            >
              →
            </button>
          </div>
          <p className="workspace-calendar-mobile-key">
            Game counts below each date
          </p>
          <div className="workspace-schedule-month-grid">
            {CALENDAR_WEEKDAYS.map((weekday) => (
              <span key={weekday} className="is-weekday">
                {weekday}
              </span>
            ))}
            {calendarDays.map((date, index) => {
              if (!date) {
                return <span key={`blank-${index}`} aria-hidden="true" />;
              }
              const inRange = date >= firstDate && date <= lastDate;
              const gameCount = counts.get(date) ?? 0;
              const content = (
                <>
                  <strong>{Number(date.slice(-2))}</strong>
                  <small>
                    <span className="workspace-calendar-count-full">
                      {gameCount === 0
                        ? "No games"
                        : `${gameCount} ${gameCount === 1 ? "game" : "games"}`}
                    </span>
                    <span
                      className="workspace-calendar-count-compact"
                      aria-hidden="true"
                    >
                      {gameCount}
                    </span>
                  </small>
                </>
              );

              return inRange ? (
                <Link
                  key={date}
                  onClick={() => setIsCalendarOpen(false)}
                  href={gamesHref({
                    seasonId: selectedSeasonId,
                    date,
                  })}
                  aria-current={date === selectedDate ? "date" : undefined}
                  data-has-games={gameCount > 0}
                  aria-label={`${formatScheduleMonthDay(date)}, ${gameCount} ${gameCount === 1 ? "game" : "games"}`}
                >
                  {content}
                </Link>
              ) : (
                <span
                  key={date}
                  aria-disabled="true"
                  data-has-games={gameCount > 0}
                  aria-label={`${formatScheduleMonthDay(date)}, ${gameCount} ${gameCount === 1 ? "game" : "games"}`}
                >
                  {content}
                </span>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="workspace-schedule-week-actions">
        <DateLink
          label="← Previous Week"
          date={previousWeek}
          disabled={selectedDate <= firstDate}
          seasonId={selectedSeasonId}
        />
        <p>
          {formatScheduleMonthDay(week[0])}–{formatScheduleMonthDay(week[6])}
        </p>
        <DateLink
          label="Next Week →"
          date={nextWeek}
          disabled={selectedDate >= lastDate}
          seasonId={selectedSeasonId}
        />
      </div>

      <p className="workspace-calendar-mobile-key">
        Game counts below each date
      </p>
      <div className="workspace-schedule-week" aria-label="Games by day">
        {week.map((date) => {
          const inRange = date >= firstDate && date <= lastDate;
          const gameCount = counts.get(date) ?? 0;
          const content = (
            <>
              <span>{formatScheduleDay(date)}</span>
              <strong>
                <span className="workspace-calendar-date-full">
                  {formatScheduleMonthDay(date)}
                </span>
                <span
                  className="workspace-calendar-date-compact"
                  aria-hidden="true"
                >
                  {Number(date.slice(-2))}
                </span>
              </strong>
              <small>
                <span className="workspace-calendar-count-full">
                  {gameCount === 0
                    ? "No games"
                    : `${gameCount} ${gameCount === 1 ? "game" : "games"}`}
                </span>
                <span
                  className="workspace-calendar-count-compact"
                  aria-hidden="true"
                >
                  {gameCount}
                </span>
              </small>
            </>
          );

          return inRange ? (
            <Link
              key={date}
              href={gamesHref({
                seasonId: selectedSeasonId,
                date,
              })}
              aria-current={date === selectedDate ? "date" : undefined}
              data-has-games={gameCount > 0}
              aria-label={`${formatScheduleDay(date)}, ${formatScheduleMonthDay(date)}, ${gameCount} ${gameCount === 1 ? "game" : "games"}`}
            >
              {content}
            </Link>
          ) : (
            <span
              key={date}
              aria-disabled="true"
              data-has-games={gameCount > 0}
              aria-label={`${formatScheduleMonthDay(date)}, ${gameCount} ${gameCount === 1 ? "game" : "games"}`}
            >
              {content}
            </span>
          );
        })}
      </div>

    </section>
  );
}

function DateLink({
  label,
  date,
  disabled,
  seasonId,
}: {
  label: string;
  date: string;
  disabled: boolean;
  seasonId: number;
}) {
  return disabled ? (
    <span aria-disabled="true" aria-label={label}><span className="week-link-full">{label}</span><span className="week-link-short">{label.replace(" Week", "")}</span></span>
  ) : (
    <Link aria-label={label} href={gamesHref({ seasonId, date })}><span className="week-link-full">{label}</span><span className="week-link-short">{label.replace(" Week", "")}</span></Link>
  );
}

function submitSelect(event: ChangeEvent<HTMLSelectElement>) {
  event.currentTarget.form?.requestSubmit();
}

function gamesHref({
  seasonId,
  date,
}: {
  seasonId: number;
  date: string;
}): string {
  const search = new URLSearchParams({
    season: String(seasonId),
    date,
  });
  return `/games?${search.toString()}`;
}
