import { withReadContext } from "@/data/read-context";
import { parseSeasonId } from "@/contracts/season";
import {
  getCachedStandings,
  listCachedSeasons,
  listCachedTeamsBySeason,
} from "@/data/page-cache";
import { firstQueryValue } from "@/lib/directory";
import { TeamsPageProps, groupTeams } from './logic';

import "server-only";
async function loadTeamsPageData({ searchParams }: TeamsPageProps) {
  const params = await searchParams;
  const seasons = await listCachedSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const [teams, standings] = selectedSeason
    ? await Promise.all([
      listCachedTeamsBySeason(selectedSeason.id, 2),
      getCachedStandings(selectedSeason.id),
    ])
    : [[], []];
  const sortedTeams = [...teams].sort((left, right) =>
    left.team.name.localeCompare(right.team.name),
  );
  const teamGroups = groupTeams(sortedTeams, standings);
  return {
    selectedSeason,
    seasons,
    sortedTeams,
    teamGroups,
  } as const;
}

export function loadTeamsPage(...args: Parameters<typeof loadTeamsPageData>) {
  return withReadContext("teams/directory", () => loadTeamsPageData(...args));
}
