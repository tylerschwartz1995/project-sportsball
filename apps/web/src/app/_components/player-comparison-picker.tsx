"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { PlayerComparisonOption } from "@/contracts/player-comparison-view";
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
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(initialPlayerIds);
  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.nhlPlayerId, option])),
    [options],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("en-CA");
  const matches = useMemo(
    () =>
      normalizedQuery.length < 2
        ? []
        : options
            .filter(
              (option) =>
                !selectedIds.includes(option.nhlPlayerId) &&
                `${option.name} ${option.position ?? ""} ${formatPlayerPosition(
                  option.position,
                  "",
                )}`
                  .toLocaleLowerCase("en-CA")
                  .includes(normalizedQuery),
            )
            .slice(0, 8),
    [normalizedQuery, options, selectedIds],
  );
  const compareHref = `/players/compare?season=${seasonId}&phase=${phase}&type=${category}&players=${selectedIds.join(",")}`;

  return (
    <section className="workspace-player-picker">
      <div className="workspace-player-picker-heading">
        <div>
          <p>Comparison Lineup</p>
          <h3>Choose Two to Four Players</h3>
        </div>
        <span>{selectedIds.length} / 4 selected</span>
      </div>

      <div className="workspace-player-picker-search">
        <label>
          Find a {category === "skaters" ? "skater" : "goalie"}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type at least two letters"
          />
        </label>
        {matches.length > 0 ? (
          <div className="workspace-player-picker-results">
            {matches.map((option) => (
              <button
                key={option.nhlPlayerId}
                type="button"
                disabled={selectedIds.length >= 4}
                onClick={() => {
                  setSelectedIds((current) => [
                    ...current,
                    option.nhlPlayerId,
                  ]);
                  setQuery("");
                }}
              >
                <strong>{option.name}</strong>
                <span>{formatPlayerPosition(option.position, "Player")}</span>
              </button>
            ))}
          </div>
        ) : normalizedQuery.length >= 2 ? (
          <p className="workspace-player-picker-no-results">
            No unselected players match this search.
          </p>
        ) : null}
      </div>

      <div className="workspace-player-picker-selected">
        {selectedIds.length > 0 ? (
          selectedIds.map((playerId) => {
            const player = optionsById.get(playerId);
            if (!player) return null;
            return (
              <span key={playerId}>
                <strong>{player.name}</strong>
                <small>{formatPlayerPosition(player.position, "Player")}</small>
                <button
                  type="button"
                  aria-label={`Remove ${player.name}`}
                  onClick={() =>
                    setSelectedIds((current) =>
                      current.filter((id) => id !== playerId),
                    )
                  }
                >
                  ×
                </button>
              </span>
            );
          })
        ) : (
          <p>Search above to build a comparison.</p>
        )}
      </div>

      <div className="workspace-player-picker-actions">
        {selectedIds.length >= 2 ? (
          <Link href={compareHref}>Compare Selected</Link>
        ) : (
          <span>Select at least two players</span>
        )}
        <button
          type="button"
          disabled={selectedIds.length === 0}
          onClick={() => setSelectedIds([])}
        >
          Clear
        </button>
      </div>
    </section>
  );
}
