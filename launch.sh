#!/bin/bash

# Claude-Gemini Collaborative Orchestration System Launcher
# Version: 2.0.0
# This is a Mixture of Agents (MOA) implementation combining Claude and Gemini models

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ORCHESTRATOR_PORT=8080
EXTENSION_MODE="development"
LOG_DIR="./logs"
PYTHON_CMD=""  # Will be set by check_dependencies

echo -e "${BLUE}===================================================================${NC}"
echo -e "${BLUE}     Claude-Gemini MOA System - Version 2.0.0                     ${NC}"
echo -e "${BLUE}     Mixture of Agents Implementation                             ${NC}"
echo -e "${BLUE}===================================================================${NC}"
echo ""

# Function to check dependencies
check_dependencies() {
    echo -e "${YELLOW}Checking dependencies...${NC}"
    
    # Check Python - prefer 3.12 for compatibility
    if command -v python3.12 &> /dev/null; then
        PYTHON_CMD="python3.12"
        echo -e "${GREEN}✓ Python 3.12 found (recommended)${NC}"
    elif command -v python3.11 &> /dev/null; then
        PYTHON_CMD="python3.11"
        echo -e "${GREEN}✓ Python 3.11 found${NC}"
    elif command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
        echo -e "${YELLOW}✓ Python 3 found (may have compatibility issues with 3.13+)${NC}"
    else
        echo -e "${RED}X Python 3 is not installed${NC}"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}X Node.js is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js found${NC}"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}X npm is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ npm found${NC}"
    
    # Check VS Code or Cursor
    if command -v code &> /dev/null; then
        EDITOR="code"
        echo -e "${GREEN}✓ VS Code found${NC}"
    elif command -v cursor &> /dev/null; then
        EDITOR="cursor"
        echo -e "${GREEN}✓ Cursor found${NC}"
    else
        echo -e "${RED}X Neither VS Code nor Cursor is installed${NC}"
        exit 1
    fi
}

# Function to check API keys
check_api_keys() {
    echo -e "${YELLOW}Checking API keys...${NC}"
    
    if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$CLAUDE_API_KEY" ]; then
        echo -e "${YELLOW}Warning: ANTHROPIC_API_KEY not set. Claude features will be limited.${NC}"
        echo -e "  To set: export ANTHROPIC_API_KEY=\"your-key-here\""
    else
        echo -e "${GREEN}✓ Claude API key configured${NC}"
    fi
    
    if [ -z "$GEMINI_API_KEY" ] && [ -z "$GOOGLE_API_KEY" ]; then
        echo -e "${YELLOW}Warning: GEMINI_API_KEY not set. Gemini features will be limited.${NC}"
        echo -e "  To set: export GEMINI_API_KEY=\"your-key-here\""
    else
        echo -e "${GREEN}✓ Gemini API key configured${NC}"
    fi
}

# Function to setup Python environment
setup_python_env() {
    echo -e "${YELLOW}Setting up Python environment for orchestrator...${NC}"
    
    cd claude-gemini-orchestrator
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        echo "Creating virtual environment with $PYTHON_CMD..."
        $PYTHON_CMD -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    echo "Installing Python dependencies..."
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
    
    cd ..
    echo -e "${GREEN}✓ Python environment ready${NC}"
}

# Function to build VS Code extension
build_extension() {
    echo -e "${YELLOW}Building VS Code extension...${NC}"
    
    # Install npm dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing npm dependencies..."
        npm install
    fi
    
    # Compile TypeScript
    echo "Compiling TypeScript..."
    npm run compile
    
    echo -e "${GREEN}✓ Extension built successfully${NC}"
}

# Function to start the orchestrator service
start_orchestrator() {
    echo -e "${YELLOW}Starting Claude-Gemini Orchestrator service...${NC}"
    
    # Create logs directory
    mkdir -p $LOG_DIR
    
    # Start orchestrator in background
    cd claude-gemini-orchestrator
    source venv/bin/activate
    
    # Export API keys for the orchestrator
    export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-$CLAUDE_API_KEY}"
    export GEMINI_API_KEY="${GEMINI_API_KEY:-$GOOGLE_API_KEY}"
    
    nohup python -m uvicorn app.main:app --host 0.0.0.0 --port $ORCHESTRATOR_PORT \
        > ../logs/orchestrator.log 2>&1 &
    
    ORCHESTRATOR_PID=$!
    cd ..
    
    # Wait for service to be ready
    echo "Waiting for orchestrator to start..."
    for i in {1..30}; do
        if curl -s http://localhost:$ORCHESTRATOR_PORT/health > /dev/null; then
            echo -e "${GREEN}✓ Orchestrator running on http://localhost:$ORCHESTRATOR_PORT${NC}"
            break
        fi
        sleep 1
    done
    
    # Save PID for cleanup
    echo $ORCHESTRATOR_PID > .orchestrator.pid
}

