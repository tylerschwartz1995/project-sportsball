"use client";

import type { ChangeEvent } from "react";

type GamePickerProps = {
  seasons: Array<{ id: number; label: string }>;
  selectedSeasonId: number | undefined;
  gameDates: Array<{ date: string; gameCount: number }>;
  selectedDate: string | undefined;
  phase: string;
};

export function GamePicker({
  seasons,
  selectedSeasonId,
  gameDates,
  selectedDate,
  phase,
}: GamePickerProps) {
  function submitSeason(event: ChangeEvent<HTMLSelectElement>) {
    const form = event.currentTarget.form;
    const dateSelect = form?.elements.namedItem("date");

    if (dateSelect instanceof HTMLSelectElement) {
      dateSelect.disabled = true;
      form?.requestSubmit();
      dateSelect.disabled = false;
      return;
    }

    form?.requestSubmit();
  }

  function submitDate(event: ChangeEvent<HTMLSelectElement>) {
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form method="get" className="workspace-game-picker">
      <input type="hidden" name="phase" value={phase} />
      <label>
        Season
        <select
          name="season"
          defaultValue={selectedSeasonId}
          onChange={submitSeason}
        >
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Game date
        <select name="date" defaultValue={selectedDate} onChange={submitDate}>
          {gameDates.map((entry) => (
            <option key={entry.date} value={entry.date}>
              {entry.date} · {entry.gameCount}{" "}
              {entry.gameCount === 1 ? "game" : "games"}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
