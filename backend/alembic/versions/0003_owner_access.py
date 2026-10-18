"""Hashed, expiring single-use owner links and revocable sessions."""
from alembic import op
import sqlalchemy as sa
revision='0003_owner_access'
down_revision='0002_audit_log'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('owner_credentials',
        sa.Column('token_hash',sa.String(64),primary_key=True),
        sa.Column('kind',sa.String(16),nullable=False),
        sa.Column('email',sa.String(254),nullable=False),
        sa.Column('expires_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('consumed_at',sa.DateTime(timezone=True),nullable=True),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False))
    op.create_index('ix_owner_credentials_kind','owner_credentials',['kind'])
    op.create_index('ix_owner_credentials_expires_at','owner_credentials',['expires_at'])

def downgrade():op.drop_table('owner_credentials')
