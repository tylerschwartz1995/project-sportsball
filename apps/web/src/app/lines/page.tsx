import { AnalyticsSectionTabs } from "@/app/_components/analytics-section-tabs";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SeasonUnitTables } from "@/app/_components/season-unit-tables";
import { SiteHeader } from "@/app/_components/site-header";
import { parseSeasonId } from "@/contracts/season";
import { listSeasons } from "@/data/seasons";
import { getMoneyPuckSeasonUnitLeaders } from "@/data/season-units";

export const dynamic = "force-dynamic";

const ICE_TIME_OPTIONS = [0, 50, 100, 200, 300] as const;

type LinesPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    minimum?: string | string[];
  }>;
};

export default async function LinesPage({ searchParams }: LinesPageProps) {
  const params = await searchParams;
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(firstValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const requestedMinimum = Number(firstValue(params.minimum));
  const minimumMinutes = ICE_TIME_OPTIONS.includes(
    requestedMinimum as (typeof ICE_TIME_OPTIONS)[number],
  )
    ? requestedMinimum
    : 100;
  const units = selectedSeason
    ? await getMoneyPuckSeasonUnitLeaders(selectedSeason.id, {
        minimumIceTimeSeconds: minimumMinutes * 60,
      })
    : { forwardLines: [], defensivePairings: [] };

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="analytics" />

      <section className="py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-violet-300">
              MoneyPuck five-on-five units
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              {selectedSeason?.label ?? "No Season"} Top Combinations
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
              Season totals are calculated in Polars from stored game-level
              forward-line and defensive-pairing records. Percentages are
              recomputed from summed results rather than averaged across games.
            </p>
          </div>
          <SeasonPicker
            seasons={seasons}
            selectedSeasonId={selectedSeason?.id}
          />
        </div>

        {selectedSeason ? (
          <AnalyticsSectionTabs seasonId={selectedSeason.id} active="lines" />
        ) : null}

        {selectedSeason && selectedSeason.id >= 20082009 ? (
          <>
            <MinimumIceTimeFilter
              seasonId={selectedSeason.id}
              selectedMinutes={minimumMinutes}
            />
            <div className="mt-10">
              <SeasonUnitTables data={units} seasonId={selectedSeason.id} />
            </div>
            <p className="mt-8 text-sm leading-6 text-slate-500">
              Regular-season five-on-five data from{" "}
              <a
                href="https://moneypuck.com/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-violet-300 hover:text-violet-200"
              >
                MoneyPuck.com
              </a>
              . Coverage begins in 2008–09.
            </p>
          </>
        ) : (
          <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-sm leading-6 text-slate-400">
            MoneyPuck line and pairing coverage begins in 2008–09.
          </p>
        )}
      </section>
    </main>
  );
}

function MinimumIceTimeFilter({
  seasonId,
  selectedMinutes,
}: {
  seasonId: number;
  selectedMinutes: number;
}) {
  return (
    <form
      method="get"
      className="mt-8 flex w-full max-w-sm items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
    >
      <input type="hidden" name="season" value={seasonId} />
      <label className="flex-1 text-sm font-medium text-slate-300">
        Minimum five-on-five TOI
        <select
          name="minimum"
          defaultValue={selectedMinutes}
          className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-violet-300/60"
        >
          {ICE_TIME_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes === 0 ? "No minimum" : `${minutes} minutes`}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-lg bg-violet-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-violet-200"
      >
        Apply
      </button>
    </form>
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
