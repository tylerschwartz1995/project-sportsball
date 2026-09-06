"""Public mappings; importing this package registers every table with Alembic."""

from sportsball.persistence.models.analytics import HistoricalEraRate as HistoricalEraRate
from sportsball.persistence.models.analytics import HistoricalPeakStats as HistoricalPeakStats
from sportsball.persistence.models.analytics import ScheduleGameContext as ScheduleGameContext
from sportsball.persistence.models.audit import BoxscoreBackfillGame as BoxscoreBackfillGame
from sportsball.persistence.models.audit import IngestionRun as IngestionRun
from sportsball.persistence.models.audit import MoneyPuckLineBackfill as MoneyPuckLineBackfill
from sportsball.persistence.models.audit import (
    MoneyPuckPlayerGameBackfill as MoneyPuckPlayerGameBackfill,
)
from sportsball.persistence.models.audit import MoneyPuckSeasonBackfill as MoneyPuckSeasonBackfill
from sportsball.persistence.models.audit import MoneyPuckShotBackfill as MoneyPuckShotBackfill
from sportsball.persistence.models.audit import PlayByPlayBackfillGame as PlayByPlayBackfillGame
from sportsball.persistence.models.audit import (
    PlayerProfileBackfillPlayer as PlayerProfileBackfillPlayer,
)
from sportsball.persistence.models.audit import (
    ScheduleBackfillCheckpoint as ScheduleBackfillCheckpoint,
)
from sportsball.persistence.models.audit import SourceArtifact as SourceArtifact
from sportsball.persistence.models.audit import SourcePayload as SourcePayload
from sportsball.persistence.models.base import Base as Base
from sportsball.persistence.models.entities import DraftSelection as DraftSelection
from sportsball.persistence.models.entities import Franchise as Franchise
from sportsball.persistence.models.entities import Game as Game
from sportsball.persistence.models.entities import Player as Player
from sportsball.persistence.models.entities import Season as Season
from sportsball.persistence.models.entities import Team as Team
from sportsball.persistence.models.entities import TeamSeason as TeamSeason
from sportsball.persistence.models.entities import TeamTransition as TeamTransition
from sportsball.persistence.models.game_stats import GameEvent as GameEvent
from sportsball.persistence.models.game_stats import GameEventPlayer as GameEventPlayer
from sportsball.persistence.models.game_stats import GoalieGameStats as GoalieGameStats
from sportsball.persistence.models.game_stats import PlayerGameStats as PlayerGameStats
from sportsball.persistence.models.game_stats import TeamGameStats as TeamGameStats
from sportsball.persistence.models.moneypuck import (
    MoneyPuckGoalieGameStats as MoneyPuckGoalieGameStats,
)
from sportsball.persistence.models.moneypuck import (
    MoneyPuckGoalieSeasonStats as MoneyPuckGoalieSeasonStats,
)
from sportsball.persistence.models.moneypuck import MoneyPuckLineGameStats as MoneyPuckLineGameStats
from sportsball.persistence.models.moneypuck import MoneyPuckShot as MoneyPuckShot
from sportsball.persistence.models.moneypuck import (
    MoneyPuckSkaterGameStats as MoneyPuckSkaterGameStats,
)
from sportsball.persistence.models.moneypuck import (
    MoneyPuckSkaterSeasonStats as MoneyPuckSkaterSeasonStats,
)
from sportsball.persistence.models.moneypuck import MoneyPuckTeamGameStats as MoneyPuckTeamGameStats
from sportsball.persistence.models.moneypuck import (
    MoneyPuckTeamSeasonStats as MoneyPuckTeamSeasonStats,
)
from sportsball.persistence.models.moneypuck import (
    MoneyPuckUnitSeasonStats as MoneyPuckUnitSeasonStats,
)
from sportsball.persistence.models.official_stats import (
    HistoricalGoalieSeasonStats as HistoricalGoalieSeasonStats,
)
from sportsball.persistence.models.official_stats import (
    HistoricalSkaterSeasonStats as HistoricalSkaterSeasonStats,
)
from sportsball.persistence.models.official_stats import (
    HistoricalTeamSeasonStats as HistoricalTeamSeasonStats,
)
from sportsball.persistence.models.official_stats import (
    OfficialGoalieSeasonStats as OfficialGoalieSeasonStats,
)
from sportsball.persistence.models.official_stats import (
    OfficialSkaterSeasonStats as OfficialSkaterSeasonStats,
)
from sportsball.persistence.models.official_stats import (
    OfficialStandingsSnapshot as OfficialStandingsSnapshot,
)
from sportsball.persistence.models.season_stats import GoalieSeasonStats as GoalieSeasonStats
from sportsball.persistence.models.season_stats import SkaterSeasonStats as SkaterSeasonStats
from sportsball.persistence.models.season_stats import TeamSeasonStats as TeamSeasonStats
