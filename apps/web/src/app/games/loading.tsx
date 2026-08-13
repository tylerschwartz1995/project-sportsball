import { RouteLoading } from "@/app/_components/route-loading";

export default function GamesLoading() {
  return (
    <RouteLoading
      active="games"
      label="schedule and results"
      panels={6}
      variant="cards"
    />
  );
}
