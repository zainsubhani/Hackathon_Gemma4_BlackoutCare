from app.events.models import Event


def test_patient_creation_writes_audit_event(client, auth_headers, db_session):
    response = client.post(
        "/patients/",
        headers=auth_headers,
        json={
            "patient_code": "P-AUDIT-1",
            "full_name": "Audit Patient",
            "age": 42,
            "gender": "unknown",
            "allergy_status": "unknown",
        },
    )

    assert response.status_code == 200

    event = (
        db_session.query(Event)
        .filter(Event.event_type == "PATIENT_CREATED")
        .one()
    )
    assert event.actor_id is not None
    assert "P-AUDIT-1" in event.event_data


def test_triage_status_update_writes_audit_event(client, auth_headers, db_session):
    patient_response = client.post(
        "/patients/",
        headers=auth_headers,
        json={
            "patient_code": "P-AUDIT-2",
            "full_name": "Triage Audit Patient",
            "gender": "unknown",
            "allergy_status": "unknown",
        },
    )
    assert patient_response.status_code == 200

    case_response = client.post(
        "/triage/cases/",
        headers=auth_headers,
        json={
            "patient_id": patient_response.json()["id"],
            "chief_complaint": "Weakness",
            "symptoms": "Dizziness",
            "vitals": "BP 100/70",
            "urgency_level": "urgent",
            "status": "active",
        },
    )
    assert case_response.status_code == 200

    update_response = client.patch(
        f"/triage/cases/{case_response.json()['id']}/status",
        headers=auth_headers,
        json={"status": "monitoring"},
    )
    assert update_response.status_code == 200

    event = (
        db_session.query(Event)
        .filter(Event.event_type == "TRIAGE_STATUS_UPDATED")
        .one()
    )
    assert event.case_id == case_response.json()["id"]
    assert "monitoring" in event.event_data


def test_json_export_writes_audit_event(client, auth_headers, db_session):
    response = client.get("/exports/downtime-report", headers=auth_headers)

    assert response.status_code == 200

    event = (
        db_session.query(Event)
        .filter(Event.event_type == "DOWNTIME_REPORT_EXPORTED")
        .one()
    )
    assert event.actor_id is not None
    assert "json" in event.event_data
