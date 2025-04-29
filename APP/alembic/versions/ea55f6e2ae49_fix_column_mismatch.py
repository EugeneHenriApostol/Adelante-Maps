"""fix_column_name_mismatch

Revision ID: fix_column_mismatch
Revises: 62a4b280c54f
Create Date: 2025-04-30

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'fix_column_mismatch'
down_revision = '62a4b280c54f'
branch_labels = None
depends_on = None


def upgrade():
    """Fix any column name inconsistencies in the database"""
    conn = op.get_bind()
    
    # Check if previousSchool_id column exists in the database
    result = conn.execute(text(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
        "WHERE TABLE_NAME = 'previous_schools' AND COLUMN_NAME = 'previousSchool_id'"
    ))
    
    column_exists = result.scalar() > 0
    
    if not column_exists:
        # The column doesn't exist - this is likely the cause of our error
        # Check if a different primary key column exists (probably previous_school_id)
        result = conn.execute(text(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_NAME = 'previous_schools' AND COLUMN_KEY = 'PRI'"
        ))
        pk_column = result.scalar()
        
        if pk_column:
            # A primary key exists but with a different name, let's rename it
            op.execute(text(f"ALTER TABLE previous_schools CHANGE {pk_column} previousSchool_id INT NOT NULL AUTO_INCREMENT"))
            print(f"Renamed column {pk_column} to previousSchool_id in previous_schools table")
        else:
            # No primary key column exists at all - this is unusual but we'll add one
            print("No primary key found in previous_schools table, creating previousSchool_id column")
            op.execute(text(
                "ALTER TABLE previous_schools ADD COLUMN previousSchool_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY"
            ))
    
    # Now fix the foreign key references if needed
    for table in ['senior_high_students', 'college_students']:
        # Check if the table exists
        result = conn.execute(text(
            f"SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES "
            f"WHERE TABLE_NAME = '{table}'"
        ))
        if result.scalar() == 0:
            print(f"Table {table} doesn't exist, skipping")
            continue
            
        # Check if the foreign key column exists
        result = conn.execute(text(
            f"SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
            f"WHERE TABLE_NAME = '{table}' AND COLUMN_NAME = 'previous_school_id'"
        ))
        if result.scalar() == 0:
            print(f"Adding missing previous_school_id column to {table}")
            op.execute(text(f"ALTER TABLE {table} ADD COLUMN previous_school_id INT"))
        
        # Check if there's already a foreign key constraint 
        result = conn.execute(text(
            f"SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE "
            f"WHERE TABLE_NAME = '{table}' AND COLUMN_NAME = 'previous_school_id' "
            f"AND REFERENCED_TABLE_NAME = 'previous_schools'"
        ))
        constraint = result.scalar()
        
        if constraint:
            # There's an existing constraint - drop it so we can recreate it correctly
            print(f"Dropping existing constraint {constraint} on {table}")
            op.execute(text(f"ALTER TABLE {table} DROP FOREIGN KEY {constraint}"))
        
        # Create proper foreign key constraint
        print(f"Creating foreign key constraint on {table}.previous_school_id")
        op.execute(text(
            f"ALTER TABLE {table} ADD CONSTRAINT fk_{table}_prev_school "
            f"FOREIGN KEY (previous_school_id) REFERENCES previous_schools(previousSchool_id)"
        ))


def downgrade():
    # We're fixing a schema issue, so downgrade is not very meaningful
    pass