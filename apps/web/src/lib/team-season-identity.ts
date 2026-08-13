import type { TeamGameLogEntry } from "@/contracts/game-log";
import type {
  TeamSeasonStats,
  TeamSeasonSummary,
} from "@/contracts/team";

export type SeasonFingerprintMetric = {
  key: "results" | "scoring" | "goals-allowed" | "shot-differential";
  label: string;
  description: string;
  value: number;
  formattedValue: string;
  rank: number;
  teamCount: number;
};

export type SeasonRecord = {
  key: "home" | "road" | "one-goal" | "extra-time";
  label: string;
  description: string;
  gamesPlayed: number;
  wins: number;
  regulationLosses: number;
  overtimeLosses: number;
};

export type OpponentLedgerEntry = {
  opponent: TeamGameLogEntry["opponent"];
  gamesPlayed: number;
  wins: number;
  regulationLosses: number;
  overtimeLosses: number;
  outcome: "won" | "tied" | "lost";
  games: Array<
    Pick<
      TeamGameLogEntry,
      "nhlGameId" | "gameDate" | "result" | "score" | "opponentScore"
    >
  >;
};

export type SeasonMoment = {
  key: "biggest-win" | "shot-edge" | "highest-scoring";
  label: string;
  nhlGameId: number;
  gameDate: string;
  isHome: boolean;
  opponent: TeamGameLogEntry["opponent"];
  score: number;
  opponentScore: number;
  detail: string;
};

export type TeamSeasonIdentity = {
  fingerprint: SeasonFingerprintMetric[];
  records: SeasonRecord[];
  opponents: OpponentLedgerEntry[];
  moments: SeasonMoment[];
  gamesAnalyzed: number;
};

type TeamSeasonIdentityInput = {
  stats: TeamSeasonStats;
  peers: TeamSeasonSummary[];
  games: TeamGameLogEntry[];
};

export function buildTeamSeasonIdentity({
  stats,
  peers,
  games,
}: TeamSeasonIdentityInput): TeamSeasonIdentity {
  const phaseGames = games.filter((game) => game.gameType === stats.gameType);
  const fingerprint = buildFingerprint(stats, peers);

  return {
    fingerprint,
    records: buildSituationalRecords(phaseGames),
    opponents: buildOpponentLedger(phaseGames, stats.gameType),
    moments: buildSeasonMoments(phaseGames),
    gamesAnalyzed: phaseGames.length,
  };
}

function buildFingerprint(
  stats: TeamSeasonStats,
  peers: TeamSeasonSummary[],
): SeasonFingerprintMetric[] {
  const eligiblePeers = peers.filter(
    (peer) =>
      peer.stats.gameType === stats.gameType && peer.stats.gamesPlayed > 0,
  );
  const teamCount = Math.max(eligiblePeers.length, 1);
  const isPlayoffs = stats.gameType === 3;
  const definitions: Array<{
    key: SeasonFingerprintMetric["key"];
    label: string;
    description: string;
    value: (candidate: TeamSeasonStats) => number;
    format: (value: number) => string;
    lowerIsBetter?: boolean;
  }> = [
    {
      key: "results",
      label: isPlayoffs ? "Games won" : "Standings points earned",
      description: isPlayoffs
        ? "Share of playoff games won"
        : "Percent of possible standings points earned",
      value: (candidate) =>
        isPlayoffs
          ? candidate.wins / candidate.gamesPlayed
          : candidate.standingsPoints / (candidate.gamesPlayed * 2),
      format: formatPercentage,
    },
    {
      key: "scoring",
      label: "Goals scored",
      description: "Team goals per game",
      value: (candidate) => candidate.goalsFor / candidate.gamesPlayed,
      format: (value) => `${value.toFixed(2)} / game`,
    },
    {
      key: "goals-allowed",
      label: "Goals allowed",
      description: "Opponent goals per game",
      value: (candidate) => candidate.goalsAgainst / candidate.gamesPlayed,
      format: (value) => `${value.toFixed(2)} / game`,
      lowerIsBetter: true,
    },
    {
      key: "shot-differential",
      label: "Shot differential",
      description: "Shots for minus shots against, per game",
      value: (candidate) =>
        (candidate.shotsFor - candidate.shotsAgainst) /
        candidate.gamesPlayed,
      format: (value) => `${formatSigned(value, 1)} / game`,
    },
  ];

  return definitions.map((definition): SeasonFingerprintMetric => {
    const value = definition.value(stats);
    const rank =
      1 +
      eligiblePeers.filter((peer) => {
        const peerValue = definition.value(peer.stats);
        return definition.lowerIsBetter
          ? peerValue < value
          : peerValue > value;
      }).length;

    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      value,
      formattedValue: definition.format(value),
      rank,
      teamCount,
    };
  });
}

function buildSituationalRecords(games: TeamGameLogEntry[]): SeasonRecord[] {
  const definitions: Array<{
    key: SeasonRecord["key"];
    label: string;
    description: string;
    include: (game: TeamGameLogEntry) => boolean;
  }> = [
    {
      key: "home",
      label: "At home",
      description: "Games played on home ice",
      include: (game) => game.isHome,
    },
    {
      key: "road",
      label: "On the road",
      description: "Games played away from home",
      include: (game) => !game.isHome,
    },
    {
      key: "one-goal",
      label: "One-goal games",
      description: "Final margin of exactly one goal",
      include: (game) => Math.abs(game.score - game.opponentScore) === 1,
    },
    {
      key: "extra-time",
      label: "Extra time",
      description: "Games decided in overtime or a shootout",
      include: (game) =>
        game.lastPeriodType === "OT" || game.lastPeriodType === "SO",
    },
  ];

  return definitions.map((definition) => ({
    key: definition.key,
    label: definition.label,
    description: definition.description,
    ...recordForGames(games.filter(definition.include)),
  }));
}

