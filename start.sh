#!/usr/bin/env bash
# -------------------------------------------------------
# Auditoria Demo - Start Everything
# Usage: ./start.sh
# -------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "Starting Auditoria Demo..."
echo ""

# Start backend
echo "[1/2] Starting backend on http://localhost:8000"
cd "$SCRIPT_DIR/backend"
python3 -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Give backend a moment to start
sleep 2

# Start frontend
echo "[2/2] Starting frontend on http://localhost:5173"
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Both servers are running."
echo "  App:    http://localhost:5173"
echo "  API:    http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop everything."
echo ""

# Stop both when Ctrl+C is pressed
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
