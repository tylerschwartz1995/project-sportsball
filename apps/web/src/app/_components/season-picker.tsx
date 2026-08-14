"use client";

import { useEffect, useRef } from "react";

import { useGetFormNavigation } from "@/app/_components/use-get-form-navigation";
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
  const formRef = useRef<HTMLFormElement>(null);
  const { isPending, navigate } = useGetFormNavigation();

  useEffect(() => {
    formRef.current?.setAttribute("data-navigation-ready", "true");
  }, []);

  return (
    <form
      ref={formRef}
      method="get"
      aria-busy={isPending || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(event.currentTarget);
      }}
      className={`workspace-season-picker ${className}`}
    >
      {Object.entries(params).map(([name, value]) =>
        name === "season" ? null : (
          <input key={name} type="hidden" name={name} value={value ?? ""} disabled={value === undefined || value === ""} />
        ),
      )}
      <label>
        Season
        <select
          name="season"
          defaultValue={selectedSeasonId}
          disabled={isPending}
          onChange={(event) => {
            const form = event.currentTarget.form;
            if (form) navigate(form);
          }}
        >
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.label}
            </option>
          ))}
        </select>
      </label>
      <noscript>
        <button type="submit">Apply season</button>
      </noscript>
    </form>
  );
}
