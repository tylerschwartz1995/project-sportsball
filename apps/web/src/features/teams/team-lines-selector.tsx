"use client";

import type { MoneyPuckSeasonUnitStats } from "@/contracts/season-unit";
import { TeamLinesTable } from "@/features/teams/team-lines-table";
import { useUrlChoice } from "@/components/ui/use-shareable-state";

const minimumOptions = ["0", "10", "30", "60", "100", "300", "500"] as const;

const lineTypes = ["forwards", "defense"] as const;

export function TeamLinesSelector({ forwards, defense, seasonId }: {
  forwards: MoneyPuckSeasonUnitStats[];
  defense: MoneyPuckSeasonUnitStats[];
  seasonId: number;
}) {
  const [type, setType] = useUrlChoice("lineType", lineTypes, "forwards");
  const [minimum, setMinimum] = useUrlChoice("lineMinimum", minimumOptions, "0");
  const rows = (type === "forwards" ? forwards : defense).filter(row => row.iceTimeSeconds >= Number(minimum) * 60);
  return <div>
    <div className="mb-5 flex flex-wrap gap-4">
    <label className="flex w-full max-w-xs flex-col gap-2 font-medium">
      Line Type
      <select value={type} onChange={event => setType(event.target.value as typeof type)}>
        <option value="forwards">Forward Lines</option>
        <option value="defense">Defensive Pairings</option>
      </select>
    </label>
    <label className="flex w-full max-w-xs flex-col gap-2 font-medium">
      Minimum Ice Time
      <select value={minimum} onChange={event => setMinimum(event.target.value as typeof minimum)}>
        {minimumOptions.map(value => <option key={value} value={value}>{value === "0" ? "No minimum" : `${value} minutes`}</option>)}
      </select>
    </label>
    </div>
    <TeamLinesTable key={`${type}:${minimum}`} title={type === "forwards" ? "Forward Lines" : "Defensive Pairings"} rows={rows} seasonId={seasonId} />
  </div>;
}
