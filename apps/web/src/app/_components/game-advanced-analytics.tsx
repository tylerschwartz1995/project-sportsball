import Link from "next/link";

import { ShotMaps } from "@/app/_components/shot-map";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import type {
  MoneyPuckGameAnalytics,
  MoneyPuckGameTeam,
  MoneyPuckGameUnit,
  MoneyPuckGoalieGameSituation,
  MoneyPuckSkaterGameSituation,
} from "@/contracts/advanced-game";

export function GameAdvancedAnalytics({
  data,
}: {
  data: MoneyPuckGameAnalytics;
}) {
  const hasTeamData = data.teamSituations.length > 0;
  const hasPlayerData =
    data.skaterSituations.length > 0 || data.goalieSituations.length > 0;
  const hasShotData = data.shots.length > 0;
  const hasUnitData =
    data.forwardLines.length > 0 || data.defensivePairings.length > 0;

  if (!hasTeamData && !hasPlayerData && !hasShotData && !hasUnitData) {
    return <GameAdvancedUnavailable seasonId={data.game.seasonId} />;
  }

  return (
    <section className="mt-16 border-t border-white/10 pt-12">
      <SectionHeading
        eyebrow="MoneyPuck game analytics"
        title="How the game was played"
        description="Expected goals, possession, shot quality, and on-ice combinations from the stored MoneyPuck game files."
      />

      {hasTeamData ? (
        <TeamGameAnalytics
          rows={data.teamSituations}
          awayTeam={data.game.awayTeam}
          homeTeam={data.game.homeTeam}
        />
      ) : null}

      {hasShotData ? (
        <Subsection
          title="Shot maps"
          description="All MoneyPuck modeled goals, saved shots, and misses. Coordinates are normalized so each team attacks the net at right."
        >
          <ShotMaps
            shots={data.shots}
            awayTeam={data.game.awayTeam}
            homeTeam={data.game.homeTeam}
          />
        </Subsection>
      ) : null}

      {hasPlayerData ? (
        <PlayerGameAnalytics
          skaters={data.skaterSituations}
          goalies={data.goalieSituations}
          seasonId={data.game.seasonId}
        />
      ) : (
        <CoverageNote>
          {data.game.gameType === 3
            ? "MoneyPuck player-game files are regular-season only, so playoff games do not include these skater and goalie tables."
            : "No MoneyPuck player-game records are stored for this regular-season game."}
        </CoverageNote>
      )}

      {hasUnitData ? (
        <UnitAnalytics
          forwardLines={data.forwardLines}
          defensivePairings={data.defensivePairings}
          seasonId={data.game.seasonId}
        />
      ) : (
        <CoverageNote>
          {data.game.gameType === 3
            ? "Forward-line and defensive-pairing files cover regular-season five-on-five play only."
            : "No five-on-five forward-line or defensive-pairing records are stored for this game."}
        </CoverageNote>
      )}

      <MetricDefinitions seasonId={data.game.seasonId} />
    </section>
  );
}

