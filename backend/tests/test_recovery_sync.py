from app.users import crud as user_crud
from app.users.schemas import UserCreate


def test_recovery_preview_status_update_and_fhir_bundle(client, db_session, auth_headers):
    admin = user_crud.create_user(
        db_session,
        UserCreate(
            full_name="Recovery Admin",
            role="admin",
            department="Recovery",
            staff_code="REC-ADMIN",
            password="password123",
        ),
    )
    login_response = client.post(
        "/auth/login",
        json={"staff_code": admin.staff_code, "password": "password123"},
    )
    admin_headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    incident_response = client.post(
        "/incidents/",
        headers=admin_headers,
        json={"name": "Recovery Sync Incident", "hospital_unit": "ED"},
    )
    assert incident_response.status_code == 200
    incident_id = incident_response.json()["id"]

    patient_response = client.post(
        "/patients/",
        headers=auth_headers,
        json={"patient_code": "REC-P-1", "full_name": "Recovery Patient"},
    )
    assert patient_response.status_code == 200

    case_response = client.post(
        "/triage/cases/",
        headers=auth_headers,
        json={
            "patient_id": patient_response.json()["id"],
            "chief_complaint": "Recovery chest pain",
            "urgency_level": "urgent",
            "status": "closed",
        },
    )
    assert case_response.status_code == 200

    preview_response = client.get(
        f"/recovery/incidents/{incident_id}/sync-preview",
        headers=admin_headers,
    )
    assert preview_response.status_code == 200
    preview = preview_response.json()
    assert preview["summary"]["total_items"] >= 2
    patient_item = next(item for item in preview["items"] if item["item_type"] == "patient")

    update_response = client.patch(
        "/recovery/sync-status",
        headers=admin_headers,
        json={
            "item_type": "patient",
            "item_id": patient_item["item_id"],
            "sync_status": "synced",
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["sync_status"] == "synced"

    bundle_response = client.get(
        f"/recovery/incidents/{incident_id}/fhir-bundle",
        headers=admin_headers,
    )
    assert bundle_response.status_code == 200
    bundle = bundle_response.json()
    assert bundle["resourceType"] == "Bundle"
    assert any(entry["resource"]["resourceType"] == "Patient" for entry in bundle["entry"])


def test_recovery_requires_admin_or_coordinator(client, auth_headers):
    response = client.get("/recovery/incidents/1/sync-preview", headers=auth_headers)
    assert response.status_code == 403
