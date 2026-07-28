import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "")

# For local dev without a database, fall back to SQLite
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./reforge.db"

# SQLite doesn't support pool parameters
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL)
else:
    # Ensure psycopg (v3) driver is used explicitly
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and closes it after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_startup_migrations():
    """Add any model columns that are missing from existing tables.

    Base.metadata.create_all() only creates tables that don't exist yet; it
    never alters a table that's already there. That's how a column added to
    a model (e.g. User.is_verified) can exist in code but not in a live
    database, breaking every query that touches it with an UndefinedColumn
    error. This scans each mapped table against what's actually in the
    database and adds whatever columns are missing, so schema drift like
    that self-heals on the next deploy instead of crashing every request.
    """
    import logging
    from sqlalchemy import inspect, text

    logger = logging.getLogger("reforge.migrations")
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    for table in Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            continue  # brand-new table: create_all() already handles this

        existing_columns = {col["name"] for col in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name in existing_columns:
                continue

            col_type = column.type.compile(dialect=engine.dialect)
            ddl = f"ALTER TABLE {table.name} ADD COLUMN {column.name} {col_type}"

            default = getattr(column, "default", None)
            if default is not None and getattr(default, "is_scalar", False):
                value = default.arg
                if isinstance(value, str):
                    ddl += f" DEFAULT '{value}'"
                elif isinstance(value, bool):
                    ddl += f" DEFAULT {1 if value else 0}"
                elif isinstance(value, (int, float)):
                    ddl += f" DEFAULT {value}"

            try:
                with engine.begin() as conn:
                    conn.execute(text(ddl))
                logger.info("Added missing column %s.%s", table.name, column.name)
            except Exception:
                logger.exception("Could not add column %s.%s", table.name, column.name)
