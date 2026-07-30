import Link from "next/link";
import { notFound } from "next/navigation";

import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import { parseNhlId } from "@/contracts/entity";
import type {
  GoalieSeasonSummary,
  SkaterSeasonSummary,
} from "@/contracts/player";
import { parseSeasonId } from "@/contracts/season";
import { getPlayerDetail } from "@/data/players";
import { listSeasons } from "@/data/seasons";

export const dynamic = "force-dynamic";

type PlayerPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string | string[] }>;
};

export default async function PlayerPage({
  params,
  searchParams,
}: PlayerPageProps) {
  const nhlPlayerId = parseNhlId((await params).id);
  if (nhlPlayerId === null) {
    notFound();
  }

  const [detail, seasons] = await Promise.all([
    getPlayerDetail(nhlPlayerId),
    listSeasons(),
  ]);
  if (!detail) {
    notFound();
  }

  const careerSeasonIds = new Set([
    ...detail.skaterSeasons.map((row) => row.seasonId),
    ...detail.goalieSeasons.map((row) => row.seasonId),
  ]);
  const careerSeasons = seasons.filter((season) =>
    careerSeasonIds.has(season.id),
  );
  const requestedSeason = parseSeasonId(
    firstValue((await searchParams).season),
  );
  const selectedSeason =
    careerSeasons.find((season) => season.id === requestedSeason) ??
    careerSeasons[0];
  const selectedSkaterRows = detail.skaterSeasons.filter(
    (row) => row.seasonId === selectedSeason?.id,
  );
  const selectedGoalieRows = detail.goalieSeasons.filter(
    (row) => row.seasonId === selectedSeason?.id,
  );
  const regularSkater = selectedSkaterRows.find((row) => row.gameType === 2);
  const playoffSkater = selectedSkaterRows.find((row) => row.gameType === 3);
  const regularGoalie = selectedGoalieRows.find((row) => row.gameType === 2);
  const playoffGoalie = selectedGoalieRows.find((row) => row.gameType === 3);
  const profile = detail.profile;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="players" />

      <section className="py-10">
        <Link
          href={`/players${selectedSeason ? `?season=${selectedSeason.id}` : ""}`}
          className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
        >
          ← All players
        </Link>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-cyan-300">
              {profile.position ?? "Player"} · NHL {profile.nhlPlayerId}
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              {profile.name}
            </h2>
            <p className="mt-4 text-base text-slate-400">
              {selectedSeason
                ? `${selectedSeason.label} and career statistics`
                : "Player profile"}
            </p>
          </div>
          {careerSeasons.length > 0 ? (
            <SeasonPicker
              seasons={careerSeasons}
              selectedSeasonId={selectedSeason?.id}
            />
          ) : null}
        </div>

        <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ProfileStat
            label="Born"
            value={
              [profile.birthDate, profile.birthPlace]
                .filter(Boolean)
                .join(" · ") || "Unavailable"
            }
          />
          <ProfileStat
            label="Size"
            value={
              profile.heightInInches && profile.weightInPounds
                ? `${formatHeight(profile.heightInInches)} · ${profile.weightInPounds} lb`
                : "Unavailable"
            }
          />
          <ProfileStat
            label="Shoots / catches"
            value={profile.shootsCatches ?? "Unavailable"}
          />
          <ProfileStat label="Draft" value={formatDraft(profile)} />
        </dl>

        {regularSkater || playoffSkater ? (
          <section className="mt-12">
            <SectionTitle
              eyebrow="Selected season"
              title="Skater totals"
              detail="Combined across teams played for"
            />
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <SkaterPanel title="Regular season" stats={regularSkater} />
              <SkaterPanel title="Playoffs" stats={playoffSkater} />
            </div>
          </section>
        ) : null}

        {regularGoalie || playoffGoalie ? (
          <section className="mt-12">
            <SectionTitle
              eyebrow="Selected season"
              title="Goalie totals"
              detail="Combined across teams played for"
            />
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <GoaliePanel title="Regular season" stats={regularGoalie} />
              <GoaliePanel title="Playoffs" stats={playoffGoalie} />
            </div>
          </section>
        ) : null}

        {detail.skaterSeasons.length > 0 ? (
          <section className="mt-12">
            <SectionTitle
              eyebrow="Career history"
              title="Skater seasons"
              detail={`${careerSeasonIds.size} NHL seasons`}
            />
            <SkaterHistory
              rows={detail.skaterSeasons}
              seasonLabels={new Map(
                seasons.map((season) => [season.id, season.label]),
              )}
            />
          </section>
        ) : null}

        {detail.goalieSeasons.length > 0 ? (
          <section className="mt-12">
            <SectionTitle
              eyebrow="Career history"
              title="Goalie seasons"
              detail={`${careerSeasonIds.size} NHL seasons`}
            />
            <GoalieHistory
              rows={detail.goalieSeasons}
              seasonLabels={new Map(
                seasons.map((season) => [season.id, season.label]),
              )}
            />
          </section>
        ) : null}
      </section>
    </main>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <dt className="text-xs uppercase tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-medium text-white">{value}</dd>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-300">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
      </div>
      <p className="text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function SkaterPanel({
  title,
  stats,
}: {
  title: string;
  stats: SkaterSeasonSummary | undefined;
}) {
  if (!stats) {
    return <EmptyPanel title={title} />;
  }
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <div className="flex items-baseline justify-between">
        <h4 className="font-semibold text-white">{title}</h4>
        <span className="font-mono text-lg text-cyan-200">
          {stats.points} PTS
        </span>
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4">
        <Metric label="GP" value={stats.gamesPlayed} />
        <Metric label="G" value={stats.goals} />
        <Metric label="A" value={stats.assists} />
        <Metric label="+/-" value={formatSigned(stats.plusMinus)} />
        <Metric label="PIM" value={stats.penaltyMinutes} />
        <Metric label="PPG" value={stats.powerPlayGoals} />
        <Metric label="Shots" value={stats.shotsOnGoal} />
        <Metric label="Teams" value={stats.teamsPlayedFor} />
      </dl>
    </article>
  );
}

