import os
import tempfile
from pathlib import Path
import pytest

_fd, _path = tempfile.mkstemp(suffix='.db')
os.close(_fd)
os.environ['ALLOWED_HOSTS'] = 'testserver,localhost,127.0.0.1,api'
os.environ['API_REQUESTS_PER_MINUTE'] = '10000'
os.environ['API_GLOBAL_REQUESTS_PER_MINUTE'] = '100000'
os.environ['DATABASE_URL'] = f'sqlite:///{_path}'
from app.db import Base, SessionLocal, engine  # noqa: E402
from app import models  # noqa: E402
from app.seed import seed  # noqa: E402
from app.main import app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

@pytest.fixture(scope='session', autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    seed()
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    Path(_path).unlink(missing_ok=True)

@pytest.fixture()
def client():
    return TestClient(app)

@pytest.fixture()
def session():
    with SessionLocal() as db:
        yield db
