import Link from "next/link";

type Option = {
  value: string;
  label: string;
};

type PlayerDirectoryFiltersProps = {
  seasonId: number;
  phase: string;
  category: "skaters" | "goalies";
  query: string;
  sort: string;
  direction: "asc" | "desc";
  sortOptions: Option[];
  countries: string[];
  regions: string[];
  cities: string[];
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
  countries,
  regions,
  cities,
  filters,
}: PlayerDirectoryFiltersProps) {
  return (
    <form
      action="/players"
      method="get"
      className="workspace-directory-controls workspace-player-filters"
    >
      <input type="hidden" name="season" value={seasonId} />
      <input type="hidden" name="phase" value={phase} />

      <label>
        Search
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Player name or position"
        />
      </label>
      <label>
        Player Type
        <select name="type" defaultValue={category}>
          <option value="skaters">Skaters</option>
          <option value="goalies">Goalies</option>
        </select>
      </label>
      <label className="workspace-directory-sort md:hidden">
        Sort By
        <select name="sort" defaultValue={sort}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="workspace-directory-sort md:hidden">
        Direction
        <select name="dir" defaultValue={direction}>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>

      <label>
        Min Games
        <input
          type="number"
          name="minGames"
          min="0"
          defaultValue={filters.minGames}
        />
      </label>
      {category === "skaters" ? (
        <>
          <label>
            Min Goals
            <input
              type="number"
              name="minGoals"
              min="0"
              defaultValue={filters.minGoals}
            />
          </label>
          <label>
            Min Assists
            <input
              type="number"
              name="minAssists"
              min="0"
              defaultValue={filters.minAssists}
            />
          </label>
          <label>
            Min Points
            <input
              type="number"
              name="minPoints"
              min="0"
              defaultValue={filters.minPoints}
            />
          </label>
        </>
      ) : (
        <>
          <label>
            Min Wins
            <input
              type="number"
              name="minWins"
              min="0"
              defaultValue={filters.minWins}
            />
          </label>
          <label>
            Min Save %
            <input
              type="number"
              name="minSavePercentage"
              min="0"
              max="1"
              step="0.001"
              placeholder="0.900"
              defaultValue={filters.minSavePercentage}
            />
          </label>
        </>
      )}

      <FilterSelect
        label="Country"
        name="country"
        value={filters.country}
        options={countries}
      />
      <FilterSelect
        label="Province / State"
        name="region"
        value={filters.region}
        options={regions}
      />
      <FilterSelect
        label="City"
        name="city"
        value={filters.city}
        options={cities}
      />

      <button type="submit">Apply</button>
      <Link
        href={`/players?season=${seasonId}&phase=${phase}&type=${category}`}
        className="workspace-directory-reset"
      >
        Reset
      </Link>
    </form>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: string[];
}) {
  return (
    <label>
      {label}
      <select name={name} defaultValue={value}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
