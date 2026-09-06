import { parseSeasonId } from "@/contracts/season";
import { listCachedSeasons } from "@/data/page-cache";
import { firstQueryValue } from "@/lib/directory";
import "server-only";
import { HomeProps } from './logic';
import { loadHomeSeasonData, loadHomeUpcomingGames } from './queries';
export async function loadHome({ searchParams }: HomeProps) {
  const params = await searchParams;
  const seasons = await listCachedSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const [seasonData, upcomingGames] = selectedSeason
    ? await Promise.all([
      loadHomeSeasonData(selectedSeason.id),
      loadHomeUpcomingGames(),
    ])
    : [[[], [], [], [], []], await loadHomeUpcomingGames()];
  const [
    standings,
    scoringLeaders,
    latestGames,
    advancedSkaters,
    advancedGoalies,
  ] = seasonData;
  const latestDate = latestGames[0]?.gameDate;
  const latestPhase = latestGames[0]?.gameType === 3 ? "playoffs" : "regular";
  return {
    selectedSeason,
    seasons,
    latestDate,
    latestPhase,
    latestGames,
    upcomingGames,
    standings,
    scoringLeaders,
    advancedSkaters,
    advancedGoalies,
  } as const;
}
