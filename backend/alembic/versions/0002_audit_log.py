"""Editorial decision audit trail."""
from alembic import op
import sqlalchemy as sa

revision = '0002_audit_log'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('actor', sa.String(180), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('target', sa.String(220), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table('audit_logs')
