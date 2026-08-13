import Link from "next/link";

import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { StandingsPointsChart } from "@/app/_components/standings-points-chart";
import { TeamLogo } from "@/app/_components/team-logo";
import { ViewTabs } from "@/app/_components/view-tabs";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
import { parseSeasonId } from "@/contracts/season";
import type { StandingsEntry } from "@/contracts/standings";
import { listSeasons } from "@/data/seasons";
import {
  getStandings,
  getStandingsPointsHistory,
} from "@/data/standings";
import {
  applySortDirection,
  firstQueryValue,
  parseSortDirection,
} from "@/lib/directory";

export const dynamic = "force-dynamic";

type StandingsView = "overall" | "conference" | "division";
type StandingsDisplay = "standings" | "progress";

type StandingsPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
    view?: string | string[];
    display?: string | string[];
    chartDivision?: string | string[];
  }>;
};

export default async function StandingsPage({
  searchParams,
}: StandingsPageProps) {
  const params = await searchParams;
  const chartDivision = firstQueryValue(params.chartDivision);
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const requestedSort = firstQueryValue(params.sort);
  const activeSort = standingsColumns.some(
    (column) => column.key === requestedSort,
  )
    ? requestedSort!
    : "rank";
  const direction = parseSortDirection(
    firstQueryValue(params.dir),
    activeSort === "rank" || activeSort === "team" ? "asc" : "desc",
  );
  const view = parseView(firstQueryValue(params.view));
  const display = parseStandingsDisplay(firstQueryValue(params.display));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const [standings, pointsHistory] = selectedSeason
    ? await Promise.all([
        getStandings(selectedSeason.id),
        display === "progress"
          ? getStandingsPointsHistory(selectedSeason.id)
          : Promise.resolve([]),
      ])
    : [[], []];
  const leader = standings[0];
  const groups = buildGroups(standings, view);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="standings" />

      <section className="py-8 sm:py-10">
        <WorkspacePageHeader
          eyebrow="League / Standings"
          title={
            selectedSeason
              ? `${selectedSeason.label} Final Standings`
              : "No Standings Available"
          }
          description="Official NHL regular-season rankings with overall, conference, and division views."
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
              params={{ view, display, chartDivision }}
            />
          }
        />

        {leader && selectedSeason ? (
          <>
            <div className="workspace-width-standard">
              <nav
                className="workspace-standings-scope"
                aria-label="Standings grouping"
              >
                <span className="workspace-navigation-label" aria-hidden="true">Group by</span>
                {(["overall", "conference", "division"] as const).map(
                  (option) => (
                    <Link
                      key={option}
                      href={`/standings?season=${selectedSeason.id}&view=${option}&display=${display}${chartDivision ? `&chartDivision=${encodeURIComponent(chartDivision)}` : ""}`}
                      aria-current={view === option ? "page" : undefined}
                    >
                      {capitalize(option)}
                    </Link>
                  ),
                )}
              </nav>
            </div>

            <ViewTabs
              active={display}
              ariaLabel="Standings content views"
              label="Content"
              width="standard"
              tabs={[
                {
                  id: "standings",
                  label: "Standings Tables",
                  href: `/standings?season=${selectedSeason.id}&view=${view}&display=standings&sort=${activeSort}&dir=${direction}`,
                },
                {
                  id: "progress",
                  label: "Points Progression",
                  href: `/standings?season=${selectedSeason.id}&view=${view}&display=progress${chartDivision ? `&chartDivision=${encodeURIComponent(chartDivision)}` : ""}`,
                },
              ]}
            />

            {display === "standings" ? (
            <div className="mt-7 grid gap-7">
              {groups.map((group) => (
                <StandingsTable
                  key={group.label}
                  label={group.label}
                  standings={sortStandings(
                    group.standings,
                    activeSort,
                    direction,
                    view,
                  )}
                  defaultSortKey={activeSort}
                  defaultDirection={direction}
                  view={view}
                  seasonId={selectedSeason.id}
                  snapshotDate={leader.snapshotDate}
                />
              ))}
            </div>
            ) : null}

            {display === "progress" ? (
            <div className="mt-7">
              <StandingsPointsChart
                history={pointsHistory}
                standings={standings}
              />
            </div>
            ) : null}
          </>
        ) : (
          <div className="workspace-empty-state">
            No standings are available for this season.
          </div>
        )}
      </section>
    </main>
  );
}

