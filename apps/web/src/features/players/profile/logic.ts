import { countryName } from "@/lib/country-name";

export type PlayerView =
  | "overview"
  | "trends"
  | "advanced"
  | "seasons";

export type PlayerPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    season?: string | string[];
    phase?: string | string[];
    view?: string | string[];
    chartWindow?: string | string[];
    chartVenue?: string | string[];
    chartMetric?: string | string[];
  }>;
};

export function formatDraft(profile: {
  draftYear: number | null;
  draftTeamAbbreviation: string | null;
  draftRound: number | null;
  draftOverallPick: number | null;
}): string {
  if (!profile.draftYear) {
    return "Unavailable";
  }
  const parts = [
    String(profile.draftYear),
    profile.draftTeamAbbreviation,
    profile.draftRound ? `Round ${profile.draftRound}` : null,
    profile.draftOverallPick
      ? `${formatOrdinal(profile.draftOverallPick)} overall`
      : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

export function formatBirthDetails(
  birthDate: string | null,
  birthPlace: string | null,
): string {
  const date = birthDate
    ? new Intl.DateTimeFormat("en-CA", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(`${birthDate}T00:00:00Z`))
    : null;
  const place = birthPlace ? formatBirthPlace(birthPlace) : null;
  return [date, place].filter(Boolean).join(" · ") || "Unavailable";
}

export function formatBirthPlace(value: string): string {
  const parts = value.split(", ");
  const country = parts.at(-1);
  if (!country || !/^[A-Z]{2,3}$/.test(country)) {
    return value;
  }

  try {
    parts[parts.length - 1] = countryName(country);
  } catch {
    return value;
  }
  return parts.join(", ");
}

export function formatHandedness(value: string | null): string {
  if (value === "L") return "Left";
  if (value === "R") return "Right";
  return value ?? "Unavailable";
}

export function formatOrdinal(value: number): string {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

export function formatHeight(inches: number): string {
  return `${Math.floor(inches / 12)}′${inches % 12}″`;
}

export function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

export function playerViewTabs({
  nhlPlayerId,
  seasonId,
  phase,
  chartParams,
}: {
  nhlPlayerId: number;
  seasonId: number;
  phase: "regular" | "playoffs";
  chartParams: Record<string, string | undefined>;
}) {
  return [
    { id: "overview" as const, label: "Overview" },
    { id: "trends" as const, label: "Recent Form" },
    { id: "advanced" as const, label: "Shot Quality" },
    { id: "seasons" as const, label: "Season History" },
  ].map((tab) => {
    const params = new URLSearchParams({
      season: String(seasonId),
      phase,
      view: tab.id,
    });
    if (tab.id === "trends")
      Object.entries(chartParams).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
    return { ...tab, href: `/players/${nhlPlayerId}?${params.toString()}` };
  });
}

export function parsePlayerView(value: string | undefined): PlayerView {
  if (value === "records") {
    return "seasons";
  }

  return value === "trends" ||
    value === "advanced" ||
    value === "seasons"
    ? value
    : "overview";
}

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
