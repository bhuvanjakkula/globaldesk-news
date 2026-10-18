"""Initial source permissions, categories and articles.

Revision ID: 0001_initial
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('sources',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(180), nullable=False),
        sa.Column('domain', sa.String(220), nullable=False),
        sa.Column('region', sa.String(80), nullable=False),
        sa.Column('source_type', sa.String(30), nullable=False),
    )
    op.create_index('ix_sources_domain', 'sources', ['domain'], unique=True)
    op.create_table('categories',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('slug', sa.String(50), nullable=False),
        sa.Column('name', sa.String(80), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
    )
    op.create_index('ix_categories_slug', 'categories', ['slug'], unique=True)
    op.create_table('source_permissions',
        sa.Column('source_id', sa.Integer(), sa.ForeignKey('sources.id'), primary_key=True),
        sa.Column('access_method', sa.String(80), nullable=False),
        sa.Column('status', sa.String(32), nullable=False),
        sa.Column('public_metadata_allowed', sa.Boolean(), nullable=False),
        sa.Column('ai_processing_allowed', sa.Boolean(), nullable=False),
        sa.Column('rights_basis', sa.String(255), nullable=False),
        sa.Column('notes', sa.Text(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table('articles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('slug', sa.String(180), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('url', sa.Text(), nullable=True),
        sa.Column('source_id', sa.Integer(), sa.ForeignKey('sources.id'), nullable=False),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('categories.id'), nullable=False),
        sa.Column('country', sa.String(80), nullable=False),
        sa.Column('language', sa.String(32), nullable=False),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(32), nullable=False),
        sa.Column('is_demo', sa.Boolean(), nullable=False),
        sa.Column('origin', sa.String(32), nullable=False),
        sa.UniqueConstraint('url', name='uq_articles_url'),
    )
    op.create_index('ix_articles_slug', 'articles', ['slug'], unique=True)
    op.create_index('ix_articles_source_id', 'articles', ['source_id'])
    op.create_index('ix_articles_category_id', 'articles', ['category_id'])
    op.create_index('ix_articles_status_category_date', 'articles', ['status', 'category_id', 'published_at'])

def downgrade():
    op.drop_table('articles')
    op.drop_table('source_permissions')
    op.drop_table('categories')
    op.drop_table('sources')
