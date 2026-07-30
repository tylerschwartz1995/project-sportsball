import Link from "next/link";

import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import {
  WorkspaceMetric,
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
import { parseSeasonId } from "@/contracts/season";
import type { StandingsEntry } from "@/contracts/standings";
import { listSeasons } from "@/data/seasons";
import { getStandings } from "@/data/standings";
import {
  applySortDirection,
  firstQueryValue,
  parseSortDirection,
} from "@/lib/directory";

export const dynamic = "force-dynamic";

type StandingsPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
  }>;
};

export default async function StandingsPage({
  searchParams,
}: StandingsPageProps) {
  const params = await searchParams;
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const requestedSort = firstQueryValue(params.sort);
  const sort = standingsColumns.some(
    (column) => column.key === requestedSort,
  );
  const activeSort = sort ? requestedSort! : "rank";
  const direction = parseSortDirection(
    firstQueryValue(params.dir),
    activeSort === "rank" || activeSort === "team" ? "asc" : "desc",
  );
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const standings = selectedSeason
    ? await getStandings(selectedSeason.id)
    : [];
  const sortedStandings = sortStandings(standings, activeSort, direction);
  const leader = standings[0];
  const cutLines = buildConferenceCutLines(standings);
  const leagueContext = buildLeagueContext(standings);
  const cutLineValue = cutLines
    .map(
      (line) =>
        `${shortConferenceName(line.conference).slice(0, 1)}: ${line.qualifyingTeam.teamAbbreviation} ${line.qualifyingTeam.points}`,
    )
    .join(" · ");
  const cutLineDetail = cutLines
    .map((line) =>
      line.firstTeamOut
        ? `${line.margin === 0 ? "tied with" : `+${line.margin} over`} ${line.firstTeamOut.teamAbbreviation}`
        : shortConferenceName(line.conference),
    )
    .join(" · ");

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="standings" />

      <section className="py-8 sm:py-10">
        <WorkspacePageHeader
          eyebrow="League / Standings"
          title={
            selectedSeason
              ? `${selectedSeason.label} final table`
              : "No standings available"
          }
          description="Official NHL regular-season rankings with historical team identity and sortable statistical columns."
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
            />
          }
        />

        {leader ? (
          <>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <WorkspaceMetric
                label="Presidents’ Trophy"
                value={leader.teamName}
                detail={`${leader.points} points · ${leader.wins} wins`}
                href={`/teams/${leader.nhlTeamId}?season=${selectedSeason.id}`}
              />
              <WorkspaceMetric
                label="Playoff cut lines"
                value={cutLineValue || "Unavailable"}
                detail={cutLineDetail || "Conference ranks unavailable"}
              />
              <WorkspaceMetric
                label="League scoring"
                value={
                  leagueContext.goalsPerGame === null
                    ? "Unavailable"
                    : `${leagueContext.goalsPerGame.toFixed(2)} G/GP`
                }
                detail={`${leagueContext.gamesPlayed.toLocaleString()} total games`}
              />
              <WorkspaceMetric
                label="Average points"
                value={
                  leagueContext.pointsPerTeam === null
                    ? "Unavailable"
                    : leagueContext.pointsPerTeam.toFixed(1)
                }
                detail={`${standings.length} teams in final snapshot`}
              />
            </div>

            <WorkspacePanel
              className="mt-5"
              title="League standings"
              description="Select any column heading to sort the current table"
            >
              <SortableTable
                defaultSortKey={activeSort}
                defaultDirection={direction}
              >
                <div className="workspace-table-scroll">
                  <table className="workspace-table min-w-[760px]">
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
                      {sortedStandings.map((team) => (
                        <tr key={team.teamId}>
                          <td className="workspace-rank-cell">
                            {team.leagueRank}
                          </td>
                          <td className="workspace-team-cell">
                            <Link
                              href={`/teams/${team.nhlTeamId}?season=${selectedSeason.id}`}
                            >
                              {team.teamName}
                            </Link>
                            {team.clinchIndicator ? (
                              <span>{team.clinchIndicator}</span>
                            ) : null}
                            <small>
                              {team.teamAbbreviation} · {team.divisionName}
                            </small>
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
                          <td className="workspace-points-cell">
                            {team.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="workspace-table-note">
                  Snapshot: {leader.snapshotDate} · Source: NHL · p Presidents’
                  Trophy · z conference · y division · x playoff berth · e
                  eliminated
                </div>
              </SortableTable>
            </WorkspacePanel>
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

function sortStandings(
  standings: StandingsEntry[],
  sort: string,
  direction: "asc" | "desc",
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
        comparison = right.leagueRank - left.leagueRank;
    }
    if (comparison === 0) {
      comparison = right.teamName.localeCompare(left.teamName);
    }
    return applySortDirection(comparison, direction);
  });
}

type ConferenceCutLine = {
  conference: string;
  qualifyingTeam: StandingsEntry;
  firstTeamOut: StandingsEntry | null;
  margin: number;
};

function buildConferenceCutLines(
  standings: StandingsEntry[],
): ConferenceCutLine[] {
  const conferenceNames = [
    ...new Set(standings.map((team) => team.conferenceName)),
  ].filter((conference): conference is string => conference !== null);

  return conferenceNames.flatMap((conference) => {
    const teams = standings
      .filter(
        (team) =>
          team.conferenceName === conference && team.conferenceRank !== null,
      )
      .sort((left, right) => left.conferenceRank! - right.conferenceRank!);
    const qualifyingTeam = teams.find((team) => team.conferenceRank === 8);
    if (!qualifyingTeam) {
      return [];
    }
    const firstTeamOut =
      teams.find((team) => team.conferenceRank === 9) ?? null;
    return [
      {
        conference,
        qualifyingTeam,
        firstTeamOut,
        margin: firstTeamOut
          ? qualifyingTeam.points - firstTeamOut.points
          : 0,
      },
    ];
  });
}

function buildLeagueContext(standings: StandingsEntry[]): {
  goalsPerGame: number | null;
  pointsPerTeam: number | null;
  gamesPlayed: number;
} {
  if (standings.length === 0) {
    return { goalsPerGame: null, pointsPerTeam: null, gamesPlayed: 0 };
  }
  const teamGames = standings.reduce(
    (total, team) => total + team.gamesPlayed,
    0,
  );
  const gamesPlayed = Math.round(teamGames / 2);
  const goals = standings.reduce((total, team) => total + team.goalsFor, 0);
  const points = standings.reduce((total, team) => total + team.points, 0);
  return {
    goalsPerGame: gamesPlayed > 0 ? goals / gamesPlayed : null,
    pointsPerTeam: points / standings.length,
    gamesPlayed,
  };
}

function shortConferenceName(value: string): string {
  return value.replace(/\s+Conference$/i, "");
}

function NumericCell({ value }: { value: number | string }) {
  return <td className="workspace-number-cell">{value}</td>;
}

function formatDifferential(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
