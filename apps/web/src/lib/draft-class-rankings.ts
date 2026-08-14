import type { DraftClassPerformance } from "@/contracts/draft";

export type DraftClassSort =
  | "class"
  | "selections"
  | "appearance-rate"
  | "hundred-rate"
  | "five-hundred-rate"
  | "average-games"
  | "points"
  | "game-score";

const draftClassSorts = new Set<DraftClassSort>([
  "class",
  "selections",
  "appearance-rate",
  "hundred-rate",
  "five-hundred-rate",
  "average-games",
  "points",
  "game-score",
]);

export function parseDraftClassSort(value: string | undefined): DraftClassSort {
  return draftClassSorts.has(value as DraftClassSort)
    ? (value as DraftClassSort)
    : "average-games";
}

export function sortDraftClassPerformance(
  rows: DraftClassPerformance[],
  sort: DraftClassSort,
  direction: "asc" | "desc",
): DraftClassPerformance[] {
  return [...rows].sort((left, right) => {
    const leftValue = draftClassSortValue(left, sort);
    const rightValue = draftClassSortValue(right, sort);
    if (leftValue === null) return rightValue === null ? 0 : 1;
    if (rightValue === null) return -1;

    const comparison = leftValue - rightValue;
    return (
      (direction === "asc" ? comparison : -comparison) ||
      right.draftYear - left.draftYear
    );
  });
}

function draftClassSortValue(
  row: DraftClassPerformance,
  sort: DraftClassSort,
): number | null {
  switch (sort) {
    case "class":
      return row.draftYear;
    case "selections":
      return row.selections;
    case "appearance-rate":
      return row.appearanceRate;
    case "hundred-rate":
      return row.hundredGameRate;
    case "five-hundred-rate":
      return row.fiveHundredGameRate;
    case "points":
      return row.pointsPerSkaterPick;
    case "game-score":
      return row.gameScorePerSkaterPick;
    case "average-games":
      return row.averageGames;
  }
}
