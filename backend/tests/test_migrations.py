import psycopg

from app.migrate import migrate_down, migrate_up


def profiles_table_exists(conn: psycopg.Connection) -> bool:
    return conn.execute("select to_regclass('profiles') is not null").fetchone()[0]


def test_migrations_roll_back_and_reapply(database_url):
    with psycopg.connect(database_url) as conn:
        assert migrate_up(conn) == []

        assert migrate_down(conn) == "001_profiles"
        assert not profiles_table_exists(conn)

        assert migrate_up(conn) == ["001_profiles"]
        assert profiles_table_exists(conn)
