"""Private persistent event dossiers."""
from alembic import op
import sqlalchemy as sa

revision = '0010_tracked_events'
down_revision = '0009_finance_signals'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('tracked_events',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('owner_email', sa.String(254), nullable=False),
        sa.Column('slot', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(160), nullable=False),
        sa.Column('note', sa.Text(), nullable=False),
        sa.Column('slugs', sa.JSON(), nullable=False),
        sa.Column('fingerprints', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('owner_email', 'slot', name='uq_event_owner_slot'),
        sa.CheckConstraint('slot >= 0 AND slot < 30', name='ck_event_slot'))
    op.create_index('ix_tracked_events_owner_email', 'tracked_events', ['owner_email'])


def downgrade():
    op.drop_table('tracked_events')
