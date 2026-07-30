"use client";

import { useState, type ReactNode } from "react";

import type { StandingsEntry } from "@/contracts/standings";
import type {
  TeamIdentity,
  TeamSeasonStats,
  TeamSkaterSplit,
} from "@/contracts/team";

import styles from "./design-lab.module.css";

type DisplayMode = "dark" | "light";
type PreviewPage = "league" | "team";

type DesignLabProps = {
  team: TeamIdentity;
  stats: TeamSeasonStats;
  skaters: TeamSkaterSplit[];
  standings: StandingsEntry[];
};

export function DesignLab(props: DesignLabProps) {
  const [mode, setMode] = useState<DisplayMode>("dark");
  const [page, setPage] = useState<PreviewPage>("team");

  return (
    <section className="py-10">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="font-mono text-sm uppercase tracking-[0.18em] text-cyan-300">
            Application design workshop
          </p>
          <h2 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Three genuinely different product systems
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
            Compare navigation, information architecture, density, typography,
            tables, and team identity—not just alternate color treatments.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <ControlGroup
            label="Preview page"
            value={page}
            options={[
              { value: "league", label: "League home" },
              { value: "team", label: "Team profile" },
            ]}
            onChange={setPage}
          />
          <ControlGroup
            label="Display mode"
            value={mode}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
            onChange={setMode}
          />
        </div>
      </div>

      <nav
        aria-label="Design systems"
        className="mt-8 flex gap-2 overflow-x-auto pb-1"
      >
        <ConceptLink href="#workspace" number="01" label="Data Workspace" />
        <ConceptLink href="#publication" number="02" label="Sports Publication" />
        <ConceptLink href="#broadcast" number="03" label="Broadcast Product" />
      </nav>

      <div data-mode={mode} className={`${styles.lab} mt-8 space-y-12`}>
        <ConceptFrame
          id="workspace"
          number="01"
          name="Data Workspace"
          summary="A compact analytics tool with a persistent sidebar, workspace tabs, dense tables, and controls kept close to the data."
          traits={["Sidebar navigation", "High density", "Utility-first"]}
        >
          <WorkspaceConcept {...props} page={page} />
        </ConceptFrame>

        <ConceptFrame
          id="publication"
          number="02"
          name="Sports Publication"
          summary="A reading-led product with a masthead, editorial hierarchy, broad whitespace, restrained rules, and statistics woven into narrative."
          traits={["Masthead navigation", "Editorial rhythm", "Typography-first"]}
        >
          <PublicationConcept {...props} page={page} />
        </ConceptFrame>

        <ConceptFrame
          id="broadcast"
          number="03"
          name="Broadcast Product"
          summary="A high-energy sports experience with a live ticker, full-width team moments, bold score graphics, and horizontal content rails."
          traits={["Ticker + top navigation", "Bold identity", "Card-driven"]}
        >
          <BroadcastConcept {...props} page={page} />
        </ConceptFrame>
      </div>

      <aside className="mt-10 rounded-2xl border border-violet-300/20 bg-violet-300/[0.055] p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-violet-300">
          Deliberate constant
        </p>
        <h3 className="mt-2 text-xl font-semibold text-white">
          Team color remains an accent system
        </h3>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
          All three systems use Colorado&apos;s palette differently, but neutral
          semantic colors still control reading surfaces, table contrast,
          focus, and positive or negative states. The selected system can later
          apply an audited palette to every historical team identity.
        </p>
      </aside>
    </section>
  );
}

function WorkspaceConcept({
  page,
  team,
  stats,
  skaters,
  standings,
}: DesignLabProps & { page: PreviewPage }) {
  return (
    <div className={styles.workspace}>
      <aside className={styles.workspaceSidebar}>
        <div className={styles.workspaceBrand}>SB</div>
        <WorkspaceNav active={page === "team" ? "Teams" : "Overview"} />
        <span className={styles.workspaceStatus}>● Data current</span>
      </aside>
      <div className={styles.workspaceMain}>
        <header className={styles.workspaceBar}>
          <span>NHL / 2025–26</span>
          <span>⌘ K&nbsp;&nbsp; Search data</span>
        </header>
        {page === "team" ? (
          <WorkspaceTeam team={team} stats={stats} skaters={skaters} />
        ) : (
          <WorkspaceLeague standings={standings} />
        )}
      </div>
    </div>
  );
}

