"""first migrations

Revision ID: b6f0701ec61c
Revises: b43ae7d95942
Create Date: 2025-03-17 15:03:27.609677

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b6f0701ec61c'
down_revision: Union[str, None] = 'b43ae7d95942'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
