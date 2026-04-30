from app.users import crud as user_crud
from app.users.schemas import UserCreate


def test_protocol_search_returns_keyword_matches(client, db_session, auth_headers):
    create_response = client.post(
        "/protocols/",
        headers=auth_headers,
        json={
            "title": "Chest Pain Downtime Protocol",
            "category": "emergency",
            "trigger_keywords": "chest pain, hypotension, shortness of breath",
            "content": "Assess airway, breathing, circulation and escalate unstable patients.",
            "version": "v1",
        },
    )
    assert create_response.status_code == 403

    user_crud.create_user(
        db_session,
        UserCreate(
            full_name="Admin User",
            role="admin",
            department="Operations",
            staff_code="ADMIN-1",
            password="password123",
        ),
    )

    login_response = client.post(
        "/auth/login",
        json={"staff_code": "ADMIN-1", "password": "password123"},
    )
    admin_headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    create_response = client.post(
        "/protocols/",
        headers=admin_headers,
        json={
            "title": "Chest Pain Downtime Protocol",
            "category": "emergency",
            "trigger_keywords": "chest pain, hypotension, shortness of breath",
            "content": "Assess airway, breathing, circulation and escalate unstable patients.",
            "version": "v1",
        },
    )
    assert create_response.status_code == 200

    search_response = client.post(
        "/protocols/search",
        headers=auth_headers,
        json={"query": "Patient has chest pain and hypotension"},
    )

    assert search_response.status_code == 200
    results = search_response.json()
    assert results[0]["title"] == "Chest Pain Downtime Protocol"
    assert "chest pain" in results[0]["matched_keywords"]


def test_pdf_export_returns_pdf(client, auth_headers):
    response = client.get("/exports/downtime-report/pdf", headers=auth_headers)

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
