"""first migrations

Revision ID: e77b6db621fe
Revises: b6f0701ec61c
Create Date: 2025-03-17 15:05:34.796154

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e77b6db621fe'
down_revision: Union[str, None] = 'b6f0701ec61c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
