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
    # Load bands from JSON file
    with open('bands.json', 'r') as f:
        bands_data = json.load(f)

    # Get existing bands
    existing_bands = {band.name: band for band in session.query(Band).all()}
    
    bands_added = 0
    bands_updated = 0

    # Insert or update bands
    for band_data in bands_data:
        band_name = band_data['name']
        
        if band_name in existing_bands:
            # Update existing band
            existing_band = existing_bands[band_name]
            existing_band.day = band_data['day']
            existing_band.stage = band_data['stage']
            existing_band.genres = band_data['genres']
            existing_band.facts = band_data['facts']
            existing_band.suggested_songs = band_data['suggestedSongs']
            bands_updated += 1
        else:
            # Add new band
            band = Band(
                name=band_data['name'],
                day=band_data['day'],
                stage=band_data['stage'],
                genres=band_data['genres'],
                facts=band_data['facts'],
                suggested_songs=band_data['suggestedSongs']
            )
            session.add(band)
            bands_added += 1

    session.commit()
    print(f"Bands processed: {bands_added} added, {bands_updated} updated")

if __name__ == "__main__":
    init_bands()