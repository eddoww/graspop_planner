from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, ARRAY, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    ratings = relationship("Rating", back_populates="user")

class Band(Base):
    __tablename__ = "bands"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    day = Column(String)
    stage = Column(String)
    start_time = Column(String, nullable=True)  # Format: "14:30"
    end_time = Column(String, nullable=True)    # Format: "15:30"
    genres = Column(ARRAY(String))
    facts = Column(ARRAY(String))
    suggested_songs = Column(ARRAY(String))
    ratings = relationship("Rating", back_populates="band")

class Rating(Base):
    __tablename__ = "ratings"
    
    id = Column(Integer, primary_key=True, index=True)
    rating = Column(Integer)
    notes = Column(String, nullable=True)
    listened = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    band_id = Column(Integer, ForeignKey("bands.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="ratings")
    band = relationship("Band", back_populates="ratings")