import "server-only";
import { query } from "@/data/database";
export async function findPlayers(name: string) {
  const term = name.trim().slice(0, 100);
  if (term.length < 2) return [];
  return query<{ id: number; name: string; position: string | null }>(
    `
    SELECT nhl_id::integer AS id, display_name AS name, position
    FROM players
    WHERE nhl_id IS NOT NULL AND strpos(lower(display_name), lower($1)) > 0
    ORDER BY CASE WHEN lower(display_name) = lower($1) THEN 0 ELSE 1 END, display_name, nhl_id
    LIMIT 50
  `,
    [term],
  );
}
