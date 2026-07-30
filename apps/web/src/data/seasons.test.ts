import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import { listSeasons } from "@/data/seasons";

describe("listSeasons", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("maps database rows into the public season contract", async () => {
    queryMock.mockResolvedValue([
      { id: 20242025, start_year: 2024, end_year: 2025 },
      { id: 20232024, start_year: 2023, end_year: 2024 },
    ]);

    await expect(listSeasons()).resolves.toEqual([
      { id: 20242025, startYear: 2024, endYear: 2025, label: "2024–25" },
      { id: 20232024, startYear: 2023, endYear: 2024, label: "2023–24" },
    ]);
    expect(queryMock).toHaveBeenCalledOnce();
  });
});
