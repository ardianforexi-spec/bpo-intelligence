from dataclasses import dataclass

from app.db.models import Company, Contact, JobSignal, ResearchSource, VerificationStatus

SERVICE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Customer Support": ("customer support", "customer service", "support agent", "call center"),
    "Sales and Appointment Setting": ("sales representative", "appointment setter", "business development"),
    "Data Entry and Data Processing": ("data entry", "data processing", "data operations"),
    "Data Analytics": ("data analyst", "analytics", "business intelligence"),
    "Technical Support": ("technical support", "support engineer", "help desk"),
    "Back Office Operations": ("back office", "order processing", "operations coordinator"),
    "Virtual Assistant Services": ("virtual assistant", "administrative assistant", "executive assistant"),
}


@dataclass(frozen=True)
class ScoreResult:
    score: int
    explanation: str
    services: list[str]


def match_services(company: Company, job_signals: list[JobSignal]) -> list[str]:
    """Match only evidence-backed offerings; an empty list means insufficient evidence."""
    corpus = " ".join(
        filter(None, [company.industry, company.description, company.business_model] + [
            f"{signal.title} {signal.description or ''} {signal.bpo_service or ''}" for signal in job_signals
        ])
    ).lower()
    return [service for service, keywords in SERVICE_KEYWORDS.items() if any(word in corpus for word in keywords)]


def score_lead(
    company: Company,
    contacts: list[Contact],
    job_signals: list[JobSignal],
    sources: list[ResearchSource],
) -> ScoreResult:
    """Apply the documented 0–100 model without treating hiring as proof of demand."""
    points = 0
    reasons: list[str] = []
    services = match_services(company, job_signals)

    if job_signals:
        hiring_points = min(25, 10 + 5 * (len(job_signals) - 1))
        points += hiring_points
        reasons.append(f"{hiring_points}/25 for {len(job_signals)} relevant public hiring signal(s)")
    if company.employee_count:
        size_points = 15 if 50 <= company.employee_count <= 500 else 8 if company.employee_count >= 20 else 3
        points += size_points
        reasons.append(f"{size_points}/15 for estimated company size")

    source_text = " ".join(filter(None, [source.title for source in sources])).lower()
    if any(term in source_text for term in ("expansion", "growth", "funding", "launch", "hiring")):
        points += 15
        reasons.append("15/15 for documented growth activity")
    if services:
        points += 20
        reasons.append("20/20 for evidence-backed service match")
    if contacts:
        points += 10
        reasons.append("10/10 for identified decision-maker or business contact")
    if any(contact.verification_status == VerificationStatus.VERIFIED for contact in contacts):
        points += 10
        reasons.append("10/10 for verified business contact")
    if sources or job_signals:
        points += 5
        reasons.append("5/5 for recorded recent public activity")

    explanation = "; ".join(reasons) if reasons else "No evidence recorded yet; score remains 0."
    return ScoreResult(score=min(points, 100), explanation=explanation, services=services)
