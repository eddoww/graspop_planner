from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import os

# Import models
from models.models import Base, User, Band, Rating

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://graspop:graspoppass@db/graspop")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Pydantic models
class UserBase(BaseModel):
    name: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    
    class Config:
        from_attributes = True

class RatingBase(BaseModel):
    rating: Optional[int] = None
    notes: Optional[str] = None
    listened: bool = False

class RatingCreate(RatingBase):
    band_id: int

class RatingUpdate(RatingBase):
    pass

class RatingResponse(RatingBase):
    id: int
    user_id: int
    band_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# FastAPI app
app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/users/", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@app.post("/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = User(name=user.name)
    db.add(db_user)
    try:
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/bands/")
def get_bands(db: Session = Depends(get_db)):
    """Get all bands with their ratings"""
    bands = db.query(Band).all()
    return bands

@app.get("/users/{user_id}/ratings/", response_model=List[RatingResponse])
def get_user_ratings(user_id: int, db: Session = Depends(get_db)):
    """Get all ratings for a specific user"""
    return db.query(Rating).filter(Rating.user_id == user_id).all()

@app.post("/users/{user_id}/ratings/", response_model=RatingResponse)
def create_rating(
    user_id: int,
    rating: RatingCreate,
    db: Session = Depends(get_db)
):
    """Create or update a rating for a band"""
    # Check if band exists
    if not db.query(Band).filter(Band.id == rating.band_id).first():
        raise HTTPException(status_code=404, detail="Band not found")

    # Check if user exists
    if not db.query(User).filter(User.id == user_id).first():
        raise HTTPException(status_code=404, detail="User not found")

    # Check if rating already exists
    db_rating = db.query(Rating).filter(
        Rating.user_id == user_id,
        Rating.band_id == rating.band_id
    ).first()

    if db_rating:
        # Update existing rating
        for key, value in rating.dict(exclude={'band_id'}).items():
            setattr(db_rating, key, value)
        db_rating.updated_at = datetime.utcnow()
    else:
        # Create new rating
        db_rating = Rating(
            user_id=user_id,
            **rating.dict()
        )
        db.add(db_rating)

    try:
        db.commit()
        db.refresh(db_rating)
        return db_rating
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/users/{user_id}/ratings/{band_id}", response_model=RatingResponse)
def update_rating(
    user_id: int,
    band_id: int,
    rating: RatingUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing rating"""
    db_rating = db.query(Rating).filter(
        Rating.user_id == user_id,
        Rating.band_id == band_id
    ).first()

    if not db_rating:
        raise HTTPException(status_code=404, detail="Rating not found")

    for key, value in rating.dict(exclude_unset=True).items():
        setattr(db_rating, key, value)
    
    db_rating.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(db_rating)
        return db_rating
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/users/{user_id}/ratings/{band_id}")
def delete_rating(
    user_id: int,
    band_id: int,
    db: Session = Depends(get_db)
):
    """Delete a rating"""
    db_rating = db.query(Rating).filter(
        Rating.user_id == user_id,
        Rating.band_id == band_id
    ).first()

    if not db_rating:
        raise HTTPException(status_code=404, detail="Rating not found")

    try:
        db.delete(db_rating)
        db.commit()
        return {"message": "Rating deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))