#!/bin/bash

# Complete Gemini Deployment Script
# This script will set up all necessary secrets and deploy the orchestrator

set -e  # Exit on error

PROJECT_ID="spry-bus-425315-p6"

echo "==========================================="
echo "🔐 Complete Gemini Integration Deployment"
echo "==========================================="
echo ""
echo "This script will:"
echo "1. Authenticate with Google Cloud"
echo "2. Create necessary API key secrets"
echo "3. Deploy the orchestrator to Cloud Run"
echo ""

# Step 1: Authenticate
echo "Step 1: Authenticating with Google Cloud..."
echo "Please login when prompted:"
gcloud auth login

# Set project
gcloud config set project $PROJECT_ID

# Step 2: Create secrets from .env file
echo ""
echo "Step 2: Creating API key secrets from .env file..."

# Load environment variables
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    exit 1
fi

source .env

# Create Anthropic API key secret
echo "Creating anthropic-api-key secret..."
if gcloud secrets describe anthropic-api-key --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "  ✅ anthropic-api-key already exists, updating..."
    echo "$ANTHROPIC_API_KEY" | gcloud secrets versions add anthropic-api-key --data-file=- --project=$PROJECT_ID
else
    echo "$ANTHROPIC_API_KEY" | gcloud secrets create anthropic-api-key --data-file=- --project=$PROJECT_ID
    echo "  ✅ anthropic-api-key created"
fi

# Create Gemini API key secret
echo "Creating gemini-api-key secret..."
if gcloud secrets describe gemini-api-key --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "  ✅ gemini-api-key already exists, updating..."
    echo "$GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=- --project=$PROJECT_ID
else
    echo "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=- --project=$PROJECT_ID
    echo "  ✅ gemini-api-key created"
fi

# OpenAI API key already exists, just update it
echo "Updating openai-api-key secret..."
echo "$OPENAI_API_KEY" | gcloud secrets versions add openai-api-key --data-file=- --project=$PROJECT_ID
echo "  ✅ openai-api-key updated"

# Create Grok API key secret
echo "Creating grok-api-key secret..."
if gcloud secrets describe grok-api-key --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "  ✅ grok-api-key already exists, updating..."
    echo "$GROK_API_KEY" | gcloud secrets versions add grok-api-key --data-file=- --project=$PROJECT_ID
else
    echo "$GROK_API_KEY" | gcloud secrets create grok-api-key --data-file=- --project=$PROJECT_ID
    echo "  ✅ grok-api-key created"
fi

echo ""
echo "✅ All API key secrets are configured!"

# Step 3: Deploy the orchestrator
echo ""
echo "Step 3: Deploying the orchestrator..."
echo ""
./deploy-orchestrator.sh

echo ""
echo "==========================================="
echo "✅ Gemini Integration Complete!"
echo "==========================================="
echo ""
echo "The Claude-Gemini Orchestrator is now deployed with:"
echo "  - Claude 4.1 (Anthropic Sonnet)"
echo "  - Gemini 2.5 Pro"
echo "  - ChatGPT 5 (GPT-4 Turbo)"
echo "  - Grok 4 Heavy"
echo ""
echo "All models are configured and ready to use!"