from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.events.models import Event
from app.patients.models import Patient
from app.protocols.models import Protocol
from app.triage.models import TriageCase
from app.users.models import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_patients = db.query(Patient).count()
    total_triage_cases = db.query(TriageCase).count()
    active_cases = (
        db.query(TriageCase)
        .filter(TriageCase.status != "closed")
        .count()
    )
    critical_active_cases = (
        db.query(TriageCase)
        .filter(TriageCase.urgency_level == "critical", TriageCase.status != "closed")
        .count()
    )
    total_protocols = db.query(Protocol).count()
    total_events = db.query(Event).count()

    return {
        "patients": total_patients,
        "triage_cases": total_triage_cases,
        "active_cases": active_cases,
        "critical_active_cases": critical_active_cases,
        "protocols": total_protocols,
        "events": total_events,
    }
