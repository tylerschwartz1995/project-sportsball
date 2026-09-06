import Link from "next/link";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogo } from "@/app/_components/team-logo";
import { WorkspacePanel } from "@/app/_components/workspace-primitives";
import type { SkaterSeasonSummary } from "@/contracts/player";
import type { TeamIdentity } from "@/contracts/team";
import type { AdvancedSkaterLeaderboardRow, AdvancedGoalieLeaderboardRow } from "@/contracts/advanced-leaderboard";

type Leader = { id: number; name: string; teams: TeamIdentity[]; values: (number | null)[] };
type Metric = { label: string; decimals?: number; description?: string };

export function HomePlayerLeaders({ seasonId, scoring, skaters, goalies }: {
  seasonId: number;
  scoring: SkaterSeasonSummary[];
  skaters: AdvancedSkaterLeaderboardRow[];
  goalies: AdvancedGoalieLeaderboardRow[];
}) {
  return (
    <WorkspacePanel title="Season Player Leaders" description="Regular season · All situations" className="mt-5">
      <div className="home-player-leaders">
        <LeaderTable title="Scoring Leaders" description="Points · NHL"
          seasonId={seasonId} href={`/players?season=${seasonId}&phase=regular&sort=points&dir=desc`}
          metrics={[{ label: "GP" }, { label: "G" }, { label: "A" }, { label: "PTS" }]}
          rows={scoring.map(p => ({ id: p.nhlPlayerId, name: p.name, teams: p.teams, values: [p.gamesPlayed, p.goals, p.assists, p.points] }))} />
        <LeaderTable title="Skater Game Score" description="Season performance · MoneyPuck"
          seasonId={seasonId} href={`/analytics?season=${seasonId}&type=skaters&situation=all&minimum=0`}
          metrics={[{ label: "GP" }, { label: "ixG", decimals: 1 }, { label: "GS", decimals: 1, description: "Season Game Score: cumulative contribution across scoring, shots, possession and other game events." }]}
          rows={skaters.filter(p => p.gameScore !== null).slice(0, 5).map(p => ({ id: p.player.nhlPlayerId, name: p.player.name, teams: [p.team], values: [p.gamesPlayed, p.individualExpectedGoals, p.gameScore] }))} />
        <LeaderTable title="Goaltending" description="Goals saved above expected · MoneyPuck"
          seasonId={seasonId} href={`/analytics?season=${seasonId}&type=goalies&situation=all&minimum=0`}
          metrics={[{ label: "GP" }, { label: "xGA", decimals: 1 }, { label: "GSAx", decimals: 1 }]}
          rows={goalies.filter(p => p.goalsSavedAboveExpected !== null).slice(0, 5).map(p => ({ id: p.player.nhlPlayerId, name: p.player.name, teams: [p.team], values: [p.gamesPlayed, p.expectedGoalsAgainst, p.goalsSavedAboveExpected] }))} />
      </div>
      <footer className="home-player-leaders-note">
        <details><summary>Top five · Season totals · About these rankings</summary><p>Sorting compares the five displayed rows. NHL scoring combines teams. MoneyPuck rankings retain player-team splits; source coverage can differ. Game Score and GSAx are cumulative, not per-game rates.</p></details>
        <Link href={`/analytics/guide?season=${seasonId}`}>Metric Guide →</Link>
      </footer>
    </WorkspacePanel>
  );
}

function LeaderTable({ title, description, seasonId, href, metrics, rows }: {
  title: string; description: string; seasonId: number; href: string; metrics: Metric[]; rows: Leader[];
}) {
  const primary = metrics.at(-1)!.label;
  return (
    <section className="home-player-leader-section">
      <header><h3>{title}</h3><p>{description}</p></header>
      {rows.length ? (
        <SortableTable defaultSortKey={primary}>
          <div className="home-player-table-scroll">
            <table className="workspace-table home-player-leader-table">
              <caption className="sr-only">{title} · Regular season · Top five</caption>
              <thead><tr><th scope="col">Player</th>{metrics.map(metric => <SortableHeader key={metric.label} label={metric.label} sortKey={metric.label} align="right" description={metric.description} />)}</tr></thead>
              <tbody>{rows.map(row => (
                <tr key={`${row.id}-${row.teams.map(t => t.nhlTeamId).join("-")}`}>
                  <td><div className="home-player-leader-identity">
                    <div className="home-player-leader-team">{row.teams.map(team => <Link key={team.nhlTeamId} href={`/teams/${team.nhlTeamId}?season=${seasonId}`} aria-label={team.name} title={team.name}><TeamLogo {...team} size="tiny" decorative /></Link>)}</div>
                    <Link href={`/players/${row.id}?season=${seasonId}&phase=regular`} className="home-player-leader-name">{row.name}</Link>
                  </div></td>
                  {row.values.map((value, index) => <td key={metrics[index].label} data-sort-value={value ?? ""} className={index === metrics.length - 1 ? "home-player-leader-value" : undefined}>{value === null ? "—" : value.toFixed(metrics[index].decimals ?? 0)}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </SortableTable>
      ) : <p className="workspace-empty-state">No season data available.</p>}
      <Link href={href} className="home-player-leader-link">Full Leaderboard →</Link>
    </section>
  );
}
