#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting server..."

# Development mode (--reload flag)
if [ "$1" = "--reload" ]; then
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Production mode (use worker processes)
else
    WORKERS=${UVICORN_WORKERS:-1}
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "$WORKERS"
fi
