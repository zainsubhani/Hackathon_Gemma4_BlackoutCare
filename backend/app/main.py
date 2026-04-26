from fastapi import FastAPI

from app.core.database import Base, engine
from app.users.router import router as users_router

# Important: import models before create_all
from app.users import models as users_models  # noqa: F401

app = FastAPI(
    title="CareContinuum API",
    description="Offline AI downtime OS for hospital clinical workflows",
    version="0.1.0",
)

Base.metadata.create_all(bind=engine)

app.include_router(users_router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "carecontinuum-backend",
        "mode": "downtime-ready",
    }