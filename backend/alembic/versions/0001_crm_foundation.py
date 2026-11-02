"""Create initial CRM tables.

Revision ID: 0001_crm_foundation
Revises:
Create Date: 2026-11-02
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_crm_foundation"
down_revision = None
branch_labels = None
depends_on = None

research_status = sa.Enum("PENDING", "IN_PROGRESS", "COMPLETE", "NEEDS_REVIEW", name="researchstatus")
verification_status = sa.Enum("UNVERIFIED", "VERIFIED", "BOUNCED", name="verificationstatus")
pipeline_stage = sa.Enum(
    "DISCOVERED", "RESEARCHING", "QUALIFIED", "CONTACT_IDENTIFIED", "OUTREACH_PREPARED", "CONTACTED",
    "REPLIED", "MEETING_SCHEDULED", "NEGOTIATION", "WON", "LOST", name="pipelinestage"
)


def upgrade() -> None:
    bind = op.get_bind()
    research_status.create(bind, checkfirst=True)
    verification_status.create(bind, checkfirst=True)
    pipeline_stage.create(bind, checkfirst=True)
    op.create_table(
        "companies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("website", sa.String(2048), unique=True),
        sa.Column("country", sa.String(100)), sa.Column("city", sa.String(100)),
        sa.Column("industry", sa.String(150)), sa.Column("employee_count", sa.Integer()),
        sa.Column("description", sa.Text()), sa.Column("business_model", sa.Text()),
        sa.Column("research_status", research_status, nullable=False, server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("name", "country", name="uq_company_name_country"),
    )
    op.create_index("ix_companies_name", "companies", ["name"])
    op.create_index("ix_companies_country", "companies", ["country"])
    op.create_index("ix_companies_industry", "companies", ["industry"])
    op.create_table(
        "contacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False), sa.Column("position", sa.String(255)),
        sa.Column("business_email", sa.String(320), unique=True), sa.Column("business_phone", sa.String(50)),
        sa.Column("linkedin_url", sa.String(2048), unique=True), sa.Column("source_url", sa.String(2048)),
        sa.Column("verification_status", verification_status, nullable=False, server_default="UNVERIFIED"),
        sa.Column("is_suppressed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("company_id", "full_name", name="uq_contact_company_name"),
    )
    op.create_index("ix_contacts_company_id", "contacts", ["company_id"])
    op.create_table(
        "leads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"), sa.Column("score_explanation", sa.Text()),
        sa.Column("stage", pipeline_stage, nullable=False, server_default="DISCOVERED"),
        sa.Column("potential_services", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "research_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False), sa.Column("title", sa.String(500)),
        sa.Column("source_type", sa.String(100), nullable=False, server_default="website"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_research_sources_company_id", "research_sources", ["company_id"])
    op.create_table(
        "job_signals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False), sa.Column("description", sa.Text()),
        sa.Column("location", sa.String(255)), sa.Column("source_url", sa.String(2048), nullable=False),
        sa.Column("bpo_service", sa.String(150)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_job_signals_company_id", "job_signals", ["company_id"])


def downgrade() -> None:
    op.drop_table("job_signals")
    op.drop_table("research_sources")
    op.drop_table("leads")
    op.drop_table("contacts")
    op.drop_table("companies")
    bind = op.get_bind()
    pipeline_stage.drop(bind, checkfirst=True)
    verification_status.drop(bind, checkfirst=True)
    research_status.drop(bind, checkfirst=True)
