import { describe, expect, it } from "vitest";

import {
  calculateScheduleTravel,
  greatCircleDistanceKm,
} from "@/lib/travel";

describe("schedule travel", () => {
  it("calculates great-circle distance with the haversine formula", () => {
    expect(
      greatCircleDistanceKm(
        { latitude: 49.2778, longitude: -123.1088 },
        { latitude: 47.6221, longitude: -122.354 },
      ),
    ).toBe(192);
  });

  it("starts at the team's home market and follows consecutive game sites", () => {
    expect(
      calculateScheduleTravel(23, [
        { gameDate: "2025-10-09", isHome: true, opponentNhlTeamId: 20 },
        { gameDate: "2025-10-11", isHome: false, opponentNhlTeamId: 55 },
        { gameDate: "2025-10-13", isHome: false, opponentNhlTeamId: 20 },
      ]),
    ).toEqual([
      { siteName: "Vancouver, BC", travelDistanceKm: 0 },
      { siteName: "Seattle, WA", travelDistanceKm: 192 },
      { siteName: "Calgary, AB", travelDistanceKm: 711 },
    ]);
  });

  it("keeps unmapped sites explicit instead of treating them as zero", () => {
    expect(
      calculateScheduleTravel(23, [
        { gameDate: "2025-10-09", isHome: false, opponentNhlTeamId: 999 },
        { gameDate: "2025-10-11", isHome: true, opponentNhlTeamId: 20 },
      ]),
    ).toEqual([
      { siteName: null, travelDistanceKm: null },
      { siteName: "Vancouver, BC", travelDistanceKm: null },
    ]);
  });

  it("uses Tempe for the later Arizona Coyotes seasons", () => {
    expect(
      calculateScheduleTravel(53, [
        { gameDate: "2023-01-01", isHome: true, opponentNhlTeamId: 23 },
      ]),
    ).toEqual([{ siteName: "Tempe, AZ", travelDistanceKm: 0 }]);
  });

  it("covers every NHL team identity stored by Sportsball", () => {
    const teamIds = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
      19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 52, 53, 54, 55,
      59, 68,
    ];
    for (const teamNhlId of teamIds) {
      expect(
        calculateScheduleTravel(teamNhlId, [
          {
            gameDate: "2025-10-09",
            isHome: true,
            opponentNhlTeamId: 23,
          },
        ])[0]?.siteName,
      ).not.toBeNull();
    }
  });
});
