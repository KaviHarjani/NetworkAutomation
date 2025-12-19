#!/bin/bash

# Celery Worker Startup Script with SQLite
# This script starts a Celery worker for your Django application using SQLite as broker

echo "Starting Celery Worker with SQLite Broker..."
echo "Broker: sqla+sqlite:///celery_broker.sqlite3"
echo "Backend: db+sqlite:///celery_results.sqlite3"
echo ""

# Activate virtual environment
source venv/bin/activate

# Start Celery worker
# --loglevel=info: Set logging level
# --concurrency=1: Single worker process (suitable for SQLite)
# --without-gossip: Disable gossip (not needed for single worker)
# --without-mingle: Disable synchronization (not needed for single worker)
# --without-heartbeat: Disable heartbeat (not needed for SQLite)
celery -A network_automation worker \
    --loglevel=info \
    --concurrency=1 \
    --without-gossip \
    --without-mingle \
    --without-heartbeat