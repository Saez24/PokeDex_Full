from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.pokemon import Pokemon

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/pokemon")
def get_pokemon(db: Session = Depends(get_db)):
    return db.query(Pokemon).all()