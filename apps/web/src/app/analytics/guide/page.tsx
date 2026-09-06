import { loadMetricGuidePage } from '@/features/analytics/guide/loader';
import type { MetricGuidePageProps } from '@/features/analytics/guide/logic';
import { MetricGuidePageView } from '@/features/analytics/guide/view';

export const dynamic = "force-dynamic";

export default async function MetricGuidePage(props: MetricGuidePageProps) {
  return <MetricGuidePageView {...await loadMetricGuidePage(props)} />;
}
