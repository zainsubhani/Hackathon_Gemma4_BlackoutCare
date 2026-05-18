import requests

from app.triage import service as triage_service


def test_triage_ai_failure_returns_saved_safe_fallback(client, auth_headers, monkeypatch):
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

    monkeypatch.setattr(triage_service, "call_gemma", raise_timeout)

    analyze_response = client.post(
        f"/triage/cases/{case_response.json()['id']}/analyze",
        headers=auth_headers,
    )

    assert analyze_response.status_code == 200
    body = analyze_response.json()
    assert body["recommendation_id"]
    assert body["ai_output"]["source"] == "safe fallback"
    assert body["ai_output"]["confidence"] == "low"
    assert body["ai_output"]["recommended_actions"]
    assert body["ai_output"]["warnings"]
