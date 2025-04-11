"""Merge heads

Revision ID: 46f9a47332bc
Revises: 1f983dd0f86a, 70c96632dab1
Create Date: 2025-04-11 00:02:06.299294

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '46f9a47332bc'
down_revision: Union[str, None] = ('1f983dd0f86a', '70c96632dab1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
