import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import Link from "@/components/ui/exploration-link";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/components/ui/workspace-primitives";
import { TeamLogo } from "@/features/teams/team-logo";
import type { loadUnitPage } from './loader';
import { GameRow } from './sections';
export function UnitPageView({
  seasonId,
  teamNhlId,
  detail,
  title,
}: Awaited<ReturnType<typeof loadUnitPage>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="analytics" />
      <section className="py-10">
        <Link
          href={`/lines?season=${seasonId}&team=${teamNhlId}`}
          className="workspace-back-link"
        >
          ← Combination Explorer
        </Link>
        <div className="mt-5">
          <WorkspacePageHeader
            eyebrow={`MoneyPuck five-on-five ${detail.unitType}`}
            title={`${Math.floor(seasonId / 10000)}–${String(seasonId % 10000).slice(-2)} ${title}`}
            description={`${detail.team.name} game-by-game results for every available regular-season appearance by this combination.`}
            action={
              <Link
                href={`/teams/${detail.team.nhlTeamId}?season=${seasonId}&phase=regular&view=combinations`}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:text-[var(--accent)]"
              >
                <TeamLogo {...detail.team} size="tiny" decorative />
                {detail.team.abbreviation} profile
              </Link>
            }
          />
          <ul className="modern-unit-players" aria-label="Players in this combination">
            {detail.players.map((player) => <li key={player.nhlPlayerId}><Link href={`/players/${player.nhlPlayerId}?season=${seasonId}`}>{player.name}</Link></li>)}
          </ul>
        </div>

        <WorkspacePanel
          className="mt-8"
          title="Full-Season Supporting Games"
          description={`${detail.games.length} games, newest first. Percentages are MoneyPuck's game-level five-on-five values.`}
        >
          <SortableTable secondaryColumns={[6, 7, 8, 9]} defaultSortKey="date" defaultDirection="desc">
            <div className="workspace-table-scroll">
              <table className="workspace-table workspace-table-dense workspace-unit-games-table min-w-[900px]">
                <caption className="sr-only">Supporting combination games</caption>
                <thead>
                  <tr>
                    <SortableHeader label="Date" sortKey="date" align="left" defaultDirection="desc" />
                    <SortableHeader label="Opponent" sortKey="opponent" align="left" defaultDirection="asc" />
                    <SortableHeader label="Score" sortKey="score" />
                    <SortableHeader label="TOI" sortKey="toi" />
                    <SortableHeader label="xG%" sortKey="xgPercentage" />
                    <SortableHeader label="CF%" sortKey="corsiPercentage" />
                    <SortableHeader label="xGF–xGA" sortKey="xgDifferential" />
                    <SortableHeader label="GF–GA" sortKey="goalDifferential" />
                    <SortableHeader label="SOG–SA" sortKey="shotDifferential" />
                  </tr>
                </thead>
                <tbody>
                  {detail.games.map((game) => (
                    <GameRow
                      key={game.nhlGameId}
                      game={game}
                      seasonId={seasonId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </SortableTable>
        </WorkspacePanel>
      </section>
    <NavigationComplete />
    </main>
  );
}
