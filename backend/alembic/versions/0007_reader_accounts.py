"""Customer accounts, separate from owner credentials."""
from alembic import op
import sqlalchemy as sa
revision = '0007_reader_accounts'
down_revision = '0006_operations'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('reader_accounts', sa.Column('id', sa.String(32), primary_key=True),
                    sa.Column('email', sa.String(254), nullable=False),
                    sa.Column('mobile', sa.String(16), nullable=False),
                    sa.Column('password_hash', sa.String(256), nullable=False),
                    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False))
    op.create_index('ix_reader_accounts_email', 'reader_accounts', ['email'], unique=True)
    op.create_table('reader_sessions', sa.Column('token_hash', sa.String(64), primary_key=True),
                    sa.Column('account_id', sa.String(32), sa.ForeignKey('reader_accounts.id'), nullable=False),
                    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False))
    op.create_index('ix_reader_sessions_account_id', 'reader_sessions', ['account_id'])
    op.create_index('ix_reader_sessions_expires_at', 'reader_sessions', ['expires_at'])


def downgrade():
    op.drop_table('reader_sessions')
    op.drop_table('reader_accounts')
