#!/bin/bash

# Run Claude-Gemini Orchestrator locally

echo "==========================================="
echo "🚀 Starting Claude-Gemini Orchestrator Locally"
echo "==========================================="

# Check if we're in the right directory
if [ ! -d "claude-gemini-orchestrator" ]; then
    echo "❌ Error: Must run from the GoogleCloudRun directory"
    exit 1
fi

# Load environment variables
if [ -f "local-config.env" ]; then
    export $(cat local-config.env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
else
    echo "❌ Error: local-config.env not found"
    exit 1
fi

# Navigate to orchestrator directory
cd claude-gemini-orchestrator

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Start the service
echo ""
echo "🌐 Starting orchestrator on http://localhost:8080"
echo "==========================================="
echo ""
echo "📝 VS Code Settings to use:"
echo "{"
echo '  "claudeGeminiAssistant.orchestratorUrl": "http://localhost:8080",'
echo '  "claudeGeminiAssistant.useLocalServices": true'
echo "}"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the FastAPI app
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload