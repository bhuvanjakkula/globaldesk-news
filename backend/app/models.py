from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, JSON, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

def utcnow():
    return datetime.now(timezone.utc)

class Source(Base):
    __tablename__ = 'sources'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    domain: Mapped[str] = mapped_column(String(220), unique=True, index=True)
    region: Mapped[str] = mapped_column(String(80), default='Global')
    source_type: Mapped[str] = mapped_column(String(30), default='publisher')
    articles: Mapped[list['Article']] = relationship(back_populates='source')
    permission: Mapped['SourcePermission'] = relationship(back_populates='source', uselist=False)

class SourcePermission(Base):
    __tablename__ = 'source_permissions'
    source_id: Mapped[int] = mapped_column(ForeignKey('sources.id'), primary_key=True)
    access_method: Mapped[str] = mapped_column(String(80), default='gdelt_discovery')
    status: Mapped[str] = mapped_column(String(32), default='pending_review')
    public_metadata_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_processing_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    narration_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    rights_basis: Mapped[str] = mapped_column(String(255), default='Unverified')
    notes: Mapped[str] = mapped_column(Text, default='')
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source: Mapped['Source'] = relationship(back_populates='permission')

class Category(Base):
    __tablename__ = 'categories'
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text, default='')


class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id: Mapped[int] = mapped_column(primary_key=True)
    actor: Mapped[str] = mapped_column(String(180))
    action: Mapped[str] = mapped_column(String(50))
    target: Mapped[str] = mapped_column(String(220))
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class Article(Base):
    __tablename__ = 'articles'
    __table_args__ = (
        UniqueConstraint('url', name='uq_articles_url'),
        Index('ix_articles_status_category_date', 'status', 'category_id', 'published_at'),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(500))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_id: Mapped[int] = mapped_column(ForeignKey('sources.id'), index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey('categories.id'), index=True)
    country: Mapped[str] = mapped_column(String(80), default='Global')
    language: Mapped[str] = mapped_column(String(32), default='English')
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    status: Mapped[str] = mapped_column(String(32), default='pending_review')
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    origin: Mapped[str] = mapped_column(String(32), default='gdelt')
    source: Mapped[Source] = relationship(back_populates='articles')
    category: Mapped[Category] = relationship()


class OwnerCredential(Base):
    __tablename__ = 'owner_credentials'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    kind: Mapped[str] = mapped_column(String(16), index=True)
    email: Mapped[str] = mapped_column(String(254))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class OwnerWatch(Base):
    __tablename__ = 'owner_watches'
    __table_args__ = (UniqueConstraint('owner_email','slot',name='uq_owner_watch_slot'), CheckConstraint('slot >= 0 AND slot < 12',name='ck_owner_watch_slot'))
    id: Mapped[str] = mapped_column(String(32),primary_key=True)
    owner_email: Mapped[str] = mapped_column(String(254),index=True)
    slot: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(80))
    keywords: Mapped[list] = mapped_column(JSON)
    exclude: Mapped[list] = mapped_column(JSON)
    match_mode: Mapped[str] = mapped_column(String(8))
    category: Mapped[str | None] = mapped_column(String(50),nullable=True)
    hours: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),default=utcnow)

class WatchReview(Base):
    __tablename__ = 'watch_reviews'
    watch_id: Mapped[str] = mapped_column(ForeignKey('owner_watches.id',ondelete='CASCADE'),primary_key=True)
    article_id: Mapped[int] = mapped_column(ForeignKey('articles.id',ondelete='CASCADE'),primary_key=True)
    content_hash: Mapped[str] = mapped_column(String(64))
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),default=utcnow)


class ResearchCollection(Base):
    __tablename__ = 'research_collections'
    __table_args__ = (UniqueConstraint('owner_email','slot',name='uq_research_owner_slot'),CheckConstraint('slot >= 0 AND slot < 20',name='ck_research_slot'))
    id: Mapped[str] = mapped_column(String(32),primary_key=True)
    owner_email: Mapped[str] = mapped_column(String(254),index=True)
    slot: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(80))
    note: Mapped[str] = mapped_column(Text,default='')
    slugs: Mapped[list] = mapped_column(JSON)
    fingerprints: Mapped[dict] = mapped_column(JSON)
    version: Mapped[int] = mapped_column(Integer,default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),default=utcnow)


class IngestionRun(Base):
    __tablename__ = 'ingestion_runs'
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20))
    results: Mapped[dict] = mapped_column(JSON, default=dict)


class ReaderAccount(Base):
    __tablename__ = 'reader_accounts'
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    mobile: Mapped[str] = mapped_column(String(16))
    password_hash: Mapped[str] = mapped_column(String(256))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ReaderSession(Base):
    __tablename__ = 'reader_sessions'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey('reader_accounts.id'), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class InnovationSignal(Base):
    __tablename__ = 'innovation_signals'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(String(2048), unique=True)
    source_id: Mapped[int] = mapped_column(ForeignKey('sources.id'), index=True)
    publisher: Mapped[str] = mapped_column(String(220))
    kind: Mapped[str] = mapped_column(String(32))
    region: Mapped[str] = mapped_column(String(40))
    topics: Mapped[list] = mapped_column(JSON)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    status: Mapped[str] = mapped_column(String(20), default='published')
    source: Mapped[Source] = relationship()


class FinanceSignal(Base):
    __tablename__ = 'finance_signals'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(String(2048), unique=True)
    source_id: Mapped[int] = mapped_column(ForeignKey('sources.id'), index=True)
    region: Mapped[str] = mapped_column(String(40))
    topics: Mapped[list] = mapped_column(JSON)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    status: Mapped[str] = mapped_column(String(20), default='published')
    source: Mapped[Source] = relationship()


class TrackedEvent(Base):
    __tablename__ = 'tracked_events'
    __table_args__ = (UniqueConstraint('owner_email', 'slot', name='uq_event_owner_slot'),
                      CheckConstraint('slot >= 0 AND slot < 30', name='ck_event_slot'))
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    owner_email: Mapped[str] = mapped_column(String(254), index=True)
    slot: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(160))
    note: Mapped[str] = mapped_column(Text, default='')
    slugs: Mapped[list] = mapped_column(JSON)
    fingerprints: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default='draft')
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AvatarVideo(Base):
    __tablename__ = 'avatar_videos'
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    channel: Mapped[str] = mapped_column(String(20), index=True)
    item_id: Mapped[str] = mapped_column(String(180), index=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(20))
    provider_job_id: Mapped[str | None] = mapped_column(String(180), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
