"""Merge heads

Revision ID: c3b3a91cc8e6
Revises: e870875d730a, eebacfd303b6
Create Date: 2025-04-14 21:51:00.824647

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3b3a91cc8e6'
down_revision: Union[str, None] = ('e870875d730a', 'eebacfd303b6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
