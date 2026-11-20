import os
from collections.abc import Callable, Iterator

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.auth import get_current_user_id
from app.main import app
from app.migrate import migrate_up


@pytest.fixture(scope="session")
def database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        pytest.skip(
            "DATABASE_URL is not set, so database tests are skipped. See README.md."
        )
    with psycopg.connect(url) as conn:
        migrate_up(conn)
    return url


@pytest.fixture
def clean_db(database_url: str) -> None:
    with psycopg.connect(database_url) as conn:
        conn.execute("truncate profiles")


@pytest.fixture
def client() -> Iterator[TestClient]:
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def sign_in() -> Callable[[str], None]:
    """Stands in for the token check until it exists."""

    def sign_in_as(user_id: str) -> None:
        app.dependency_overrides[get_current_user_id] = lambda: user_id

    return sign_in_as