function StandingsTable({
  label,
  standings,
  defaultSortKey,
  defaultDirection,
  view,
  seasonId,
  snapshotDate,
}: {
  label: string;
  standings: StandingsEntry[];
  defaultSortKey: string;
  defaultDirection: "asc" | "desc";
  view: StandingsView;
  seasonId: number;
  snapshotDate: string;
}) {
  return (
    <WorkspacePanel
      title={label}
      description="Select any column heading to sort the current table"
      width="standard"
    >
      <SortableTable
        defaultSortKey={defaultSortKey}
        defaultDirection={defaultDirection}
      >
        <div className="workspace-table-scroll">
          <table className="workspace-table workspace-table-dense workspace-table-semantic workspace-standings-table min-w-[900px]">
            <colgroup>
              <col className="workspace-col-rank" />
              <col className="workspace-col-entity" />
              <col className="workspace-col-stat" span={7} />
              <col className="workspace-col-differential" />
              <col className="workspace-col-number" />
            </colgroup>
            <thead>
              <tr>
                {standingsColumns.map((column) => (
                  <SortableHeader
                    key={column.key}
                    label={column.label}
                    sortKey={column.key}
                    align={column.align}
                    defaultDirection={column.defaultDirection}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((team) => (
                <tr key={team.teamId}>
                  <td className="workspace-rank-cell">
                    {rankForView(team, view)}
                  </td>
                  <td className="workspace-team-cell">
                    <div className="flex items-center gap-2">
                      <TeamLogo
                        nhlTeamId={team.nhlTeamId}
                        abbreviation={team.teamAbbreviation}
                        name={team.teamName}
                        size="tiny"
                        decorative
                      />
                      <div>
                        <Link href={`/teams/${team.nhlTeamId}?season=${seasonId}`}>
                          {team.teamName}
                        </Link>
                        <small>
                          <span>
                            {team.teamAbbreviation} · {team.divisionName}
                          </span>
                          {team.clinchIndicator ? (
                            <span className="workspace-clinch-indicator">
                              {team.clinchIndicator}
                            </span>
                          ) : null}
                        </small>
                      </div>
                    </div>
                  </td>
                  <NumericCell value={team.gamesPlayed} />
                  <NumericCell value={team.wins} />
                  <NumericCell value={team.losses} />
                  <NumericCell value={team.overtimeLosses} />
                  <NumericCell value={team.regulationWins} />
                  <NumericCell value={team.goalsFor} />
                  <NumericCell value={team.goalsAgainst} />
                  <NumericCell
                    value={formatDifferential(team.goalDifferential)}
                  />
                  <td className="workspace-points-cell">{team.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="workspace-table-note">
          Snapshot: {snapshotDate} · Source: NHL · p Presidents’ Trophy · z
          conference · y division · x playoff berth · e eliminated
        </div>
      </SortableTable>
    </WorkspacePanel>
  );
}

const standingsColumns: Array<{
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  defaultDirection?: "asc" | "desc";
}> = [
  { key: "rank", label: "Rank", align: "center", defaultDirection: "asc" },
  { key: "team", label: "Team", align: "left", defaultDirection: "asc" },
  { key: "games", label: "GP" },
  { key: "wins", label: "W" },
  { key: "losses", label: "L" },
  { key: "overtimeLosses", label: "OT" },
  { key: "regulationWins", label: "RW" },
  { key: "goalsFor", label: "GF" },
  { key: "goalsAgainst", label: "GA" },
  { key: "goalDifferential", label: "DIFF" },
  { key: "points", label: "PTS" },
];

function parseView(value: string | undefined): StandingsView {
  return value === "conference" || value === "division" ? value : "overall";
}

function parseStandingsDisplay(value: string | undefined): StandingsDisplay {
  return value === "progress" ? "progress" : "standings";
}

function buildGroups(
  standings: StandingsEntry[],
  view: StandingsView,
): Array<{ label: string; standings: StandingsEntry[] }> {
  if (view === "overall") {
    return [{ label: "League Standings", standings }];
  }
  const key = view === "conference" ? "conferenceName" : "divisionName";
  const grouped = new Map<string, StandingsEntry[]>();
  for (const team of standings) {
    const label = team[key] ?? `Unknown ${capitalize(view)}`;
    grouped.set(label, [...(grouped.get(label) ?? []), team]);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, entries]) => ({
      label: `${label} ${capitalize(view)}`,
      standings: entries,
    }));
}

function rankForView(team: StandingsEntry, view: StandingsView): number | null {
  if (view === "conference") return team.conferenceRank;
  if (view === "division") return team.divisionRank;
  return team.leagueRank;
}

function sortStandings(
  standings: StandingsEntry[],
  sort: string,
  direction: "asc" | "desc",
  view: StandingsView,
): StandingsEntry[] {
  return [...standings].sort((left, right) => {
    let comparison: number;
    switch (sort) {
      case "team":
        comparison = right.teamName.localeCompare(left.teamName);
        break;
      case "games":
        comparison = right.gamesPlayed - left.gamesPlayed;
        break;
      case "wins":
        comparison = right.wins - left.wins;
        break;
      case "losses":
        comparison = right.losses - left.losses;
        break;
      case "overtimeLosses":
        comparison = right.overtimeLosses - left.overtimeLosses;
        break;
      case "regulationWins":
        comparison = right.regulationWins - left.regulationWins;
        break;
      case "goalsFor":
        comparison = right.goalsFor - left.goalsFor;
        break;
      case "goalsAgainst":
        comparison = right.goalsAgainst - left.goalsAgainst;
        break;
      case "goalDifferential":
        comparison = right.goalDifferential - left.goalDifferential;
        break;
      case "points":
        comparison = right.points - left.points;
        break;
      default:
        comparison =
          (rankForView(right, view) ?? 999) -
          (rankForView(left, view) ?? 999);
    }
    if (comparison === 0) {
      comparison = right.teamName.localeCompare(left.teamName);
    }
    return applySortDirection(comparison, direction);
  });
}

function NumericCell({ value }: { value: number | string }) {
  return <td className="workspace-number-cell">{value}</td>;
}

function formatDifferential(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
