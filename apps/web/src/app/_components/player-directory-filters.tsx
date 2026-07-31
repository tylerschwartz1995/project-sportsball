"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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

  return (
    <form action="/players" method="get" className="workspace-player-filters">
      <input type="hidden" name="season" value={seasonId} />
      <input type="hidden" name="phase" value={phase} />

      <fieldset className="workspace-player-filter-group is-primary">
        <legend>Find Players</legend>
        <p>Search by name or position, then choose the player group.</p>
        <div>
          <label className="is-wide">
            Player Search
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="e.g. Connor McDavid or defense"
            />
          </label>
          <label>
            Player Type
            <select name="type" defaultValue={category}>
              <option value="skaters">Skaters</option>
              <option value="goalies">Goalies</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="workspace-player-filter-group">
        <legend>Minimum Season Totals</legend>
        <p>Only show players who meet every entered threshold.</p>
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
                  placeholder=".900"
                  defaultValue={filters.minSavePercentage}
                />
              </label>
            </>
          )}
        </div>
      </fieldset>

      <fieldset className="workspace-player-filter-group">
        <legend>Birthplace</legend>
        <p>
          Choose a country first; province/state and city then narrow to valid
          locations.
        </p>
        <div>
          <label>
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
                  {formatCountry(option)}
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
                {country ? "All Provinces / States" : "Choose Country First"}
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

      <div className="workspace-player-filter-actions">
        <button type="submit">Show Players</button>
        <Link
          href={`/players?season=${seasonId}&phase=${phase}&type=${category}`}
          className="workspace-directory-reset"
        >
          Clear Filters
        </Link>
        <Link
          href={`/players/compare?season=${seasonId}&phase=${phase}&type=${category}`}
          className="workspace-player-compare-link"
        >
          Compare Players →
        </Link>
      </div>
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

function formatCountry(country: string): string {
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(country);
    return name && name !== country ? `${name} (${country})` : country;
  } catch {
    return country;
  }
}
