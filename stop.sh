#!/bin/bash

# Claude-Gemini MOA System Shutdown Script
# Cleanly stops all running services

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping Claude-Gemini MOA System...${NC}"

# Stop orchestrator
if [ -f .orchestrator.pid ]; then
    PID=$(cat .orchestrator.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "Stopping orchestrator (PID: $PID)..."
        kill $PID
        rm .orchestrator.pid
        echo -e "${GREEN}✓ Orchestrator stopped${NC}"
    else
        echo "Orchestrator not running (stale PID file)"
        rm .orchestrator.pid
    fi
else
    echo "No orchestrator PID file found"
fi

# Kill any remaining Python processes running the orchestrator
pkill -f "uvicorn app.main:app" 2>/dev/null || true

echo -e "${GREEN}✓ All services stopped${NC}"