"""Build a source-only release; exclude runtime data, credentials and generated output."""
from hashlib import sha256
from hashlib import sha256
from pathlib import Path
import os
import zipfile

root = Path(__file__).resolve().parent
target = root.parent / 'GlobalDesk-v0.17-verified-source.zip'
excluded = {'node_modules', '.venv', '.secrets', 'backups', 'logs', 'generated-media', '__pycache__', '.pytest_cache', '.security-audit', '.git'}


def included(path):
    relative = path.relative_to(root)
    if any(p in excluded or p.startswith(('.next', '.test-tmp')) for p in relative.parts):
        return False
    name = path.name.lower()
    return not ((name.startswith('.env') and name != '.env.example') or '.db' in name or name.endswith(('.sqlite3', '.pyc', '.pyo', '.private.pem', '.tsbuildinfo', '.log')))


with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for directory, folders, files in os.walk(root):
        folders[:] = sorted(folder for folder in folders if included(Path(directory) / folder))
        for name in sorted(files):
            path = Path(directory) / name
            if included(path):
                archive.write(path, root.name + '/' + path.relative_to(root).as_posix())
with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
    assert all(included(root / Path(name).relative_to(root.name)) for name in archive.namelist())
digest = sha256(target.read_bytes()).hexdigest()
target.with_suffix(target.suffix + '.sha256').write_text(f'{digest}  {target.name}\n', encoding='utf-8')
print(f'{target.name}: {target.stat().st_size} bytes; SHA-256 {digest}')