# Function to launch VS Code extension
launch_extension() {
    echo -e "${YELLOW}Launching VS Code extension in development mode...${NC}"
    
    if [ "$EXTENSION_MODE" == "development" ]; then
        # Launch in development mode
        $EDITOR --extensionDevelopmentPath=. .
        echo -e "${GREEN}✓ Extension launched in development mode${NC}"
        echo -e "${BLUE}Press F5 in VS Code to start debugging the extension${NC}"
    else
        # Install extension in VS Code
        echo "Building VSIX package..."
        npm run package
        
        # Install the extension
        $EDITOR --install-extension claude-gemini-assistant-*.vsix
        echo -e "${GREEN}✓ Extension installed${NC}"
    fi
}

# Function to show usage instructions
show_instructions() {
    echo ""
    echo -e "${BLUE}===================================================================${NC}"
    echo -e "${GREEN}🚀 Claude-Gemini MOA System is ready!${NC}"
    echo -e "${BLUE}===================================================================${NC}"
    echo ""
    echo "📍 Services running:"
    echo "   • Orchestrator API: http://localhost:$ORCHESTRATOR_PORT"
    echo "   • API Documentation: http://localhost:$ORCHESTRATOR_PORT/docs"
    echo "   • Health Check: http://localhost:$ORCHESTRATOR_PORT/health"
    echo ""
    echo "🎯 Available collaboration modes:"
    echo "   • PARALLEL - Both models work simultaneously"
    echo "   • SEQUENTIAL - One model's output feeds another"
    echo "   • DEBATE - Models discuss and refine responses"
    echo "   • CONSENSUS - Models must reach agreement"
    echo "   • SPECIALIZED - Each model handles their expertise"
    echo ""
    echo "💡 Quick start commands in VS Code:"
    echo "   • Ctrl+Shift+G - Start Gemini Workflow"
    echo "   • Ctrl+Shift+C - Execute with Context"
    echo "   • Ctrl+Shift+P - Command Palette → 'Claude Assistant'"
    echo ""
    echo "📊 Monitor logs:"
    echo "   tail -f logs/orchestrator.log"
    echo ""
    echo "🛑 To stop the orchestrator:"
    echo "   ./stop.sh"
    echo ""
}

# Function to test the orchestrator
test_orchestrator() {
    echo -e "${YELLOW}Testing orchestrator endpoints...${NC}"
    
    # Test health endpoint
    if curl -s http://localhost:$ORCHESTRATOR_PORT/health | grep -q "healthy"; then
        echo -e "${GREEN}✓ Health check passed${NC}"
    fi
    
    # Test capabilities endpoint
    if curl -s http://localhost:$ORCHESTRATOR_PORT/capabilities > /dev/null; then
        echo -e "${GREEN}✓ Capabilities endpoint working${NC}"
    fi
    
    # Test models endpoint
    if curl -s http://localhost:$ORCHESTRATOR_PORT/models > /dev/null; then
        echo -e "${GREEN}✓ Models endpoint working${NC}"
    fi
}

# Main execution flow
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --production)
                EXTENSION_MODE="production"
                shift
                ;;
            --port)
                ORCHESTRATOR_PORT="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [--production] [--port PORT]"
                echo "  --production    Install extension instead of development mode"
                echo "  --port PORT     Set orchestrator port (default: 8080)"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run setup steps
    check_dependencies
    check_api_keys
    setup_python_env
    build_extension
    start_orchestrator
    test_orchestrator
    launch_extension
    show_instructions
    
    # Keep script running if in development mode
    if [ "$EXTENSION_MODE" == "development" ]; then
        echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
        
        # Trap Ctrl+C to cleanup
        trap cleanup INT
        
        # Wait indefinitely
        while true; do
            sleep 1
        done
    fi
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    
    # Stop orchestrator
    if [ -f .orchestrator.pid ]; then
        kill $(cat .orchestrator.pid) 2>/dev/null || true
        rm .orchestrator.pid
    fi
    
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
}

# Run main function
main "$@"