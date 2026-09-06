import {
  formatGameTeamRecord,
  type GameTeamRecord,
} from "@/contracts/game";

export function TeamGameRecord({ record }: { record: GameTeamRecord }) {
  const label = `${record.wins} wins, ${record.losses} losses, ${record.overtimeLosses} overtime losses`;

  return (
    <span
      className="workspace-team-game-record"
      aria-label={`Team record: ${label}`}
      title={`Team record: ${label}`}
    >
      {formatGameTeamRecord(record)}
    </span>
  );
}
