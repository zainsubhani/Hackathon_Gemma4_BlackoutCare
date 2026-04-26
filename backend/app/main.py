from fastapi import FastAPI

from app.core.database import Base, engine
from app.users.router import router as users_router
from app.events.router import router as events_router
from app.events import models as events_models  
from app.users import models as users_models  #
from app.patients.router import router as patients_router
from app.triage.router import router as triage_router
from app.triage import models as triage_models  
from app.ai import model as ai_model 
from app.protocols.router import router as protocols_router
from app.protocols import models as protocols_models  



app = FastAPI(
    title="CareContinuum API",
    description="Offline AI downtime OS for hospital clinical workflows",
    version="0.1.0",
)

Base.metadata.create_all(bind=engine)

app.include_router(users_router)
app.include_router(patients_router)
app.include_router(triage_router)
app.include_router(events_router)
app.include_router(protocols_router)



@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "carecontinuum-backend",
        "mode": "downtime-ready",
    }
