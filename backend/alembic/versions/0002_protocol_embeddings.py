"""add protocol embeddings

Revision ID: 0002_protocol_embeddings
Revises: 0001_baseline
Create Date: 2026-05-12
"""

from alembic import op


revision = "0002_protocol_embeddings"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("ALTER TABLE protocols ADD COLUMN IF NOT EXISTS embedding vector")


def downgrade() -> None:
    op.execute("ALTER TABLE protocols DROP COLUMN IF EXISTS embedding")
