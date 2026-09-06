import { loadTeamPage } from '@/features/teams/profile/loader';
import type { TeamPageProps } from '@/features/teams/profile/logic';
import { TeamPageView } from '@/features/teams/profile/view';

export const dynamic = "force-dynamic";

export default async function TeamPage(props: TeamPageProps) {
  return <TeamPageView {...await loadTeamPage(props)} />;
}
