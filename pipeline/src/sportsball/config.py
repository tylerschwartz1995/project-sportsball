"""Environment-backed pipeline configuration."""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings shared by ingestion jobs."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="SPORTSBALL_",
        extra="ignore",
    )

    database_url: str = Field(
        default="postgresql+psycopg://sportsball:sportsball@localhost:5432/sportsball"
    )
    raw_data_path: Path = Path("data/raw")


settings = Settings()
