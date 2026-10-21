import Link from "@/components/ui/exploration-link";
import type { TeamIdentity } from "@/contracts/team";
import { TeamLogo } from "@/features/teams/team-logo";

export function TeamTableLink({ team, href }: { team: TeamIdentity; href: string }) {
  return (
    <Link className="reference-team-name" href={href} aria-label={team.name}>
      <TeamLogo {...team} size="tiny" decorative />
      <span className="team-name-full">{team.name}</span>
      <span className="team-name-short" aria-hidden="true">{team.abbreviation}</span>
    </Link>
  );
}
