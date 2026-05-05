from app.ai.models import AIRecommendation
from app.users import crud as user_crud
from app.users.schemas import UserCreate


def test_dashboard_summary_counts_resources(client, db_session, auth_headers):
    patient_response = client.post(
        "/patients/",
        headers=auth_headers,
        json={
            "patient_code": "P-SUMMARY-1",
            "full_name": "Summary Patient",
            "age": 45,
            "gender": "female",
            "allergy_status": "unknown",
        },
    )
    assert patient_response.status_code == 200

    case_response = client.post(
        "/triage/cases/",
        headers=auth_headers,
        json={
            "patient_id": patient_response.json()["id"],
            "chief_complaint": "Chest pain",
            "urgency_level": "critical",
            "status": "active",
        },
    )
    assert case_response.status_code == 200

    user_crud.create_user(
        db_session,
        UserCreate(
            full_name="Admin User",
            role="admin",
            department="Operations",
            staff_code="ADMIN-SUM",
            password="password123",
        ),
    )
    admin_login = client.post(
        "/auth/login",
        json={"staff_code": "ADMIN-SUM", "password": "password123"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    client.post(
        "/protocols/",
        headers=admin_headers,
        json={
            "title": "Summary Protocol",
            "category": "emergency",
            "trigger_keywords": "chest pain",
            "content": "Assess airway, breathing, and circulation.",
            "version": "v1",
        },
    )

    response = client.get("/dashboard/summary", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["patients"] == 1
    assert response.json()["triage_cases"] == 1
    assert response.json()["critical_active_cases"] == 1
    assert response.json()["protocols"] == 1


def test_safety_board_surfaces_operational_risks(client, db_session, auth_headers):
    patient_response = client.post(
        "/patients/",
        headers=auth_headers,
        json={
            "patient_code": "P-SAFETY-1",
            "full_name": "Safety Patient",
            "allergy_status": "unknown",
        },
    )
    assert patient_response.status_code == 200

    case_response = client.post(
        "/triage/cases/",
        headers=auth_headers,
        json={
            "patient_id": patient_response.json()["id"],
            "chief_complaint": "Severe shortness of breath",
            "urgency_level": "critical",
            "status": "active",
        },
    )
    assert case_response.status_code == 200

    db_session.add(
        AIRecommendation(
            case_id=case_response.json()["id"],
            urgency="critical",
            risk_summary="High risk respiratory distress",
            recommended_actions="Escalate immediately",
            confidence="high",
            review_status="pending",
        )
    )
    db_session.commit()

    response = client.get("/operations/safety-board", headers=auth_headers)

    assert response.status_code == 200
    board = response.json()
    assert board["summary"]["critical_cases"] == 1
    assert board["summary"]["unknown_allergies"] == 1
    assert board["summary"]["pending_ai_reviews"] == 1
    assert board["critical_cases"][0]["patient_label"] == "P-SAFETY-1"
