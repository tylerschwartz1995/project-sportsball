import { loadHome } from '@/features/home/loader';
import type { HomeProps } from '@/features/home/logic';
import { HomeView } from '@/features/home/view';

export const dynamic = "force-dynamic";

export default async function Home(props: HomeProps) {
  return <HomeView {...await loadHome(props)} />;
}
