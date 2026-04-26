from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.protocols import crud, schemas

router = APIRouter(prefix="/protocols", tags=["protocols"])


@router.post("/", response_model=schemas.ProtocolResponse)
def create_protocol(protocol: schemas.ProtocolCreate, db: Session = Depends(get_db)):
    return crud.create_protocol(db, protocol)


@router.get("/", response_model=list[schemas.ProtocolResponse])
def get_protocols(db: Session = Depends(get_db)):
    return crud.get_protocols(db)


@router.get("/{protocol_id}", response_model=schemas.ProtocolResponse)
def get_protocol(protocol_id: int, db: Session = Depends(get_db)):
    protocol = crud.get_protocol(db, protocol_id)

    if not protocol:
        raise HTTPException(status_code=404, detail="Protocol not found")

    return protocol


@router.post("/search", response_model=list[schemas.ProtocolResponse])
def search_protocols(
    payload: schemas.ProtocolSearchRequest,
    db: Session = Depends(get_db),
):
    return crud.search_protocols(db, payload.query)