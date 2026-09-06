import { loadTeamGamesPage } from '@/features/teams/game-log/loader';
import type { TeamGamesPageProps } from '@/features/teams/game-log/logic';
import { TeamGamesPageView } from '@/features/teams/game-log/view';

export const dynamic = "force-dynamic";

export default async function TeamGamesPage(props: TeamGamesPageProps) {
  return <TeamGamesPageView {...await loadTeamGamesPage(props)} />;
}
