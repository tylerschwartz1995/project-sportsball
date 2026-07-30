import Link from "next/link";

type SelectOption = {
  value: string;
  label: string;
};

type DirectoryControlsProps = {
  action: string;
  seasonId: number;
  query: string;
  sort: string;
  sortOptions: SelectOption[];
  direction: "asc" | "desc";
  category?: string;
  categoryOptions?: SelectOption[];
  searchPlaceholder: string;
  alwaysShowSort?: boolean;
};

export function DirectoryControls({
  action,
  seasonId,
  query,
  sort,
  sortOptions,
  direction,
  category,
  categoryOptions,
  searchPlaceholder,
  alwaysShowSort = false,
}: DirectoryControlsProps) {
  return (
    <form
      action={action}
      method="get"
      className="workspace-directory-controls"
    >
      <input type="hidden" name="season" value={seasonId} />
      <label>
        Search
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={searchPlaceholder}
        />
      </label>

      {categoryOptions && category ? (
        <label>
          Player type
          <select
            name="type"
            defaultValue={category}
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label
        className={`workspace-directory-sort ${
          alwaysShowSort ? "" : "md:hidden"
        }`}
      >
        Sort by
        <select
          name="sort"
          defaultValue={sort}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label
        className={`workspace-directory-sort ${
          alwaysShowSort ? "" : "md:hidden"
        }`}
      >
        Direction
        <select
          name="dir"
          defaultValue={direction}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>

      <button
        type="submit"
      >
        Apply
      </button>
      <Link
        href={`${action}?season=${seasonId}`}
        className="workspace-directory-reset"
      >
        Reset
      </Link>
    </form>
  );
}
