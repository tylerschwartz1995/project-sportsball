"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  FilterActions,
  FilterHeader,
} from "@/app/_components/filter-primitives";
import { countryNameWithCode } from "@/lib/country-name";
import { playerDirectoryClearHref } from "@/lib/player-directory-url";
import type { PlayerPositionFilter } from "@/lib/player-position";

type Option = {
  value: string;
  label: string;
};

type PlayerLocation = {
  country: string;
  region: string | null;
  city: string | null;
};

type PlayerDirectoryFiltersProps = {
  seasonId: number;
  phase: string;
  category: "skaters" | "goalies";
  query: string;
  position: PlayerPositionFilter;
  sort: string;
  direction: "asc" | "desc";
  sortOptions: Option[];
  locations: PlayerLocation[];
  filters: {
    minGames: string;
    minGoals: string;
    minAssists: string;
    minPoints: string;
    minWins: string;
    minSavePercentage: string;
    country: string;
    region: string;
    city: string;
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
  sortOptions,
  locations,
  filters,
}: PlayerDirectoryFiltersProps) {
  const [country, setCountry] = useState(filters.country);
  const [region, setRegion] = useState(filters.region);
  const [city, setCity] = useState(filters.city);
  const countries = useMemo(
    () => unique(locations.map((location) => location.country)),
    [locations],
  );
  const regions = useMemo(
    () =>
      country
        ? unique(
            locations
              .filter((location) => location.country === country)
              .map((location) => location.region),
          )
        : [],
    [country, locations],
  );
  const cities = useMemo(
    () =>
      country
        ? unique(
            locations
              .filter(
                (location) =>
                  location.country === country &&
                  (!region || location.region === region),
              )
              .map((location) => location.city),
          )
        : [],
    [country, locations, region],
  );
  const activeFilterCount = [
    query,
    category === "skaters" ? position : "",
    filters.minGames !== "0" ? filters.minGames : "",
    filters.minGoals !== "0" ? filters.minGoals : "",
    filters.minAssists !== "0" ? filters.minAssists : "",
    filters.minPoints !== "0" ? filters.minPoints : "",
    filters.minWins !== "0" ? filters.minWins : "",
    filters.minSavePercentage !== "0" ? filters.minSavePercentage : "",
    filters.country,
    filters.region,
    filters.city,
  ].filter(Boolean).length;
  const advancedFilterCount = [
    filters.minGames !== "0" ? filters.minGames : "",
    filters.minGoals !== "0" ? filters.minGoals : "",
    filters.minAssists !== "0" ? filters.minAssists : "",
    filters.minPoints !== "0" ? filters.minPoints : "",
    filters.minWins !== "0" ? filters.minWins : "",
    filters.minSavePercentage !== "0" ? filters.minSavePercentage : "",
    filters.country,
    filters.region,
    filters.city,
  ].filter(Boolean).length;

  return (
    <form action="/players" method="get" className="workspace-player-filters">
      <input type="hidden" name="season" value={seasonId} />
      <input type="hidden" name="phase" value={phase} />

      <FilterHeader
        title="Filter Players"
        description="Search by name or choose a position. Open advanced filters only when you need them."
        activeCount={activeFilterCount}
      />

      <fieldset
        className={`workspace-player-filter-group is-primary${category === "skaters" ? " has-position" : ""}`}
      >
        <legend>Find Players</legend>
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
            <select name="type" defaultValue={category}>
              <option value="skaters">Skaters</option>
              <option value="goalies">Goalies</option>
            </select>
          </label>
          {category === "skaters" ? (
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

      <details
        className="workspace-player-advanced-filters"
        open={advancedFilterCount > 0 || undefined}
      >
        <summary>
          <span>
            <strong>Advanced Filters</strong>
            <small>Season totals, birthplace, and compact-screen sorting</small>
          </span>
          <b>
            {advancedFilterCount > 0
              ? `${advancedFilterCount} active`
              : "Optional"}
          </b>
        </summary>
        <div>
          <fieldset className="workspace-player-filter-group">
            <legend>Minimum Season Totals</legend>
            <div>
              <NumberFilter
                label="Games Played"
                name="minGames"
                value={filters.minGames}
              />
              {category === "skaters" ? (
                <>
                  <NumberFilter
                    label="Goals"
                    name="minGoals"
                    value={filters.minGoals}
                  />
                  <NumberFilter
                    label="Assists"
                    name="minAssists"
                    value={filters.minAssists}
                  />
                  <NumberFilter
                    label="Points"
                    name="minPoints"
                    value={filters.minPoints}
                  />
                </>
              ) : (
                <>
                  <NumberFilter
                    label="Wins"
                    name="minWins"
                    value={filters.minWins}
                  />
                  <label>
                    Save Percentage
                    <input
                      type="number"
                      name="minSavePercentage"
                      min="0"
                      max="1"
                      step="0.001"
                      defaultValue={filters.minSavePercentage}
                    />
                  </label>
                </>
              )}
            </div>
          </fieldset>

          <fieldset className="workspace-player-filter-group">
            <legend>Birthplace</legend>
            <div>
              <label className="is-country">
                Country
                <select
                  name="country"
                  value={country}
                  onChange={(event) => {
                    setCountry(event.target.value);
                    setRegion("");
                    setCity("");
                  }}
                >
                  <option value="">All Countries</option>
                  {countries.map((option) => (
                    <option key={option} value={option}>
                      {countryNameWithCode(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Province / State
                <select
                  name="region"
                  value={region}
                  disabled={!country}
                  onChange={(event) => {
                    setRegion(event.target.value);
                    setCity("");
                  }}
                >
                  <option value="">
                    {country
                      ? "All Provinces / States"
                      : "Choose Country First"}
                  </option>
                  {regions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                City
                <select
                  name="city"
                  value={city}
                  disabled={!country}
                  onChange={(event) => setCity(event.target.value)}
                >
                  <option value="">
                    {country ? "All Cities" : "Choose Country First"}
                  </option>
                  {cities.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="workspace-player-filter-group workspace-directory-sort md:hidden">
            <legend>Sort Results</legend>
            <div>
              <label>
                Sort By
                <select name="sort" defaultValue={sort}>
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
        </div>
      </details>

      <FilterActions
        clearHref={playerDirectoryClearHref({
          seasonId,
          phase,
          category,
          sort,
          direction,
        })}
        canClear={activeFilterCount > 0}
        applyLabel="Show Players"
      >
        <Link
          href={`/players/compare?season=${seasonId}&phase=${phase}&type=${category}`}
          className="workspace-player-compare-link"
        >
          Compare Players →
        </Link>
      </FilterActions>
    </form>
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

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .sort((left, right) => left.localeCompare(right));
}