function GoaliePanel({
  title,
  stats,
}: {
  title: string;
  stats: GoalieSeasonSummary | undefined;
}) {
  if (!stats) {
    return <EmptyPanel title={title} />;
  }
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <div className="flex items-baseline justify-between">
        <h4 className="font-semibold text-white">{title}</h4>
        <span className="font-mono text-lg text-cyan-200">
          {formatSavePercentage(stats.savePercentage)} SV%
        </span>
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4">
        <Metric label="GP" value={stats.gamesPlayed} />
        <Metric label="GS" value={stats.gamesStarted} />
        <Metric label="W" value={stats.wins} />
        <Metric label="L" value={stats.losses} />
        <Metric label="OTL" value={stats.overtimeLosses} />
        <Metric label="GA" value={stats.goalsAgainst} />
        <Metric label="Saves" value={stats.saves} />
        <Metric label="Teams" value={stats.teamsPlayedFor} />
      </dl>
    </article>
  );
}

function EmptyPanel({ title }: { title: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
      <h4 className="font-semibold text-white">{title}</h4>
      <p className="mt-5 text-sm text-slate-500">Did not participate.</p>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-semibold tabular-nums text-white">{value}</dd>
    </div>
  );
}

function SkaterHistory({
  rows,
  seasonLabels,
}: {
  rows: SkaterSeasonSummary[];
  seasonLabels: Map<number, string>;
}) {
  return (
    <HistoryTable
      headers={["Season", "Type", "GP", "G", "A", "PTS", "+/-", "PIM"]}
      rows={rows.map((row) => [
        seasonLabels.get(row.seasonId) ?? String(row.seasonId),
        gameTypeLabel(row.gameType),
        row.gamesPlayed,
        row.goals,
        row.assists,
        row.points,
        formatSigned(row.plusMinus),
        row.penaltyMinutes,
      ])}
    />
  );
}

function GoalieHistory({
  rows,
  seasonLabels,
}: {
  rows: GoalieSeasonSummary[];
  seasonLabels: Map<number, string>;
}) {
  return (
    <HistoryTable
      headers={["Season", "Type", "GP", "GS", "W", "L", "OTL", "SV%"]}
      rows={rows.map((row) => [
        seasonLabels.get(row.seasonId) ?? String(row.seasonId),
        gameTypeLabel(row.gameType),
        row.gamesPlayed,
        row.gamesStarted,
        row.wins,
        row.losses,
        row.overtimeLosses,
        formatSavePercentage(row.savePercentage),
      ])}
    />
  );
}

function HistoryTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<number | string>>;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
              {headers.map((header, index) => (
                <th
                  key={header}
                  className={`px-4 py-3 font-medium ${
                    index < 2 ? "text-left" : "text-right"
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row[0]}-${row[1]}`}
                className="border-b border-white/[0.06] text-slate-300 last:border-0"
              >
                {row.map((value, index) => (
                  <td
                    key={`${headers[index]}-${value}`}
                    className={`px-4 py-3 tabular-nums ${
                      index < 2 ? "text-left" : "text-right"
                    } ${index === 5 ? "font-semibold text-cyan-200" : ""}`}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDraft(profile: {
  draftYear: number | null;
  draftTeamAbbreviation: string | null;
  draftRound: number | null;
  draftOverallPick: number | null;
}): string {
  if (!profile.draftYear) {
    return "Undrafted";
  }
  const parts = [
    String(profile.draftYear),
    profile.draftTeamAbbreviation,
    profile.draftRound ? `round ${profile.draftRound}` : null,
    profile.draftOverallPick ? `#${profile.draftOverallPick} overall` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

function formatHeight(inches: number): string {
  return `${Math.floor(inches / 12)}′${inches % 12}″`;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

function gameTypeLabel(gameType: number): string {
  return gameType === 3 ? "Playoffs" : "Regular";
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
