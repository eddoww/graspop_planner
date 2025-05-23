"""Add start_time and end_time to bands

Revision ID: 002
Revises: 001
Create Date: 2025-01-23 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Add start_time and end_time columns to bands table
    op.add_column('bands', sa.Column('start_time', sa.String(), nullable=True))
    op.add_column('bands', sa.Column('end_time', sa.String(), nullable=True))


def downgrade():
    # Remove start_time and end_time columns from bands table
    op.drop_column('bands', 'end_time')
    op.drop_column('bands', 'start_time')