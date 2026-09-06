"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

import type {
  MoneyPuckGameTeam,
  MoneyPuckShot,
} from "@/contracts/advanced-game";
import { useUrlChoice } from "@/components/ui/use-shareable-state";
import { TeamLogo } from "@/features/teams/team-logo";
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
  const [period, setPeriod] = useUrlChoice(
    "shotPeriod",
    ["all", ...new Set(shots.map((shot) => String(shot.period)))],
    "all",
  );
  const [result, setResult] = useUrlChoice(
    "shotResult",
    ["all", "goal", "saved", "missed"],
    "all",
  );
  const shooters = [
    ...new Set(
      shots
        .map((shot) => shot.shooter?.name)
        .filter((name): name is string => Boolean(name)),
    ),
  ].sort();
  const [shooter, setShooter] = useUrlChoice(
    "shotShooter",
    ["all", ...shooters],
    "all",
  );
  const filtered = shots.filter(
    (shot) =>
      (period === "all" || String(shot.period) === period) &&
      (shooter === "all" || shot.shooter?.name === shooter) &&
      (result === "all" ||
        (result === "goal"
          ? shot.isGoal
          : result === "saved"
            ? shot.wasOnGoal && !shot.isGoal
            : !shot.wasOnGoal && !shot.isGoal)),
  );
  return (
    <section>
      <div className="ux-shot-filters">
        <label>
          Period
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="all">All Periods</option>
            {[...new Set(shots.map((shot) => shot.period))]
              .sort((a, b) => a - b)
              .map((value) => (
                <option key={value} value={value}>
                  Period {value}
                </option>
              ))}
          </select>
        </label>
        <label>
          Shot Result
          <select
            value={result}
            onChange={(event) =>
              setResult(
                event.target.value as "all" | "goal" | "saved" | "missed",
              )
            }
          >
            <option value="all">All Results</option>
            <option value="goal">Goals</option>
            <option value="saved">Saved</option>
            <option value="missed">Missed</option>
          </select>
        </label>
        <label>
          Shooter
          <select
            value={shooter}
            onChange={(event) => setShooter(event.target.value)}
          >
            <option value="all">All Shooters</option>
            {shooters.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="ux-chart-reading">
        {filtered.length} of {shots.length} attempts shown. Map totals reflect
        these filters. Use the shot list below each rink to select overlapping
        attempts.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        <TeamShotMap
          key={`away-${period}-${result}-${shooter}`}
          team={awayTeam}
          shots={filtered.filter(
            (shot) => shot.shootingTeam.nhlTeamId === awayTeam.nhlTeamId,
          )}
          accent="cyan"
        />
        <TeamShotMap
          key={`home-${period}-${result}-${shooter}`}
          team={homeTeam}
          shots={filtered.filter(
            (shot) => shot.shootingTeam.nhlTeamId === homeTeam.nhlTeamId,
          )}
          accent="violet"
        />
      </div>
    </section>
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
      shot.adjustedXCoordinate !== null && shot.adjustedYCoordinate !== null,
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
  const color =
    accent === "cyan" ? "var(--chart-primary)" : "var(--chart-secondary)";
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
    <figure className="modern-shot-map surface-panel flex h-full flex-col overflow-hidden">
      <figcaption className="border-b border-[var(--border)] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <TeamLogo {...team} size="compact" decorative />
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              {team.abbreviation} attempts
            </p>
            <p className="mt-1 whitespace-nowrap font-semibold text-[var(--foreground)]">
              {team.name}
            </p>
            <p className="mt-2 whitespace-nowrap text-sm tabular-nums text-[var(--muted)]">
              {shots.length} attempts · {goals} goals ·{" "}
              {expectedGoals.toFixed(2)} xG
            </p>
          </div>
        </div>
      </figcaption>

      <div className="flex flex-1 flex-col p-4">
        <div className="modern-shot-orientation" aria-hidden="true">
          <span>CENTRE</span>
          <span>ATTACKING →</span>
        </div>
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
            stroke="var(--rink-line-blue)"
            strokeWidth="2"
            opacity="0.55"
          />
          <line
            x1={mapShotX(89)}
            y1={SHOT_RINK.top + 2}
            x2={mapShotX(89)}
            y2={SHOT_RINK.top + SHOT_RINK.height - 2}
            stroke="var(--rink-line-red)"
            strokeWidth="2"
            opacity="0.7"
          />
          <path
            d={`M${mapShotX(89)} ${SHOT_RINK.centerY - 12} C${mapShotX(95)} ${SHOT_RINK.centerY - 12} ${mapShotX(95)} ${SHOT_RINK.centerY + 12} ${mapShotX(89)} ${SHOT_RINK.centerY + 12}`}
            fill="none"
            stroke="var(--rink-line-red)"
            strokeWidth="2"
          />
          <path
            d={`M${mapShotX(89)} ${SHOT_RINK.centerY - 18} A18 18 0 0 0 ${mapShotX(89)} ${SHOT_RINK.centerY + 18}`}
            fill="color-mix(in srgb, var(--rink-crease) 12%, transparent)"
            stroke="var(--rink-crease)"
            strokeWidth="1.5"
            opacity="0.7"
          />
          <line
            x1={SHOT_RINK.left}
            y1={SHOT_RINK.top + 2}
            x2={SHOT_RINK.left}
            y2={SHOT_RINK.top + SHOT_RINK.height - 2}
            stroke="var(--rink-line-red)"
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
                stroke="var(--rink-line-red)"
                strokeWidth="1.25"
                opacity="0.35"
              />
              <circle
                cx={mapShotX(69)}
                cy={y}
                r="3"
                fill="var(--rink-line-red)"
                opacity="0.65"
              />
            </g>
          ))}

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
                      shot.isGoal ? goalOuterRadius(radius) + 2.5 : radius + 3.5
                    }
                    fill="none"
                    stroke="var(--foreground)"
                    strokeWidth="1.5"
                    opacity="0.95"
                  />
                ) : null}
                {shot.isGoal ? (
                  <GoalMarker x={x} y={y} shotRadius={radius} />
                ) : (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill={shot.wasOnGoal ? color : "transparent"}
                    fillOpacity={shot.wasOnGoal ? 0.3 : 0}
                    stroke={color}
                    strokeWidth="1.25"
                    strokeDasharray={!shot.wasOnGoal ? "2 2" : undefined}
                  />
                )}
              </g>
            );
          })}
        </svg>

        <div
          id={instructionsId}
          className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--muted)]"
        >
          <LegendDot color={color} label="Missed" dashed />
          <LegendDot color={color} label="Saved" fillOpacity={0.3} />
          <LegendGoalMarker label="Goal" />
          <span>
            Marker size reflects expected-goal probability. Green puck halos
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

        <label className="ux-chart-subject">
          Select an Attempt
          <select
            value={selectedShotId ?? ""}
            onChange={(event) => setSelectedShotId(event.target.value || null)}
          >
            <option value="">Choose an attempt</option>
            {shots.map((shot) => (
              <option key={shotKey(shot)} value={shotKey(shot)}>
                P{shot.period} ·{" "}
                {formatMoneyPuckPeriodClock(shot.gameTimeSeconds, shot.period)}{" "}
                · {shot.shooter?.name ?? "Unknown shooter"} ·{" "}
                {shot.isGoal ? "Goal" : shot.wasOnGoal ? "Saved" : "Missed"}
              </option>
            ))}
          </select>
        </label>
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
      <p className="mt-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--muted)]">
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
      className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            Selected shot
          </p>
          <p className="mt-1 font-semibold text-[var(--foreground)]">
            {shot.shooter?.name ?? "Unknown shooter"}
          </p>
        </div>
        <span
          className={
            shot.isGoal
              ? "rounded-full bg-[var(--positive-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--positive)]"
              : "rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground-soft)]"
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
              className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]"
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
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 tabular-nums text-[var(--foreground-soft)]">{value}</dd>
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
  const puckRadius = Math.max(shotRadius, 4.25);
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
      <ellipse
        cx={x}
        cy={y}
        rx={puckRadius}
        ry={puckRadius * 0.72}
        fill="var(--chart-puck)"
        stroke="var(--chart-puck-highlight)"
        strokeWidth="1.25"
      />
      <path
        d={`M${x - puckRadius * 0.65} ${y - puckRadius * 0.28} Q${x} ${y - puckRadius * 0.65} ${x + puckRadius * 0.65} ${y - puckRadius * 0.28}`}
        fill="none"
        stroke="var(--chart-puck-highlight)"
        strokeWidth="0.9"
        opacity="0.8"
      />
    </>
  );
}

function goalOuterRadius(shotRadius: number): number {
  return Math.max(shotRadius + 3.5, 8);
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
