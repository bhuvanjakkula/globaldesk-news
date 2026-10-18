"""Private versioned research collections with no publisher-content snapshots."""
from alembic import op
import sqlalchemy as sa
revision='0005_research'
down_revision='0004_watch_desk'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('research_collections',sa.Column('id',sa.String(32),primary_key=True),
        sa.Column('owner_email',sa.String(254),nullable=False),sa.Column('slot',sa.Integer(),nullable=False),
        sa.Column('name',sa.String(80),nullable=False),sa.Column('note',sa.Text(),nullable=False),
        sa.Column('slugs',sa.JSON(),nullable=False),sa.Column('fingerprints',sa.JSON(),nullable=False),
        sa.Column('version',sa.Integer(),nullable=False),sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
        sa.UniqueConstraint('owner_email','slot',name='uq_research_owner_slot'),
        sa.CheckConstraint('slot >= 0 AND slot < 20',name='ck_research_slot'))
    op.create_index('ix_research_collections_owner_email','research_collections',['owner_email'])

def downgrade():op.drop_table('research_collections')
