import { loadPlayerComparePage } from '@/features/players/comparison/loader';
import type { PlayerComparePageProps } from '@/features/players/comparison/logic';
import { PlayerComparePageView } from '@/features/players/comparison/view';

export const dynamic = "force-dynamic";

export default async function PlayerComparePage(props: PlayerComparePageProps) {
  return <PlayerComparePageView {...await loadPlayerComparePage(props)} />;
}
