"""first migrations

Revision ID: 0b08454b0005
Revises: 552574a0e1db
Create Date: 2025-03-05 15:52:48.528846

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0b08454b0005'
down_revision: Union[str, None] = '552574a0e1db'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
