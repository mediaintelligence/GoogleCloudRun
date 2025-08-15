#!/bin/bash

# Deployment script for Claude-Gemini Orchestrator
# This script deploys the AI orchestration service to Google Cloud Run

set -e  # Exit on error

# Configuration
PROJECT_ID="spry-bus-425315-p6"
REGION="us-central1"
SERVICE_NAME="claude-gemini-orchestrator"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "==========================================="
echo "🚀 Deploying Claude-Gemini Orchestrator"
echo "==========================================="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Check if we're in the right directory
if [ ! -d "claude-gemini-orchestrator" ]; then
    echo "❌ Error: Must run from the GoogleCloudRun directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

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

# Check if required secrets exist
echo "🔍 Checking for required secrets..."
if ! gcloud secrets describe anthropic-api-key --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "❌ Error: anthropic-api-key secret not found"
    echo "   Please create it with: gcloud secrets create anthropic-api-key --data-file=-"
    echo "   Then paste your Anthropic API key and press Ctrl+D"
    exit 1
fi

if ! gcloud secrets describe gemini-api-key --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "❌ Error: gemini-api-key secret not found"
    echo "   Please create it with: gcloud secrets create gemini-api-key --data-file=-"
    echo "   Then paste your Gemini API key and press Ctrl+D"
    exit 1
fi

echo "✅ Secrets found"

# Check if service account exists
SERVICE_ACCOUNT="claude-gemini-service-account@$PROJECT_ID.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "🔧 Creating service account..."
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
fi

# Navigate to orchestrator directory
cd claude-gemini-orchestrator

# Build and push Docker image
echo ""
echo "🐳 Building Docker image..."
docker build -t $IMAGE_NAME:latest .

echo "📤 Pushing image to Container Registry..."
docker push $IMAGE_NAME:latest

# Deploy to Cloud Run
echo ""
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars="GCP_PROJECT_ID=$PROJECT_ID" \
    --set-secrets="ANTHROPIC_API_KEY=anthropic-api-key:latest,GEMINI_API_KEY=gemini-api-key:latest" \
    --service-account="$SERVICE_ACCOUNT" \
    --memory=4Gi \
    --cpu=2 \
    --max-instances=100 \
    --min-instances=1 \
    --concurrency=100 \
    --timeout=300s \
    --project=$PROJECT_ID

# Get service URL
echo ""
echo "🔍 Getting service URL..."
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

# Test health endpoint
echo "🧪 Testing health endpoint..."
if curl -f "$SERVICE_URL/health" 2>/dev/null; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
fi

# Update VS Code settings
echo ""
echo "🔧 Update your VS Code settings with:"
echo "-------------------------------------"
echo "{"
echo "  \"claudeGeminiAssistant.orchestratorUrl\": \"$SERVICE_URL\","
echo "  \"claudeGeminiAssistant.useLocalServices\": false"
echo "}"

echo ""
echo "🎉 Claude-Gemini Orchestrator is now deployed and ready!"
echo "   You can test it by visiting: $SERVICE_URL"
