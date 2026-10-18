"""Private topic monitors and content-aware review checkpoints."""
from alembic import op
import sqlalchemy as sa
revision='0004_watch_desk'
down_revision='0003_owner_access'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('owner_watches',
        sa.Column('id',sa.String(32),primary_key=True),sa.Column('owner_email',sa.String(254),nullable=False),
        sa.Column('slot',sa.Integer(),nullable=False),sa.Column('name',sa.String(80),nullable=False),
        sa.Column('keywords',sa.JSON(),nullable=False),sa.Column('exclude',sa.JSON(),nullable=False),
        sa.Column('match_mode',sa.String(8),nullable=False),sa.Column('category',sa.String(50),nullable=True),
        sa.Column('hours',sa.Integer(),nullable=False),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.UniqueConstraint('owner_email','slot',name='uq_owner_watch_slot'),
        sa.CheckConstraint('slot >= 0 AND slot < 12',name='ck_owner_watch_slot'))
    op.create_index('ix_owner_watches_owner_email','owner_watches',['owner_email'])
    op.create_table('watch_reviews',sa.Column('watch_id',sa.String(32),sa.ForeignKey('owner_watches.id',ondelete='CASCADE'),primary_key=True),
        sa.Column('article_id',sa.Integer(),sa.ForeignKey('articles.id',ondelete='CASCADE'),primary_key=True),
        sa.Column('content_hash',sa.String(64),nullable=False),sa.Column('reviewed_at',sa.DateTime(timezone=True),nullable=False))

def downgrade():
    op.drop_table('watch_reviews');op.drop_table('owner_watches')