function TeamGameAnalytics({
  rows,
  awayTeam,
  homeTeam,
}: {
  rows: MoneyPuckGameAnalytics["teamSituations"];
  awayTeam: MoneyPuckGameTeam;
  homeTeam: MoneyPuckGameTeam;
}) {
  const away = rows.find(
    (row) =>
      row.team.nhlTeamId === awayTeam.nhlTeamId && row.situation === "all",
  );
  const home = rows.find(
    (row) =>
      row.team.nhlTeamId === homeTeam.nhlTeamId && row.situation === "all",
  );

  return (
    <div className="mt-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ComparisonCard
          team={awayTeam.abbreviation}
          label="Expected goals"
          value={formatDecimal(away?.expectedGoalsFor ?? null)}
        />
        <ComparisonCard
          team={homeTeam.abbreviation}
          label="Expected goals"
          value={formatDecimal(home?.expectedGoalsFor ?? null)}
        />
        <ComparisonCard
          team={awayTeam.abbreviation}
          label="xG share"
          value={formatPercentage(away?.expectedGoalsPercentage ?? null)}
        />
        <ComparisonCard
          team={homeTeam.abbreviation}
          label="xG share"
          value={formatPercentage(home?.expectedGoalsPercentage ?? null)}
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
        <SortableTable>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <caption className="sr-only">
                Team advanced statistics by game situation
              </caption>
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
                  <MetricHeader label="Team" align="left" />
                  <MetricHeader label="Situation" align="left" />
                  <MetricHeader label="xG%" />
                  <MetricHeader label="CF%" />
                  <MetricHeader label="FF%" />
                  <MetricHeader label="xGF" />
                  <MetricHeader label="xGA" />
                  <MetricHeader label="SOG" />
                  <MetricHeader label="SA" />
                  <MetricHeader label="GF" />
                  <MetricHeader label="GA" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.team.nhlTeamId}-${row.situation}`}
                    className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.025]"
                  >
                    <TextCell value={row.team.abbreviation} />
                    <TextCell value={situationLabel(row.situation)} />
                    <ValueCell
                      value={formatPercentage(row.expectedGoalsPercentage)}
                      highlight
                    />
                    <ValueCell value={formatPercentage(row.corsiPercentage)} />
                    <ValueCell
                      value={formatPercentage(row.fenwickPercentage)}
                    />
                    <ValueCell value={formatDecimal(row.expectedGoalsFor)} />
                    <ValueCell value={formatDecimal(row.expectedGoalsAgainst)} />
                    <ValueCell value={formatDecimal(row.shotsOnGoalFor, 0)} />
                    <ValueCell
                      value={formatDecimal(row.shotsOnGoalAgainst, 0)}
                    />
                    <ValueCell value={formatDecimal(row.goalsFor, 0)} />
                    <ValueCell value={formatDecimal(row.goalsAgainst, 0)} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SortableTable>
      </div>
    </div>
  );
}

function PlayerGameAnalytics({
  skaters,
  goalies,
  seasonId,
}: {
  skaters: MoneyPuckSkaterGameSituation[];
  goalies: MoneyPuckGoalieGameSituation[];
  seasonId: number;
}) {
  const allSituationSkaters = skaters
    .filter((row) => row.situation === "all")
    .sort((left, right) =>
      compareNullableDescending(left.gameScore, right.gameScore),
    );
  const allSituationGoalies = goalies
    .filter((row) => row.situation === "all")
    .sort((left, right) =>
      compareNullableDescending(
        difference(left.expectedGoalsAgainst, left.goalsAgainst),
        difference(right.expectedGoalsAgainst, right.goalsAgainst),
      ),
    );

  return (
    <Subsection
      title="Player advanced results"
      description="All-situations game totals. Open a player profile for season context and career history."
    >
      {allSituationSkaters.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
          <SortableTable defaultSortKey="Game score">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-sm">
                <caption className="sr-only">
                  MoneyPuck skater game statistics
                </caption>
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
                    <MetricHeader label="Player" align="left" />
                    <MetricHeader label="Team" align="left" />
                    <MetricHeader label="Pos" align="left" />
                    <MetricHeader label="TOI" />
                    <MetricHeader label="Game score" />
                    <MetricHeader label="ixG" />
                    <MetricHeader label="iG" />
                    <MetricHeader label="iPTS" />
                    <MetricHeader label="Shots" />
                    <MetricHeader label="On-ice xG%" />
                    <MetricHeader label="On-ice CF%" />
                  </tr>
                </thead>
                <tbody>
                  {allSituationSkaters.map((row) => (
                    <tr
                      key={`${row.team.nhlTeamId}-${row.player.nhlPlayerId}`}
                      className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.025]"
                    >
                      <td className="px-4 py-3 text-left">
                        <Link
                          href={`/players/${row.player.nhlPlayerId}?season=${seasonId}`}
                          className="font-medium text-white transition hover:text-violet-200"
                        >
                          {row.player.name}
                        </Link>
                      </td>
                      <TextCell value={row.team.abbreviation} />
                      <TextCell value={row.position ?? "—"} />
                      <ValueCell value={formatTimeOnIce(row.iceTimeSeconds)} />
                      <ValueCell value={formatDecimal(row.gameScore)} highlight />
                      <ValueCell
                        value={formatDecimal(row.individualExpectedGoals)}
                      />
                      <ValueCell
                        value={formatDecimal(row.individualGoals, 0)}
                      />
                      <ValueCell
                        value={formatDecimal(row.individualPoints, 0)}
                      />
                      <ValueCell value={formatDecimal(row.shotsOnGoal, 0)} />
                      <ValueCell
                        value={formatPercentage(
                          row.onIceExpectedGoalsPercentage,
                        )}
                      />
                      <ValueCell
                        value={formatPercentage(row.onIceCorsiPercentage)}
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SortableTable>
        </div>
      ) : null}

      {allSituationGoalies.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
          <SortableTable defaultSortKey="GSAx">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <caption className="sr-only">
                  MoneyPuck goalie game statistics
                </caption>
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
                    <MetricHeader label="Goalie" align="left" />
                    <MetricHeader label="Team" align="left" />
                    <MetricHeader label="TOI" />
                    <MetricHeader label="xGA" />
                    <MetricHeader label="GA" />
                    <MetricHeader label="GSAx" />
                    <MetricHeader label="Expected SOG" />
                    <MetricHeader label="SOG" />
                  </tr>
                </thead>
                <tbody>
                  {allSituationGoalies.map((row) => (
                    <tr
                      key={`${row.team.nhlTeamId}-${row.player.nhlPlayerId}`}
                      className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.025]"
                    >
                      <td className="px-4 py-3 text-left">
                        <Link
                          href={`/players/${row.player.nhlPlayerId}?season=${seasonId}`}
                          className="font-medium text-white transition hover:text-violet-200"
                        >
                          {row.player.name}
                        </Link>
                      </td>
                      <TextCell value={row.team.abbreviation} />
                      <ValueCell value={formatTimeOnIce(row.iceTimeSeconds)} />
                      <ValueCell value={formatDecimal(row.expectedGoalsAgainst)} />
                      <ValueCell value={formatDecimal(row.goalsAgainst, 0)} />
                      <ValueCell
                        value={formatSignedDecimal(
                          difference(
                            row.expectedGoalsAgainst,
                            row.goalsAgainst,
                          ),
                        )}
                        highlight
                      />
                      <ValueCell
                        value={formatDecimal(row.expectedShotsOnGoalAgainst)}
                      />
                      <ValueCell
                        value={formatDecimal(row.shotsOnGoalAgainst, 0)}
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SortableTable>
        </div>
      ) : null}
    </Subsection>
  );
}

function UnitAnalytics({
  forwardLines,
  defensivePairings,
  seasonId,
}: {
  forwardLines: MoneyPuckGameUnit[];
  defensivePairings: MoneyPuckGameUnit[];
  seasonId: number;
}) {
  return (
    <Subsection
      title="Five-on-five combinations"
      description="Forward lines and defensive pairs ordered from the stored game-level MoneyPuck unit file."
    >
      {forwardLines.length > 0 ? (
        <UnitTable
          title="Forward lines"
          rows={forwardLines}
          seasonId={seasonId}
        />
      ) : null}
      {defensivePairings.length > 0 ? (
        <div className={forwardLines.length > 0 ? "mt-5" : undefined}>
          <UnitTable
            title="Defensive pairings"
            rows={defensivePairings}
            seasonId={seasonId}
          />
        </div>
      ) : null}
    </Subsection>
  );
}

function UnitTable({
  title,
  rows,
  seasonId,
}: {
  title: string;
  rows: MoneyPuckGameUnit[];
  seasonId: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
      <SortableTable defaultSortKey="TOI">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
                <MetricHeader label="Team" align="left" />
                <MetricHeader label={title} align="left" />
                <MetricHeader label="TOI" />
                <MetricHeader label="xG%" />
                <MetricHeader label="CF%" />
                <MetricHeader label="FF%" />
                <MetricHeader label="xGF" />
                <MetricHeader label="xGA" />
                <MetricHeader label="SOG" />
                <MetricHeader label="SA" />
                <MetricHeader label="GF" />
                <MetricHeader label="GA" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.team.nhlTeamId}-${row.unitType}-${row.sourceLineId}`}
                  className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.025]"
                >
                  <TextCell value={row.team.abbreviation} />
                  <td className="px-4 py-3 text-left">
                    <div className="flex flex-wrap gap-x-1">
                      {row.players.map((player, index) => (
                        <span key={player.nhlPlayerId}>
                          {index > 0 ? <span className="text-slate-600"> / </span> : null}
                          <Link
                            href={`/players/${player.nhlPlayerId}?season=${seasonId}`}
                            className="font-medium text-white transition hover:text-violet-200"
                          >
                            {player.name}
                          </Link>
                        </span>
                      ))}
                    </div>
                  </td>
                  <ValueCell value={formatTimeOnIce(row.iceTimeSeconds)} />
                  <ValueCell
                    value={formatPercentage(row.expectedGoalsPercentage)}
                    highlight
                  />
                  <ValueCell value={formatPercentage(row.corsiPercentage)} />
                  <ValueCell value={formatPercentage(row.fenwickPercentage)} />
                  <ValueCell value={formatDecimal(row.expectedGoalsFor)} />
                  <ValueCell value={formatDecimal(row.expectedGoalsAgainst)} />
                  <ValueCell value={formatDecimal(row.shotsOnGoalFor, 0)} />
                  <ValueCell value={formatDecimal(row.shotsOnGoalAgainst, 0)} />
                  <ValueCell value={formatDecimal(row.goalsFor, 0)} />
                  <ValueCell value={formatDecimal(row.goalsAgainst, 0)} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SortableTable>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-300">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-white">{title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>
      <MoneyPuckAttribution />
    </div>
  );
}

