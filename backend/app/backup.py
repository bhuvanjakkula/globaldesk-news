"""Consistent SQLite backups and non-overwriting offline restores.

PostgreSQL deployments should use pg_dump/pg_restore, as documented in OPERATIONS.md.
"""
import argparse
from pathlib import Path
import sqlite3
from sqlalchemy.engine import make_url


def validate(path):
    with sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True) as db:
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError('Database integrity check failed')
        tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if not {'articles', 'sources', 'alembic_version'}.issubset(tables):
            raise ValueError('Not a migrated GlobalDesk database')


def copy_database(source: Path, destination: Path):
    source, destination = source.resolve(), destination.resolve()
    if not source.is_file():
        raise ValueError('Source database does not exist')
    validate(source)
    # Exclusive create prevents accidental replacement of live data or older backups.
    with destination.open('xb'):
        pass
    try:
        with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True) as src:
            with sqlite3.connect(destination) as target:
                src.backup(target)
        validate(destination)
    except BaseException:
        destination.unlink(missing_ok=True)
        raise
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['backup', 'restore', 'check'])
    parser.add_argument('--source', type=Path, help='Required for restore/check')
    parser.add_argument('--destination', type=Path, help='New file; never overwrites')
    args = parser.parse_args()
    try:
        if args.action == 'check':
            if not args.source:
                parser.error('--source is required')
            validate(args.source)
            print('GlobalDesk database integrity verified.'); return
        if not args.destination:
            parser.error('--destination is required')
        source = args.source
        if args.action == 'backup':
            from .settings import DATABASE_URL
            url = make_url(DATABASE_URL)
            if url.get_backend_name() != 'sqlite' or not url.database or url.database == ':memory:':
                parser.error('Use pg_dump for PostgreSQL; this tool supports file-backed SQLite only')
            source = Path(url.database)
        if not source:
            parser.error('--source is required for restore')
        result = copy_database(source, args.destination)
        print(f'Verified database written to {result}')
    except (ValueError, OSError, sqlite3.Error) as exc:
        parser.exit(1, f'{exc}\n')


if __name__ == '__main__':
    main()
