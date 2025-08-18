#!/bin/bash

# Complete Deployment Script for Claude-Gemini Orchestrator
# This script handles authentication and full deployment

set -e  # Exit on error

PROJECT_ID="spry-bus-425315-p6"
REGION="us-central1"
SERVICE_NAME="claude-gemini-orchestrator"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "==========================================="
echo "🚀 Deploying Claude-Gemini Orchestrator to Cloud Run"
echo "==========================================="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Step 1: Re-authenticate with Google Cloud
echo "Step 1: Re-authenticating with Google Cloud..."
echo "Please complete the authentication in your browser when prompted."
echo ""
gcloud auth login

# Configure Docker for GCR
echo ""
echo "Configuring Docker for Google Container Registry..."
gcloud auth configure-docker

# Set project
echo "Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Step 2: Create/Update secrets from .env file
echo ""
echo "Step 2: Setting up API key secrets..."

if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    exit 1
fi

# Load environment variables
source .env

# Create or update Anthropic API key
echo "Setting up anthropic-api-key..."
if gcloud secrets describe anthropic-api-key --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "$ANTHROPIC_API_KEY" | gcloud secrets versions add anthropic-api-key --data-file=- --project=$PROJECT_ID
    echo "  ✅ anthropic-api-key updated"
else
    echo "$ANTHROPIC_API_KEY" | gcloud secrets create anthropic-api-key --data-file=- --project=$PROJECT_ID
    echo "  ✅ anthropic-api-key created"
fi

# Create or update Gemini API key
echo "Setting up gemini-api-key..."
if gcloud secrets describe gemini-api-key --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "$GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=- --project=$PROJECT_ID
    echo "  ✅ gemini-api-key updated"
else
    echo "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=- --project=$PROJECT_ID
    echo "  ✅ gemini-api-key created"
fi

# Update OpenAI API key (already exists)
echo "Updating openai-api-key..."
echo "$OPENAI_API_KEY" | gcloud secrets versions add openai-api-key --data-file=- --project=$PROJECT_ID
echo "  ✅ openai-api-key updated"

# Create or update Grok API key
echo "Setting up grok-api-key..."
if gcloud secrets describe grok-api-key --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "$GROK_API_KEY" | gcloud secrets versions add grok-api-key --data-file=- --project=$PROJECT_ID
    echo "  ✅ grok-api-key updated"
else
    echo "$GROK_API_KEY" | gcloud secrets create grok-api-key --data-file=- --project=$PROJECT_ID
    echo "  ✅ grok-api-key created"
fi

# Step 3: Create service account if needed
echo ""
echo "Step 3: Setting up service account..."
SERVICE_ACCOUNT="claude-gemini-service-account@$PROJECT_ID.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "Creating service account..."
    gcloud iam service-accounts create claude-gemini-service-account \
        --display-name="Claude-Gemini Orchestrator Service Account" \
        --project=$PROJECT_ID
    
    # Grant necessary permissions
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/secretmanager.secretAccessor"
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/logging.logWriter"
    
    echo "  ✅ Service account created and configured"
else
    echo "  ✅ Service account already exists"
fi

# Step 4: Build and push Docker image
echo ""
echo "Step 4: Building and pushing Docker image..."
cd claude-gemini-orchestrator

echo "Building Docker image..."
docker build -t $IMAGE_NAME:latest .

echo "Pushing image to Container Registry..."
docker push $IMAGE_NAME:latest
echo "  ✅ Docker image pushed successfully"

cd ..

# Step 5: Deploy to Cloud Run
echo ""
echo "Step 5: Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars="GCP_PROJECT_ID=$PROJECT_ID" \
    --update-secrets="ANTHROPIC_API_KEY=anthropic-api-key:latest,GEMINI_API_KEY=gemini-api-key:latest,OPENAI_API_KEY=openai-api-key:latest,GROK_API_KEY=grok-api-key:latest" \
    --service-account="$SERVICE_ACCOUNT" \
    --memory=4Gi \
    --cpu=2 \
    --max-instances=100 \
    --min-instances=1 \
    --concurrency=100 \
    --timeout=300s \
    --project=$PROJECT_ID

# Step 6: Get service URL and test
echo ""
echo "Step 6: Testing deployed service..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format='value(status.url)')

echo ""
echo "==========================================="
echo "✅ Deployment Complete!"
echo "==========================================="
echo ""
echo "🌐 Service URL: $SERVICE_URL"
echo ""

# Test the service
echo "Testing health endpoint..."
if curl -s "$SERVICE_URL/health" | python3 -m json.tool; then
    echo ""
    echo "✅ Service is healthy and running!"
else
    echo "⚠️  Health check failed - please check logs"
fi

echo ""
echo "Testing models endpoint..."
curl -s "$SERVICE_URL/models" | python3 -m json.tool | head -20

echo ""
echo "==========================================="
echo "🎉 Claude-Gemini Orchestrator is deployed!"
echo "==========================================="
echo ""
echo "Available models:"
echo "  - Claude 4.1 (Anthropic Sonnet)"
echo "  - Gemini 2.5 Pro"
echo "  - ChatGPT 5 (GPT-4 Turbo)"
echo "  - Grok 4 Heavy"
echo ""
echo "Update your VS Code settings:"
echo "  \"claudeGeminiAssistant.orchestratorUrl\": \"$SERVICE_URL\""
echo "  \"claudeGeminiAssistant.useLocalServices\": false"
echo ""
echo "Test the orchestrator:"
echo "  curl -X POST $SERVICE_URL/orchestrate \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"prompt\": \"Hello AI\", \"task_type\": \"generation\", \"collaboration_mode\": \"specialized\"}'"