import { withReadContext } from "@/data/read-context";
import { parseSeasonId } from "@/contracts/season";
import {
  listCachedSeasons,
  listCachedTeamsBySeason,
} from "@/data/page-cache";
import { firstQueryValue } from "@/lib/directory";
import { TeamsPageProps } from './logic';

import "server-only";
import { parseSeasonPhase, gameTypeForPhase } from "@/contracts/season-phase";
async function loadTeamsPageData({ searchParams }: TeamsPageProps) {
  const params = await searchParams;
  const seasons = await listCachedSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const phase = parseSeasonPhase(firstQueryValue(params.phase));
  const teams = selectedSeason ? await listCachedTeamsBySeason(selectedSeason.id, gameTypeForPhase(phase)) : [];
  const sortedTeams = [...teams].sort((left, right) =>
    (phase === "regular" ? right.stats.standingsPoints - left.stats.standingsPoints : right.stats.wins - left.stats.wins) || left.team.name.localeCompare(right.team.name),
  );

  return {
    selectedSeason,
    seasons,
    sortedTeams,
    phase,
  } as const;
}

export function loadTeamsPage(...args: Parameters<typeof loadTeamsPageData>) {
  return withReadContext("teams/directory", () => loadTeamsPageData(...args));
}
