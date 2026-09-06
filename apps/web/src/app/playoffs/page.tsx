import { loadPlayoffsPage } from '@/features/playoffs/directory/loader';
import type { PlayoffsPageProps } from '@/features/playoffs/directory/logic';
import { PlayoffsPageView } from '@/features/playoffs/directory/view';

export const dynamic = "force-dynamic";

export default async function PlayoffsPage(props: PlayoffsPageProps) {
  return <PlayoffsPageView {...await loadPlayoffsPage(props)} />;
}
