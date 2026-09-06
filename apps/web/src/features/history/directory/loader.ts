import { withReadContext } from "@/data/read-context";
import {
  parseSeasonPhase
} from "@/contracts/season-phase";
import "server-only";
import { HistoryPageProps, firstValue, historySectionTabs, parseHistorySection } from './logic';
async function loadHistoryPageData({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const section = parseHistorySection(
    firstValue(params.section),
    firstValue(params.display),
    firstValue(params.view),
  );
  const phase = parseSeasonPhase(firstValue(params.phase));
  const sectionTabs = historySectionTabs(section, phase);
  return {
    phase,
    section,
    sectionTabs,
    params,
  } as const;
}

export function loadHistoryPage(...args: Parameters<typeof loadHistoryPageData>) {
  return withReadContext("history/directory", () => loadHistoryPageData(...args));
}