function Subsection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h3 className="text-2xl font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
        {description}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ComparisonCard({
  team,
  label,
  value,
}: {
  team: string;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.06] p-5">
      <p className="font-mono text-xs font-semibold text-violet-300">{team}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.12em] text-violet-200/60">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-white">
        {value}
      </p>
    </article>
  );
}

function MetricHeader({
  label,
  align = "right",
}: {
  label: string;
  align?: "left" | "right";
}) {
  return (
    <SortableHeader
      label={label}
      sortKey={label}
      align={align}
      defaultDirection={align === "left" ? "asc" : "desc"}
    />
  );
}

function TextCell({ value }: { value: string }) {
  return <td className="px-4 py-3 text-left font-medium text-white">{value}</td>;
}

function ValueCell({
  value,
  highlight = false,
}: {
  value: string;
  highlight?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 text-right tabular-nums ${
        highlight ? "font-semibold text-violet-200" : "text-slate-300"
      }`}
    >
      {value}
    </td>
  );
}

function CoverageNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4 text-sm leading-6 text-slate-500">
      {children}
    </p>
  );
}

function MetricDefinitions({ seasonId }: { seasonId: number }) {
  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-sm leading-6 text-slate-400">
      <p>
        <strong className="text-slate-200">xG</strong> estimates shot quality.{" "}
        <strong className="text-slate-200">xG%</strong> is a team or on-ice
        share of expected goals. <strong className="text-slate-200">CF%</strong>{" "}
        measures all shot attempts, while{" "}
        <strong className="text-slate-200">FF%</strong> excludes blocked
        attempts. <strong className="text-slate-200">GSAx</strong> is expected
        goals against minus actual goals against; positive is better.
      </p>
      <Link
        href={`/analytics/guide?season=${seasonId}`}
        className="mt-3 inline-block font-medium text-violet-300 transition hover:text-violet-200"
      >
        Open the full metric guide →
      </Link>
    </div>
  );
}

function MoneyPuckAttribution() {
  return (
    <a
      href="https://moneypuck.com/"
      target="_blank"
      rel="noreferrer"
      className="text-sm font-medium text-violet-300 transition hover:text-violet-200"
    >
      Data: MoneyPuck.com ↗
    </a>
  );
}

function GameAdvancedUnavailable({ seasonId }: { seasonId: number }) {
  return (
    <section className="mt-16 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-300">
        Advanced analytics
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">
        MoneyPuck game data unavailable
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        {seasonId < 20072008
          ? "MoneyPuck game coverage begins with shot data in 2007–08 and broader game data in 2008–09."
          : "No MoneyPuck advanced records are stored for this game."}
      </p>
    </section>
  );
}

function situationLabel(situation: string): string {
  const labels: Record<string, string> = {
    all: "All situations",
    "5on5": "5-on-5",
    "5on4": "5-on-4",
    "4on5": "4-on-5",
    other: "Other",
  };
  return labels[situation] ?? situation;
}

function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatDecimal(value: number | null, digits = 2): string {
  return value === null ? "—" : value.toFixed(digits);
}

function formatSignedDecimal(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function formatTimeOnIce(seconds: number): string {
  const roundedSeconds = Math.round(seconds);
  return `${Math.floor(roundedSeconds / 60)}:${String(roundedSeconds % 60).padStart(2, "0")}`;
}

function difference(
  left: number | null,
  right: number | null,
): number | null {
  return left === null || right === null ? null : left - right;
}

function compareNullableDescending(
  left: number | null,
  right: number | null,
): number {
  if (left === null) {
    return right === null ? 0 : 1;
  }
  if (right === null) {
    return -1;
  }
  return right - left;
}