function buildOpponentLedger(
  games: TeamGameLogEntry[],
  gameType: number,
): OpponentLedgerEntry[] {
  const gamesByOpponent = new Map<number, TeamGameLogEntry[]>();
  for (const game of games) {
    const opponentGames = gamesByOpponent.get(game.opponent.nhlTeamId) ?? [];
    opponentGames.push(game);
    gamesByOpponent.set(game.opponent.nhlTeamId, opponentGames);
  }

  return [...gamesByOpponent.values()]
    .map((opponentGames): OpponentLedgerEntry => {
      const record = recordForGames(opponentGames);
      const teamPoints = opponentGames.reduce(
        (total, game) => total + (game.result === "W" ? 2 : game.result === "OTL" ? 1 : 0),
        0,
      );
      const opponentPoints = opponentGames.reduce((total, game) => {
        if (game.result !== "W") return total + 2;
        return total +
          (game.lastPeriodType === "OT" || game.lastPeriodType === "SO"
            ? 1
            : 0);
      }, 0);
      const teamEdge = gameType === 3 ? record.wins : teamPoints;
      const opponentEdge =
        gameType === 3
          ? record.regulationLosses + record.overtimeLosses
          : opponentPoints;

      return {
        opponent: opponentGames[0]!.opponent,
        ...record,
        games: [...opponentGames]
          .sort((left, right) => left.gameDate.localeCompare(right.gameDate))
          .map((game) => ({
            nhlGameId: game.nhlGameId,
            gameDate: game.gameDate,
            result:
              game.gameType === 3 && game.result === "OTL"
                ? "L"
                : game.result,
            score: game.score,
            opponentScore: game.opponentScore,
          })),
        outcome:
          teamEdge > opponentEdge
            ? "won"
            : teamEdge < opponentEdge
              ? "lost"
              : "tied",
      };
    })
    .sort((left, right) =>
      left.opponent.name.localeCompare(right.opponent.name),
    );
}

function buildSeasonMoments(games: TeamGameLogEntry[]): SeasonMoment[] {
  const selectedGameIds = new Set<number>();
  const moments: SeasonMoment[] = [];

  const biggestWin = selectGame(
    games.filter((game) => game.result === "W"),
    (game) => game.score - game.opponentScore,
    selectedGameIds,
  );
  if (biggestWin) {
    selectedGameIds.add(biggestWin.nhlGameId);
    moments.push({
      ...momentBase(biggestWin),
      key: "biggest-win",
      label: "Biggest win",
      detail: `Won by ${biggestWin.score - biggestWin.opponentScore} goals`,
    });
  }

  const largestShotEdge = selectGame(
    games.filter(
      (game) =>
        game.shotsOnGoal !== null &&
        game.opponentShotsOnGoal !== null &&
        game.shotsOnGoal > game.opponentShotsOnGoal,
    ),
    (game) => game.shotsOnGoal! - game.opponentShotsOnGoal!,
    selectedGameIds,
  );
  if (largestShotEdge) {
    selectedGameIds.add(largestShotEdge.nhlGameId);
    moments.push({
      ...momentBase(largestShotEdge),
      key: "shot-edge",
      label: "Largest shot edge",
      detail: `${largestShotEdge.shotsOnGoal}–${largestShotEdge.opponentShotsOnGoal} in shots`,
    });
  }

  const highestScoring = selectGame(
    games,
    (game) => game.score + game.opponentScore,
    selectedGameIds,
  );
  if (highestScoring) {
    moments.push({
      ...momentBase(highestScoring),
      key: "highest-scoring",
      label: "Highest-scoring game",
      detail: `${highestScoring.score + highestScoring.opponentScore} combined goals`,
    });
  }

  return moments;
}

function selectGame(
  games: TeamGameLogEntry[],
  value: (game: TeamGameLogEntry) => number,
  excludedGameIds: Set<number>,
): TeamGameLogEntry | null {
  const availableGames = games.filter(
    (game) => !excludedGameIds.has(game.nhlGameId),
  );
  return (
    [...availableGames].sort(
      (left, right) =>
        value(right) - value(left) ||
        right.gameDate.localeCompare(left.gameDate) ||
        right.nhlGameId - left.nhlGameId,
    )[0] ?? null
  );
}

function momentBase(game: TeamGameLogEntry) {
  return {
    nhlGameId: game.nhlGameId,
    gameDate: game.gameDate,
    isHome: game.isHome,
    opponent: game.opponent,
    score: game.score,
    opponentScore: game.opponentScore,
  };
}

function recordForGames(games: TeamGameLogEntry[]) {
  return games.reduce(
    (record, game) => {
      record.gamesPlayed += 1;
      if (game.result === "W") record.wins += 1;
      else if (game.result === "OTL" && game.gameType !== 3) {
        record.overtimeLosses += 1;
      } else record.regulationLosses += 1;
      return record;
    },
    {
      gamesPlayed: 0,
      wins: 0,
      regulationLosses: 0,
      overtimeLosses: 0,
    },
  );
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSigned(value: number, digits: number): string {
  if (value === 0) return value.toFixed(digits);
  return `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}`;
}
