import type { GameSummary } from "@/contracts/game";
import type {
  PlayoffBracketTeam,
  PlayoffRound,
  PlayoffSeries,
  PlayoffSeriesGame,
} from "@/contracts/playoffs";
import type { StandingsEntry } from "@/contracts/standings";

const ROUND_NAMES = [
  "First Round",
  "Second Round",
  "Conference Finals",
  "Stanley Cup Final",
];
const SERIES_PER_ROUND = [8, 4, 2, 1];

export function buildActualBracket(games: GameSummary[]): PlayoffRound[] {
  const grouped = new Map<string, GameSummary[]>();
  for (const game of games) {
    const { round, matchup } = parsePlayoffGameNumber(game.nhlGameId);
    if (round < 1 || round > 4 || matchup < 1) continue;
    const key = `${round}-${matchup}`;
    grouped.set(key, [...(grouped.get(key) ?? []), game]);
  }

  return buildEmptyRounds().map((round) => ({
    ...round,
    series: round.series.map((placeholder) => {
      const seriesGames = grouped.get(placeholder.id);
      return seriesGames?.length
        ? seriesFromGames(
            placeholder.round,
            placeholder.matchup,
            seriesGames,
          )
        : placeholder;
    }),
  }));
}

export function buildProjectedBracket(
  standings: StandingsEntry[],
): PlayoffRound[] {
  const rounds = buildEmptyRounds();
  const firstRound: PlayoffSeries[] = [];
  const conferences = groupBy(
    standings.filter((team) => team.conferenceName),
    (team) => team.conferenceName!,
  );

  const orderedConferences = [...conferences.entries()].sort(
    ([left], [right]) =>
      playoffConferenceOrder(left) - playoffConferenceOrder(right),
  );

  for (const [conference, teams] of orderedConferences) {
    const divisions = groupBy(
      teams.filter((team) => team.divisionName),
      (team) => team.divisionName!,
    );
    const divisionWinners = teams
      .filter((team) => team.divisionRank === 1)
      .sort(compareStandings);
    const wildcards = teams
      .filter((team) => team.wildcardRank === 1 || team.wildcardRank === 2)
      .sort(
        (left, right) =>
          (left.wildcardRank ?? 99) - (right.wildcardRank ?? 99),
      );

    divisionWinners.forEach((winner, index) => {
      const wildcard =
        index === 0 ? wildcards[wildcards.length - 1] : wildcards[0];
      if (wildcard) {
        firstRound.push(
          projectedSeries(
            conference,
            winner,
            wildcard,
            `${winner.divisionName} 1`,
            `WC${wildcard.wildcardRank}`,
          ),
        );
      }
    });

    for (const [, divisionTeams] of divisions) {
      const second = divisionTeams.find((team) => team.divisionRank === 2);
      const third = divisionTeams.find((team) => team.divisionRank === 3);
      if (second && third) {
        firstRound.push(
          projectedSeries(
            conference,
            second,
            third,
            `${second.divisionName} 2`,
            `${third.divisionName} 3`,
          ),
        );
      }
    }
  }

  rounds[0].series = firstRound.map((series, index) => ({
    ...series,
    id: `1-${index + 1}`,
    matchup: index + 1,
  }));
  return rounds;
}

function playoffConferenceOrder(conference: string): number {
  if (conference.startsWith("Eastern")) return 0;
  if (conference.startsWith("Western")) return 1;
  return 2;
}

export function parsePlayoffGameNumber(nhlGameId: number): {
  round: number;
  matchup: number;
  gameNumber: number;
} {
  const suffix = nhlGameId % 1000;
  return {
    round: Math.floor(suffix / 100),
    matchup: Math.floor((suffix % 100) / 10),
    gameNumber: suffix % 10,
  };
}

