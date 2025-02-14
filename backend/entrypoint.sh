#!/bin/bash
set -e

# Wait for the database to be ready
until pg_isready -h db -p 5432 -U graspop; do
  echo "Waiting for database..."
  sleep 2
done

echo "Database is ready"

# Run database migrations
alembic upgrade head

# Initialize database with bands data if needed
python init_db.py

# Start the application
exec uvicorn main:app --host 0.0.0.0 --port 3001 --reload