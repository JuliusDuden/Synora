#!/bin/bash
set -e

echo "========================================"
echo "Synora Backend Startup"
echo "========================================"

# Initialize database
echo "Initializing database..."
python init_database.py

# Start the application
echo "Starting Synora API..."
exec python app.py
