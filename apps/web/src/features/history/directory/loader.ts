import {
  parseSeasonPhase
} from "@/contracts/season-phase";
import "server-only";
import { HistoryPageProps, firstValue, historySectionTabs, parseHistorySection } from './logic';
export async function loadHistoryPage({ searchParams }: HistoryPageProps) {
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
