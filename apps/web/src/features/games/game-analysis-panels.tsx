"use client";

import type { GameBoxScore, GameSkaterStats } from "@/contracts/game";
import type { PlayByPlayEvent } from "@/contracts/play-by-play";
import type { MoneyPuckGameAnalytics, MoneyPuckTeamGameSituation } from "@/contracts/advanced-game";
import { useUrlChoice } from "@/components/ui/use-shareable-state";
import { UnitTable } from "./game-lines-table";
import { TeamLogo } from "@/features/teams/team-logo";
import Link from "@/components/ui/exploration-link";
import { ShotMaps } from "./shot-map";

export function GameAnalysisPanel({ data, view, boxScore = null, events = [] }: { boxScore?: GameBoxScore | null; events?: PlayByPlayEvent[]; data: MoneyPuckGameAnalytics; view: "team-stats" | "lines" | "shot-map" }) {

  const [side, setSide] = useUrlChoice("lineTeam", ["away", "home"], "away");
  const [type, setType] = useUrlChoice("lineType", ["forwards", "defense"], "forwards");
  const [minimum, setMinimum] = useUrlChoice("lineMin", ["0", "60", "180", "300", "600"], "0");
  const team = side === "away" ? data.game.awayTeam : data.game.homeTeam;
  if (view === "shot-map") return <div className="mt-6"><ShotMaps shots={data.shots} awayTeam={data.game.awayTeam} homeTeam={data.game.homeTeam} /></div>;
  if (view === "lines") {
    const rows = (type === "forwards" ? data.forwardLines : data.defensivePairings)
      .filter(row => row.team.nhlTeamId === team.nhlTeamId && row.iceTimeSeconds >= Number(minimum));
    return <section className="mt-6 min-h-[100dvh]">
      <div className="mobile-detail-filters mb-5 flex flex-wrap gap-4">
        <label className="flex flex-col gap-2">Team<select value={side} onChange={e => setSide(e.target.value as typeof side)}><option value="away">{data.game.awayTeam.name}</option><option value="home">{data.game.homeTeam.name}</option></select></label>
        <label className="flex flex-col gap-2">Line Type<select value={type} onChange={e => setType(e.target.value as typeof type)}><option value="forwards">Forward Lines</option><option value="defense">Defense Pairings</option></select></label>
        <label className="flex flex-col gap-2">Minimum TOI<select value={minimum} onChange={e => setMinimum(e.target.value as typeof minimum)}>{["0", "60", "180", "300", "600"].map(n => <option key={n} value={n}>{n === "0" ? "No minimum" : `${Number(n) / 60} ${n === "60" ? "minute" : "minutes"}`}</option>)}</select></label>
      </div>
      {rows.length ? <UnitTable key={side + type + minimum} title="Players" rows={rows} seasonId={data.game.seasonId} /> : <p className="text-[var(--muted)]">No lines available for these filters.</p>}
    </section>;
  }
  const away = data.teamSituations.find(row => row.team.nhlTeamId === data.game.awayTeam.nhlTeamId && row.situation === "all");
  const home = data.teamSituations.find(row => row.team.nhlTeamId === data.game.homeTeam.nhlTeamId && row.situation === "all");
  const boxes = [boxScore?.awayTeam, boxScore?.homeTeam];
  const totals = (key: "hits" | "blockedShots" | "penaltyMinutes" | "powerPlayGoals") =>
    boxes.map(team => team?.skaters.length
      ? team.skaters.reduce((sum: number, player: GameSkaterStats) => sum + player[key], 0) : null);
  const faceoffs = events.filter(e => e.typeDescription === "faceoff" && e.ownerTeam);
  const faceoffValues = [data.game.awayTeam, data.game.homeTeam].map(team =>
    faceoffs.length
      ? faceoffs.filter(e => e.ownerTeam?.nhlTeamId === team.nhlTeamId).length / faceoffs.length : null);
  const metrics: { label: string; read?: (row: MoneyPuckTeamGameSituation) => number | null; values?: (number | null)[]; percent?: boolean; integer?: boolean; powerPlay?: boolean; neutral?: boolean; description?: string }[] = [
    { label: "Shots", read: r => r.shotsOnGoalFor, integer: true },
    { label: "Shot Attempts", read: r => r.shotAttemptsFor, integer: true },
    { label: "FF%", read: r => r.fenwickPercentage, percent: true },
    { label: "Expected Goals", read: r => r.expectedGoalsFor },
    { label: "High-Danger xG", read: r => r.highDangerExpectedGoalsFor },
    { label: "Goals Above Expected", read: r => r.goalsFor != null && r.expectedGoalsFor != null ? r.goalsFor - r.expectedGoalsFor : null, description: "MoneyPuck goals minus expected goals for all situations; excludes shootout goals." },
    { label: "Faceoff %", values: faceoffValues, percent: true, description: "Share of recorded faceoffs won. All situations." },
    { label: "Hits", values: totals("hits"), integer: true, neutral: true, description: "Full-game skater box-score total." },
    { label: "Blocked Shots", values: totals("blockedShots"), integer: true, neutral: true, description: "Full-game skater box-score total." },
    { label: "Penalty Minutes", values: totals("penaltyMinutes"), integer: true, neutral: true, description: "Full-game skater penalty minutes; excludes goalie and bench penalties." },
  ];
  return <section className="mt-6">
    <div className="data-table-shell">
      <table className="reference-team-comparison w-full table-fixed">
        <caption className="sr-only">Team statistics for all situations</caption>
        <colgroup><col style={{ width: "30%" }} /><col style={{ width: "40%" }} /><col style={{ width: "30%" }} /></colgroup>
        <thead><tr>
          <th scope="col"><Link href={`/teams/${data.game.awayTeam.nhlTeamId}?season=${data.game.seasonId}`} className="inline-flex items-center justify-center gap-2"><TeamLogo {...data.game.awayTeam} size="compact" decorative />{data.game.awayTeam.abbreviation}</Link></th>
          <th scope="col"><span className="sr-only">Metric</span></th>
          <th scope="col"><Link href={`/teams/${data.game.homeTeam.nhlTeamId}?season=${data.game.seasonId}`} className="inline-flex items-center justify-center gap-2"><TeamLogo {...data.game.homeTeam} size="compact" decorative />{data.game.homeTeam.abbreviation}</Link></th>
        </tr></thead>
        <tbody>{metrics.map(m => {
          const values = m.values ?? [away && m.read ? m.read(away) : null, home && m.read ? m.read(home) : null];
          const formatted = values.map(n => n == null ? "—" : m.percent ? `${(n * 100).toFixed(1)}%` : m.powerPlay ? `${n.toFixed(0)} / —` : n.toFixed(m.integer ? 0 : 2));
          const winner = !m.neutral && values[0] != null && values[1] != null && formatted[0] !== formatted[1]
            ? values[0] > values[1] ? 0 : 1 : -1;
          return <tr key={m.label} className={["Expected Goals", "Faceoff %", "Hits"].includes(m.label) ? "reference-comparison-quality" : undefined}>
            <td data-leading={winner === 0}>{formatted[0]}</td>
            <th scope="row" title={m.description ?? (m.label === "FF%" ? "Share of unblocked shot attempts." : undefined)}>{m.label}</th>
            <td data-leading={winner === 1}>{formatted[1]}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}
