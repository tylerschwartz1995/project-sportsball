"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import type {
  MoneyPuckGameTeam,
  MoneyPuckShot,
} from "@/contracts/advanced-game";
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
  const awayShots = shots.filter(shot => shot.shootingTeam.nhlTeamId === awayTeam.nhlTeamId);
  const homeShots = shots.filter(shot => shot.shootingTeam.nhlTeamId === homeTeam.nhlTeamId);
  const awayHeat = buildHeat(awayShots);
  const homeHeat = buildHeat(homeShots);
  const peak = Math.max(0, ...awayHeat.map(cell => cell.value), ...homeHeat.map(cell => cell.value));
  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-label="Team expected-goal heatmaps">
      <TeamShotMap key={awayTeam.nhlTeamId} team={awayTeam} shots={awayShots} heat={awayHeat} peak={peak} />
      <TeamShotMap key={homeTeam.nhlTeamId} team={homeTeam} shots={homeShots} heat={homeHeat} peak={peak} />
    </section>
  );
}

function TeamShotMap({
  team,
  shots,
  heat,
  peak,
}: {
  team: MoneyPuckGameTeam;
  shots: MoneyPuckShot[];
  heat: ReturnType<typeof buildHeat>;
  peak: number;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const markerRefs = useRef(new Map<string, SVGGElement>());
  const instructionsId = useId();
  const clipId = useId();
  const smoothingId = useId();
  const plottedShots = shots.filter(
    (shot) =>
      shot.isGoal && shot.adjustedXCoordinate !== null && shot.adjustedYCoordinate !== null,
  );
  const renderedShots = [
    ...plottedShots.filter((shot) => !shot.isGoal),
    ...plottedShots.filter((shot) => shot.isGoal),
  ];
  const navigationIndexByKey = new Map(
    plottedShots.map((shot, index) => [shotKey(shot), index]),
  );
  const goals = shots.filter((shot) => shot.isGoal).length;
  const shotsOnGoal = shots.filter((shot) => shot.wasOnGoal || shot.isGoal).length;
  const expectedGoals = sumExpectedGoals(shots);

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
      setDetailsOpen(true);
    }
  }

  return (
    <figure className="modern-shot-map surface-panel flex h-full flex-col overflow-hidden">
      <figcaption className="border-b border-[var(--border)] px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeamLogo {...team} size="compact" decorative />
          <div className="min-w-0">
            <p className="mt-1 whitespace-nowrap font-semibold text-[var(--foreground)]">
              {team.name}
            </p>
            <p className="mt-2 text-sm tabular-nums text-[var(--muted)]">
              {shots.length} attempts · {shotsOnGoal} SOG · {goals} goals ·{" "}
              {expectedGoals.toFixed(2)} xG
            </p>
          </div>
        </div>
      </figcaption>

      <div className="flex flex-1 flex-col p-4">
        <svg
          viewBox="0 0 320 275"
          role="group"
          aria-label={`${team.name} expected-goal heatmap`}
          aria-describedby={instructionsId}
          className="reference-shot-rink w-full"
        >
          <path
            d="M10 10 H226 A84 84 0 0 1 310 94 V181 A84 84 0 0 1 226 265 H10 Z"
            fill="var(--heat-ice)"
            stroke="var(--heat-ice-border)"
            strokeWidth="2"
          />
          <defs><clipPath id={clipId}><path d="M10 10 H226 A84 84 0 0 1 310 94 V181 A84 84 0 0 1 226 265 H10 Z" /></clipPath><filter id={smoothingId} x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.2" /></filter></defs>
          <g clipPath={`url(#${clipId})`} aria-hidden="true" pointerEvents="none"><g filter={`url(#${smoothingId})`}>
            {heat.map(cell => cell.value > 0 && peak > 0 ? <rect key={cell.x + ":" + cell.y}
              x={cell.x} y={cell.y} width={4.15} height={4.15}
              fill={heatColor(cell.value / peak)} opacity={Math.min(0.96, cell.value / peak * 12)} /> : null)}
          </g></g>
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
            const radius = 3;
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
                onClick={() => { setSelectedShotId(key); setDetailsOpen(true); }}
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
                      radius + 2.5
                    }
                    fill="none"
                    stroke="var(--foreground)"
                    strokeWidth="1.5"
                    opacity="0.95"
                  />
                ) : null}
                <PuckMarker x={x} y={y} />

              </g>
            );
          })}
        </svg>

        <div
          id={instructionsId}
          className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--muted)]"
        >
          <span className="inline-flex items-center gap-2">Less xG
            <span className="inline-block h-2 w-24 rounded" style={{ background: "linear-gradient(to right, var(--heat-low), var(--heat-mid), var(--heat-high), var(--heat-peak))" }} />
            More xG
          </span>
          <span className="inline-flex items-center gap-2"><svg aria-hidden="true" viewBox="-7 -7 14 14" className="h-4 w-4"><PuckMarker x={0} y={0} /></svg>Goal</span>

        </div>

        {detailsOpen && selectedShot ? <ShotPopup shot={selectedShot} team={team} onClose={() => setDetailsOpen(false)} /> : null}
      </div>
    </figure>
  );
}

