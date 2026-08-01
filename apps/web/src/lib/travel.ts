type TravelLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

export type ScheduleTravelInput = {
  gameDate: string;
  isHome: boolean;
  opponentNhlTeamId: number;
};

export type ScheduleTravelLeg = {
  siteName: string | null;
  travelDistanceKm: number | null;
};

const TEAM_LOCATIONS: Record<number, TravelLocation> = {
  1: location("Newark, NJ", 40.7336, -74.1711),
  2: location("Elmont, NY", 40.7123, -73.7271),
  3: location("New York, NY", 40.7505, -73.9934),
  4: location("Philadelphia, PA", 39.9012, -75.172),
  5: location("Pittsburgh, PA", 40.4396, -79.9893),
  6: location("Boston, MA", 42.3662, -71.0621),
  7: location("Buffalo, NY", 42.875, -78.8765),
  8: location("Montreal, QC", 45.4961, -73.5693),
  9: location("Ottawa, ON", 45.2969, -75.9272),
  10: location("Toronto, ON", 43.6435, -79.3791),
  11: location("Atlanta, GA", 33.7573, -84.3963),
  12: location("Raleigh, NC", 35.8033, -78.7218),
  13: location("Sunrise, FL", 26.1584, -80.3256),
  14: location("Tampa, FL", 27.9427, -82.4518),
  15: location("Washington, DC", 38.8981, -77.0209),
  16: location("Chicago, IL", 41.8807, -87.6742),
  17: location("Detroit, MI", 42.3411, -83.0553),
  18: location("Nashville, TN", 36.1592, -86.7785),
  19: location("St. Louis, MO", 38.6268, -90.2026),
  20: location("Calgary, AB", 51.0374, -114.0519),
  21: location("Denver, CO", 39.7487, -105.0077),
  22: location("Edmonton, AB", 53.5469, -113.4977),
  23: location("Vancouver, BC", 49.2778, -123.1088),
  24: location("Anaheim, CA", 33.8078, -117.8765),
  25: location("Dallas, TX", 32.7905, -96.8103),
  26: location("Los Angeles, CA", 34.043, -118.2673),
  27: location("Glendale, AZ", 33.5319, -112.2612),
  28: location("San Jose, CA", 37.3328, -121.9012),
  29: location("Columbus, OH", 39.9693, -83.0061),
  30: location("St. Paul, MN", 44.9448, -93.1011),
  52: location("Winnipeg, MB", 49.8928, -97.1436),
  54: location("Las Vegas, NV", 36.1029, -115.1783),
  55: location("Seattle, WA", 47.6221, -122.354),
  59: location("Salt Lake City, UT", 40.7683, -111.9011),
  68: location("Salt Lake City, UT", 40.7683, -111.9011),
};

const ARIZONA_GLENDALE = location("Glendale, AZ", 33.5319, -112.2612);
const ARIZONA_TEMPE = location("Tempe, AZ", 33.4255, -111.9281);

export function calculateScheduleTravel(
  teamNhlId: number,
  games: ScheduleTravelInput[],
): ScheduleTravelLeg[] {
  let previous = teamLocation(teamNhlId, games[0]?.gameDate);
  return games.map((game) => {
    const site = teamLocation(
      game.isHome ? teamNhlId : game.opponentNhlTeamId,
      game.gameDate,
    );
    const leg = {
      siteName: site?.label ?? null,
      travelDistanceKm:
        previous && site ? greatCircleDistanceKm(previous, site) : null,
    };
    previous = site;
    return leg;
  });
}

export function greatCircleDistanceKm(
  start: Pick<TravelLocation, "latitude" | "longitude">,
  end: Pick<TravelLocation, "latitude" | "longitude">,
): number {
  const earthRadiusKm = 6_371.0088;
  const latitudeDelta = radians(end.latitude - start.latitude);
  const longitudeDelta = radians(end.longitude - start.longitude);
  const startLatitude = radians(start.latitude);
  const endLatitude = radians(end.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(
    2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(haversine))),
  );
}

function teamLocation(
  nhlTeamId: number,
  gameDate: string | undefined,
): TravelLocation | null {
  if (nhlTeamId === 53) {
    return gameDate && gameDate >= "2022-10-01"
      ? ARIZONA_TEMPE
      : ARIZONA_GLENDALE;
  }
  return TEAM_LOCATIONS[nhlTeamId] ?? null;
}

function location(
  label: string,
  latitude: number,
  longitude: number,
): TravelLocation {
  return { label, latitude, longitude };
}

function radians(value: number): number {
  return (value * Math.PI) / 180;
}
