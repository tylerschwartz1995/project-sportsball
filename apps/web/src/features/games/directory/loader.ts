import {
  parseGameDate
} from "@/contracts/game";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase,
} from "@/contracts/season-phase";
import {
  getGamesByDate,
  listGameDates,
  listScheduleTeams,
} from "@/data/games";
import { listCachedScheduleSeasons } from "@/data/page-cache";
import { resolveScheduleDate } from "@/lib/schedule-navigation";
import { redirect } from "next/navigation";
import "server-only";
import { firstValue, GamesPageProps } from './logic';
export async function loadGamesPage({ searchParams }: GamesPageProps) {
  const seasons = await listCachedScheduleSeasons();
  const requested = await searchParams;
  const requestedSeason = firstValue(requested.season);
  const phase = parseSeasonPhase(firstValue(requested.phase));
  const gameType = gameTypeForPhase(phase);
  const parsedSeason = parseSeasonId(requestedSeason);
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const rawTeamId = Number(firstValue(requested.team));
  const requestedTeamId =
    Number.isSafeInteger(rawTeamId) && rawTeamId > 0 ? rawTeamId : undefined;
  const [allGameDates, requestedTeamGameDates, scheduleTeams] = selectedSeason
    ? await Promise.all([
      listGameDates(selectedSeason.id, gameType),
      requestedTeamId
        ? listGameDates(selectedSeason.id, gameType, requestedTeamId)
        : Promise.resolve([]),
      listScheduleTeams(selectedSeason.id, gameType),
    ])
    : [[], [], []];
  const selectedTeam = scheduleTeams.find(
    (team) => team.nhlTeamId === requestedTeamId,
  );
  const gameDates = selectedTeam ? requestedTeamGameDates : allGameDates;
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
      phase,
      date: selectedDate,
    });
    if (selectedTeam) search.set("team", String(selectedTeam.nhlTeamId));
    redirect(`/games?${search.toString()}`);
  }
  const games =
    selectedSeason && selectedDate
      ? await getGamesByDate(selectedSeason.id, selectedDate, gameType)
      : [];
  const visibleGames = selectedTeam
    ? games.filter(
      (game) =>
        game.awayTeam.nhlTeamId === selectedTeam.nhlTeamId ||
        game.homeTeam.nhlTeamId === selectedTeam.nhlTeamId,
    )
    : games;
  return {
    selectedSeason,
    selectedDate,
    gameDates,
    phase,
    selectedTeam,
    seasons,
    visibleGames,
    scheduleTeams,
  } as const;
}
