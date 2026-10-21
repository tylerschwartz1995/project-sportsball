"use client";

import {
  skaterSortOptions,
  goalieSortOptions,
} from "@/lib/player-sort-options";
import { FilterForm } from "@/components/ui/filter-form";
import { useState } from "react";

import {
  FilterActions,
} from "@/components/ui/filter-primitives";
import { playerDirectoryClearHref } from "@/lib/player-directory-url";
import type { PlayerPositionFilter } from "@/lib/player-position";

type PlayerDirectoryFiltersProps = {
  seasonId: number;
  phase: string;
  category: "skaters" | "goalies";
  query: string;
  position: PlayerPositionFilter;
  sort: string;
  direction: "asc" | "desc";
};

export function PlayerDirectoryFilters({
  seasonId,
  phase,
  category,
  query,
  position,
  sort,
  direction,
}: PlayerDirectoryFiltersProps) {
  const [draftCategory, setDraftCategory] = useState(category);
  const sortOptions =
    draftCategory === "goalies" ? goalieSortOptions : skaterSortOptions;
  const selectedSort = sortOptions.some((option) => option.value === sort)
    ? sort
    : draftCategory === "goalies"
      ? "savePercentage"
      : "points";
  const activeFilterCount = [
    query,
    category === "skaters" ? position : "",
  ].filter(Boolean).length;

  return (
    <FilterForm autoApply action="/players" className="workspace-player-filters reference-player-filters">
      <input type="hidden" name="season" value={seasonId} />
      <input type="hidden" name="phase" value={phase} />

      <fieldset
        className={`workspace-player-filter-group is-primary${draftCategory === "skaters" ? " has-position" : ""}`}
      >
        <legend className="sr-only">Find Players</legend>
        <div>
          <label className="is-wide">
            Player Search
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search by name…"
            />
          </label>
          <label>
            Player Type
            <select
              name="type"
              value={draftCategory}
              onChange={(event) =>
                setDraftCategory(event.target.value as "skaters" | "goalies")
              }
            >
              <option value="skaters">Skaters</option>
              <option value="goalies">Goalies</option>
            </select>
          </label>
          {draftCategory === "skaters" ? (
            <label>
              Position
              <select name="position" defaultValue={position}>
                <option value="">All Positions</option>
                <option value="F">Forwards</option>
                <option value="D">Defensemen</option>
                <option value="C">Centers</option>
                <option value="R">Right Wings</option>
                <option value="L">Left Wings</option>
              </select>
            </label>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="workspace-player-filter-group workspace-directory-sort md:hidden">
        <legend>Sort Results</legend>
        <div>
          <label>
            Sort By
            <select key={draftCategory} name="sort" defaultValue={selectedSort}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Direction
            <select name="dir" defaultValue={direction}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </div>
      </fieldset>
      <FilterActions autoApply
        clearHref={playerDirectoryClearHref({
          seasonId,
          phase,
          category,
          sort,
          direction,
        })}
        canClear={activeFilterCount > 0}
      />

    </FilterForm>
  );
}
