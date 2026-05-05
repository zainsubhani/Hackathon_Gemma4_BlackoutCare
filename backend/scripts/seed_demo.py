import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.ai import models as ai_models 
from app.core.database import Base, SessionLocal, engine
from app.events import models as events_models 
from app.main import ensure_development_schema
from app.patients import crud as patient_crud
from app.patients.schemas import AllergyStatus, Gender, PatientCreate
from app.protocols import crud as protocol_crud
from app.protocols.schemas import ProtocolCreate
from app.triage import crud as triage_crud
from app.triage.schemas import CaseStatus, TriageCaseCreate, UrgencyLevel
from app.users import crud as user_crud
from app.users.models import User
from app.users.schemas import UserCreate


DEMO_STAFF_CODE = "DOC-900"
ADMIN_STAFF_CODE = "ADMIN-900"
DEMO_PATIENT_CODE = "P-1001"
DEMO_PASSWORD = "password123"


def main():
    Base.metadata.create_all(bind=engine)
    ensure_development_schema()

    db = SessionLocal()
    try:
        doctor = user_crud.get_user_by_staff_code(db, DEMO_STAFF_CODE)
        if not doctor:
            doctor = user_crud.create_user(
                db,
                UserCreate(
                    full_name="Dr. Aisha Rahman",
                    role="doctor",
                    department="Emergency",
                    staff_code=DEMO_STAFF_CODE,
                    password=DEMO_PASSWORD,
                ),
            )

        admin = user_crud.get_user_by_staff_code(db, ADMIN_STAFF_CODE)
        if not admin:
            admin = user_crud.create_user(
                db,
                UserCreate(
                    full_name="BlackoutCare Administrator",
                    role="admin",
                    department="Operations",
                    staff_code=ADMIN_STAFF_CODE,
                    password=DEMO_PASSWORD,
                ),
            )

        patient = patient_crud.get_patient_by_code(db, DEMO_PATIENT_CODE)
        if not patient:
            patient = patient_crud.create_patient(
                db,
                PatientCreate(
                    patient_code=DEMO_PATIENT_CODE,
                    full_name="Demo Patient",
                    age=67,
                    gender=Gender.unknown,
                    allergy_status=AllergyStatus.unknown,
                    known_conditions="Hypertension",
                    current_medications="Unknown during downtime",
                ),
                actor_id=doctor.id,
            )

        _ensure_protocol(db)
        case = _ensure_triage_case(db, doctor, patient)

        print("Seed data ready")
        print(f"Admin staff_code: {ADMIN_STAFF_CODE}")
        print(f"Admin password: {DEMO_PASSWORD}")
        print(f"Doctor staff_code: {DEMO_STAFF_CODE}")
        print(f"Doctor password: {DEMO_PASSWORD}")
        print(f"Patient code: {DEMO_PATIENT_CODE}")
        print(f"Triage case id: {case.id}")
    finally:
        db.close()


def _ensure_protocol(db):
    existing = protocol_crud.search_protocols(
        db,
        "chest pain shortness of breath hypotension tachycardia",
    )
    if existing:
        return existing[0]["protocol"]

    return protocol_crud.create_protocol(
        db,
        ProtocolCreate(
            title="Emergency Chest Pain Downtime Protocol",
            category="emergency",
            trigger_keywords="chest pain, shortness of breath, hypotension, tachycardia",
            content=(
                "Assess airway, breathing, circulation. Obtain vital signs. "
                "Escalate immediately for unstable vitals. Document uncertainty, "
                "allergies, medications, and handoff actions."
            ),
            version="v1",
        ),
    )


def _ensure_triage_case(db, doctor: User, patient):
    existing_cases = triage_crud.get_triage_cases(db)
    for case in existing_cases:
        if case.patient_id == patient.id and case.chief_complaint == "Chest pain":
            return case

    return triage_crud.create_triage_case(
        db,
        TriageCaseCreate(
            patient_id=patient.id,
            chief_complaint="Chest pain",
            symptoms="Shortness of breath and diaphoresis",
            vitals="BP 88/54, HR 122, SpO2 91%",
            urgency_level=UrgencyLevel.critical,
            status=CaseStatus.active,
        ),
        created_by=doctor.id,
    )


if __name__ == "__main__":
    main()
