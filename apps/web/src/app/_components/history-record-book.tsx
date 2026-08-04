import Link from "next/link";

import { TeamLogo, TeamLogoStack } from "@/app/_components/team-logo";
import type {
  GoalieHistoryMetric,
  HistoricalDecadeLeader,
  HistoricalEraScore,
  HistoricalGoalieCareer,
  HistoricalGoalieSeason,
  HistoricalLeaderboard,
  HistoricalPeak,
  HistoricalSkaterCareer,
  HistoricalSkaterSeason,
  HistoricalTeamCareer,
  HistoricalTeamSeason,
  HistoryFilterOptions,
  HistoryFilters,
  HistoryMetric,
  HistoryOverview,
  HistoryView,
  SkaterHistoryMetric,
  TeamHistoryMetric,
} from "@/contracts/history";
import type { SeasonPhase } from "@/contracts/season-phase";
import { seasonPhaseLabel } from "@/contracts/season-phase";
import { formatPlayerPosition } from "@/lib/player-position";

export function HistoryRecordBook({
  overview,
  phase,
}: {
  overview: HistoryOverview;
  phase: SeasonPhase;
}) {
  return (
    <div className="workspace-history-record-grid">
      <RecordList
        title="Career Points"
        href={`/history?section=careers&entity=skaters&metric=points&phase=${phase}`}
        rows={overview.careerPoints.map((row) => ({
          key: row.nhlPlayerId,
          rank: row.rank ?? 0,
          name: row.name,
          href: `/players/${row.nhlPlayerId}`,
          value: row.points.toLocaleString("en-CA"),
          detail: `${row.gamesPlayed.toLocaleString("en-CA")} GP`,
        }))}
      />
      <RecordList
        title="Career Goals"
        href={`/history?section=careers&entity=skaters&metric=goals&phase=${phase}`}
        rows={overview.careerGoals.map((row) => ({
          key: row.nhlPlayerId,
          rank: row.rank ?? 0,
          name: row.name,
          href: `/players/${row.nhlPlayerId}`,
          value: row.goals.toLocaleString("en-CA"),
          detail: `${row.gamesPlayed.toLocaleString("en-CA")} GP`,
        }))}
      />
      <RecordList
        title="Goalie Wins"
        href={`/history?section=careers&entity=goalies&metric=wins&phase=${phase}`}
        rows={overview.goalieWins.map((row) => ({
          key: row.nhlPlayerId,
          rank: row.rank ?? 0,
          name: row.name,
          href: `/players/${row.nhlPlayerId}`,
          value: row.wins.toLocaleString("en-CA"),
          detail: `${row.shutouts} shutouts`,
        }))}
      />
      <RecordList
        title="Team Season Points Percentage"
        href={`/history?section=seasons&entity=teams&metric=pointPercentage&phase=${phase}`}
        rows={overview.teamSeasons.map((row) => ({
          key: `${row.nhlTeamId}-${row.seasonId}`,
          rank: row.rank ?? 0,
          name: row.name,
          href: undefined,
          value: formatPercentage(row.pointPercentage),
          detail: `${formatSeason(row.seasonId)} · ${formatTeamRecord(row)}`,
          logo: <TeamLogo nhlTeamId={row.nhlTeamId} name={row.name} size="tiny" decorative />,
        }))}
      />
    </div>
  );
}

