import { loadUnitPage } from '@/features/lines/detail/loader';
import type { UnitPageProps } from '@/features/lines/detail/logic';
import { UnitPageView } from '@/features/lines/detail/view';

export const dynamic = "force-dynamic";

export default async function UnitPage(props: UnitPageProps) {
  return <UnitPageView {...await loadUnitPage(props)} />;
}
