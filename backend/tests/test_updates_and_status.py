from app.users import crud as user_crud
from app.users.schemas import UserCreate


def test_create_user_requires_admin_after_bootstrap(client):
    first_user = client.post(
        "/users/",
        json={
            "full_name": "Admin User",
            "role": "admin",
            "department": "Ops",
            "staff_code": "ADMIN-1",
            "password": "password123",
        },
    )
    assert first_user.status_code == 200

    blocked = client.post(
        "/users/",
        json={
            "full_name": "Open User",
            "role": "doctor",
            "department": "Emergency",
            "staff_code": "DOC-OPEN",
            "password": "password123",
        },
    )
    assert blocked.status_code == 403

    login = client.post(
        "/auth/login",
        json={"staff_code": "ADMIN-1", "password": "password123"},
    )
    token = login.json()["access_token"]
    created = client.post(
        "/users/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Created User",
            "role": "doctor",
            "department": "Emergency",
            "staff_code": "DOC-CREATED",
            "password": "password123",
        },
    )
    assert created.status_code == 200


def test_patient_protocol_and_triage_updates(client, db_session, auth_headers):
    admin = user_crud.create_user(
        db_session,
        UserCreate(
            full_name="Admin Two",
            role="admin",
            department="Ops",
            staff_code="ADMIN-2",
            password="password123",
        ),
    )
    login = client.post(
        "/auth/login",
        json={"staff_code": admin.staff_code, "password": "password123"},
    )
    admin_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    patient = client.post(
        "/patients/",
        headers=auth_headers,
        json={"patient_code": "P-UPD", "full_name": "Original"},
    ).json()
    updated_patient = client.patch(
        f"/patients/{patient['id']}",
        headers=auth_headers,
        json={"full_name": "Updated Patient", "age": 45},
    )
    assert updated_patient.status_code == 200
    assert updated_patient.json()["full_name"] == "Updated Patient"

    protocol = client.post(
        "/protocols/",
        headers=admin_headers,
        json={
            "title": "Original Protocol",
            "category": "emergency",
            "trigger_keywords": "pain",
            "content": "Follow downtime emergency protocol.",
            "version": "v1",
        },
    ).json()
    updated_protocol = client.patch(
        f"/protocols/{protocol['id']}",
        headers=admin_headers,
        json={"title": "Updated Protocol"},
    )
    assert updated_protocol.status_code == 200
    assert updated_protocol.json()["title"] == "Updated Protocol"

    triage = client.post(
        "/triage/cases/",
        headers=auth_headers,
        json={
            "patient_id": patient["id"],
            "chief_complaint": "Pain",
            "urgency_level": "unassigned",
            "status": "active",
        },
    ).json()
    updated_triage = client.patch(
        f"/triage/cases/{triage['id']}",
        headers=auth_headers,
        json={"chief_complaint": "Updated pain", "urgency_level": "urgent"},
    )
    assert updated_triage.status_code == 200
    assert updated_triage.json()["urgency_level"] == "urgent"


def test_status_reports_missing_ollama_model(client, monkeypatch):
    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"models": [{"name": "other-model"}]}

    monkeypatch.setattr("app.main.requests.get", lambda *args, **kwargs: Response())

    response = client.get("/status")
    assert response.status_code == 200
    assert response.json()["ollama"] == "model_missing"