function buildEmptyRounds(): PlayoffRound[] {
  return ROUND_NAMES.map((name, index) => ({
    round: index + 1,
    name,
    series: Array.from({ length: SERIES_PER_ROUND[index] }, (_, matchup) => ({
      id: `${index + 1}-${matchup + 1}`,
      round: index + 1,
      matchup: matchup + 1,
      teamOne: null,
      teamTwo: null,
      teamOneWins: 0,
      teamTwoWins: 0,
      winnerNhlTeamId: null,
      games: [],
    })),
  }));
}

function seriesFromGames(
  round: number,
  matchup: number,
  games: GameSummary[],
): PlayoffSeries {
  const sorted = [...games].sort((left, right) =>
    left.startTimeUtc.localeCompare(right.startTimeUtc),
  );
  const first = sorted[0];
  const teamOne = gameTeamToBracketTeam(first.homeTeam);
  const teamTwo = gameTeamToBracketTeam(first.awayTeam);
  let teamOneWins = 0;
  let teamTwoWins = 0;

  for (const game of sorted) {
    if (game.homeTeam.score === null || game.awayTeam.score === null) continue;
    const winner =
      game.homeTeam.score > game.awayTeam.score
        ? game.homeTeam.nhlTeamId
        : game.awayTeam.nhlTeamId;
    if (winner === teamOne.nhlTeamId) teamOneWins += 1;
    if (winner === teamTwo.nhlTeamId) teamTwoWins += 1;
  }

  return {
    id: `${round}-${matchup}`,
    round,
    matchup,
    teamOne,
    teamTwo,
    teamOneWins,
    teamTwoWins,
    winnerNhlTeamId:
      teamOneWins >= 4
        ? teamOne.nhlTeamId
        : teamTwoWins >= 4
          ? teamTwo.nhlTeamId
          : null,
    games: sorted.map(gameToSeriesGame),
  };
}

function gameToSeriesGame(game: GameSummary): PlayoffSeriesGame {
  return {
    nhlGameId: game.nhlGameId,
    gameDate: game.gameDate,
    startTimeUtc: game.startTimeUtc,
    state: game.state,
    lastPeriodType: game.lastPeriodType,
    awayTeam: {
      nhlTeamId: game.awayTeam.nhlTeamId,
      abbreviation: game.awayTeam.abbreviation,
      name: game.awayTeam.name,
      score: game.awayTeam.score,
    },
    homeTeam: {
      nhlTeamId: game.homeTeam.nhlTeamId,
      abbreviation: game.homeTeam.abbreviation,
      name: game.homeTeam.name,
      score: game.homeTeam.score,
    },
  };
}

function projectedSeries(
  conference: string,
  teamOne: StandingsEntry,
  teamTwo: StandingsEntry,
  seedOne: string,
  seedTwo: string,
): PlayoffSeries {
  return {
    id: conference,
    round: 1,
    matchup: 0,
    teamOne: standingsTeamToBracketTeam(teamOne, seedOne),
    teamTwo: standingsTeamToBracketTeam(teamTwo, seedTwo),
    teamOneWins: 0,
    teamTwoWins: 0,
    winnerNhlTeamId: null,
    games: [],
  };
}

function standingsTeamToBracketTeam(
  team: StandingsEntry,
  seedLabel: string,
): PlayoffBracketTeam {
  return {
    nhlTeamId: team.nhlTeamId,
    name: team.teamName,
    abbreviation: team.teamAbbreviation,
    seedLabel,
  };
}

function gameTeamToBracketTeam(
  team: GameSummary["homeTeam"],
): PlayoffBracketTeam {
  return {
    nhlTeamId: team.nhlTeamId,
    name: team.name,
    abbreviation: team.abbreviation,
    seedLabel: null,
  };
}

function compareStandings(left: StandingsEntry, right: StandingsEntry) {
  return (
    right.points - left.points ||
    right.regulationWins - left.regulationWins ||
    left.teamName.localeCompare(right.teamName)
  );
}

function groupBy<T>(
  values: T[],
  getKey: (value: T) => string,
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const value of values) {
    const key = getKey(value);
    grouped.set(key, [...(grouped.get(key) ?? []), value]);
  }
  return grouped;
}
