"use client";

import {
  skaterSortOptions,
  goalieSortOptions,
} from "@/lib/player-sort-options";
import { FilterForm } from "@/components/ui/filter-form";
import { useState } from "react";

import {
  FilterActions,
  FilterHeader,
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
  filters: {
    minGames: string;
  };
};

export function PlayerDirectoryFilters({
  seasonId,
  phase,
  category,
  query,
  position,
  sort,
  direction,
  filters,
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
    filters.minGames !== "0" ? filters.minGames : "",
  ].filter(Boolean).length;

  return (
    <FilterForm action="/players" className="workspace-player-filters">
      <input type="hidden" name="season" value={seasonId} />
      <input type="hidden" name="phase" value={phase} />

      {activeFilterCount > 0 ? (
        <FilterHeader
          title="Active Filters"
          description="Choose filters, then Apply Filters."
          activeCount={activeFilterCount}
        />
      ) : null}

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
              placeholder="e.g. Connor McDavid"
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

      <div className="workspace-player-filter-group max-w-40"><NumberFilter label="Minimum Games" name="minGames" value={filters.minGames} /></div>

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
      <FilterActions
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

function NumberFilter({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label>
      {label}
      <input type="number" name={name} min="0" defaultValue={value} />
    </label>
  );
}
