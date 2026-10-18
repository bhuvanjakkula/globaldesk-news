from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .settings import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={'check_same_thread': False} if DATABASE_URL.startswith('sqlite') else {},
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

def get_db():
    with SessionLocal() as session:
        yield session
