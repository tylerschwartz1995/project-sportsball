import { AnalyticsSectionTabs } from "@/app/_components/analytics-section-tabs";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SeasonUnitTables } from "@/app/_components/season-unit-tables";
import { SiteHeader } from "@/app/_components/site-header";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
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
        <WorkspacePageHeader
          eyebrow="MoneyPuck five-on-five units"
          title={`${selectedSeason?.label ?? "No Season"} Top Combinations`}
          description="Compare the most-used forward lines and defensive pairings. Season totals are calculated from stored game-level records, with percentages recomputed from their combined results."
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
            />
          }
        />

        {selectedSeason ? (
          <AnalyticsSectionTabs seasonId={selectedSeason.id} active="lines" />
        ) : null}

        {selectedSeason && selectedSeason.id >= 20082009 ? (
          <>
            <WorkspacePanel
              className="mt-8"
              title="Usage Filter"
              description="Set the minimum five-on-five ice time required to appear in both tables."
            >
              <MinimumIceTimeFilter
                seasonId={selectedSeason.id}
                selectedMinutes={minimumMinutes}
              />
            </WorkspacePanel>
            <div className="mt-10">
              <SeasonUnitTables data={units} seasonId={selectedSeason.id} />
            </div>
            <p className="workspace-coverage-note mt-8">
              <strong>Coverage:</strong> Regular-season five-on-five data from{" "}
              <a
                href="https://moneypuck.com/"
                target="_blank"
                rel="noreferrer"
              >
                MoneyPuck.com
              </a>
              . Coverage begins in 2008–09.
            </p>
          </>
        ) : (
          <div className="workspace-empty-state mt-10">
            <strong>Combinations are unavailable for this season.</strong>
            <span>MoneyPuck line and pairing coverage begins in 2008–09.</span>
          </div>
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
      className="workspace-unit-filter"
    >
      <input type="hidden" name="season" value={seasonId} />
      <label>
        Minimum five-on-five TOI
        <select
          name="minimum"
          defaultValue={selectedMinutes}
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
      >
        Apply
      </button>
    </form>
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
