"""update migrations

Revision ID: 657a02e35514
Revises: 4646f8dc0421
Create Date: 2025-03-19 13:04:16.621145

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '657a02e35514'
down_revision: Union[str, None] = '4646f8dc0421'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
