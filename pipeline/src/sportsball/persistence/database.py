"""PostgreSQL engine and session configuration."""

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from sportsball.config import settings

engine: Engine = create_engine(settings.database_url, pool_pre_ping=True)
session_factory = sessionmaker(bind=engine, expire_on_commit=False)


@contextmanager
def session_scope() -> Iterator[Session]:
    """Yield a session and manage its transaction boundary."""
    with session_factory.begin() as session:
        yield session
