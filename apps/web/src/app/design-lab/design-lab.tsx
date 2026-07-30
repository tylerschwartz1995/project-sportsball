"use client";

import { useState, type ReactNode } from "react";

import type {
  TeamIdentity,
  TeamSeasonStats,
  TeamSkaterSplit,
} from "@/contracts/team";

import styles from "./design-lab.module.css";

type DisplayMode = "dark" | "light";

export function DesignLab({
  team,
  stats,
  skaters,
}: {
  team: TeamIdentity;
  stats: TeamSeasonStats;
  skaters: TeamSkaterSplit[];
}) {
  const [mode, setMode] = useState<DisplayMode>("dark");

  return (
    <section className="py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-sm uppercase tracking-[0.18em] text-cyan-300">
            Visual direction workshop
          </p>
          <h2 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Three ways Sportsball could feel
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
            The data and team are identical in every concept. Compare hierarchy,
            density, personality, and how Colorado&apos;s colors support the
            experience in both display modes.
          </p>
        </div>

        <fieldset className="w-fit rounded-xl border border-white/10 bg-white/[0.04] p-1">
          <legend className="sr-only">Preview display mode</legend>
          {(["dark", "light"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={
                mode === value
                  ? "rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold capitalize text-slate-950"
                  : "rounded-lg px-4 py-2 text-sm font-medium capitalize text-slate-400 transition hover:text-white"
              }
            >
              {value}
            </button>
          ))}
        </fieldset>
      </div>

      <nav
        aria-label="Design concepts"
        className="mt-8 flex gap-2 overflow-x-auto pb-1"
      >
        <ConceptLink href="#data-lab" number="01" label="Data Lab" />
        <ConceptLink href="#broadcast" number="02" label="Modern Broadcast" />
        <ConceptLink href="#editorial" number="03" label="Sports Editorial" />
      </nav>

      <div
        data-mode={mode}
        className={`${styles.lab} mt-8 space-y-10`}
      >
        <ConceptFrame
          id="data-lab"
          number="01"
          name="Data Lab"
          summary="Dense, technical, and analytical. The interface feels like a serious research tool with restrained team accents."
        >
          <DataLabConcept
            team={team}
            stats={stats}
            skaters={skaters}
          />
        </ConceptFrame>

        <ConceptFrame
          id="broadcast"
          number="02"
          name="Modern Broadcast"
          summary="More energy and team identity. Bold records, stronger color, and clearer visual moments feel closer to a premium sports broadcast."
        >
          <BroadcastConcept
            team={team}
            stats={stats}
            skaters={skaters}
          />
        </ConceptFrame>

        <ConceptFrame
          id="editorial"
          number="03"
          name="Sports Editorial"
          summary="Calmer and more spacious. Typography leads, containers recede, and the page feels like a data-rich sports publication."
        >
          <EditorialConcept
            team={team}
            stats={stats}
            skaters={skaters}
          />
        </ConceptFrame>
      </div>

      <aside className="mt-10 rounded-2xl border border-violet-300/20 bg-violet-300/[0.055] p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-violet-300">
          Team-color rule
        </p>
        <h3 className="mt-2 text-xl font-semibold text-white">
          Identity without sacrificing readability
        </h3>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
          The eventual team palette should come from a controlled registry.
          Primary and secondary colors can drive hero treatments, monograms,
          plot series, and selected metrics. Neutral semantic tokens should
          continue to control page backgrounds, text, borders, tables, and
          accessible states.
        </p>
      </aside>
    </section>
  );
}

function ConceptFrame({
  id,
  number,
  name,
  summary,
  children,
}: {
  id: string;
  number: string;
  name: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <article id={id} className="scroll-mt-6">
      <div className="mb-4 grid gap-2 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-x-4">
        <span className="font-mono text-sm text-cyan-300">{number}</span>
        <div>
          <h3 className="text-2xl font-semibold text-white">{name}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            {summary}
          </p>
        </div>
      </div>
      <div className={styles.preview}>{children}</div>
    </article>
  );
}

function DataLabConcept({
  team,
  stats,
  skaters,
}: ConceptProps) {
  return (
    <div className={styles.dataLab}>
      <ConceptTopbar name="SPORTSBALL / NHL DATA LAB" />
      <div className={styles.dataHero}>
        <TeamMark abbreviation={team.abbreviation} />
        <div>
          <p className={styles.kicker}>TEAM PROFILE · 2025–26</p>
          <h4>{team.name}</h4>
          <p className={styles.subtle}>Regular season · 82 games</p>
        </div>
        <div className={styles.dataRecord}>
          <span>RECORD</span>
          <strong>{record(stats)}</strong>
        </div>
      </div>
      <MetricStrip stats={stats} className={styles.dataMetrics} />
      <SampleTable skaters={skaters} title="SKATER PRODUCTION" />
    </div>
  );
}

