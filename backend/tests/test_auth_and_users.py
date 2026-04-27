from app.core.security import verify_password
from app.users.crud import get_user_by_staff_code


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
