import { withReadContext } from "@/data/read-context";
import {
  parseGameDate
} from "@/contracts/game";
import { parseSeasonId } from "@/contracts/season";
import { getGamesByDate, listGameDates } from "@/data/performance-cache";
import { listCachedScheduleSeasons } from "@/data/page-cache";
import { resolveScheduleDate } from "@/lib/schedule-navigation";
import { redirect } from "next/navigation";
import "server-only";
import { firstValue, GamesPageProps } from './logic';
async function loadGamesPageData({ searchParams }: GamesPageProps) {
  const seasons = await listCachedScheduleSeasons();
  const requested = await searchParams;
  const requestedSeason = firstValue(requested.season);
  const parsedSeason = parseSeasonId(requestedSeason);
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const gameDates = selectedSeason ? await listGameDates(selectedSeason.id) : [];
  const requestedDateValue = firstValue(requested.date);
  const requestedDate = parseGameDate(requestedDateValue);
  const selectedDate = resolveScheduleDate(requestedDate, gameDates);
  if (
    selectedSeason &&
    selectedDate &&
    requestedDateValue &&
    selectedDate !== requestedDateValue
  ) {
    const search = new URLSearchParams({
      season: String(selectedSeason.id),
      date: selectedDate,
    });
    redirect(`/games?${search.toString()}`);
  }
  const games =
    selectedSeason && selectedDate
      ? await getGamesByDate(selectedSeason.id, selectedDate)
      : [];
  return {
    selectedSeason,
    selectedDate,
    gameDates,
    seasons,
    visibleGames: games,
  } as const;
}

export function loadGamesPage(...args: Parameters<typeof loadGamesPageData>) {
  return withReadContext("games/directory", () => loadGamesPageData(...args));
}