function BroadcastConcept({
  team,
  stats,
  skaters,
}: ConceptProps) {
  return (
    <div className={styles.broadcast}>
      <ConceptTopbar name="SPORTSBALL LIVE" />
      <div className={styles.broadcastHero}>
        <div>
          <p className={styles.kicker}>COLORADO · 2025–26</p>
          <h4>{team.name}</h4>
          <p>Regular-season profile</p>
        </div>
        <div className={styles.broadcastRecord}>
          <strong>{stats.wins}</strong>
          <span>WINS</span>
          <b>{record(stats)}</b>
        </div>
        <span className={styles.broadcastMark}>
          {team.abbreviation}
        </span>
      </div>
      <MetricStrip stats={stats} className={styles.broadcastMetrics} />
      <SampleTable skaters={skaters} title="TEAM LEADERS" />
    </div>
  );
}

function EditorialConcept({
  team,
  stats,
  skaters,
}: ConceptProps) {
  return (
    <div className={styles.editorial}>
      <ConceptTopbar name="SPORTSBALL / SEASON REVIEW" />
      <div className={styles.editorialHero}>
        <div className={styles.editorialIdentity}>
          <span>{team.abbreviation}</span>
          <p>Colorado · National Hockey League</p>
        </div>
        <h4>{team.name}</h4>
        <p className={styles.editorialDek}>
          A {stats.standingsPoints}-point season defined by a{" "}
          {signed(stats.goalsFor - stats.goalsAgainst)} goal differential and a{" "}
          {record(stats)} overall record.
        </p>
      </div>
      <div className={styles.editorialRule} />
      <MetricStrip stats={stats} className={styles.editorialMetrics} />
      <SampleTable skaters={skaters} title="Leading skaters" />
    </div>
  );
}

type ConceptProps = {
  team: TeamIdentity;
  stats: TeamSeasonStats;
  skaters: TeamSkaterSplit[];
};

function MetricStrip({
  stats,
  className,
}: {
  stats: TeamSeasonStats;
  className: string;
}) {
  const values = [
    { label: "Points", value: stats.standingsPoints },
    {
      label: "Goal diff.",
      value: signed(stats.goalsFor - stats.goalsAgainst),
    },
    { label: "Goals", value: stats.goalsFor },
    {
      label: "Shot diff.",
      value: signed(stats.shotsFor - stats.shotsAgainst),
    },
  ];

  return (
    <dl className={className}>
      {values.map((metric) => (
        <div key={metric.label}>
          <dt>{metric.label}</dt>
          <dd>{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SampleTable({
  skaters,
  title,
}: {
  skaters: TeamSkaterSplit[];
  title: string;
}) {
  return (
    <section className={styles.tableSection}>
      <div className={styles.tableTitle}>
        <h5>{title}</h5>
        <span>Top five by points</span>
      </div>
      <div className={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>GP</th>
              <th>G</th>
              <th>A</th>
              <th>PTS</th>
            </tr>
          </thead>
          <tbody>
            {skaters.map((player) => (
              <tr key={player.nhlPlayerId}>
                <td>
                  {player.name} <span>{player.position}</span>
                </td>
                <td>{player.gamesPlayed}</td>
                <td>{player.goals ?? "—"}</td>
                <td>{player.assists ?? "—"}</td>
                <td>{player.points ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ConceptTopbar({ name }: { name: string }) {
  return (
    <div className={styles.conceptTopbar}>
      <span>{name}</span>
      <span>TEAMS&nbsp;&nbsp; PLAYERS&nbsp;&nbsp; ANALYTICS</span>
    </div>
  );
}

function TeamMark({ abbreviation }: { abbreviation: string }) {
  return <span className={styles.teamMark}>{abbreviation}</span>;
}

function ConceptLink({
  href,
  number,
  label,
}: {
  href: string;
  number: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className="shrink-0 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-cyan-300/30 hover:text-white"
    >
      <span className="mr-2 font-mono text-xs text-cyan-300">{number}</span>
      {label}
    </a>
  );
}

function record(stats: TeamSeasonStats): string {
  return `${stats.wins}–${stats.regulationLosses}–${stats.overtimeLosses + stats.shootoutLosses}`;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
