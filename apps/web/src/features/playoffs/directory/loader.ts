import { parseSeasonId } from "@/contracts/season";
import { getGamesForSeasonByType } from "@/data/games";
import { getCachedStandings, listCachedSeasons } from "@/data/page-cache";
import { listGoalieLeadersBySeason } from "@/data/players";
import {
  getPlayoffScoringLeaders,
  getPlayoffSeriesInsights,
} from "@/data/playoffs";
import { firstQueryValue } from "@/lib/directory";
import {
  attachPlayoffSeriesInsights,
  buildActualBracket,
  buildProjectedBracket,
} from "@/lib/playoff-bracket";
import "server-only";
import { PlayoffsPageProps, parsePlayoffView } from './logic';
export async function loadPlayoffsPage({
  searchParams,
}: PlayoffsPageProps) {
  const params = await searchParams;
  const seasons = await listCachedSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const view = parsePlayoffView(firstQueryValue(params.view));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const [standings, games, seriesInsights, leaders, goalieLeaders] = selectedSeason
    ? await Promise.all([
      view === "bracket"
        ? getCachedStandings(selectedSeason.id)
        : Promise.resolve([]),
      view === "bracket"
        ? getGamesForSeasonByType(selectedSeason.id, 3)
        : Promise.resolve([]),
      view === "bracket"
        ? getPlayoffSeriesInsights(selectedSeason.id)
        : Promise.resolve([]),
      view === "skaters"
        ? getPlayoffScoringLeaders(selectedSeason.id)
        : Promise.resolve([]),
      view === "goalies"
        ? listGoalieLeadersBySeason(selectedSeason.id, 25, 3)
        : Promise.resolve([]),
    ])
    : [[], [], [], [], []];
  const isProjection = !games.some(
    (game) =>
      game.homeTeam.score !== null &&
      game.awayTeam.score !== null,
  );
  const baseRounds = isProjection
    ? buildProjectedBracket(standings)
    : buildActualBracket(games);
  const rounds = isProjection
    ? baseRounds
    : attachPlayoffSeriesInsights(baseRounds, seriesInsights);
  return {
    selectedSeason,
    view,
    isProjection,
    seasons,
    rounds,
    standings,
    leaders,
    goalieLeaders,
  } as const;
}
