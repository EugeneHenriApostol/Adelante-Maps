"""first migrations

Revision ID: 1f983dd0f86a
Revises: e77b6db621fe
Create Date: 2025-03-17 15:06:07.501608

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1f983dd0f86a'
down_revision: Union[str, None] = 'e77b6db621fe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
