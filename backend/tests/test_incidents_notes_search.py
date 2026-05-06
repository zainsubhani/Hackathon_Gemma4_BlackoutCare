from app.ai.crud import create_ai_recommendation
from app.users import crud as user_crud
from app.users.schemas import UserCreate


def test_incident_notes_review_search_and_export(client, db_session, auth_headers):
    incident_response = client.post(
        "/incidents/",
        headers=auth_headers,
        json={"name": "Ransomware downtime", "hospital_unit": "Emergency"},
    )
    assert incident_response.status_code == 403

    admin = user_crud.create_user(
        db_session,
        UserCreate(
            full_name="Incident Admin",
            role="admin",
            department="Ops",
            staff_code="INC-ADMIN",
            password="password123",
        ),
    )
    admin_login = client.post(
        "/auth/login",
        json={"staff_code": admin.staff_code, "password": "password123"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    incident_response = client.post(
        "/incidents/",
        headers=admin_headers,
        json={"name": "Ransomware downtime", "hospital_unit": "Emergency"},
    )
    assert incident_response.status_code == 200
    incident_id = incident_response.json()["id"]

    patient_response = client.post(
        "/patients/",
        headers=auth_headers,
        json={"patient_code": "INC-P-1", "full_name": "Incident Patient"},
    )
    assert patient_response.status_code == 200
    assert patient_response.json()["incident_id"] == incident_id

    case_response = client.post(
        "/triage/cases/",
        headers=auth_headers,
        json={
            "patient_id": patient_response.json()["id"],
            "chief_complaint": "Incident chest pain",
            "urgency_level": "critical",
            "status": "active",
        },
    )
    assert case_response.status_code == 200
    assert case_response.json()["incident_id"] == incident_id
    case_id = case_response.json()["id"]

    note_response = client.post(
        f"/triage/cases/{case_id}/notes/",
        headers=auth_headers,
        json={"note_type": "vitals", "content": "BP 90/60, HR 118"},
    )
    assert note_response.status_code == 200

    search_response = client.get("/operations/search?q=Incident", headers=auth_headers)
    assert search_response.status_code == 200
    assert search_response.json()["patients"]

    blocked_report_response = client.get(f"/exports/incidents/{incident_id}", headers=auth_headers)
    assert blocked_report_response.status_code == 403

    report_response = client.get(f"/exports/incidents/{incident_id}", headers=admin_headers)
    assert report_response.status_code == 200
    report = report_response.json()
    assert report["incident"]["id"] == incident_id
    assert report["case_notes"][0]["content"] == "BP 90/60, HR 118"


def test_ai_recommendation_review_endpoint(client, db_session, auth_headers):
    patient_response = client.post(
        "/patients/",
        headers=auth_headers,
        json={"patient_code": "AI-REVIEW-P", "full_name": "AI Review Patient"},
    )
    case_response = client.post(
        "/triage/cases/",
        headers=auth_headers,
        json={
            "patient_id": patient_response.json()["id"],
            "chief_complaint": "Headache",
            "urgency_level": "stable",
            "status": "active",
        },
    )
    recommendation = create_ai_recommendation(
        db_session,
        case_response.json()["id"],
        {
            "urgency": "stable",
            "risk_summary": "Low risk",
            "recommended_actions": ["Monitor"],
            "warnings": [],
            "confidence": "medium",
            "source": "test",
        },
    )

    review_response = client.patch(
        f"/ai/recommendations/{recommendation.id}/review",
        headers=auth_headers,
        json={"review_status": "accepted", "review_note": "Clinician reviewed."},
    )
    assert review_response.status_code == 200
    assert review_response.json()["review_status"] == "accepted"
    assert review_response.json()["review_note"] == "Clinician reviewed."
