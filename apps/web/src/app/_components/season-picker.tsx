import type { SeasonSummary } from "@/contracts/season";

type SeasonPickerProps = {
  seasons: SeasonSummary[];
  selectedSeasonId: number | undefined;
  className?: string;
};

export function SeasonPicker({
  seasons,
  selectedSeasonId,
  className = "",
}: SeasonPickerProps) {
  return (
    <form
      method="get"
      className={`flex w-full max-w-sm items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${className}`}
    >
      <label className="flex-1 text-sm font-medium text-slate-300">
        Season
        <select
          name="season"
          defaultValue={selectedSeasonId}
          className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-300/60"
        >
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
      >
        View
      </button>
    </form>
  );
}
