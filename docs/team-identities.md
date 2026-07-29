# Team identity and franchise history

The data model separates three concepts that should not be treated as one:

- A **franchise** is the stable lineage recognized by the NHL.
- A **team identity** is the source team ID used for a particular location and
  name, such as the Atlanta Thrashers or Winnipeg Jets.
- A **team season** stores the identity's display name and abbreviation for one
  season so later changes cannot rewrite historical pages.

`games` continue to reference the NHL team identity present in the source
record. Product queries can join through `teams.franchise_id` when a user wants
an entire franchise history, or remain on `teams.id` when the user wants only a
specific historical identity.

## Important cases

| Change | Representation |
| --- | --- |
| Atlanta Thrashers to Winnipeg Jets | Two team identities, one franchise, with a relocation transition |
| Phoenix Coyotes to Arizona Coyotes | Two team identities, one franchise, with a rebrand transition |
| Vegas Golden Knights | New franchise and team identity with an expansion transition |
| Seattle Kraken | New franchise and team identity with an expansion transition |
| Arizona assets transferred to Utah | Separate Arizona and Utah franchises with an asset-transfer transition |
| Utah Hockey Club to Utah Mammoth | Two team identities, one Utah franchise, with a rebrand transition |

The Arizona-to-Utah case is intentionally not modelled as a franchise
relocation. The NHL established a new Utah franchise, transferred Arizona's
hockey assets to it, and made the Arizona franchise inactive.

## Source and ingestion behavior

The NHL Stats team endpoint supplies both `id` and `franchiseId`. Versioned
reference mappings enrich schedule and box-score ingestion, while the source
payload remains retained for provenance. Unknown future team IDs are accepted
without a franchise link so ingestion does not fail before the reference data
is updated.

Early 2025–26 schedules sometimes used Utah Hockey Club's team ID after the
Mammoth name became official. The season-specific identity mapping displays
Utah Mammoth for 2025–26 without altering the original source payload.

Transition records include an effective season, type, explanatory note, and
source URL. Current seeds are based on NHL records and announcements:

- https://records.nhl.com/history
- https://www.nhl.com/news/seattle-officially-joins-nhl-can-sign-free-agents-make-trades-324191506
- https://www.nhl.com/utah/news/nhl-bog-approves-establishment-of-new-franchise-in-utah-x8485
- https://www.nhl.com/utah/news/utah-s-nhl-franchise-officially-named-the-utah-mammoth-release-5-7-25
