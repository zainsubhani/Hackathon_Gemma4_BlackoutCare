from app.core.security import verify_password
from app.users import crud as user_crud
from app.users.crud import get_user_by_staff_code
from app.users.schemas import UserCreate


def test_create_user_hashes_password_and_login_returns_token(client, db_session):
    response = client.post(
        "/users/",
        json={
            "full_name": "Dr. Aisha Rahman",
            "role": "doctor",
            "department": "Emergency",
            "staff_code": "doc-900",
            "password": "password123",
        },
    )

    assert response.status_code == 200
    assert response.json()["staff_code"] == "DOC-900"
    assert "password" not in response.json()

    user = get_user_by_staff_code(db_session, "DOC-900")
    assert user.hashed_password != "password123"
    assert verify_password("password123", user.hashed_password)

    login_response = client.post(
        "/auth/login",
        json={"staff_code": "DOC-900", "password": "password123"},
    )

    assert login_response.status_code == 200
    assert login_response.json()["token_type"] == "bearer"
    assert login_response.json()["access_token"]


def test_protected_patient_list_requires_bearer_token(client):
    response = client.get("/patients/")

    assert response.status_code == 401


def test_me_returns_authenticated_user(client, auth_headers):
    response = client.get("/auth/me", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["staff_code"] == "DOC-TEST"


def test_forgot_password_resets_password_with_master_password(client):
    create_response = client.post(
        "/users/",
        json={
            "full_name": "Nurse Jamie Lee",
            "role": "nurse",
            "department": "Emergency",
            "staff_code": "nurse-321",
            "password": "oldpassword",
        },
    )
    assert create_response.status_code == 200

    reset_response = client.post(
        "/auth/forgot-password",
        json={
            "staff_code": "nurse-321",
            "master_password": "blackoutcare-admin-reset",
            "new_password": "newpassword123",
        },
    )

    assert reset_response.status_code == 200
    reset_body = reset_response.json()
    assert reset_body["staff_code"] == "NURSE-321"
    assert "temporary_password" not in reset_body

    old_login_response = client.post(
        "/auth/login",
        json={"staff_code": "NURSE-321", "password": "oldpassword"},
    )
    assert old_login_response.status_code == 401

    new_login_response = client.post(
        "/auth/login",
        json={
            "staff_code": "NURSE-321",
            "password": "newpassword123",
        },
    )

    assert new_login_response.status_code == 200
    assert new_login_response.json()["access_token"]


def test_forgot_password_rejects_invalid_master_password(client):
    create_response = client.post(
        "/users/",
        json={
            "full_name": "Nurse Mira Khan",
            "role": "nurse",
            "department": "Emergency",
            "staff_code": "nurse-654",
            "password": "oldpassword",
        },
    )
    assert create_response.status_code == 200

    reset_response = client.post(
        "/auth/forgot-password",
        json={
            "staff_code": "NURSE-654",
            "master_password": "wrong-master",
            "new_password": "newpassword123",
        },
    )

    assert reset_response.status_code == 403

    old_login_response = client.post(
        "/auth/login",
        json={"staff_code": "NURSE-654", "password": "oldpassword"},
    )
    assert old_login_response.status_code == 200


def test_authenticated_user_can_change_password(client):
    create_response = client.post(
        "/users/",
        json={
            "full_name": "Dr. Password Change",
            "role": "doctor",
            "department": "Emergency",
            "staff_code": "doc-change",
            "password": "oldpassword",
        },
    )
    assert create_response.status_code == 200

    login_response = client.post(
        "/auth/login",
        json={"staff_code": "DOC-CHANGE", "password": "oldpassword"},
    )
    assert login_response.status_code == 200
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    change_response = client.post(
        "/auth/change-password",
        headers=headers,
        json={"current_password": "oldpassword", "new_password": "newpassword123"},
    )
    assert change_response.status_code == 200

    old_login_response = client.post(
        "/auth/login",
        json={"staff_code": "DOC-CHANGE", "password": "oldpassword"},
    )
    assert old_login_response.status_code == 401

    new_login_response = client.post(
        "/auth/login",
        json={"staff_code": "DOC-CHANGE", "password": "newpassword123"},
    )
    assert new_login_response.status_code == 200


def test_audit_events_require_admin_or_coordinator(client, db_session, auth_headers):
    blocked = client.get("/events/", headers=auth_headers)
    assert blocked.status_code == 403

    admin = user_crud.create_user(
        db_session,
        UserCreate(
            full_name="Audit Admin",
            role="admin",
            department="Ops",
            staff_code="audit-admin",
            password="password123",
        ),
    )
    login_response = client.post(
        "/auth/login",
        json={"staff_code": admin.staff_code, "password": "password123"},
    )
    assert login_response.status_code == 200

    allowed = client.get(
        "/events/",
        headers={"Authorization": f"Bearer {login_response.json()['access_token']}"},
    )
    assert allowed.status_code == 200
