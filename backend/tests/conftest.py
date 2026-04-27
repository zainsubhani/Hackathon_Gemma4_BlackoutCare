import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

os.environ["DATABASE_URL"] = "sqlite://"

from app.ai import models as ai_models  # noqa: E402,F401
from app.core.database import Base, get_db  # noqa: E402
from app.events import models as events_models  # noqa: E402,F401
from app.main import app  # noqa: E402
from app.patients import models as patient_models  # noqa: E402,F401
from app.protocols import models as protocol_models  # noqa: E402,F401
from app.triage import models as triage_models  # noqa: E402,F401
from app.users import models as user_models  # noqa: E402,F401


test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture()
def db_session():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers(client):
    response = client.post(
        "/users/",
        json={
            "full_name": "Dr. Test User",
            "role": "doctor",
            "department": "Emergency",
            "staff_code": "DOC-TEST",
            "password": "password123",
        },
    )
    assert response.status_code == 200

    login_response = client.post(
        "/auth/login",
        json={"staff_code": "DOC-TEST", "password": "password123"},
    )
    assert login_response.status_code == 200

    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
