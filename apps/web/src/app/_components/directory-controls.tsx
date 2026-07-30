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
      className="mt-8 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem_auto_auto] lg:items-end"
    >
      <input type="hidden" name="season" value={seasonId} />
      <label className="text-sm font-medium text-slate-300">
        Search
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={searchPlaceholder}
          className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
        />
      </label>

      {categoryOptions && category ? (
        <label className="text-sm font-medium text-slate-300">
          Player type
          <select
            name="type"
            defaultValue={category}
            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-300/60"
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
        className={`text-sm font-medium text-slate-300 ${
          alwaysShowSort ? "" : "md:hidden"
        }`}
      >
        Sort by
        <select
          name="sort"
          defaultValue={sort}
          className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-300/60"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label
        className={`text-sm font-medium text-slate-300 ${
          alwaysShowSort ? "" : "md:hidden"
        }`}
      >
        Direction
        <select
          name="dir"
          defaultValue={direction}
          className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-300/60"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>

      <button
        type="submit"
        className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
      >
        Apply
      </button>
      <Link
        href={`${action}?season=${seasonId}`}
        className="rounded-lg border border-white/10 px-4 py-2.5 text-center text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
      >
        Reset
      </Link>
    </form>
  );
}
