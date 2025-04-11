"""new table model migrations

Revision ID: 92353f1aa4f8
Revises: 46f9a47332bc
Create Date: 2025-04-11 00:02:35.277392

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '92353f1aa4f8'
down_revision: Union[str, None] = '46f9a47332bc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
