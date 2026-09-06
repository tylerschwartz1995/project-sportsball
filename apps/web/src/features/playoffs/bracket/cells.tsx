"use client";
import Link from "@/components/ui/exploration-link";
import type {
  PlayoffBracketTeam
} from "@/contracts/playoffs";
import { TeamLogo } from "@/features/teams/team-logo";
import type { ReactNode } from "react";
import { SeriesPlayerIdentity, formatSigned } from './logic';
export function SeriesPlayerCell({
  player,
  seasonId,
}: {
  player: SeriesPlayerIdentity;
  seasonId: number;
}) {
  return (
    <td className="workspace-series-player-cell" data-sort-value={player.name}>
      <span className="workspace-series-player-identity">
        <TeamLogo
          nhlTeamId={player.nhlTeamId}
          abbreviation={player.teamAbbreviation}
          name={player.teamAbbreviation}
          size="tiny"
          decorative
          prominent
        />
        <Link href={`/players/${player.nhlPlayerId}?season=${seasonId}&phase=playoffs`}>
          <strong>{player.name}</strong>
          <small>{player.teamAbbreviation}</small>
        </Link>
      </span>
    </td>
  );
}

export function SeriesNumberCell({
  value,
  children,
  highlight = false,
  signed = false,
}: {
  value: number | string | null;
  children?: ReactNode;
  highlight?: boolean;
  signed?: boolean;
}) {
  const display =
    children ??
    (value === null ? "—" : signed && typeof value === "number" ? formatSigned(value) : value);
  return (
    <td
      className={highlight ? "is-highlight" : undefined}
      data-sort-value={value ?? undefined}
    >
      {display}
    </td>
  );
}

export function SeriesLoadingState() {
  return <p className="workspace-series-loading">Loading series statistics…</p>;
}

export function SeriesEmptyState({ children }: { children: ReactNode }) {
  return <p className="workspace-series-empty">{children}</p>;
}

export function SeriesTeam({
  team,
  winner,
  seasonId,
  align = "left",
}: {
  team: PlayoffBracketTeam | null;
  winner: boolean;
  seasonId: number;
  align?: "left" | "right";
}) {
  if (!team) {
    return <div className="workspace-series-team is-empty">To Be Determined</div>;
  }

  return (
    <Link
      href={`/teams/${team.nhlTeamId}?season=${seasonId}`}
      className={`workspace-series-team is-${align}${winner ? " is-winner" : ""
        }`}
    >
      <TeamLogo
        nhlTeamId={team.nhlTeamId}
        abbreviation={team.abbreviation}
        name={team.name}
        size="compact"
        decorative
        prominent
      />
      <span>
        <small>{team.seedLabel ?? team.abbreviation}</small>
        <strong>{team.name}</strong>
      </span>
    </Link>
  );
}
