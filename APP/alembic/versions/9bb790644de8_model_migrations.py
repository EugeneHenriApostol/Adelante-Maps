"""model migrations

Revision ID: 9bb790644de8
Revises: b43ae7d95942
Create Date: 2025-03-18 23:41:08.924506

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9bb790644de8'
down_revision: Union[str, None] = 'b43ae7d95942'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
