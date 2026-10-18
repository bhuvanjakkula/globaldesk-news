import sqlite3
import pytest
from app.backup import copy_database, validate


def test_backup_restore_roundtrip_and_overwrite_protection(tmp_path):
    source = tmp_path / 'source.db'
    backup = tmp_path / 'backup.db'
    restored = tmp_path / 'restored.db'
    with sqlite3.connect(source) as db:
        db.executescript("CREATE TABLE articles(id INTEGER PRIMARY KEY, title TEXT); CREATE TABLE sources(id INTEGER); CREATE TABLE alembic_version(version_num TEXT); INSERT INTO articles VALUES(1, 'Original');")
    copy_database(source, backup)
    with sqlite3.connect(source) as db:
        db.execute("UPDATE articles SET title='Changed'")
    copy_database(backup, restored)
    validate(restored)
    with sqlite3.connect(restored) as db:
        assert db.execute('SELECT title FROM articles').fetchone()[0] == 'Original'
    with pytest.raises(FileExistsError):
        copy_database(backup, restored)
    with sqlite3.connect(source) as db:
        assert db.execute('SELECT title FROM articles').fetchone()[0] == 'Changed'


def test_backup_rejects_non_project_database(tmp_path):
    source = tmp_path / 'empty.db'
    with sqlite3.connect(source):
        pass
    with pytest.raises(ValueError):
        copy_database(source, tmp_path / 'copy.db')
    assert not (tmp_path / 'copy.db').exists()
