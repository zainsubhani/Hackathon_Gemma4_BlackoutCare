import requests

from app.triage import crud as triage_crud


def test_triage_ai_failure_returns_safe_503(client, auth_headers, monkeypatch):
    patient_response = client.post(
        "/patients/",
        headers=auth_headers,
        json={
            "patient_code": "P-1001",
            "full_name": "Demo Patient",
            "age": 67,
            "gender": "unknown",
            "allergy_status": "unknown",
            "known_conditions": "Hypertension",
            "current_medications": "Unknown",
        },
    )
    assert patient_response.status_code == 200

    case_response = client.post(
        "/triage/cases/",
        headers=auth_headers,
        json={
            "patient_id": patient_response.json()["id"],
            "created_by": 999,
            "chief_complaint": "Chest pain",
            "symptoms": "Shortness of breath",
            "vitals": "BP 88/54, HR 122",
            "urgency_level": "critical",
            "status": "active",
        },
    )
    assert case_response.status_code == 200

    def raise_timeout(prompt: str):
        raise requests.Timeout("Ollama timed out")

    monkeypatch.setattr(triage_crud, "call_gemma", raise_timeout)

    analyze_response = client.post(
        f"/triage/cases/{case_response.json()['id']}/analyze",
        headers=auth_headers,
    )

    assert analyze_response.status_code == 503
    detail = analyze_response.json()["detail"]
    assert detail["message"] == "AI recommendation service unavailable"
    assert detail["safe_fallback"]
