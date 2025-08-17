#!/bin/bash

# Launch the Claude-Gemini Orchestrator locally with API keys from .env file

echo "==========================================="
echo "🚀 Launching Claude-Gemini Orchestrator"
echo "==========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create a .env file with your API keys"
    echo ""
    echo "Required keys:"
    echo "  ANTHROPIC_API_KEY=your-claude-api-key"
    echo "  OPENAI_API_KEY=your-openai-api-key"
    echo "  GEMINI_API_KEY=your-gemini-api-key"
    echo "  GROK_API_KEY=your-grok-api-key (optional)"
    exit 1
fi

# Load environment variables from .env file
export $(cat .env | grep -v '^#' | xargs)

# Check if required API keys are set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  Warning: ANTHROPIC_API_KEY not set - Claude models will not be available"
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY not set - ChatGPT models will not be available"
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  Warning: GEMINI_API_KEY not set - Gemini models will not be available"
fi

if [ -z "$GROK_API_KEY" ] && [ -z "$XAI_API_KEY" ]; then
    echo "ℹ️  Info: GROK_API_KEY/XAI_API_KEY not set - Grok models will not be available (optional)"
fi

# Navigate to orchestrator directory
cd claude-gemini-orchestrator

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies if needed
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt

# Set port (use 8081 to avoid conflicts)
export PORT=8081

# Launch the orchestrator
echo ""
echo "==========================================="
echo "✅ Starting orchestrator on http://localhost:$PORT"
echo "==========================================="
echo ""
echo "Available endpoints:"
echo "  GET  http://localhost:$PORT/          - Service info"
echo "  GET  http://localhost:$PORT/health    - Health check"
echo "  GET  http://localhost:$PORT/models    - List available models"
echo "  POST http://localhost:$PORT/orchestrate - Main orchestration"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the FastAPI app
python app/main.py