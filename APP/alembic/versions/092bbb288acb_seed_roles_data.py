"""Seed roles data

Revision ID: 092bbb288acb
Revises: 4925de4216dd
Create Date: 2025-03-19 23:36:03.554854

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '092bbb288acb'
down_revision: Union[str, None] = '4925de4216dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    """Insert initial role data."""
    op.execute(
        """
        INSERT INTO roles (role_id, role_name) VALUES 
        (1, 'Default User'),
        (2, 'Admin'),
        (3, 'Super Admin')
        ON DUPLICATE KEY UPDATE role_name=VALUES(role_name);
        """
    )

def downgrade():
    """Remove seeded data if downgrading."""
    op.execute(
        """
        DELETE FROM roles WHERE role_id IN (1, 2, 3);
        """
    )