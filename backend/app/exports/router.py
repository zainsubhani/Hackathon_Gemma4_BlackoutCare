from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.events.crud import create_event
from app.exports.pdf_generators import generate_downtime_pdf
from app.exports.service import build_full_downtime_report, build_incident_report, export_triage_case_report
from app.users.models import User

router = APIRouter(prefix="/exports", tags=["exports"])


@router.get("/triage-case/{case_id}")
def export_triage_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = export_triage_case_report(db, case_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Triage case not found")
    create_event(
        db=db,
        event_type="TRIAGE_CASE_EXPORTED",
        actor_id=current_user.id,
        case_id=case_id,
        event_data={"format": "json"},
    )
    return report


@router.get("/downtime-report")
def export_full_downtime_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = build_full_downtime_report(db)
    create_event(
        db=db,
        event_type="DOWNTIME_REPORT_EXPORTED",
        actor_id=current_user.id,
        event_data={"format": "json"},
    )
    return report


@router.get("/downtime-report/pdf")
def export_full_downtime_report_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = build_full_downtime_report(db)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    filename = f"blackoutcare-downtime-report_{timestamp}.pdf"

    create_event(
        db=db,
        event_type="DOWNTIME_REPORT_EXPORTED",
        actor_id=current_user.id,
        event_data={"format": "pdf", "filename": filename},
    )
    return _pdf_response(report, filename)


@router.get("/incidents/{incident_id}")
def export_incident_report(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = build_incident_report(db, incident_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    create_event(
        db=db,
        event_type="INCIDENT_REPORT_EXPORTED",
        actor_id=current_user.id,
        event_data={"incident_id": incident_id, "format": "json"},
    )
    return report


@router.get("/incidents/{incident_id}/pdf")
def export_incident_report_pdf(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = build_incident_report(db, incident_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    filename = f"incident-{incident_id}-downtime-report_{timestamp}.pdf"
    create_event(
        db=db,
        event_type="INCIDENT_REPORT_EXPORTED",
        actor_id=current_user.id,
        event_data={"incident_id": incident_id, "format": "pdf", "filename": filename},
    )
    return _pdf_response(report, filename)


@router.get("/triage-case/{case_id}/pdf")
def export_case_pdf(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = export_triage_case_report(db, case_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Triage case not found")

    patient_code = report["patient"]["patient_code"] or "unknown"
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    filename = f"case-{case_id}_{patient_code}_{timestamp}.pdf"

    create_event(
        db=db,
        event_type="TRIAGE_CASE_EXPORTED",
        actor_id=current_user.id,
        case_id=case_id,
        event_data={"format": "pdf", "filename": filename},
    )
    return _pdf_response(report, filename)


def _pdf_response(report: dict, filename: str) -> StreamingResponse:
    pdf_buffer = generate_downtime_pdf(report)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
