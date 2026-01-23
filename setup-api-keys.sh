#!/bin/bash

# Setup script for Claude-Gemini Orchestrator API keys
# This script helps you create the necessary Google Cloud secrets

set -e  # Exit on error

PROJECT_ID="spry-bus-425315-p6"

echo "==========================================="
echo "🔑 Setting up API Keys for Claude-Gemini Orchestrator"
echo "==========================================="
echo "Project: $PROJECT_ID"
echo ""

# Check if gcloud is configured
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Error: gcloud not authenticated. Please run:"
    echo "   gcloud auth login"
    echo "   gcloud config set project $PROJECT_ID"
    exit 1
fi

# Check if project is set correctly
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "🔧 Setting project to $PROJECT_ID..."
    gcloud config set project $PROJECT_ID
fi

echo "🔍 Checking existing secrets..."

# Check for Anthropic API key
if gcloud secrets describe anthropic-api-key --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "✅ anthropic-api-key already exists"
else
    echo "🔑 Creating anthropic-api-key secret..."
    echo "Please paste your Anthropic API key and press Enter:"
    read -s ANTHROPIC_KEY
    
    if [ -z "$ANTHROPIC_KEY" ]; then
        echo "❌ Error: API key cannot be empty"
        exit 1
    fi
    
    echo "$ANTHROPIC_KEY" | gcloud secrets create anthropic-api-key \
        --data-file=- \
        --project=$PROJECT_ID
    
    echo "✅ anthropic-api-key created successfully"
fi

# Check for Gemini API key
if gcloud secrets describe gemini-api-key --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "✅ gemini-api-key already exists"
else
    echo "🔑 Creating gemini-api-key secret..."
    echo "Please paste your Gemini API key and press Enter:"
    read -s GEMINI_KEY
    
    if [ -z "$GEMINI_KEY" ]; then
        echo "❌ Error: API key cannot be empty"
        exit 1
    fi
    
    echo "$GEMINI_KEY" | gcloud secrets create gemini-api-key \
        --data-file=- \
        --project=$PROJECT_ID
    
    echo "✅ gemini-api-key created successfully"
fi

# Check for OpenAI API key
if gcloud secrets describe openai-api-key --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "✅ openai-api-key already exists"
else
    echo "🔑 Creating openai-api-key secret..."
    echo "Please paste your OpenAI API key and press Enter:"
    read -s OPENAI_KEY
    
    if [ -z "$OPENAI_KEY" ]; then
        echo "❌ Error: API key cannot be empty"
        exit 1
    fi
    
    echo "$OPENAI_KEY" | gcloud secrets create openai-api-key \
        --data-file=- \
        --project=$PROJECT_ID
    
    echo "✅ openai-api-key created successfully"
fi

# Check for Grok/X.AI API key
if gcloud secrets describe grok-api-key --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "✅ grok-api-key already exists"
else
    echo "🔑 Creating grok-api-key secret (optional)..."
    echo "Please paste your Grok/X.AI API key and press Enter (or press Enter to skip):"
    read -s GROK_KEY
    
    if [ ! -z "$GROK_KEY" ]; then
        echo "$GROK_KEY" | gcloud secrets create grok-api-key \
            --data-file=- \
            --project=$PROJECT_ID
        
        echo "✅ grok-api-key created successfully"
    else
        echo "⚠️  Skipping Grok API key (optional)"
    fi
fi

echo ""
echo "==========================================="
echo "✅ API Keys setup complete!"
echo "==========================================="
echo ""
echo "You can now run: ./deploy-orchestrator.sh"
echo ""
echo "To get your API keys:"
echo "  - Anthropic: https://console.anthropic.com/"
echo "  - Gemini: https://makersuite.google.com/app/apikey"
echo "  - OpenAI: https://platform.openai.com/api-keys"
echo "  - Grok/X.AI: https://x.ai/ (when available)"
