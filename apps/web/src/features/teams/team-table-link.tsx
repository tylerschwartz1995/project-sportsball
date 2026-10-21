import Link from "@/components/ui/exploration-link";
import type { TeamIdentity } from "@/contracts/team";
import { TeamLogo } from "@/features/teams/team-logo";

export function TeamTableLink({ team, href }: { team: TeamIdentity; href: string }) {
  return (
    <Link className="reference-team-name" href={href}>
      <TeamLogo {...team} size="tiny" decorative />
      <span>{team.name}</span>
    </Link>
  );
}
