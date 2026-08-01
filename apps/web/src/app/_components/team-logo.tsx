"use client";

import { useState } from "react";

const teamAbbreviations: Record<number, string> = {
  1: "NJD", 2: "NYI", 3: "NYR", 4: "PHI", 5: "PIT", 6: "BOS",
  7: "BUF", 8: "MTL", 9: "OTT", 10: "TOR", 11: "ATL", 12: "CAR",
  13: "FLA", 14: "TBL", 15: "WSH", 16: "CHI", 17: "DET", 18: "NSH",
  19: "STL", 20: "CGY", 21: "COL", 22: "EDM", 23: "VAN", 24: "ANA",
  25: "DAL", 26: "LAK", 27: "PHX", 28: "SJS", 29: "CBJ", 30: "MIN",
  31: "MNS", 32: "QUE", 33: "WIN", 34: "HFD", 35: "CLR", 36: "SEN",
  37: "HAM", 38: "PIR", 39: "QUA", 40: "DCG", 41: "MWN", 42: "QBD",
  43: "MMR", 44: "NYA", 45: "SLE", 46: "OAK", 47: "AFM", 48: "KCS",
  49: "CLE", 50: "DFL", 51: "BRK", 52: "WPG", 53: "ARI", 54: "VGK",
  55: "SEA", 56: "CGS", 57: "TAN", 58: "TSP", 59: "UTA", 68: "UTA",
};

const historicalLogoPaths: Record<string, string> = {
  AFM: "AFM_19721973-19791980_light.svg",
  ATL: "ATL_19992000-20102011_light.svg",
  BRK: "BRK_19411942_light.svg",
  CGS: "CGS_19741975-19761977_light.svg",
  CLE: "CLE_19761977-19771978_light.svg",
  CLR: "CLR_19761977-19811982_light.svg",
  DCG: "DCG_19261927-19291930_light.svg",
  DFL: "DFL_19301931-19311932_light.svg",
  HAM: "HAM_19231924-19241925_light.svg",
  HFD: "HFD_19921993-19961997_light.svg",
  KCS: "KCS_19741975-19761977_light.svg",
  MMR: "MMR_19351936-19371938_light.svg",
  MNS: "MNS_19911992-19921993_light.svg",
  MWN: "MWN_19171918_light.svg",
  NYA: "NYA_19401941_light.svg",
  OAK: "OAK_19671968-19691970_light.svg",
  PHX: "PHX_20032004-20132014_light.svg",
  PIR: "PIR_19291930_light.svg",
  QBD: "QBD_19191920_light.svg",
  QUA: "QUA_19301931_light.svg",
  QUE: "QUE_19791980-19941995_light.svg",
  SEN: "SEN_19171918-19331934_light.svg",
  SLE: "SLE_19341935_light.svg",
  TAN: "TAN_19171918-19181919_light.svg",
  TSP: "TSP_19261927_light.svg",
  WIN: "WIN_19901991-19951996_light.svg",
};

export type TeamLogoIdentity = {
  nhlTeamId?: number | null;
  abbreviation?: string | null;
  name?: string | null;
};

type TeamLogoProps = TeamLogoIdentity & {
  size?: "profile" | "compact" | "tiny";
  decorative?: boolean;
  prominent?: boolean;
};

export function TeamLogo({
  name,
  abbreviation,
  nhlTeamId,
  size = "profile",
  decorative = false,
  prominent = false,
}: TeamLogoProps) {
  const resolvedAbbreviation = abbreviation ??
    (nhlTeamId ? teamAbbreviations[nhlTeamId] : undefined) ?? "NHL";
  const src = teamLogoUrl(resolvedAbbreviation);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;
  const className = size === "profile"
    ? "grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-white/70 bg-slate-50/95 p-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_8px_24px_rgb(2_8_23/0.22)]"
    : size === "compact"
      ? "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/70 bg-slate-50/95 p-1 shadow-sm"
      : "grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/70 bg-slate-50/95 p-0.5 shadow-sm";

  return (
    <span className={className}>
      {failed ? (
        <span
          className={`font-mono font-semibold text-slate-800 ${size === "profile" ? "text-sm" : "text-[0.45rem]"}`}
        >
          {resolvedAbbreviation}
        </span>
      ) : (
        // The NHL asset host serves SVG crests directly; this avoids proxying
        // protected branding through the app's image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={decorative ? "" : `${name ?? resolvedAbbreviation} logo`}
          className={`h-full w-full object-contain ${prominent ? "scale-[1.18]" : ""}`}
          onError={() => setFailedSrc(src)}
        />
      )}
    </span>
  );
}

export function TeamLogoStack({
  teams,
  abbreviations,
  max = 4,
  size = "tiny",
  prominent = false,
}: {
  teams?: TeamLogoIdentity[];
  abbreviations?: string | null;
  max?: number;
  size?: "tiny" | "compact" | "profile";
  prominent?: boolean;
}) {
  const resolvedTeams: TeamLogoIdentity[] = teams?.length
    ? teams
    : (abbreviations ?? "")
        .split(/[,/]/)
        .map((abbreviation) => abbreviation.trim())
        .filter(Boolean)
        .map((abbreviation): TeamLogoIdentity => ({ abbreviation }));
  const uniqueTeams = resolvedTeams.filter(
    (team, index, values) =>
      values.findIndex(
        (candidate) =>
          candidate.nhlTeamId === team.nhlTeamId &&
          candidate.abbreviation === team.abbreviation,
      ) === index,
  );
  const visibleTeams = uniqueTeams.slice(0, max);

  if (visibleTeams.length === 0) return null;

  const label = uniqueTeams
    .map((team) => team.name ?? team.abbreviation)
    .filter(Boolean)
    .join(", ");

  return (
    <span className="inline-flex items-center -space-x-1" title={label}>
      {visibleTeams.map((team, index) => (
        <TeamLogo
          key={`${team.nhlTeamId ?? team.abbreviation}-${index}`}
          {...team}
          size={size}
          decorative
          prominent={prominent}
        />
      ))}
      {uniqueTeams.length > max ? (
        <span className="ml-1 text-[0.65rem] text-slate-500">
          +{uniqueTeams.length - max}
        </span>
      ) : null}
      <span className="sr-only">{label}</span>
    </span>
  );
}

function teamLogoUrl(abbreviation: string) {
  const logoPath = historicalLogoPaths[abbreviation] ?? `${abbreviation}_light.svg`;
  return `https://assets.nhle.com/logos/nhl/svg/${logoPath}`;
}
