from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.database import get_db
from app.recovery import schemas, service
from app.users.models import User

router = APIRouter(prefix="/recovery", tags=["recovery"])


@router.get("/incidents/{incident_id}/sync-preview")
def sync_preview(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
):
    return service.build_sync_preview(db, incident_id)


@router.get("/incidents/{incident_id}/fhir-bundle")
def fhir_bundle(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
):
    return service.build_fhir_bundle(db, incident_id)


@router.patch("/sync-status")
def update_sync_status(
    payload: schemas.RecoveryStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
):
    return service.update_sync_status(db, payload, actor_id=current_user.id)
