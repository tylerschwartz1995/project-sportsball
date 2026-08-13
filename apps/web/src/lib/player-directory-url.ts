export function playerDirectoryClearHref({
  seasonId,
  phase,
  category,
  sort,
  direction,
}: {
  seasonId: number;
  phase: string;
  category: "skaters" | "goalies";
  sort: string;
  direction: "asc" | "desc";
}): string {
  const params = new URLSearchParams({
    season: String(seasonId),
    phase,
    type: category,
    sort,
    dir: direction,
  });
  return `/players?${params.toString()}`;
}
