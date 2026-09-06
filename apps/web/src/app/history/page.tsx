import { loadHistoryPage } from '@/features/history/directory/loader';
import type { HistoryPageProps } from '@/features/history/directory/logic';
import { HistoryPageView } from '@/features/history/directory/view';

export const dynamic = "force-dynamic";

export default async function HistoryPage(props: HistoryPageProps) {
  return <HistoryPageView {...await loadHistoryPage(props)} />;
}
