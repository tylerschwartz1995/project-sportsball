import { withReadContext } from "@/data/read-context";
import { parseSeasonId } from "@/contracts/season";
import { listCachedSeasons } from "@/data/page-cache";
import { firstQueryValue } from "@/lib/directory";
import "server-only";
import { HomeProps } from './logic';
import { loadHomeLeaders, loadHomeSeasonData, loadHomeUpcomingGames } from './queries';
async function loadHomeData({ searchParams }: HomeProps) {
  const params = await searchParams;
  const seasons = await listCachedSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const leaders = selectedSeason ? loadHomeLeaders(selectedSeason.id) : Promise.resolve(null);
  const [seasonData, upcomingGames] = selectedSeason
    ? await Promise.all([
      loadHomeSeasonData(selectedSeason.id),
      loadHomeUpcomingGames(),
    ])
    : [[[], []], await loadHomeUpcomingGames()];
  const [
    standings,
    latestGames,
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
    leaders,
  } as const;
}

export function loadHome(...args: Parameters<typeof loadHomeData>) {
  return withReadContext("home", () => loadHomeData(...args));
}
