"""add_is_demo_columns

Revision ID: d2f4a8b71234
Revises: c051210e7139
Create Date: 2026-11-12 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd2f4a8b71234'
down_revision: Union[str, Sequence[str], None] = 'c051210e7139'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Add is_demo column to users table
    op.add_column(
        'users',
        sa.Column('is_demo', sa.Boolean(), server_default=sa.text('false'), nullable=False)
    )
    op.create_index(op.f('ix_users_is_demo'), 'users', ['is_demo'], unique=False)

    # 2. Add is_demo column to tickets table
    op.add_column(
        'tickets',
        sa.Column('is_demo', sa.Boolean(), server_default=sa.text('false'), nullable=False)
    )
    op.create_index(op.f('ix_tickets_is_demo'), 'tickets', ['is_demo'], unique=False)

    # 3. Create compound index for demo department filtering
    op.create_index('idx_ticket_is_demo_dept', 'tickets', ['is_demo', 'department_id', 'status'], unique=False)

def downgrade() -> None:
    op.drop_index('idx_ticket_is_demo_dept', table_name='tickets')
    op.drop_index(op.f('ix_tickets_is_demo'), table_name='tickets')
    op.drop_column('tickets', 'is_demo')
    op.drop_index(op.f('ix_users_is_demo'), table_name='users')
    op.drop_column('users', 'is_demo')
