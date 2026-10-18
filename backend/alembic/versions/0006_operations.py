"""Permission expiry and ingestion run history."""
from alembic import op
import sqlalchemy as sa
revision = '0006_operations'
down_revision = '0005_research'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('source_permissions', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))
    op.create_table('ingestion_runs', sa.Column('id', sa.String(32), primary_key=True),
                    sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
                    sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
                    sa.Column('status', sa.String(20), nullable=False),
                    sa.Column('results', sa.JSON(), nullable=False))


def downgrade():
    op.drop_table('ingestion_runs')
    op.drop_column('source_permissions', 'expires_at')
