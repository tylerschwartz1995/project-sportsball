"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { PlayerComparisonOption } from "@/contracts/player-comparison-view";
import {
  findPlayerComparisonOptions,
  playerComparisonHref,
} from "@/lib/player-comparison";
import { formatPlayerPosition } from "@/lib/player-position";

export function PlayerComparisonPicker({
  options,
  initialPlayerIds,
  seasonId,
  phase,
  category,
}: {
  options: PlayerComparisonOption[];
  initialPlayerIds: number[];
  seasonId: number;
  phase: string;
  category: "skaters" | "goalies";
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(initialPlayerIds);
  const [isPending, startTransition] = useTransition();

  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.nhlPlayerId, option])),
    [options],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("en-CA");
  const matches = useMemo(
    () => findPlayerComparisonOptions(options, selectedIds, query),
    [options, query, selectedIds],
  );

  function updateSelection(nextIds: number[]) {
    setSelectedIds(nextIds);
    setQuery("");
    startTransition(() => {
      router.replace(
        playerComparisonHref({
          seasonId,
          phase,
          category,
          playerIds: nextIds,
        }),
        { scroll: false },
      );
    });
  }

  return (
    <section className="workspace-player-picker">
      <details open={selectedIds.length < 2}><summary>Edit Players</summary>
      <div className="workspace-player-picker-search">
        <label>
          Find a {category === "skaters" ? "skater" : "goalie"}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, position, or team"
            disabled={selectedIds.length >= 4}
          />
        </label>
        {matches.length > 0 ? (
          <details className="workspace-player-picker-suggestions" open={Boolean(normalizedQuery) || selectedIds.length < 2}>
            <summary>{normalizedQuery ? "Search Results" : "Suggested Players"}</summary>
            <div className="workspace-player-picker-results">
              {matches.map((option) => (
                <button
                  key={option.nhlPlayerId}
                  type="button"
                  disabled={selectedIds.length >= 4}
                  onClick={() =>
                    updateSelection([...selectedIds, option.nhlPlayerId])
                  }
                >
                  <strong>{option.name}</strong>
                  <span>
                    {formatPlayerPosition(option.position, "Player")}
                    {option.teamAbbreviations.length > 0
                      ? ` · ${option.teamAbbreviations.join(" / ")}`
                      : ""}
                  </span>
                </button>
              ))}
            </div>
          </details>
        ) : normalizedQuery ? (
          <p className="workspace-player-picker-no-results">
            No unselected players match this search.
          </p>
        ) : null}
      </div>

      </details>
      <ol
        className="workspace-player-picker-selected"
        aria-label="Selected players"
      >
        {Array.from({ length: 4 }, (_, index) => {
          const playerId = selectedIds[index];
          if (playerId !== undefined) {
            const player = optionsById.get(playerId);
            if (!player) return null;
            return (
              <li key={playerId} className="is-filled">
                <span>{index + 1}</span>
                <div>
                  <strong>{player.name}</strong>
                  <small>
                    {formatPlayerPosition(player.position, "Player")}
                  </small>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${player.name}`}
                  onClick={() =>
                    updateSelection(selectedIds.filter((id) => id !== playerId))
                  }
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                </button>
              </li>
            );
          }
          return null;
        })}
      </ol>

      <div className="workspace-player-picker-actions">
        <div aria-live="polite">
          <strong>
            {isPending
              ? "Updating comparison…"
              : selectedIds.length >= 2
                ? ""
                : `Choose ${2 - selectedIds.length} more player${selectedIds.length === 0 ? "s" : ""}`}
          </strong>
        </div>
        <button
          type="button"
          disabled={selectedIds.length === 0}
          onClick={() => updateSelection([])}
        >
          Clear Comparison
        </button>
      </div>
    </section>
  );
}
