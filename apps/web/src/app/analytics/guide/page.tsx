import { AnalyticsSectionTabs } from "@/app/_components/analytics-section-tabs";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import { parseSeasonId } from "@/contracts/season";
import { listSeasons } from "@/data/seasons";
import { firstQueryValue } from "@/lib/directory";

export const dynamic = "force-dynamic";

type MetricGuidePageProps = {
  searchParams: Promise<{ season?: string | string[] }>;
};

const metricGroups = [
  {
    title: "Shot quality and possession",
    description:
      "Use these together: shot volume describes territorial pressure, while expected goals adds an estimate of chance quality.",
    metrics: [
      {
        abbreviation: "xG",
        name: "Expected goals",
        definition:
          "The estimated probability that an unblocked shot becomes a goal. Adding every shot probability gives a team or player’s total expected goals.",
        reading: "Higher is better for offence; lower is better when allowed.",
      },
      {
        abbreviation: "xG%",
        name: "Expected-goal share",
        definition:
          "Expected goals for divided by total expected goals for and against while the team, player, line, or pairing is on the ice.",
        reading: "Above 50% means the selected side controlled more shot quality.",
      },
      {
        abbreviation: "CF%",
        name: "Corsi share",
        definition:
          "The share of all shot attempts—including goals, saved shots, misses, and blocks—taken by the selected side.",
        reading: "Above 50% indicates more shot-attempt pressure than the opponent.",
      },
      {
        abbreviation: "FF%",
        name: "Fenwick share",
        definition:
          "The share of unblocked shot attempts, so it includes goals, saves, and misses but removes blocked attempts.",
        reading: "Above 50% indicates the selected side produced more unblocked attempts.",
      },
    ],
  },
  {
    title: "Player creation and results",
    description:
      "Individual metrics describe what a skater personally generated; on-ice metrics include everything that happened with that player on the ice.",
    metrics: [
      {
        abbreviation: "ixG",
        name: "Individual expected goals",
        definition:
          "The expected-goal probabilities from only that skater’s own unblocked shots, added together.",
        reading: "A shot-quality estimate of the scoring chances a player personally created.",
      },
      {
        abbreviation: "On-ice xG%",
        name: "On-ice expected-goal share",
        definition:
          "The team’s expected-goal share during the player’s ice time, regardless of which teammate took each shot.",
        reading: "Useful for context, but affected by teammates, opponents, and deployment.",
      },
      {
        abbreviation: "Game score",
        name: "Single-game contribution",
        definition:
          "MoneyPuck’s combined single-game estimate using scoring, shot, penalty, and defensive events.",
        reading: "Best used as a compact game summary, not a complete player evaluation.",
      },
    ],
  },
  {
    title: "Goaltending",
    description:
      "Expected-goal models estimate shot difficulty so goalie results can be compared with the quality of chances faced.",
    metrics: [
      {
        abbreviation: "xGA",
        name: "Expected goals against",
        definition:
          "The expected-goal probabilities of the unblocked shots a goalie faced, added together.",
        reading: "An estimate of how many goals an average goalie would allow on those chances.",
      },
      {
        abbreviation: "GSAx",
        name: "Goals saved above expected",
        definition:
          "Expected goals against minus actual goals against.",
        reading: "Positive is better: the goalie allowed fewer goals than shot quality predicted.",
      },
      {
        abbreviation: "SV%",
        name: "Save percentage",
        definition:
          "Saves divided by shots on goal. Unlike GSAx, it does not adjust for the quality of shots faced.",
        reading: "Higher is better, but compare it with workload and shot quality.",
      },
    ],
  },
] as const;

export default async function MetricGuidePage({
  searchParams,
}: MetricGuidePageProps) {
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(
    firstQueryValue((await searchParams).season),
  );
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="analytics" />

      <section className="py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-violet-300">
              Advanced analytics reference
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              Metric guide
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
              Plain-language definitions for the advanced statistics used
              across team, player, line, goalie, and game views.
            </p>
          </div>
          <SeasonPicker
            seasons={seasons}
            selectedSeasonId={selectedSeason?.id}
          />
        </div>

        {selectedSeason ? (
          <AnalyticsSectionTabs
            seasonId={selectedSeason.id}
            active="guide"
          />
        ) : null}

        <div className="mt-8 space-y-8">
          {metricGroups.map((group) => (
            <section key={group.title}>
              <h3 className="text-2xl font-semibold text-white">
                {group.title}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                {group.description}
              </p>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {group.metrics.map((metric) => (
                  <article
                    key={metric.abbreviation}
                    className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h4 className="text-xl font-semibold text-violet-200">
                        {metric.abbreviation}
                      </h4>
                      <p className="text-sm font-medium text-white">
                        {metric.name}
                      </p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {metric.definition}
                    </p>
                    <p className="mt-3 border-l-2 border-violet-300/30 pl-3 text-sm leading-6 text-slate-300">
                      {metric.reading}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="mt-10 rounded-2xl border border-violet-300/20 bg-violet-300/[0.06] p-6">
          <h3 className="font-semibold text-white">How to read the data</h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
            Situation filters matter: all-situations results include power
            plays and penalty kills, while 5-on-5 is better for even-strength
            comparison. Small samples can swing sharply, and model-based
            metrics should support—not replace—game context.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <a
              href="https://www.moneypuck.com/glossary.htm"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-violet-300 transition hover:text-violet-200"
            >
              MoneyPuck glossary ↗
            </a>
            <a
              href="https://www.moneypuck.com/about.htm"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-violet-300 transition hover:text-violet-200"
            >
              Model methodology ↗
            </a>
          </div>
        </aside>
      </section>
    </main>
  );
}
