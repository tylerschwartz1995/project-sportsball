import { loadGamePage } from '@/features/games/detail/loader';
import type { GamePageProps } from '@/features/games/detail/logic';
import { GamePageView } from '@/features/games/detail/view';

export const dynamic = "force-dynamic";

export default async function GamePage(props: GamePageProps) {
  return <GamePageView {...await loadGamePage(props)} />;
}
