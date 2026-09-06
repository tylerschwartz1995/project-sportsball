import { loadPlayersPage } from '@/features/players/directory/loader';
import type { PlayersPageProps } from '@/features/players/directory/logic';
import { PlayersPageView } from '@/features/players/directory/view';

export const dynamic = "force-dynamic";

export default async function PlayersPage(props: PlayersPageProps) {
  return <PlayersPageView {...await loadPlayersPage(props)} />;
}
