from sqlalchemy import Column, Integer, String
from app.db.base import Base

class Pokemon(Base):
    __tablename__ = "pokemon"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    height = Column(Integer)
    weight = Column(Integer)