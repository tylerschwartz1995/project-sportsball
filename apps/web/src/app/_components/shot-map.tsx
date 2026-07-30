"use client";

import { useState } from "react";

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
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const plottedShots = shots.filter(
    (shot) =>
      shot.adjustedXCoordinate !== null &&
      shot.adjustedYCoordinate !== null,
  );
  const goals = shots.filter((shot) => shot.isGoal).length;
  const expectedGoals = sumExpectedGoals(shots);
  const color = accent === "cyan" ? "#67e8f9" : "#c4b5fd";
  const selectedShot =
    shots.find((shot) => shotKey(shot) === selectedShotId) ?? null;

  return (
    <figure className="surface-panel overflow-hidden">
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
            fill="var(--surface-raised)"
            stroke="var(--border-strong)"
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
            stroke="var(--muted)"
            strokeDasharray="4 6"
            opacity="0.2"
          />

          {plottedShots.map((shot) => {
            const x = mapX(shot.adjustedXCoordinate!);
            const y = mapY(shot.adjustedYCoordinate!);
            const radius = shotRadius(shot.expectedGoal);
            const key = shotKey(shot);
            const isSelected = key === selectedShotId;
            return (
              <g
                key={key}
                role="button"
                tabIndex={0}
                aria-label={shotLabel(shot)}
                aria-pressed={isSelected}
                className="cursor-pointer outline-none"
                onClick={() => setSelectedShotId(key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedShotId(key);
                  }
                }}
              >
                <title>{shotLabel(shot)}</title>
                <circle
                  cx={x}
                  cy={y}
                  r={Math.max(radius + 5, 9)}
                  fill="transparent"
                />
                {isSelected ? (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 3.5}
                    fill="none"
                    stroke="var(--foreground)"
                    strokeWidth="1.5"
                    opacity="0.95"
                  />
                ) : null}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={
                    shot.isGoal
                      ? color
                      : shot.wasOnGoal
                        ? color
                        : "var(--surface-raised)"
                  }
                  fillOpacity={shot.isGoal ? 0.95 : 0.45}
                  stroke={color}
                  strokeWidth={shot.isGoal ? 2.5 : 1.25}
                />
              </g>
            );
          })}
        </svg>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
          <LegendDot color={color} label="On goal" />
          <LegendDot color={color} label="Goal" solid />
          <span>Circle size reflects expected-goal probability. Select a shot for details.</span>
        </div>

        <ShotDetails shot={selectedShot} team={team} />
      </div>
    </figure>
  );
}

function ShotDetails({
  shot,
  team,
}: {
  shot: MoneyPuckShot | null;
  team: MoneyPuckGameTeam;
}) {
  if (!shot) {
    return (
      <p className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-slate-500">
        Select any shot marker to see the shooter, result, game situation, and
        shot-quality details.
      </p>
    );
  }

  const score =
    shot.awayTeamGoals === null || shot.homeTeamGoals === null
      ? "Unavailable"
      : shot.isHomeTeam
        ? `${team.abbreviation} ${shot.homeTeamGoals}–${shot.awayTeamGoals} ${shot.defendingTeam.abbreviation}`
        : `${team.abbreviation} ${shot.awayTeamGoals}–${shot.homeTeamGoals} ${shot.defendingTeam.abbreviation}`;
  const tags = [
    shot.wasRebound ? "Rebound" : null,
    shot.wasRush ? "Rush" : null,
    shot.wasEmptyNet ? "Empty net" : null,
  ].filter(Boolean);

  return (
    <div
      aria-live="polite"
      className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            Selected shot
          </p>
          <p className="mt-1 font-semibold text-white">
            {shot.shooter?.name ?? "Unknown shooter"}
          </p>
        </div>
        <span
          className={
            shot.isGoal
              ? "rounded-full bg-emerald-300/15 px-2.5 py-1 text-xs font-semibold text-emerald-200"
              : "rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-300"
          }
        >
          {shotOutcome(shot)}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
        <ShotDetail label="When" value={`P${shot.period} · ${formatMoneyPuckPeriodClock(shot.gameTimeSeconds, shot.period)}`} />
        <ShotDetail label="Shot type" value={formatShotType(shot.shotType)} />
        <ShotDetail
          label="Expected goal"
          value={
            shot.expectedGoal === null
              ? "Unavailable"
              : `${(shot.expectedGoal * 100).toFixed(1)}%`
          }
        />
        <ShotDetail label="Goalie" value={shot.goalie?.name ?? (shot.wasEmptyNet ? "Empty net" : "Unknown")} />
        <ShotDetail
          label="Distance"
          value={
            shot.shotDistance === null
              ? "Unavailable"
              : `${shot.shotDistance.toFixed(1)} ft`
          }
        />
        <ShotDetail label="Recorded score" value={score} />
      </dl>

      {tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ShotDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 tabular-nums text-slate-200">{value}</dd>
    </div>
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
  const outcome = shotOutcome(shot);
  const expectedGoal =
    shot.expectedGoal === null
      ? "xG unavailable"
      : `${(shot.expectedGoal * 100).toFixed(1)}% xG`;
  return `${shooter}: ${outcome}, period ${shot.period}, ${formatMoneyPuckPeriodClock(shot.gameTimeSeconds, shot.period)}, ${expectedGoal}`;
}

function shotKey(shot: MoneyPuckShot): string {
  return `${shot.sourceShotId}-${shot.sourceEventIndex}`;
}

function shotOutcome(shot: MoneyPuckShot): string {
  return shot.isGoal
    ? "Goal"
    : shot.wasOnGoal
      ? "Saved"
      : "Missed shot";
}

function formatShotType(value: string | null): string {
  if (!value) {
    return "Unknown";
  }
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
