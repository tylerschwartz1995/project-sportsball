"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

import type {
  MoneyPuckGameTeam,
  MoneyPuckShot,
} from "@/contracts/advanced-game";
import { TeamLogo } from "@/app/_components/team-logo";
import { formatMoneyPuckPeriodClock } from "@/lib/moneypuck-shot";
import {
  mapShotX,
  mapShotY,
  SHOT_RINK,
  shotNavigationIndex,
} from "@/lib/shot-map";

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
  const markerRefs = useRef(new Map<string, SVGGElement>());
  const instructionsId = useId();
  const plottedShots = shots.filter(
    (shot) =>
      shot.adjustedXCoordinate !== null &&
      shot.adjustedYCoordinate !== null,
  );
  const renderedShots = [
    ...plottedShots.filter((shot) => !shot.isGoal),
    ...plottedShots.filter((shot) => shot.isGoal),
  ];
  const navigationIndexByKey = new Map(
    plottedShots.map((shot, index) => [shotKey(shot), index]),
  );
  const goals = shots.filter((shot) => shot.isGoal).length;
  const expectedGoals = sumExpectedGoals(shots);
  const color = accent === "cyan" ? "#67e8f9" : "#c4b5fd";
  const selectedShot =
    shots.find((shot) => shotKey(shot) === selectedShotId) ?? null;
  const activeShotId =
    selectedShotId ?? (plottedShots[0] ? shotKey(plottedShots[0]) : null);

  function focusShot(index: number) {
    const shot = plottedShots[index];
    if (!shot) return;
    const key = shotKey(shot);
    setSelectedShotId(key);
    requestAnimationFrame(() => markerRefs.current.get(key)?.focus());
  }

  function handleMarkerKeyDown(
    event: KeyboardEvent<SVGGElement>,
    index: number,
  ) {
    const nextIndex = shotNavigationIndex(
      index,
      event.key,
      plottedShots.length,
    );
    if (nextIndex !== null) {
      event.preventDefault();
      focusShot(nextIndex);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedShotId(shotKey(plottedShots[index]));
    }
  }

  return (
    <figure className="surface-panel flex h-full flex-col overflow-hidden">
      <figcaption className="border-b border-white/[0.07] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <TeamLogo {...team} size="compact" decorative />
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
              {team.abbreviation} attempts
            </p>
            <p className="mt-1 whitespace-nowrap font-semibold text-white">
              {team.name}
            </p>
            <p className="mt-2 whitespace-nowrap text-sm tabular-nums text-slate-400">
              {shots.length} attempts · {goals} goals ·{" "}
              {expectedGoals.toFixed(2)} xG
            </p>
          </div>
        </div>
      </figcaption>

      <div className="flex flex-1 flex-col p-4">
        <svg
          viewBox="0 0 320 275"
          role="group"
          aria-label={`${team.name} offensive-zone shot map`}
          aria-describedby={instructionsId}
          className="h-auto w-full"
        >
          <path
            d="M10 10 H226 A84 84 0 0 1 310 94 V181 A84 84 0 0 1 226 265 H10 Z"
            fill="var(--surface-raised)"
            stroke="var(--border-strong)"
            strokeWidth="2"
          />
          <line
            x1={mapShotX(25)}
            y1={SHOT_RINK.top}
            x2={mapShotX(25)}
            y2={SHOT_RINK.top + SHOT_RINK.height}
            stroke="#2563eb"
            strokeWidth="2"
            opacity="0.55"
          />
          <line
            x1={mapShotX(89)}
            y1={SHOT_RINK.top + 2}
            x2={mapShotX(89)}
            y2={SHOT_RINK.top + SHOT_RINK.height - 2}
            stroke="#ef4444"
            strokeWidth="2"
            opacity="0.7"
          />
          <path
            d={`M${mapShotX(89)} ${SHOT_RINK.centerY - 12} C${mapShotX(95)} ${SHOT_RINK.centerY - 12} ${mapShotX(95)} ${SHOT_RINK.centerY + 12} ${mapShotX(89)} ${SHOT_RINK.centerY + 12}`}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
          />
          <path
            d={`M${mapShotX(89)} ${SHOT_RINK.centerY - 18} A18 18 0 0 0 ${mapShotX(89)} ${SHOT_RINK.centerY + 18}`}
            fill="color-mix(in srgb, #38bdf8 12%, transparent)"
            stroke="#38bdf8"
            strokeWidth="1.5"
            opacity="0.7"
          />
          <line
            x1={SHOT_RINK.left}
            y1={SHOT_RINK.top + 2}
            x2={SHOT_RINK.left}
            y2={SHOT_RINK.top + SHOT_RINK.height - 2}
            stroke="#ef4444"
            strokeWidth="3"
            opacity="0.75"
          />

          {[SHOT_RINK.centerY - 66, SHOT_RINK.centerY + 66].map((y) => (
            <g key={y} aria-hidden="true">
              <circle
                cx={mapShotX(69)}
                cy={y}
                r="45"
                fill="none"
                stroke="#ef4444"
                strokeWidth="1.25"
                opacity="0.35"
              />
              <circle
                cx={mapShotX(69)}
                cy={y}
                r="3"
                fill="#ef4444"
                opacity="0.65"
              />
            </g>
          ))}

          <text x="18" y="28" fill="var(--muted)" fontSize="9">
            CENTRE
          </text>
          <text
            x="300"
            y="28"
            fill="var(--muted)"
            fontSize="9"
            textAnchor="end"
          >
            ATTACKING →
          </text>

          {renderedShots.map((shot) => {
            const x = mapShotX(shot.adjustedXCoordinate!);
            const y = mapShotY(shot.adjustedYCoordinate!);
            const radius = shotRadius(shot.expectedGoal);
            const key = shotKey(shot);
            const navigationIndex = navigationIndexByKey.get(key)!;
            const isSelected = key === selectedShotId;
            return (
              <g
                key={key}
                role="button"
                tabIndex={key === activeShotId ? 0 : -1}
                aria-label={shotLabel(shot)}
                aria-pressed={isSelected}
                aria-describedby={instructionsId}
                className="workspace-shot-marker cursor-pointer"
                onClick={() => setSelectedShotId(key)}
                onFocus={() => setSelectedShotId(key)}
                onKeyDown={(event) =>
                  handleMarkerKeyDown(event, navigationIndex)
                }
                ref={(element) => {
                  if (element) {
                    markerRefs.current.set(key, element);
                  } else {
                    markerRefs.current.delete(key);
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
                    r={
                      shot.isGoal
                        ? goalOuterRadius(radius) + 2.5
                        : radius + 3.5
                    }
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
                  fill={shot.wasOnGoal ? color : "transparent"}
                  fillOpacity={shot.isGoal ? 0.95 : shot.wasOnGoal ? 0.3 : 0}
                  stroke={color}
                  strokeWidth={shot.isGoal ? 1.75 : 1.25}
                  strokeDasharray={!shot.wasOnGoal ? "2 2" : undefined}
                />
                {shot.isGoal ? (
                  <GoalMarker x={x} y={y} shotRadius={radius} />
                ) : null}
              </g>
            );
          })}
        </svg>

        <div
          id={instructionsId}
          className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500"
        >
          <LegendDot color={color} label="Missed" dashed />
          <LegendDot color={color} label="Saved" fillOpacity={0.3} />
          <LegendGoalMarker label="Goal" />
          <span>
            Marker size reflects expected-goal probability. Gold target markers
            identify goals. Tab into the map, then use arrow keys, Home, or End
            to inspect shots.
          </span>
          {plottedShots.length < shots.length ? (
            <span>
              {plottedShots.length} of {shots.length} attempts have coordinates
              and appear on the rink.
            </span>
          ) : null}
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
  fillOpacity = 0,
  dashed = false,
}: {
  color: string;
  label: string;
  fillOpacity?: number;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 rounded-full border"
        style={{
          borderColor: color,
          borderStyle: dashed ? "dashed" : "solid",
          backgroundColor:
            fillOpacity === 0
              ? "transparent"
              : `color-mix(in srgb, ${color} ${fillOpacity * 100}%, transparent)`,
        }}
      />
      {label}
    </span>
  );
}

function GoalMarker({
  x,
  y,
  shotRadius,
}: {
  x: number;
  y: number;
  shotRadius: number;
}) {
  const outerRadius = goalOuterRadius(shotRadius);
  const innerRadius = Math.max(shotRadius, 3.75);
  return (
    <>
      <circle
        cx={x}
        cy={y}
        r={outerRadius}
        fill="color-mix(in srgb, var(--chart-goal) 24%, transparent)"
        stroke="var(--chart-goal)"
        strokeWidth="2.25"
      />
      <circle
        cx={x}
        cy={y}
        r={innerRadius}
        fill="var(--chart-goal)"
        stroke="var(--chart-goal-center)"
        strokeWidth="1.25"
      />
      <circle
        cx={x}
        cy={y}
        r="1.6"
        fill="var(--chart-goal-center)"
      />
    </>
  );
}

function goalOuterRadius(shotRadius: number): number {
  return Math.max(shotRadius + 2.75, 7);
}

function LegendGoalMarker({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 overflow-visible"
      >
        <GoalMarker x={8} y={8} shotRadius={3.5} />
      </svg>
      {label}
    </span>
  );
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
