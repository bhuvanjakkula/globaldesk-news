"""Generated realistic presenter video records."""
from alembic import op
import sqlalchemy as sa
revision = '0012_avatar_videos'
down_revision = '0011_narration'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('avatar_videos', sa.Column('id',sa.String(32),primary_key=True),
        sa.Column('channel',sa.String(20),nullable=False), sa.Column('item_id',sa.String(180),nullable=False),
        sa.Column('fingerprint',sa.String(64),nullable=False), sa.Column('status',sa.String(20),nullable=False),
        sa.Column('provider_job_id',sa.String(180)), sa.Column('error_code',sa.String(40)),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False))
    op.create_index('ix_avatar_videos_channel','avatar_videos',['channel'])
    op.create_index('ix_avatar_videos_item_id','avatar_videos',['item_id'])


def downgrade():
    op.drop_table('avatar_videos')
