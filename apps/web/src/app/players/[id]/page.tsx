import { loadPlayerPage } from '@/features/players/profile/loader';
import type { PlayerPageProps } from '@/features/players/profile/logic';
import { PlayerPageView } from '@/features/players/profile/view';

export const dynamic = "force-dynamic";

export default async function PlayerPage(props: PlayerPageProps) {
  return <PlayerPageView {...await loadPlayerPage(props)} />;
}
