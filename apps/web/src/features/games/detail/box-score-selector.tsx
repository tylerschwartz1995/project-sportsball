"use client";

import type { MoneyPuckSkaterGameSituation, MoneyPuckGoalieGameSituation } from "@/contracts/advanced-game";
import type { GameBoxScoreTeam } from "@/contracts/game";
import { useUrlChoice } from "@/components/ui/use-shareable-state";
import { GoalieTable, SkaterTable } from "./sections";

const sides = ["away", "home"] as const;
const playerTypes = ["skaters", "goalies"] as const;

export function BoxScoreSelector({ awayTeam, homeTeam, seasonId, skaterSituations, goalieSituations }: {
  awayTeam: GameBoxScoreTeam;
  homeTeam: GameBoxScoreTeam;
  seasonId: number;
  skaterSituations: MoneyPuckSkaterGameSituation[];
  goalieSituations: MoneyPuckGoalieGameSituation[];
}) {
  const [side, setSide] = useUrlChoice("boxTeam", sides, "away");
  const [type, setType] = useUrlChoice("boxType", playerTypes, "skaters");
  const team = side === "away" ? awayTeam : homeTeam;
  return <section className="mt-6 min-w-0" aria-label="Game box score">
    <div className="mb-5 flex flex-wrap gap-4">
      <label className="flex w-full max-w-xs flex-col gap-2 font-medium">
        Team
        <select value={side} onChange={event => setSide(event.target.value as typeof side)}>
          <option value="away">{awayTeam.name}</option>
          <option value="home">{homeTeam.name}</option>
        </select>
      </label>
      <label className="flex w-full max-w-xs flex-col gap-2 font-medium">
        Player Type
        <select value={type} onChange={event => setType(event.target.value as typeof type)}>
          <option value="skaters">Skaters</option>
          <option value="goalies">Goalies</option>
        </select>
      </label>
    </div>
    <div key={`${side}:${type}`}>
      {type === "skaters"
        ? <SkaterTable advanced={skaterSituations} players={team.skaters} seasonId={seasonId} team={team} />
        : <GoalieTable advanced={goalieSituations} players={team.goalies} seasonId={seasonId} team={team} />}
    </div>
  </section>;
}
