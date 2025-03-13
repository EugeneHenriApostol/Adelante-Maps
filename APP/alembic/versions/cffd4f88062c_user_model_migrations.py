"""user model migrations

Revision ID: cffd4f88062c
Revises: 16f5088e7d82
Create Date: 2025-03-11 19:10:06.763301

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cffd4f88062c'
down_revision: Union[str, None] = '16f5088e7d82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
