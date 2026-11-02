import enum
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class PipelineStage(str, enum.Enum):
    DISCOVERED = "discovered"
    RESEARCHING = "researching"
    QUALIFIED = "qualified"
    CONTACT_IDENTIFIED = "contact_identified"
    OUTREACH_PREPARED = "outreach_prepared"
    CONTACTED = "contacted"
    REPLIED = "replied"
    MEETING_SCHEDULED = "meeting_scheduled"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"


class ResearchStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETE = "complete"
    NEEDS_REVIEW = "needs_review"


class VerificationStatus(str, enum.Enum):
    UNVERIFIED = "unverified"
    VERIFIED = "verified"
    BOUNCED = "bounced"


class Company(TimestampMixin, Base):
    __tablename__ = "companies"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), index=True)
    website: Mapped[str | None] = mapped_column(String(2048), unique=True, nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), index=True)
    city: Mapped[str | None] = mapped_column(String(100))
    industry: Mapped[str | None] = mapped_column(String(150), index=True)
    employee_count: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    business_model: Mapped[str | None] = mapped_column(Text)
    research_status: Mapped[ResearchStatus] = mapped_column(
        Enum(ResearchStatus), default=ResearchStatus.PENDING, nullable=False
    )

    contacts: Mapped[list["Contact"]] = relationship(back_populates="company", cascade="all, delete-orphan")
    lead: Mapped["Lead | None"] = relationship(back_populates="company", cascade="all, delete-orphan", uselist=False)
    sources: Mapped[list["ResearchSource"]] = relationship(back_populates="company", cascade="all, delete-orphan")
    job_signals: Mapped[list["JobSignal"]] = relationship(back_populates="company", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("name", "country", name="uq_company_name_country"),)


class Contact(TimestampMixin, Base):
    __tablename__ = "contacts"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    position: Mapped[str | None] = mapped_column(String(255))
    business_email: Mapped[str | None] = mapped_column(String(320), unique=True)
    business_phone: Mapped[str | None] = mapped_column(String(50))
    linkedin_url: Mapped[str | None] = mapped_column(String(2048), unique=True)
    source_url: Mapped[str | None] = mapped_column(String(2048))
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus), default=VerificationStatus.UNVERIFIED, nullable=False
    )
    is_suppressed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    company: Mapped[Company] = relationship(back_populates="contacts")
    __table_args__ = (UniqueConstraint("company_id", "full_name", name="uq_contact_company_name"),)


class Lead(TimestampMixin, Base):
    __tablename__ = "leads"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), unique=True)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    score_explanation: Mapped[str | None] = mapped_column(Text)
    stage: Mapped[PipelineStage] = mapped_column(Enum(PipelineStage), default=PipelineStage.DISCOVERED)
    potential_services: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)

    company: Mapped[Company] = relationship(back_populates="lead")


class ResearchSource(TimestampMixin, Base):
    __tablename__ = "research_sources"
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String(2048))
    title: Mapped[str | None] = mapped_column(String(500))
    source_type: Mapped[str] = mapped_column(String(100), default="website")
    company: Mapped[Company] = relationship(back_populates="sources")


class JobSignal(TimestampMixin, Base):
    __tablename__ = "job_signals"
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(255))
    source_url: Mapped[str] = mapped_column(String(2048))
    bpo_service: Mapped[str | None] = mapped_column(String(150))
    company: Mapped[Company] = relationship(back_populates="job_signals")