function RecordList({
  title,
  href,
  rows,
}: {
  title: string;
  href: string;
  rows: Array<{
    key: string | number;
    rank: number;
    name: string;
    href?: string;
    value: string;
    detail: string;
    logo?: React.ReactNode;
  }>;
}) {
  return (
    <section className="workspace-history-record-list">
      <header>
        <h2>{title}</h2>
        <Link href={href}>Full ranking →</Link>
      </header>
      <ol>
        {rows.map((row) => (
          <li key={row.key}>
            <span>{row.rank}</span>
            <div className="workspace-history-record-main">
              {row.logo}
              {row.href ? (
                <Link href={row.href}>
                  <strong>{row.name}</strong>
                  <small>{row.detail}</small>
                </Link>
              ) : (
                <span className="workspace-history-record-entity">
                  <strong>{row.name}</strong>
                  <small>{row.detail}</small>
                </span>
              )}
            </div>
            <b>{row.value}</b>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function HistoryExplorerNav({
  view,
  metric,
  entityHrefs,
  metricHrefs,
  entities = ["skaters", "goalies", "teams"],
}: {
  view: HistoryView;
  metric: HistoryMetric;
  entityHrefs: Record<HistoryView, string>;
  metricHrefs: Array<{ metric: HistoryMetric; label: string; href: string }>;
  entities?: HistoryView[];
}) {
  return (
    <div className="workspace-history-explorer-nav">
      <nav aria-label="Historical leader type">
        {entities.map((entity) => (
          <Link
            key={entity}
            href={entityHrefs[entity]}
            aria-current={view === entity ? "page" : undefined}
          >
            {entity === "skaters" ? "Skaters" : entity === "goalies" ? "Goalies" : "Teams"}
          </Link>
        ))}
      </nav>
      <nav aria-label="Ranking metric">
        {metricHrefs.map((item) => (
          <Link
            key={item.metric}
            href={item.href}
            aria-current={metric === item.metric ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function HistoryFilters({
  section,
  view,
  metric,
  phase,
  filters,
  options,
  isOpen,
}: {
  section: string;
  view: HistoryView;
  metric: HistoryMetric;
  phase: SeasonPhase;
  filters: HistoryFilters;
  options: HistoryFilterOptions;
  isOpen: boolean;
}) {
  return (
    <details className="workspace-history-filter-drawer" open={isOpen || undefined}>
      <summary>
        <span><strong>Refine This Ranking</strong><small>Season range, eligibility, position, team, and birthplace</small></span>
        <b aria-hidden="true">+</b>
      </summary>
      <form action="/history" method="get">
        <input type="hidden" name="section" value={section} />
        <input type="hidden" name="entity" value={view} />
        <input type="hidden" name="metric" value={metric} />
        <input type="hidden" name="phase" value={phase} />
        <fieldset>
          <legend>Season Window</legend>
          <div>
            <label>Start Season<input name="startYear" type="number" min="1917" max="2025" defaultValue={filters.startYear} /></label>
            <label>End Season<input name="endYear" type="number" min="1917" max="2025" defaultValue={filters.endYear} /></label>
            <label>Minimum Games<input name="minimumGames" type="number" min="0" max="5000" defaultValue={filters.minimumGames} /></label>
          </div>
        </fieldset>
        {view !== "teams" ? (
          <fieldset>
            <legend>Player Context</legend>
            <div>
              {view === "skaters" ? (
                <label>Position<select name="position" defaultValue={filters.position ?? ""}>
                  <option value="">All Positions</option>
                  {options.positions.filter((value) => value !== "G").map((value) => <option key={value} value={value}>{positionLabel(value)}</option>)}
                </select></label>
              ) : null}
              <label>Played For<select name="team" defaultValue={filters.team ?? ""}>
                <option value="">All Teams</option>
                {options.teams.map((value) => <option key={value} value={value}>{value}</option>)}
              </select></label>
              <label>Birth Country<select name="country" defaultValue={filters.country ?? ""}>
                <option value="">All Countries</option>
                {options.countries.map((value) => <option key={value} value={value}>{countryLabel(value)}</option>)}
              </select></label>
            </div>
          </fieldset>
        ) : null}
        <div className="workspace-history-filter-actions">
          <button type="submit">Apply Filters</button>
          <Link href={`/history?section=${section}&entity=${view}&metric=${metric}&phase=${phase}`}>Reset</Link>
        </div>
      </form>
    </details>
  );
}

export function HistoryRankingSummary({
  leaderboard,
  filters,
  phase,
  metricLabel,
}: {
  leaderboard: HistoricalLeaderboard;
  filters: HistoryFilters;
  phase: SeasonPhase;
  metricLabel: string;
}) {
  const noun = leaderboard.view === "teams" ? "teams" : leaderboard.view;
  return (
    <div className="workspace-history-ranking-summary">
      <div>
        <p>{leaderboard.display === "career" ? "Career record book" : "Single-season record book"}</p>
        <h2>{metricLabel} Leaders</h2>
      </div>
      <dl>
        <div><dt>Phase</dt><dd>{seasonPhaseLabel(phase)}</dd></div>
        <div><dt>Window</dt><dd>{filters.startYear}–{String(filters.endYear + 1).slice(-2)}</dd></div>
        <div><dt>Eligible</dt><dd>{leaderboard.totalRows.toLocaleString("en-CA")} {noun}</dd></div>
        <div><dt>Minimum</dt><dd>{filters.minimumGames.toLocaleString("en-CA")} GP</dd></div>
      </dl>
    </div>
  );
}

export function HistoryLeaderboardTable({
  leaderboard,
  metricHrefs,
}: {
  leaderboard: HistoricalLeaderboard;
  metricHrefs: Partial<Record<HistoryMetric, string>>;
}) {
  if (leaderboard.rows.length === 0) {
    return <HistoryEmptyState />;
  }
  if (leaderboard.view === "skaters") {
    return <SkaterTable rows={leaderboard.rows} display={leaderboard.display} metric={leaderboard.metric} metricHrefs={metricHrefs} />;
  }
  if (leaderboard.view === "goalies") {
    return <GoalieTable rows={leaderboard.rows} display={leaderboard.display} metric={leaderboard.metric} metricHrefs={metricHrefs} />;
  }
  return <TeamTable rows={leaderboard.rows} display={leaderboard.display} metric={leaderboard.metric} metricHrefs={metricHrefs} />;
}

function SkaterTable({ rows, display, metric, metricHrefs }: {
  rows: Array<HistoricalSkaterCareer | HistoricalSkaterSeason>;
  display: "career" | "seasons";
  metric: SkaterHistoryMetric;
  metricHrefs: Partial<Record<HistoryMetric, string>>;
}) {
  return (
    <TableShell minWidth="780px">
      <table className="workspace-table workspace-table-dense workspace-history-table">
        <thead><tr>
          <th className="workspace-history-rank-col">Rank</th>
          <th className="workspace-history-entity-col">Player</th>
          {display === "seasons" ? <th>Season</th> : <th>Seasons</th>}
          <MetricHeading label="GP" metric="games" active={metric === "games"} href={metricHrefs.games} />
          <MetricHeading label="G" metric="goals" active={metric === "goals"} href={metricHrefs.goals} />
          <MetricHeading label="A" metric="assists" active={metric === "assists"} href={metricHrefs.assists} />
          <MetricHeading label="PTS" metric="points" active={metric === "points"} href={metricHrefs.points} />
          <MetricHeading label="P/GP" metric="pointsPerGame" active={metric === "pointsPerGame"} href={metricHrefs.pointsPerGame} />
        </tr></thead>
        <tbody>{rows.map((row) => {
          const season = "seasonId" in row ? row : null;
          return (
            <tr key={season ? `${row.nhlPlayerId}-${season.seasonId}` : row.nhlPlayerId}>
              <RankCell rank={row.rank} />
              <td className="workspace-history-sticky-entity"><div className="workspace-history-entity">
                {season ? <TeamLogoStack abbreviations={season.teamAbbreviations} /> : null}
                <span><Link href={`/players/${row.nhlPlayerId}`}><strong>{row.name}</strong></Link><small>{formatPlayerPosition(row.position)}</small></span>
              </div></td>
              <td data-sort-value={season?.seasonId}>{season ? formatSeason(season.seasonId) : "seasonsPlayed" in row ? row.seasonsPlayed : "—"}</td>
              <MetricCell value={row.gamesPlayed} active={metric === "games"} />
              <MetricCell value={row.goals} active={metric === "goals"} />
              <MetricCell value={row.assists} active={metric === "assists"} />
              <MetricCell value={row.points} active={metric === "points"} />
              <MetricCell value={row.pointsPerGame.toFixed(2)} active={metric === "pointsPerGame"} />
            </tr>
          );
        })}</tbody>
      </table>
    </TableShell>
  );
}

function GoalieTable({ rows, display, metric, metricHrefs }: {
  rows: Array<HistoricalGoalieCareer | HistoricalGoalieSeason>;
  display: "career" | "seasons";
  metric: GoalieHistoryMetric;
  metricHrefs: Partial<Record<HistoryMetric, string>>;
}) {
  return (
    <TableShell minWidth="760px"><table className="workspace-table workspace-table-dense workspace-history-table">
      <thead><tr>
        <th className="workspace-history-rank-col">Rank</th><th className="workspace-history-entity-col">Goalie</th>
        {display === "seasons" ? <th>Season</th> : <th>Seasons</th>}
        <MetricHeading label="GP" metric="games" active={metric === "games"} href={metricHrefs.games} />
        <MetricHeading label="W" metric="wins" active={metric === "wins"} href={metricHrefs.wins} />
        <th>L</th><MetricHeading label="SO" metric="shutouts" active={metric === "shutouts"} href={metricHrefs.shutouts} />
        {display === "seasons" ? <th>GAA</th> : null}
        <MetricHeading label="SV%" metric="savePercentage" active={metric === "savePercentage"} href={metricHrefs.savePercentage} />
      </tr></thead>
      <tbody>{rows.map((row) => {
        const season = "seasonId" in row ? row : null;
        return <tr key={season ? `${row.nhlPlayerId}-${season.seasonId}` : row.nhlPlayerId}>
          <RankCell rank={row.rank} />
          <td className="workspace-history-sticky-entity"><div className="workspace-history-entity">
            {season ? <TeamLogoStack abbreviations={season.teamAbbreviations} /> : null}
            <Link href={`/players/${row.nhlPlayerId}`}><strong>{row.name}</strong></Link>
          </div></td>
          <td>{season ? formatSeason(season.seasonId) : "seasonsPlayed" in row ? row.seasonsPlayed : "—"}</td>
          <MetricCell value={row.gamesPlayed} active={metric === "games"} />
          <MetricCell value={row.wins} active={metric === "wins"} />
          <MetricCell value={row.losses} />
          <MetricCell value={row.shutouts} active={metric === "shutouts"} />
          {season ? <MetricCell value={formatDecimal(season.goalsAgainstAverage, 2)} /> : null}
          <MetricCell value={formatSavePercentage(row.savePercentage)} active={metric === "savePercentage"} />
        </tr>;
      })}</tbody>
    </table></TableShell>
  );
}

function TeamTable({ rows, display, metric, metricHrefs }: {
  rows: Array<HistoricalTeamCareer | HistoricalTeamSeason>;
  display: "career" | "seasons";
  metric: TeamHistoryMetric;
  metricHrefs: Partial<Record<HistoryMetric, string>>;
}) {
  return (
    <TableShell minWidth="860px"><table className="workspace-table workspace-table-dense workspace-history-table">
      <thead><tr>
        <th className="workspace-history-rank-col">Rank</th><th className="workspace-history-entity-col">Team</th>
        {display === "seasons" ? <th>Season</th> : <th>Seasons</th>}
        <th>GP</th><MetricHeading label="W" metric="wins" active={metric === "wins"} href={metricHrefs.wins} />
        <th>L</th><th>T</th><th>OTL</th>
        <MetricHeading label="PTS" metric="points" active={metric === "points"} href={metricHrefs.points} />
        <MetricHeading label="PTS%" metric="pointPercentage" active={metric === "pointPercentage"} href={metricHrefs.pointPercentage} />
        {display === "seasons" ? <th>GD</th> : null}
      </tr></thead>
      <tbody>{rows.map((row) => {
        const season = "seasonId" in row ? row : null;
        return <tr key={season ? `${row.nhlTeamId}-${season.seasonId}` : row.nhlTeamId}>
          <RankCell rank={row.rank} />
          <td className="workspace-history-sticky-entity"><div className="workspace-history-entity"><TeamLogo nhlTeamId={row.nhlTeamId} name={row.name} size="tiny" decorative /><strong>{row.name}</strong></div></td>
          <td>{season ? formatSeason(season.seasonId) : "seasonsPlayed" in row ? row.seasonsPlayed : "—"}</td>
          <MetricCell value={row.gamesPlayed} /><MetricCell value={row.wins} active={metric === "wins"} />
          <MetricCell value={row.losses} /><MetricCell value={row.ties} /><MetricCell value={row.overtimeLosses} />
          <MetricCell value={row.points} active={metric === "points"} />
          <MetricCell value={formatPercentage(row.pointPercentage)} active={metric === "pointPercentage"} />
          {season ? <MetricCell value={formatSigned(season.goalsFor - season.goalsAgainst)} /> : null}
        </tr>;
      })}</tbody>
    </table></TableShell>
  );
}

export function HistoryPeaksTable({ rows, metricLabel, window }: { rows: HistoricalPeak[]; metricLabel: string; window: number }) {
  if (rows.length === 0) return <HistoryEmptyState />;
  return <TableShell minWidth="660px"><table className="workspace-table workspace-table-dense workspace-history-table">
    <thead><tr><th className="workspace-history-rank-col">Rank</th><th className="workspace-history-entity-col">Player</th><th>Stretch</th><th>GP</th><th>{metricLabel}</th></tr></thead>
    <tbody>{rows.map((row) => <tr key={`${row.nhlPlayerId}-${row.endSeasonId}-${window}`}>
      <RankCell rank={row.rank} />
      <td className="workspace-history-sticky-entity"><div className="workspace-history-entity"><span><Link href={`/players/${row.nhlPlayerId}`}><strong>{row.name}</strong></Link><small>{formatPlayerPosition(row.position)}</small></span></div></td>
      <td>{formatSeason(row.startSeasonId)}–{String(seasonStart(row.endSeasonId) + 1).slice(-2)}</td>
      <MetricCell value={row.gamesPlayed} /><MetricCell value={row.value} active />
    </tr>)}</tbody>
  </table></TableShell>;
}

export function HistoryEraTable({ rows }: { rows: HistoricalEraScore[] }) {
  if (rows.length === 0) return <HistoryEmptyState />;
  return <TableShell minWidth="620px"><table className="workspace-table workspace-table-dense workspace-history-table">
    <thead><tr><th className="workspace-history-rank-col">Rank</th><th className="workspace-history-entity-col">Player</th><th>GP</th><th>PTS</th><th title="100 is league-average points per game in the same seasons">Era Score</th></tr></thead>
    <tbody>{rows.map((row) => <tr key={row.nhlPlayerId}>
      <RankCell rank={row.rank} />
      <td className="workspace-history-sticky-entity"><div className="workspace-history-entity"><span><Link href={`/players/${row.nhlPlayerId}`}><strong>{row.name}</strong></Link><small>{formatPlayerPosition(row.position)}</small></span></div></td>
      <MetricCell value={row.gamesPlayed} /><MetricCell value={row.points} /><MetricCell value={row.eraScore.toFixed(0)} active />
    </tr>)}</tbody>
  </table></TableShell>;
}

export function HistoryDecadeLeaders({ rows }: { rows: HistoricalDecadeLeader[] }) {
  return <section className="workspace-history-decades"><header><h2>Decade Points Leaders</h2></header><div>
    {rows.map((row) => <Link href={`/players/${row.nhlPlayerId}`} key={row.decade}><span>{row.decade}s</span><strong>{row.name}</strong><small>{row.points.toLocaleString("en-CA")} PTS · {row.gamesPlayed.toLocaleString("en-CA")} GP</small></Link>)}
  </div></section>;
}

function TableShell({ minWidth, children }: { minWidth: string; children: React.ReactNode }) {
  return <div className="workspace-history-table-shell"><div className="workspace-table-scroll" style={{ minWidth: 0 }}><div style={{ minWidth }}>{children}</div></div></div>;
}

function MetricHeading({ label, metric, active, href }: { label: string; metric: HistoryMetric; active: boolean; href?: string }) {
  return <th aria-sort={active ? "descending" : undefined} className={active ? "is-active-metric" : undefined}>{href ? <Link href={href} aria-label={`Rank by ${fullMetricLabel(metric)}`}>{label}<span aria-hidden="true">{active ? " ↓" : " ↕"}</span></Link> : label}</th>;
}

function RankCell({ rank }: { rank?: number }) { return <td className="workspace-history-rank">{rank ?? "—"}</td>; }
function MetricCell({ value, active = false }: { value: string | number | null; active?: boolean }) { return <td className={active ? "workspace-history-metric is-active" : "workspace-history-metric"}>{value ?? "—"}</td>; }
function HistoryEmptyState() { return <div className="workspace-history-empty"><strong>No eligible records found</strong><p>Try widening the season range or lowering the minimum-games requirement.</p></div>; }

function formatSeason(seasonId: number): string { return `${seasonStart(seasonId)}–${String(seasonId % 10_000).slice(-2)}`; }
function seasonStart(seasonId: number): number { return Math.floor(seasonId / 10_000); }
function formatDecimal(value: number | null, digits: number): string | null { return value === null ? null : value.toFixed(digits); }
function formatSavePercentage(value: number | null): string | null { return value === null ? null : value.toFixed(3).replace(/^0/, ""); }
function formatPercentage(value: number | null): string { return value === null ? "—" : `${(value * 100).toFixed(1)}%`; }
function formatSigned(value: number): string { return value > 0 ? `+${value}` : String(value); }
function formatTeamRecord(row: HistoricalTeamSeason): string { return `${row.wins}-${row.losses}${row.overtimeLosses ? `-${row.overtimeLosses}` : ""}`; }
function positionLabel(position: string): string { return ({ C: "Centre", L: "Left Wing", R: "Right Wing", D: "Defence" } as Record<string, string>)[position] ?? position; }
function countryLabel(country: string): string { try { return new Intl.DisplayNames(["en"], { type: "region" }).of(country) ?? country; } catch { return country; } }
function fullMetricLabel(metric: HistoryMetric): string { return ({ points: "points", goals: "goals", assists: "assists", games: "games played", pointsPerGame: "points per game", wins: "wins", shutouts: "shutouts", savePercentage: "save percentage", pointPercentage: "points percentage" } as Record<HistoryMetric, string>)[metric]; }