function WorkspaceTeam({
  team,
  stats,
  skaters,
}: Pick<DesignLabProps, "team" | "stats" | "skaters">) {
  return (
    <div className={styles.workspaceContent}>
      <div className={styles.workspaceCrumbs}>TEAMS / {team.abbreviation}</div>
      <div className={styles.workspaceTitle}>
        <TeamBadge abbreviation={team.abbreviation} />
        <div>
          <h4>{team.name}</h4>
          <p>Regular season · {stats.gamesPlayed} games</p>
        </div>
        <strong>{record(stats)}</strong>
      </div>
      <div className={styles.workspaceTabs}>
        <b>Summary</b><span>Roster</span><span>Game log</span><span>5-on-5</span>
      </div>
      <WorkspaceMetrics stats={stats} />
      <DenseTable skaters={skaters} title="Skater production" />
    </div>
  );
}

function WorkspaceLeague({ standings }: { standings: StandingsEntry[] }) {
  const leader = standings[0];
  return (
    <div className={styles.workspaceContent}>
      <div className={styles.workspaceCrumbs}>LEAGUE / OVERVIEW</div>
      <div className={styles.workspaceTitle}>
        <div>
          <h4>League workspace</h4>
          <p>2025–26 regular season · final snapshot</p>
        </div>
      </div>
      <div className={styles.workspaceTabs}>
        <b>Standings</b><span>Results</span><span>Leaders</span><span>Trends</span>
      </div>
      <dl className={styles.workspaceMetrics}>
        <Metric label="League leader" value={leader?.teamAbbreviation ?? "—"} />
        <Metric label="Leader points" value={leader?.points ?? "—"} />
        <Metric label="Teams" value="32" />
        <Metric label="Games" value="1,312" />
      </dl>
      <DenseStandings standings={standings} />
    </div>
  );
}

function PublicationConcept({
  page,
  team,
  stats,
  skaters,
  standings,
}: DesignLabProps & { page: PreviewPage }) {
  return (
    <div className={styles.publication}>
      <header className={styles.publicationHeader}>
        <div className={styles.publicationUtility}>
          <span>THURSDAY, JULY 30, 2026</span>
          <span>NHL ARCHIVE · 2005–PRESENT</span>
        </div>
        <div className={styles.publicationMasthead}>Sportsball</div>
        <nav>League&nbsp;&nbsp;&nbsp; Teams&nbsp;&nbsp;&nbsp; Players&nbsp;&nbsp;&nbsp; Analysis</nav>
      </header>
      {page === "team" ? (
        <PublicationTeam team={team} stats={stats} skaters={skaters} />
      ) : (
        <PublicationLeague standings={standings} />
      )}
    </div>
  );
}

function PublicationTeam({
  team,
  stats,
  skaters,
}: Pick<DesignLabProps, "team" | "stats" | "skaters">) {
  return (
    <main className={styles.publicationBody}>
      <div className={styles.publicationSectionLabel}>SEASON REVIEW / COLORADO</div>
      <div className={styles.publicationLead}>
        <div>
          <h4>{team.name}</h4>
          <p className={styles.publicationDek}>
            A {stats.standingsPoints}-point campaign that paired the league&apos;s
            strongest record with a {signed(stats.goalsFor - stats.goalsAgainst)} goal differential.
          </p>
        </div>
        <div className={styles.publicationRecord}>
          <strong>{record(stats)}</strong>
          <span>FINAL RECORD</span>
        </div>
      </div>
      <div className={styles.publicationRule} />
      <div className={styles.publicationGrid}>
        <article>
          <h5>The season in four numbers</h5>
          <EditorialMetrics stats={stats} />
        </article>
        <aside>
          <span className={styles.publicationMonogram}>{team.abbreviation}</span>
          <p>Colorado Avalanche</p>
          <small>National Hockey League</small>
        </aside>
      </div>
      <EditorialLeaders skaters={skaters} />
    </main>
  );
}

