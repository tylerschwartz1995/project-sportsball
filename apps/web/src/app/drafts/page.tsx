import { SiteHeader } from "@/components/shell/site-header";
import { ViewTabs } from "@/components/ui/view-tabs";
import { WorkspacePageHeader } from "@/components/ui/workspace-primitives";
import { getDraftAnalytics } from "@/data/drafts";
import { DraftBoardView } from "@/features/drafts/board";
import { ClassRankingsView } from "@/features/drafts/classes";
import { draftViewTabs, parseDraftView, parseDraftYear } from "@/features/drafts/logic";
import { PlayerOutcomesView } from "@/features/drafts/outcomes";
import { TeamDraftingView } from "@/features/drafts/teams";
import { firstQueryValue } from "@/lib/directory";

export const dynamic = "force-dynamic";

import type { DraftsPageProps } from "@/features/drafts/route-state";

export default async function DraftsPage({ searchParams }: DraftsPageProps) {
  const params = await searchParams;
  const view = parseDraftView(firstQueryValue(params.view));
  const outcomeMetric = firstQueryValue(params.outcomeMetric);
  const roundGroup = firstQueryValue(params.roundGroup);
  const yearParam = firstQueryValue(params.year);
  const requestedYear = parseDraftYear(yearParam);
  const allYears = view === "board" && yearParam === "all";
  const requestedTeam = view === "board" || view === "teams"
    ? (firstQueryValue(params.team) ?? "")
    : "";
  const requestedFromYear = parseDraftYear(firstQueryValue(params.from));
  const requestedToYear = parseDraftYear(firstQueryValue(params.to));
  const boardYearRange =
    view === "board" &&
    allYears &&
    requestedFromYear !== null &&
    requestedToYear !== null;
  const analytics = await getDraftAnalytics(
    view === "teams"
      ? {
          yearRange: true,
          fromYear: requestedFromYear,
          toYear: requestedToYear,
          includeAdvanced: true,
        }
      : view === "classes"
        ? {
            allYears: true,
            includeAdvanced: true,
          }
      : boardYearRange
        ? {
            allYears: true,
            yearRange: true,
            fromYear: requestedFromYear,
            toYear: requestedToYear,
            teamAbbreviation: requestedTeam || null,
          }
      : {
          draftYear: requestedYear,
          teamAbbreviation: requestedTeam || null,
          allYears,
          defaultYear: view === "outcomes" ? "mature" : "latest",
          includeAdvanced: view === "outcomes",
        },
  );
  const selectedBoardTeam = view === "board"
    ? (analytics.selectedTeamAbbreviation ?? "")
    : "";
  const selectedDraftingTeam =
    view === "teams" &&
    analytics.teamOptions.some(
      (team) => team.abbreviation === requestedTeam,
    )
      ? requestedTeam
      : "";
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="drafts" />
      <section className="py-8 sm:py-10">
        <WorkspacePageHeader
          eyebrow="League / Drafts"
          title="NHL Drafts"
          description="Explore every NHL draft since 1963, trace each selection, and evaluate player and team outcomes."
          descriptionClassName="workspace-description-single-line"
        />

        <ViewTabs
          active={view}
          ariaLabel="Draft views"
          label="Draft view"
          tabs={draftViewTabs({
            view,
            selectedYear: analytics.selectedDraftYear,
            selectedTeam: selectedBoardTeam,
            selectedDraftingTeam,
            selectedFromYear: analytics.selectedFromYear,
            selectedToYear: analytics.selectedToYear,
            outcomeMetric,
            roundGroup,
          })}
        />

        {view === "board" ? (
          <DraftBoardView
            analytics={analytics}
            params={params}
            selectedTeam={selectedBoardTeam}
          />
        ) : null}

        {view === "outcomes" ? (
          <PlayerOutcomesView analytics={analytics} />
        ) : null}

        {view === "teams" ? (
          <TeamDraftingView
            analytics={analytics}
            selectedTeam={selectedDraftingTeam}
          />
        ) : null}

        {view === "classes" ? (
          <ClassRankingsView analytics={analytics} params={params} />
        ) : null}
      </section>
    </main>
  );
}
