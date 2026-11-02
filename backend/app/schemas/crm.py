from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

from app.db.models import PipelineStage, ResearchStatus, VerificationStatus


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CompanyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    website: HttpUrl | None = None
    country: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    industry: str | None = Field(default=None, max_length=150)
    employee_count: int | None = Field(default=None, ge=1)
    description: str | None = None
    business_model: str | None = None


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    website: HttpUrl | None = None
    country: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    industry: str | None = Field(default=None, max_length=150)
    employee_count: int | None = Field(default=None, ge=1)
    description: str | None = None
    business_model: str | None = None
    research_status: ResearchStatus | None = None


class CompanyRead(CompanyCreate, ORMModel):
    id: UUID
    research_status: ResearchStatus


class ContactCreate(BaseModel):
    company_id: UUID
    full_name: str = Field(min_length=1, max_length=255)
    position: str | None = None
    business_email: str | None = None
    business_phone: str | None = None
    linkedin_url: HttpUrl | None = None
    source_url: HttpUrl | None = None


class ContactRead(ContactCreate, ORMModel):
    id: UUID
    verification_status: VerificationStatus
    is_suppressed: bool


class LeadCreate(BaseModel):
    company_id: UUID
    score: int = Field(default=0, ge=0, le=100)
    score_explanation: str | None = None
    potential_services: list[str] = Field(default_factory=list)


class LeadUpdate(BaseModel):
    score: int | None = Field(default=None, ge=0, le=100)
    score_explanation: str | None = None
    stage: PipelineStage | None = None
    potential_services: list[str] | None = None


class LeadRead(LeadCreate, ORMModel):
    id: UUID
    stage: PipelineStage
