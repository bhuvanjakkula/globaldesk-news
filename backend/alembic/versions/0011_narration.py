"""Separate source permission for spoken headline bulletins."""
from alembic import op
import sqlalchemy as sa
revision = '0011_narration'
down_revision = '0010_tracked_events'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('source_permissions', sa.Column('narration_allowed', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    op.drop_column('source_permissions', 'narration_allowed')
