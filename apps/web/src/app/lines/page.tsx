import { AnalyticsSectionTabs } from "@/app/_components/analytics-section-tabs";
import {
  FilterActions,
  FilterHeader,
} from "@/app/_components/filter-primitives";
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
import { listTeamsBySeason } from "@/data/teams";

export const dynamic = "force-dynamic";

const ICE_TIME_OPTIONS = [0, 20, 50, 100, 200, 300] as const;
const WINDOW_OPTIONS = [10, 20, 40] as const;

type LinesPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    minimum?: string | string[];
    team?: string | string[];
    window?: string | string[];
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
  const requestedTeam = Number(firstValue(params.team));
  const requestedTeamId =
    Number.isSafeInteger(requestedTeam) && requestedTeam > 0
      ? requestedTeam
      : undefined;
  const requestedWindow = Number(firstValue(params.window));
  const rollingGames = WINDOW_OPTIONS.includes(
    requestedWindow as (typeof WINDOW_OPTIONS)[number],
  )
    ? (requestedWindow as (typeof WINDOW_OPTIONS)[number])
    : undefined;
  const [teams, units] = selectedSeason
    ? await Promise.all([
        listTeamsBySeason(selectedSeason.id),
        getMoneyPuckSeasonUnitLeaders(selectedSeason.id, {
          minimumIceTimeSeconds: minimumMinutes * 60,
          teamNhlId: requestedTeamId,
          rollingGames,
        }),
      ])
    : [[], { forwardLines: [], defensivePairings: [] }];
  const selectedTeam = teams.find(
    ({ team }) => team.nhlTeamId === requestedTeamId,
  )?.team;

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
              params={{
                minimum: minimumMinutes,
                team: selectedTeam?.nhlTeamId,
                window: rollingGames,
              }}
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
              title="Combination Scope"
              description="Compare full-season results or each team's most recent 10, 20, or 40 regular-season games. Rolling windows use the last team games in the selected season, then recompute every rate from the supporting totals."
            >
              <CombinationFilters
                seasonId={selectedSeason.id}
                selectedMinutes={minimumMinutes}
                teams={teams.map(({ team }) => team)}
                selectedTeamId={selectedTeam?.nhlTeamId}
                rollingGames={rollingGames}
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

function CombinationFilters({
  seasonId,
  selectedMinutes,
  teams,
  selectedTeamId,
  rollingGames,
}: {
  seasonId: number;
  selectedMinutes: number;
  teams: Array<{ nhlTeamId: number; name: string }>;
  selectedTeamId: number | undefined;
  rollingGames: (typeof WINDOW_OPTIONS)[number] | undefined;
}) {
  return (
    <form
      method="get"
      className="workspace-unit-filter"
    >
      <input type="hidden" name="season" value={seasonId} />
      <FilterHeader
        description="Narrow combinations by team, sample window, and shared ice time."
        activeCount={
          (selectedTeamId ? 1 : 0) +
          (rollingGames ? 1 : 0) +
          (selectedMinutes > 0 ? 1 : 0)
        }
      />
      <label>
        Team
        <select name="team" defaultValue={selectedTeamId ?? ""}>
          <option value="">All teams</option>
          {teams.map((team) => (
            <option key={team.nhlTeamId} value={team.nhlTeamId}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sample
        <select name="window" defaultValue={rollingGames ?? ""}>
          <option value="">Full season</option>
          {WINDOW_OPTIONS.map((games) => (
            <option key={games} value={games}>
              Last {games} team games
            </option>
          ))}
        </select>
      </label>
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
      <FilterActions clearHref={`/lines?season=${seasonId}`} />
    </form>
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
