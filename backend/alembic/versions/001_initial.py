"""Initial migration

Revision ID: 001_initial
Revises: 
Create Date: 2025-02-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create bands table
    op.create_table(
        'bands',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('day', sa.String(), nullable=False),
        sa.Column('stage', sa.String(), nullable=False),
        sa.Column('genres', ARRAY(sa.String()), nullable=False),
        sa.Column('facts', ARRAY(sa.String()), nullable=False),
        sa.Column('suggested_songs', ARRAY(sa.String()), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create ratings table
    op.create_table(
        'ratings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('listened', sa.Boolean(), default=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('band_id', sa.Integer(), sa.ForeignKey('bands.id')),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_users_name', 'users', ['name'], unique=True)
    op.create_index('ix_bands_name', 'bands', ['name'], unique=True)
    op.create_index('ix_ratings_user_id', 'ratings', ['user_id'])
    op.create_index('ix_ratings_band_id', 'ratings', ['band_id'])


def downgrade():
    op.drop_index('ix_ratings_band_id')
    op.drop_index('ix_ratings_user_id')
    op.drop_index('ix_bands_name')
    op.drop_index('ix_users_name')
    op.drop_table('ratings')
    op.drop_table('bands')
    op.drop_table('users')