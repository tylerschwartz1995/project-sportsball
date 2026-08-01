"use client";

import type { SeasonSummary } from "@/contracts/season";

type SeasonPickerProps = {
  seasons: SeasonSummary[];
  selectedSeasonId: number | undefined;
  className?: string;
  params?: Record<string, string | number | undefined>;
};

export function SeasonPicker({
  seasons,
  selectedSeasonId,
  className = "",
  params = {},
}: SeasonPickerProps) {
  return (
    <form
      method="get"
      className={`workspace-season-picker ${className}`}
    >
      {Object.entries(params).map(([name, value]) =>
        value === undefined || name === "season" ? null : (
          <input key={name} type="hidden" name={name} value={value} />
        ),
      )}
      <label>
        Season
        <select
          name="season"
          defaultValue={selectedSeasonId}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.label}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
