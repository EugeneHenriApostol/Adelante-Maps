"""first migrations

Revision ID: 339cf846fdf3
Revises: c3b3a91cc8e6
Create Date: 2025-04-14 21:54:03.338726

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '339cf846fdf3'
down_revision: Union[str, None] = 'c3b3a91cc8e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
