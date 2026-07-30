import { notFound } from "next/navigation";

import { SiteHeader } from "@/app/_components/site-header";
import { getTeamSeasonDetail } from "@/data/teams";

import { DesignLab } from "./design-lab";

export const dynamic = "force-dynamic";

const REFERENCE_TEAM_ID = 21;
const REFERENCE_SEASON_ID = 20252026;

export default async function DesignLabPage() {
  const detail = await getTeamSeasonDetail(
    REFERENCE_TEAM_ID,
    REFERENCE_SEASON_ID,
  );
  if (!detail?.regularSeason) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="teams" />
      <DesignLab
        team={detail.team}
        stats={detail.regularSeason}
        skaters={detail.skaters.slice(0, 5)}
      />
    </main>
  );
}
