"use client";

import { useState } from "react";

const historicalLogoPaths: Record<number, string> = {
  11: "ATL_19992000-20102011_light.svg",
  27: "PHX_20032004-20132014_light.svg",
};

type TeamLogoProps = {
  name: string;
  abbreviation: string;
  nhlTeamId: number;
  size?: "profile" | "compact";
};

export function TeamLogo({
  name,
  abbreviation,
  nhlTeamId,
  size = "profile",
}: TeamLogoProps) {
  const compact = size === "compact";
  const src = teamLogoUrl(nhlTeamId, abbreviation);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;

  return (
    <div
      className={
        compact
          ? "row-span-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-1"
          : "grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.08] p-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
      }
    >
      {failed ? (
        <span
          className={`font-mono font-semibold text-cyan-100 ${compact ? "text-[0.55rem]" : "text-sm"}`}
        >
          {abbreviation}
        </span>
      ) : (
        // The NHL asset host serves SVG crests directly; this avoids proxying
        // protected branding through the app's image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${name} logo`}
          className="h-full w-full object-contain"
          onError={() => setFailedSrc(src)}
        />
      )}
    </div>
  );
}

function teamLogoUrl(nhlTeamId: number, abbreviation: string) {
  const logoPath = historicalLogoPaths[nhlTeamId] ?? `${abbreviation}_light.svg`;
  return `https://assets.nhle.com/logos/nhl/svg/${logoPath}`;
}