function PublicationLeague({ standings }: { standings: StandingsEntry[] }) {
  const leader = standings[0];
  return (
    <main className={styles.publicationBody}>
      <div className={styles.publicationSectionLabel}>THE 2025–26 NHL SEASON</div>
      <div className={styles.publicationLead}>
        <div>
          <h4>The league, at the finish</h4>
          <p className={styles.publicationDek}>
            Colorado finished first overall with {leader?.points} points as the
            playoff field separated itself across two conferences.
          </p>
        </div>
        <div className={styles.publicationRecord}>
          <strong>{leader?.teamAbbreviation}</strong>
          <span>PRESIDENTS&apos; TROPHY</span>
        </div>
      </div>
      <div className={styles.publicationRule} />
      <div className={styles.publicationStandings}>
        <h5>Final table</h5>
        {standings.map((row) => (
          <div key={row.teamId}>
            <span>{row.leagueRank}</span>
            <b>{row.teamName}</b>
            <small>{row.wins} wins</small>
            <strong>{row.points}</strong>
          </div>
        ))}
      </div>
    </main>
  );
}

function BroadcastConcept({
  page,
  team,
  stats,
  skaters,
  standings,
}: DesignLabProps & { page: PreviewPage }) {
  return (
    <div className={styles.broadcast}>
      <div className={styles.scoreTicker}>
        <b>FINAL</b><span>SEA 0&nbsp;&nbsp; COL 2</span>
        <b>FINAL</b><span>DAL 4&nbsp;&nbsp; WPG 3</span>
        <b>TONIGHT</b><span>EDM @ VGK</span>
      </div>
      <header className={styles.broadcastHeader}>
        <strong>SPORTSBALL</strong>
        <nav>Scores&nbsp;&nbsp; Standings&nbsp;&nbsp; Teams&nbsp;&nbsp; Stats</nav>
        <span>NHL</span>
      </header>
      {page === "team" ? (
        <BroadcastTeam team={team} stats={stats} skaters={skaters} />
      ) : (
        <BroadcastLeague standings={standings} />
      )}
    </div>
  );
}

function BroadcastTeam({
  team,
  stats,
  skaters,
}: Pick<DesignLabProps, "team" | "stats" | "skaters">) {
  return (
    <>
      <div className={styles.broadcastHero}>
        <span className={styles.broadcastWatermark}>{team.abbreviation}</span>
        <div>
          <p>COLORADO · 2025–26</p>
          <h4>{team.name}</h4>
          <span>REGULAR-SEASON PROFILE</span>
        </div>
        <div className={styles.broadcastWin}>
          <strong>{stats.wins}</strong><span>WINS</span><b>{record(stats)}</b>
        </div>
      </div>
      <BroadcastMetrics stats={stats} />
      <div className={styles.broadcastRail}>
        {skaters.slice(0, 4).map((player, index) => (
          <article key={player.nhlPlayerId}>
            <span>#{index + 1} TEAM SCORING</span>
            <h5>{player.name}</h5>
            <strong>{player.points ?? "—"} PTS</strong>
            <p>{player.goals ?? "—"} G · {player.assists ?? "—"} A</p>
          </article>
        ))}
      </div>
    </>
  );
}

function BroadcastLeague({ standings }: { standings: StandingsEntry[] }) {
  const leader = standings[0];
  return (
    <>
      <div className={styles.broadcastLeagueHero}>
        <p>2025–26 FINAL STANDINGS</p>
        <h4>The playoff picture is set.</h4>
        <div>
          <span>PRESIDENTS&apos; TROPHY</span>
          <strong>{leader?.teamName}</strong>
          <b>{leader?.points} PTS</b>
        </div>
      </div>
      <div className={styles.broadcastRail}>
        {standings.map((row) => (
          <article key={row.teamId}>
            <span>LEAGUE RANK #{row.leagueRank}</span>
            <h5>{row.teamAbbreviation}</h5>
            <strong>{row.points} PTS</strong>
            <p>{row.wins}–{row.losses}–{row.overtimeLosses}</p>
          </article>
        ))}
      </div>
    </>
  );
}

function ControlGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="w-fit rounded-xl border border-white/10 bg-white/[0.04] p-1">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={
            value === option.value
              ? "rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950"
              : "rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:text-white"
          }
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

function ConceptFrame({
  id,
  number,
  name,
  summary,
  traits,
  children,
}: {
  id: string;
  number: string;
  name: string;
  summary: string;
  traits: string[];
  children: ReactNode;
}) {
  return (
    <article id={id} className="scroll-mt-6">
      <div className="mb-4 grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-end lg:gap-x-4">
        <span className="font-mono text-sm text-cyan-300">{number}</span>
        <div>
          <h3 className="text-2xl font-semibold text-white">{name}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">{summary}</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {traits.map((trait) => (
            <span key={trait} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-500">
              {trait}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.preview}>{children}</div>
    </article>
  );
}

