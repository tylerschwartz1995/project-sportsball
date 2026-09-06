import { loadAnalyticsPage } from '@/features/analytics/directory/loader';
import type { AnalyticsPageProps } from '@/features/analytics/directory/logic';
import { AnalyticsPageView } from '@/features/analytics/directory/view';

export const dynamic = "force-dynamic";

export default async function AnalyticsPage(props: AnalyticsPageProps) {
  return <AnalyticsPageView {...await loadAnalyticsPage(props)} />;
}
