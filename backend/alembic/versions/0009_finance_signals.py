"""Official finance headline metadata."""
from alembic import op
import sqlalchemy as sa
revision='0009_finance_signals'
down_revision='0008_innovation'
branch_labels=None
depends_on=None


def upgrade():
    op.create_table('finance_signals',sa.Column('id',sa.String(64),primary_key=True),
        sa.Column('title',sa.String(500),nullable=False),sa.Column('url',sa.String(2048),nullable=False,unique=True),
        sa.Column('source_id',sa.Integer(),sa.ForeignKey('sources.id'),nullable=False),
        sa.Column('region',sa.String(40),nullable=False),sa.Column('topics',sa.JSON(),nullable=False),
        sa.Column('published_at',sa.DateTime(timezone=True),nullable=False),sa.Column('fetched_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('status',sa.String(20),nullable=False))
    for name in ['source_id','published_at']:op.create_index('ix_finance_signals_'+name,'finance_signals',[name])


def downgrade():op.drop_table('finance_signals')
