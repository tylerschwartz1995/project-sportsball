import type {
  MoneyPuckGameTeam,
  MoneyPuckShot,
} from "@/contracts/advanced-game";
import { formatMoneyPuckPeriodClock } from "@/lib/moneypuck-shot";

export function ShotMaps({
  shots,
  awayTeam,
  homeTeam,
}: {
  shots: MoneyPuckShot[];
  awayTeam: MoneyPuckGameTeam;
  homeTeam: MoneyPuckGameTeam;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <TeamShotMap
        team={awayTeam}
        shots={shots.filter(
          (shot) => shot.shootingTeam.nhlTeamId === awayTeam.nhlTeamId,
        )}
        accent="cyan"
      />
      <TeamShotMap
        team={homeTeam}
        shots={shots.filter(
          (shot) => shot.shootingTeam.nhlTeamId === homeTeam.nhlTeamId,
        )}
        accent="violet"
      />
    </div>
  );
}

function TeamShotMap({
  team,
  shots,
  accent,
}: {
  team: MoneyPuckGameTeam;
  shots: MoneyPuckShot[];
  accent: "cyan" | "violet";
}) {
  const plottedShots = shots.filter(
    (shot) =>
      shot.adjustedXCoordinate !== null &&
      shot.adjustedYCoordinate !== null,
  );
  const goals = shots.filter((shot) => shot.isGoal).length;
  const expectedGoals = sumExpectedGoals(shots);
  const color = accent === "cyan" ? "#67e8f9" : "#c4b5fd";

  return (
    <figure className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
      <figcaption className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
            {team.abbreviation} attempts
          </p>
          <p className="mt-1 font-semibold text-white">{team.name}</p>
        </div>
        <p className="text-right text-sm tabular-nums text-slate-400">
          {shots.length} attempts · {goals} goals · {expectedGoals.toFixed(2)}{" "}
          xG
        </p>
      </figcaption>

      <div className="p-4">
        <svg
          viewBox="0 0 320 220"
          role="img"
          aria-label={`${team.name} offensive-zone shot map`}
          className="h-auto w-full"
        >
          <rect
            x="8"
            y="8"
            width="304"
            height="204"
            rx="48"
            fill="#071525"
            stroke="#334155"
            strokeWidth="2"
          />
          <line
            x1="42"
            y1="9"
            x2="42"
            y2="211"
            stroke="#2563eb"
            strokeWidth="2"
            opacity="0.55"
          />
          <line
            x1="278"
            y1="9"
            x2="278"
            y2="211"
            stroke="#ef4444"
            strokeWidth="2"
            opacity="0.7"
          />
          <path
            d="M278 96 C298 96 298 124 278 124"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
          />
          <circle
            cx="278"
            cy="110"
            r="54"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.5"
            opacity="0.3"
          />
          <circle cx="278" cy="110" r="2.5" fill="#ef4444" opacity="0.7" />
          <line
            x1="160"
            y1="9"
            x2="160"
            y2="211"
            stroke="#94a3b8"
            strokeDasharray="4 6"
            opacity="0.2"
          />

          {plottedShots.map((shot) => {
            const x = mapX(shot.adjustedXCoordinate!);
            const y = mapY(shot.adjustedYCoordinate!);
            const radius = shotRadius(shot.expectedGoal);
            return (
              <circle
                key={`${shot.sourceShotId}-${shot.sourceEventIndex}`}
                cx={x}
                cy={y}
                r={radius}
                fill={shot.isGoal ? color : shot.wasOnGoal ? color : "#071525"}
                fillOpacity={shot.isGoal ? 0.95 : 0.45}
                stroke={color}
                strokeWidth={shot.isGoal ? 2.5 : 1.25}
              >
                <title>{shotLabel(shot)}</title>
              </circle>
            );
          })}
        </svg>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
          <LegendDot color={color} label="On goal" />
          <LegendDot color={color} label="Goal" solid />
          <span>Circle size reflects expected-goal probability.</span>
        </div>
      </div>
    </figure>
  );
}

function LegendDot({
  color,
  label,
  solid = false,
}: {
  color: string;
  label: string;
  solid?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 rounded-full border"
        style={{
          borderColor: color,
          backgroundColor: solid ? color : "transparent",
        }}
      />
      {label}
    </span>
  );
}

function mapX(value: number): number {
  return 18 + (Math.max(0, Math.min(100, value)) / 100) * 284;
}

function mapY(value: number): number {
  return 110 - (Math.max(-42.5, Math.min(42.5, value)) / 42.5) * 92;
}

function shotRadius(expectedGoal: number | null): number {
  return 2.75 + Math.sqrt(Math.max(0, expectedGoal ?? 0)) * 9;
}

function sumExpectedGoals(shots: MoneyPuckShot[]): number {
  return shots.reduce((total, shot) => total + (shot.expectedGoal ?? 0), 0);
}

function shotLabel(shot: MoneyPuckShot): string {
  const shooter = shot.shooter?.name ?? "Unknown shooter";
  const outcome = shot.isGoal
    ? "Goal"
    : shot.wasOnGoal
      ? "Shot on goal"
      : "Missed shot";
  const expectedGoal =
    shot.expectedGoal === null
      ? "xG unavailable"
      : `${(shot.expectedGoal * 100).toFixed(1)}% xG`;
  return `${shooter}: ${outcome}, period ${shot.period}, ${formatMoneyPuckPeriodClock(shot.gameTimeSeconds, shot.period)}, ${expectedGoal}`;
}
