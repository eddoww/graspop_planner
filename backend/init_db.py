# init_db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Band
import json
import os

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://graspop:graspoppass@db/graspop")
engine = create_engine(DATABASE_URL)

# Create tables
Base.metadata.create_all(engine)

# Create session
SessionLocal = sessionmaker(bind=engine)
session = SessionLocal()

def init_bands():
    # Check if bands already exist
    if session.query(Band).first():
        print("Bands already initialized")
        return

    # Load bands from JSON file
    with open('bands.json', 'r') as f:
        bands_data = json.load(f)

    # Insert bands
    for band_data in bands_data:
        band = Band(
            name=band_data['name'],
            day=band_data['day'],
            stage=band_data['stage'],
            genres=band_data['genres'],
            facts=band_data['facts'],
            suggested_songs=band_data['suggestedSongs']
        )
        session.add(band)

    session.commit()
    print(f"Initialized {len(bands_data)} bands")

if __name__ == "__main__":
    init_bands()