import { loadStandingsPage } from '@/features/standings/directory/loader';
import type { StandingsPageProps } from '@/features/standings/directory/logic';
import { StandingsPageView } from '@/features/standings/directory/view';

export const dynamic = "force-dynamic";

export default async function StandingsPage(props: StandingsPageProps) {
  return <StandingsPageView {...await loadStandingsPage(props)} />;
}
