import { loadGamesPage } from '@/features/games/directory/loader';
import type { GamesPageProps } from '@/features/games/directory/logic';
import { GamesPageView } from '@/features/games/directory/view';

export const dynamic = "force-dynamic";

export default async function GamesPage(props: GamesPageProps) {
  return <GamesPageView {...await loadGamesPage(props)} />;
}
