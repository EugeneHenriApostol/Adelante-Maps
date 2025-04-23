"""empty message

Revision ID: 1831be895b4d
Revises: 14e107899494
Create Date: 2025-04-17 16:09:59.239879

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# ✅ FIX: This was missing
revision: str = '1831be895b4d'
down_revision: Union[str, None] = '14e107899494'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
