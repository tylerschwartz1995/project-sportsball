import { loadLinesPage } from '@/features/lines/directory/loader';
import type { LinesPageProps } from '@/features/lines/directory/logic';
import { LinesPageView } from '@/features/lines/directory/view';

export const dynamic = "force-dynamic";

export default async function LinesPage(props: LinesPageProps) {
  return <LinesPageView {...await loadLinesPage(props)} />;
}