function WorkspaceNav({ active }: { active: string }) {
  return (
    <nav>
      {["Overview", "Games", "Teams", "Players", "Analytics"].map((item) => (
        <span key={item} data-active={item === active}>{item.slice(0, 1)}<b>{item}</b></span>
      ))}
    </nav>
  );
}

function WorkspaceMetrics({ stats }: { stats: TeamSeasonStats }) {
  return (
    <dl className={styles.workspaceMetrics}>
      <Metric label="Points" value={stats.standingsPoints} />
      <Metric label="Goal diff." value={signed(stats.goalsFor - stats.goalsAgainst)} />
      <Metric label="Goals for" value={stats.goalsFor} />
      <Metric label="Shot diff." value={signed(stats.shotsFor - stats.shotsAgainst)} />
    </dl>
  );
}

function BroadcastMetrics({ stats }: { stats: TeamSeasonStats }) {
  return (
    <dl className={styles.broadcastMetrics}>
      <Metric label="Points" value={stats.standingsPoints} />
      <Metric label="Goal differential" value={signed(stats.goalsFor - stats.goalsAgainst)} />
      <Metric label="Goals scored" value={stats.goalsFor} />
      <Metric label="Regulation wins" value={stats.regulationWins} />
    </dl>
  );
}

function EditorialMetrics({ stats }: { stats: TeamSeasonStats }) {
  return (
    <dl className={styles.editorialMetrics}>
      <Metric label="Points" value={stats.standingsPoints} />
      <Metric label="Goals for" value={stats.goalsFor} />
      <Metric label="Goals against" value={stats.goalsAgainst} />
      <Metric label="Shot differential" value={signed(stats.shotsFor - stats.shotsAgainst)} />
    </dl>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function DenseTable({ skaters, title }: { skaters: TeamSkaterSplit[]; title: string }) {
  return (
    <section className={styles.denseSection}>
      <div><h5>{title}</h5><span>Top five by points</span></div>
      <div className={styles.tableScroll}>
        <table>
          <thead><tr><th>Player</th><th>GP</th><th>G</th><th>A</th><th>PTS</th></tr></thead>
          <tbody>
            {skaters.map((player) => (
              <tr key={player.nhlPlayerId}>
                <td>{player.name} <span>{player.position}</span></td>
                <td>{player.gamesPlayed}</td><td>{player.goals ?? "—"}</td>
                <td>{player.assists ?? "—"}</td><td>{player.points ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DenseStandings({ standings }: { standings: StandingsEntry[] }) {
  return (
    <section className={styles.denseSection}>
      <div><h5>League standings</h5><span>Final snapshot</span></div>
      <div className={styles.tableScroll}>
        <table>
          <thead><tr><th>Rank</th><th>Team</th><th>W</th><th>L</th><th>DIFF</th><th>PTS</th></tr></thead>
          <tbody>
            {standings.map((row) => (
              <tr key={row.teamId}>
                <td>{row.leagueRank}</td><td>{row.teamName}</td><td>{row.wins}</td>
                <td>{row.losses}</td><td>{signed(row.goalDifferential)}</td><td>{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EditorialLeaders({ skaters }: { skaters: TeamSkaterSplit[] }) {
  return (
    <section className={styles.editorialLeaders}>
      <h5>Leading skaters</h5>
      {skaters.map((player, index) => (
        <div key={player.nhlPlayerId}>
          <span>0{index + 1}</span><b>{player.name}</b>
          <small>{player.goals ?? "—"} goals · {player.assists ?? "—"} assists</small>
          <strong>{player.points ?? "—"}</strong>
        </div>
      ))}
    </section>
  );
}

function TeamBadge({ abbreviation }: { abbreviation: string }) {
  return <span className={styles.teamBadge}>{abbreviation}</span>;
}

function ConceptLink({ href, number, label }: { href: string; number: string; label: string }) {
  return (
    <a href={href} className="shrink-0 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-cyan-300/30 hover:text-white">
      <span className="mr-2 font-mono text-xs text-cyan-300">{number}</span>{label}
    </a>
  );
}

function record(stats: TeamSeasonStats): string {
  return `${stats.wins}–${stats.regulationLosses}–${stats.overtimeLosses + stats.shootoutLosses}`;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
