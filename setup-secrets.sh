#!/bin/bash

# Script to set up API key secrets for Claude-Gemini Orchestrator

echo "Setting up secrets for Claude-Gemini Orchestrator deployment"
echo "=============================================="

# Check if API keys are provided as environment variables
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Please enter your Anthropic API key:"
    read -s ANTHROPIC_API_KEY
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "Please enter your Gemini API key:"
    read -s GEMINI_API_KEY
fi

PROJECT_ID="spry-bus-425315-p6"
SERVICE_ACCOUNT="claude-gemini-service-account@${PROJECT_ID}.iam.gserviceaccount.com"

echo ""
echo "Creating secrets in Google Secret Manager..."

# Create Anthropic API key secret
echo -n "$ANTHROPIC_API_KEY" | gcloud secrets create anthropic-api-key \
  --data-file=- \
  --replication-policy="automatic" \
  --project=$PROJECT_ID 2>/dev/null || \
  echo -n "$ANTHROPIC_API_KEY" | gcloud secrets versions add anthropic-api-key \
  --data-file=- \
  --project=$PROJECT_ID

# Create Gemini API key secret
echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic" \
  --project=$PROJECT_ID 2>/dev/null || \
  echo -n "$GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key \
  --data-file=- \
  --project=$PROJECT_ID

echo ""
echo "Granting secret access to service account..."

# Grant secret access to service account
gcloud secrets add-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

# Also grant to default Cloud Run service account
DEFAULT_SA="698171499447-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:${DEFAULT_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${DEFAULT_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

echo ""
echo "Secrets have been configured successfully!"
echo ""
echo "You can now deploy the services using:"
echo "  cd claude-gemini-orchestrator"
echo "  gcloud builds submit --config=cloudbuild.yaml ."
echo ""
echo "  cd ../cloud-run-gemini-service"
echo "  gcloud builds submit --config=cloudbuild.yaml ."