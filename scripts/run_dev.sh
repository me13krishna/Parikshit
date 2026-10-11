#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo " Starting Parikshit Development Cockpit (Local)  "
echo "=================================================="

# Start backend
echo "Starting Backend API on http://localhost:8000..."
(
  cd backend
  if [ -d ".venv" ]; then
    source .venv/bin/activate
  fi
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
) &
BACKEND_PID=$!

# Start frontend
echo "Starting Frontend Web on http://localhost:3000..."
(
  cd frontend
  npm run dev
) &
FRONTEND_PID=$!

cleanup() {
  echo "Shutting down Parikshit services..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait
