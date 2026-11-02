from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Company, Contact, Lead
from app.db.session import get_db_session
from app.schemas.crm import (
    CompanyCreate,
    CompanyRead,
    CompanyUpdate,
    ContactCreate,
    ContactRead,
    LeadCreate,
    LeadRead,
    LeadUpdate,
)

router = APIRouter(tags=["crm"])


async def get_or_404(session: AsyncSession, model: type[Company] | type[Contact] | type[Lead], item_id: UUID):
    item = await session.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return item


def apply_update(instance: object, changes: dict[str, object]) -> None:
    for field, value in changes.items():
        setattr(instance, field, value)


async def commit_or_conflict(session: AsyncSession) -> None:
    try:
        await session.commit()
    except IntegrityError as error:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate or invalid record") from error


@router.post("/companies", response_model=CompanyRead, status_code=status.HTTP_201_CREATED)
async def create_company(payload: CompanyCreate, session: AsyncSession = Depends(get_db_session)) -> Company:
    company = Company(**payload.model_dump(mode="json"))
    session.add(company)
    await commit_or_conflict(session)
    await session.refresh(company)
    return company


@router.get("/companies", response_model=list[CompanyRead])
async def list_companies(
    search: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
) -> list[Company]:
    statement: Select[tuple[Company]] = select(Company).order_by(Company.created_at.desc()).limit(limit).offset(offset)
    if search:
        statement = statement.where(Company.name.ilike(f"%{search}%"))
    return list((await session.scalars(statement)).all())


@router.get("/companies/{company_id}", response_model=CompanyRead)
async def get_company(company_id: UUID, session: AsyncSession = Depends(get_db_session)) -> Company:
    return await get_or_404(session, Company, company_id)


@router.patch("/companies/{company_id}", response_model=CompanyRead)
async def update_company(
    company_id: UUID, payload: CompanyUpdate, session: AsyncSession = Depends(get_db_session)
) -> Company:
    company = await get_or_404(session, Company, company_id)
    apply_update(company, payload.model_dump(exclude_unset=True, mode="json"))
    await commit_or_conflict(session)
    await session.refresh(company)
    return company


@router.post("/contacts", response_model=ContactRead, status_code=status.HTTP_201_CREATED)
async def create_contact(payload: ContactCreate, session: AsyncSession = Depends(get_db_session)) -> Contact:
    await get_or_404(session, Company, payload.company_id)
    contact = Contact(**payload.model_dump(mode="json"))
    session.add(contact)
    await commit_or_conflict(session)
    await session.refresh(contact)
    return contact


@router.get("/contacts", response_model=list[ContactRead])
async def list_contacts(
    company_id: UUID | None = None,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
) -> list[Contact]:
    statement = select(Contact).order_by(Contact.created_at.desc()).limit(limit).offset(offset)
    if company_id:
        statement = statement.where(Contact.company_id == company_id)
    return list((await session.scalars(statement)).all())


@router.post("/leads", response_model=LeadRead, status_code=status.HTTP_201_CREATED)
async def create_lead(payload: LeadCreate, session: AsyncSession = Depends(get_db_session)) -> Lead:
    await get_or_404(session, Company, payload.company_id)
    lead = Lead(**payload.model_dump())
    session.add(lead)
    await commit_or_conflict(session)
    await session.refresh(lead)
    return lead


@router.get("/leads", response_model=list[LeadRead])
async def list_leads(
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
) -> list[Lead]:
    statement = select(Lead).order_by(Lead.score.desc()).limit(limit).offset(offset)
    return list((await session.scalars(statement)).all())


@router.patch("/leads/{lead_id}", response_model=LeadRead)
async def update_lead(lead_id: UUID, payload: LeadUpdate, session: AsyncSession = Depends(get_db_session)) -> Lead:
    lead = await get_or_404(session, Lead, lead_id)
    apply_update(lead, payload.model_dump(exclude_unset=True))
    await commit_or_conflict(session)
    await session.refresh(lead)
    return lead
