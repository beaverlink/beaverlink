"""Applies or rolls back SQL migrations.

Usage: python -m app.migrate up | down
"""

import sys

import psycopg

from app.db import MIGRATIONS_DIR, database_url

TRACKING_TABLE = """
create table if not exists schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
)
"""


def migrate_up(conn: psycopg.Connection) -> list[str]:
    """Applies every migration that hasn't run yet, oldest first."""
    conn.execute(TRACKING_TABLE)
    done = {row[0] for row in conn.execute("select version from schema_migrations")}
    applied = []
    for path in sorted(MIGRATIONS_DIR.glob("*.up.sql")):
        version = path.name.removesuffix(".up.sql")
        if version in done:
            continue
        conn.execute(path.read_text())
        conn.execute("insert into schema_migrations (version) values (%s)", (version,))
        applied.append(version)
    return applied


def migrate_down(conn: psycopg.Connection) -> str | None:
    """Rolls back the most recent migration."""
    conn.execute(TRACKING_TABLE)
    row = conn.execute(
        "select version from schema_migrations order by version desc limit 1"
    ).fetchone()
    if row is None:
        return None
    version = row[0]
    conn.execute((MIGRATIONS_DIR / f"{version}.down.sql").read_text())
    conn.execute("delete from schema_migrations where version = %s", (version,))
    return version


def main(command: str) -> None:
    # Each command runs in one transaction, so a failed migration changes nothing.
    with psycopg.connect(database_url()) as conn:
        if command == "up":
            applied = migrate_up(conn)
            print(
                f"Applied: {', '.join(applied)}" if applied else "Already up to date."
            )
        elif command == "down":
            version = migrate_down(conn)
            print(f"Rolled back: {version}" if version else "Nothing to roll back.")
        else:
            raise SystemExit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "")