function PuckMarker({ x, y }: { x: number; y: number }) {
  return <g aria-hidden="true">
    <ellipse cx={x} cy={y + 1} rx={4.5} ry={3.2} fill="var(--heat-puck)" stroke="var(--heat-puck-outline)" strokeWidth="0.9" />
    <ellipse cx={x} cy={y - 0.6} rx={4.5} ry={2.5} fill="var(--heat-puck)" stroke="var(--heat-puck-outline)" strokeWidth="0.9" />
    <path d={`M${x - 2.5} ${y - 1} Q${x} ${y - 2.4} ${x + 2.5} ${y - 1}`} fill="none" stroke="var(--heat-puck-highlight)" strokeWidth="0.65" />
  </g>;
}

function ShotPopup({ shot, team, onClose }: {
  shot: MoneyPuckShot;
  team: MoneyPuckGameTeam;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return <dialog ref={dialogRef} aria-labelledby={titleId}
    className="reference-shot-popup"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    } }}>
    <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
      <h2 id={titleId} className="font-semibold">Shot Details</h2>
      <button type="button" onClick={onClose} aria-label="Close shot details" className="px-3 py-2">✕</button>
    </header>
    <div className="p-4"><ShotDetails shot={shot} team={team} /></div>
  </dialog>;
}

function ShotDetails({
  shot,
  team,
}: {
  shot: MoneyPuckShot | null;
  team: MoneyPuckGameTeam;
}) {
  if (!shot) return null;

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
      className="reference-shot-details"
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

function heatColor(intensity: number): string {
  const stops = ["var(--heat-low)", "var(--heat-mid)", "var(--heat-high)", "var(--heat-peak)"];
  const scaled = Math.max(0, Math.min(1, intensity)) * 3;
  const index = Math.min(2, Math.floor(scaled));
  return `color-mix(in srgb, ${stops[index]} ${(1 - (scaled - index)) * 100}%, ${stops[index + 1]})`;
}

// Five-foot Gaussian smoothing on a fixed grid; both teams share the same peak.
function buildHeat(shots: MoneyPuckShot[]) {
  const modeled = shots.filter(shot => shot.adjustedXCoordinate != null &&
    shot.adjustedYCoordinate != null && shot.expectedGoal != null);
  const cells: { x: number; y: number; value: number }[] = [];
  for (let y = 10; y < 265; y += 4) {
    for (let x = 10; x < 310; x += 4) {
      let value = 0;
      for (const shot of modeled) {
        const distanceSquared = (x + 2 - mapShotX(shot.adjustedXCoordinate!)) ** 2 +
          (y + 2 - mapShotY(shot.adjustedYCoordinate!)) ** 2;
        if (distanceSquared <= 45 ** 2) value += shot.expectedGoal! * Math.exp(-distanceSquared / (2 * 15 ** 2));
      }
      cells.push({ x, y, value });
    }
  }
  return cells;
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
