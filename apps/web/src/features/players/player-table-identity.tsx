import Link from "@/components/ui/exploration-link";
import { TeamLogoStack, type TeamLogoIdentity } from "@/features/teams/team-logo";

export function PlayerTableIdentity({ href, name, position, teams }: {
  href: string;
  name: string;
  position?: string;
  teams?: TeamLogoIdentity[];
}) {
  return (
    <div className="reference-player-identity">
      <TeamLogoStack teams={teams} size="tiny" />
      <div>
        <Link href={href} title={name}>{name}</Link>
        {position ? <span className="reference-player-position">{position}</span> : null}
      </div>
    </div>
  );
}
