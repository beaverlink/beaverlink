import os
from collections.abc import Iterator
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set. See README.md.")
    return url


def get_connection() -> Iterator[psycopg.Connection]:
    """Opens one database connection per request."""
    with psycopg.connect(database_url(), row_factory=dict_row) as conn:
        yield conn
