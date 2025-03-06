"""first migrations

Revision ID: 11ee151ba08f
Revises: eebacfd303b6
Create Date: 2025-03-06 15:46:29.845261

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '11ee151ba08f'
down_revision: Union[str, None] = 'eebacfd303b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
