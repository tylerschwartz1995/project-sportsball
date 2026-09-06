import { loadPlayerGamesPage } from '@/features/players/game-log/loader';
import type { PlayerGamesPageProps } from '@/features/players/game-log/logic';
import { PlayerGamesPageView } from '@/features/players/game-log/view';

export const dynamic = "force-dynamic";

export default async function PlayerGamesPage(props: PlayerGamesPageProps) {
  return <PlayerGamesPageView {...await loadPlayerGamesPage(props)} />;
}
