import { loadTeamsPage } from '@/features/teams/directory/loader';
import type { TeamsPageProps } from '@/features/teams/directory/logic';
import { TeamsPageView } from '@/features/teams/directory/view';

export const dynamic = "force-dynamic";

export default async function TeamsPage(props: TeamsPageProps) {
  return <TeamsPageView {...await loadTeamsPage(props)} />;
}
