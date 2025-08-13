#!/bin/bash

# Deployment script for Claude-Gemini Orchestrator and Gemini Service

set -e  # Exit on error

PROJECT_ID="spry-bus-425315-p6"
REGION="us-central1"

echo "==========================================="
echo "Deploying Claude-Gemini Services to Cloud Run"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "==========================================="

# Check if we're in the right directory
if [ ! -d "claude-gemini-orchestrator" ] || [ ! -d "cloud-run-gemini-service" ]; then
    echo "Error: Must run from the GoogleCloudRun directory"
    exit 1
fi

# Check if secrets exist
echo ""
echo "Checking for required secrets..."
if ! gcloud secrets describe anthropic-api-key --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "Error: anthropic-api-key secret not found. Please run setup-secrets.sh first."
    exit 1
fi

if ! gcloud secrets describe gemini-api-key --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "Error: gemini-api-key secret not found. Please run setup-secrets.sh first."
    exit 1
fi

echo "✓ Secrets found"

# Deploy Claude-Gemini Orchestrator
echo ""
echo "Deploying Claude-Gemini Orchestrator..."
echo "----------------------------------------"
cd claude-gemini-orchestrator

# Build and push Docker image
echo "Building Docker image..."
docker build -t gcr.io/$PROJECT_ID/claude-gemini-orchestrator:latest .

echo "Pushing image to Container Registry..."
docker push gcr.io/$PROJECT_ID/claude-gemini-orchestrator:latest

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy claude-gemini-orchestrator \
  --image gcr.io/$PROJECT_ID/claude-gemini-orchestrator:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars="GCP_PROJECT_ID=$PROJECT_ID" \
  --set-secrets="ANTHROPIC_API_KEY=anthropic-api-key:latest,GEMINI_API_KEY=gemini-api-key:latest" \
  --service-account="claude-gemini-service-account@$PROJECT_ID.iam.gserviceaccount.com" \
  --memory=4Gi \
  --cpu=2 \
  --max-instances=100 \
  --min-instances=1 \
  --concurrency=100 \
  --timeout=300s \
  --project=$PROJECT_ID

cd ..

# Deploy Gemini Service (optional)
read -p "Do you want to deploy the Gemini Service as well? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Deploying Gemini Service..."
    echo "----------------------------"
    cd cloud-run-gemini-service
    
    # Build and push Docker image
    echo "Building Docker image..."
    docker build -t gcr.io/$PROJECT_ID/gemini-orchestration-service:latest .
    
    echo "Pushing image to Container Registry..."
    docker push gcr.io/$PROJECT_ID/gemini-orchestration-service:latest
    
    # Deploy to Cloud Run
    echo "Deploying to Cloud Run..."
    gcloud run deploy gemini-orchestration-service \
      --image gcr.io/$PROJECT_ID/gemini-orchestration-service:latest \
      --platform managed \
      --region $REGION \
      --allow-unauthenticated \
      --set-env-vars="GCP_PROJECT_ID=$PROJECT_ID" \
      --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
      --memory=2Gi \
      --cpu=1 \
      --max-instances=100 \
      --min-instances=1 \
      --concurrency=100 \
      --timeout=300s \
      --project=$PROJECT_ID
    
    cd ..
fi

# Get service URLs
echo ""
echo "==========================================="
echo "Deployment Complete!"
echo "==========================================="
echo ""
echo "Service URLs:"
echo "-------------"

ORCHESTRATOR_URL=$(gcloud run services describe claude-gemini-orchestrator \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)')

echo "Claude-Gemini Orchestrator: $ORCHESTRATOR_URL"

if [[ $REPLY =~ ^[Yy]$ ]]; then
    GEMINI_URL=$(gcloud run services describe gemini-orchestration-service \
      --region=$REGION \
      --project=$PROJECT_ID \
      --format='value(status.url)')
    echo "Gemini Service: $GEMINI_URL"
fi

# Test health endpoints
echo ""
echo "Testing health endpoints..."
echo "---------------------------"

if curl -f "$ORCHESTRATOR_URL/health" 2>/dev/null; then
    echo "✓ Orchestrator health check passed"
else
    echo "✗ Orchestrator health check failed"
fi

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if curl -f "$GEMINI_URL/health" 2>/dev/null; then
        echo "✓ Gemini service health check passed"
    else
        echo "✗ Gemini service health check failed"
    fi
fi

# Update VS Code settings
echo ""
echo "Update your VS Code settings with:"
echo "-----------------------------------"
echo "{"
echo "  \"claudeGeminiAssistant.orchestratorUrl\": \"$ORCHESTRATOR_URL\","
echo "  \"claudeGeminiAssistant.useLocalServices\": false"
echo "}"

echo ""
echo "Deployment complete!"