import Link from "@/components/ui/exploration-link";
import { SiteHeader } from "@/components/shell/site-header";
import { findPlayers } from "@/data/player-search";
export const dynamic = "force-dynamic";
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const term =
    typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const players = await findPlayers(term);
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="search" />
      <section className="py-10 workspace-width-standard">
        <h1>Find a Player</h1>
        <p className="workspace-description">
          Search current and historical NHL players across all seasons. Open a
          career, then choose a season.
        </p>
        <form className="ux-search-form" action="/search">
          <label>
            Player Name
            <input
              type="search"
              name="q"
              defaultValue={term}
              minLength={2}
              maxLength={100}
              placeholder="e.g. Wayne Gretzky"
              required
            />
          </label>
          <button type="submit">Search All Seasons</button>
        </form>
        {term.length >= 2 ? (
          <section aria-label="Player search results">
            <h2>
              {players.length === 50
                ? "First 50 Matches"
                : `${players.length} ${players.length === 1 ? "Match" : "Matches"}`}
            </h2>
            {players.length ? (
              <ul className="ux-search-results">
                {players.map((player) => (
                  <li key={player.id}>
                    <Link href={`/players/${player.id}?view=seasons`}>
                      {player.name}
                      <span>
                        {player.position ?? "Player"} · Career & Seasons →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                No players match “{term}”. Try a surname or fewer letters. This
                search includes every player profile in the stored archive.
              </p>
            )}
            {players.length === 50 ? (
              <p>Use more of the name to narrow these results.</p>
            ) : null}
          </section>
        ) : (
          <p>
            Enter at least two letters of a name. For season rankings, open{" "}
            <Link href="/players">Player Statistics →</Link>
          </p>
        )}
      </section>
    </main>
  );
}
