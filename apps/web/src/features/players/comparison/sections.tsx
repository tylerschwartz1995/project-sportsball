import { ComparisonScrollRegion } from "@/components/ui/comparison-scroll-region";
import Link from "@/components/ui/exploration-link";
import type {
  PlayerComparisonEntry,
  PlayerComparisonMetric,
} from "@/contracts/player-comparison-view";
import { TeamLogoStack } from "@/features/teams/team-logo";
import { formatComparisonValue } from "@/lib/player-comparison";
import { formatPlayerPosition } from "@/lib/player-position";
import type { CSSProperties } from "react";

export function ComparisonTable({
  players,
  metrics,
  seasonId,
  phase,
}: {
  players: PlayerComparisonEntry[];
  metrics: PlayerComparisonMetric[];
  seasonId: number;
  phase: string;
}) {
  return (
    <ComparisonScrollRegion>
      <table className="workspace-table workspace-comparison-matrix" style={{ "--comparison-players": players.length } as CSSProperties}>
        <colgroup>
          <col className="workspace-comparison-metric-column" />
          {players.map((player) => (
            <col key={player.nhlPlayerId} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th>Metric</th>
            {players.map((player) => (
              <th key={player.nhlPlayerId}>
                <div className="workspace-comparison-player-heading">
                  <TeamLogoStack
                    teams={player.teams}
                    size="compact"
                    prominent
                  />
                  <div>
                    <Link
                      href={`/players/${player.nhlPlayerId}?season=${seasonId}&phase=${phase}`}
                    >
                      {player.name}
                    </Link>
                    <small>{formatPlayerPosition(player.position, "Player")}</small>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.key}>
              <th>{metric.label}</th>
              {players.map((player) => (
                <td key={player.nhlPlayerId}>
                  {formatComparisonValue(
                    player.values[metric.key] ?? null,
                    metric,
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ComparisonScrollRegion>
  );
}
