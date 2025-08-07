# Claude-Gemini Orchestration Deployment Guide

This guide covers deploying the Claude-Gemini collaborative orchestration system to Google Cloud Run and integrating it with VS Code.

## Architecture Overview

```
┌─────────────────────┐
│   VS Code Extension │
│  (Local Development)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Cloud Run Bridge   │
│   (HTTP Client)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Claude-Gemini       │
│ Orchestrator        │
│ (Cloud Run Service) │
└──────────┬──────────┘
           │
      ┌────┴────┐
      ▼         ▼
┌──────────┐ ┌──────────┐
│  Claude  │ │  Gemini  │
│   API    │ │   API    │
└──────────┘ └──────────┘
```

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **gcloud CLI** installed and configured
3. **API Keys**:
   - Anthropic API key for Claude
   - Google Gemini API key
4. **VS Code** with the extension installed

## Quick Start (Local Development)

### 1. Test Locally First

```bash
# Navigate to orchestrator directory
cd claude-gemini-orchestrator

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export ANTHROPIC_API_KEY="your-anthropic-key"
export GEMINI_API_KEY="your-gemini-key"

# Run the service
python -m uvicorn app.main:app --reload --port 8080
```

### 2. Configure VS Code Extension

Open VS Code settings (`Cmd+,` on Mac, `Ctrl+,` on Windows/Linux) and configure:

```json
{
  "claudeGeminiAssistant.orchestratorUrl": "http://localhost:8080",
  "claudeGeminiAssistant.useLocalServices": true
}
```

### 3. Test the Connection

In VS Code, open the Command Palette (`Cmd+Shift+P`) and run:
- `Claude Assistant: Test Cloud Run Connection`

## Cloud Run Deployment

### Step 1: Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com
```

### Step 2: Store API Keys in Secret Manager

```bash
# Store Anthropic API key
echo -n "your-anthropic-api-key" | gcloud secrets create anthropic-api-key \
  --data-file=- \
  --replication-policy="automatic"

# Store Gemini API key
echo -n "your-gemini-api-key" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic"
```

### Step 3: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create claude-gemini-service-account \
  --display-name="Claude-Gemini Service Account"

# Grant secret access
gcloud secrets add-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:claude-gemini-service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:claude-gemini-service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 4: Deploy the Orchestrator

```bash
# Set your project ID
export PROJECT_ID=your-project-id

# Update configuration files
sed -i "s/PROJECT_ID/$PROJECT_ID/g" claude-gemini-orchestrator/cloud-run.yaml
sed -i "s/PROJECT_ID/$PROJECT_ID/g" claude-gemini-orchestrator/cloudbuild.yaml

# Deploy using Cloud Build
cd claude-gemini-orchestrator
gcloud builds submit --config=cloudbuild.yaml .
```

### Step 5: Get Service URL

```bash
# Get the deployed service URL
gcloud run services describe claude-gemini-orchestrator \
  --region=us-central1 \
  --format='value(status.url)'
```

### Step 6: Update VS Code Settings

Update your VS Code settings with the Cloud Run URL:

```json
{
  "claudeGeminiAssistant.orchestratorUrl": "https://claude-gemini-orchestrator-xxxxx.run.app",
  "claudeGeminiAssistant.useLocalServices": false
}
```

## Deployment Options

### Option 1: Direct Deployment (Quick)

```bash
# Build and deploy directly
cd claude-gemini-orchestrator

# Build image
docker build -t gcr.io/$PROJECT_ID/claude-gemini-orchestrator .

# Push to registry
docker push gcr.io/$PROJECT_ID/claude-gemini-orchestrator

# Deploy to Cloud Run
gcloud run deploy claude-gemini-orchestrator \
  --image gcr.io/$PROJECT_ID/claude-gemini-orchestrator \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="ANTHROPIC_API_KEY=anthropic-api-key:latest,GEMINI_API_KEY=gemini-api-key:latest"
```

### Option 2: CI/CD with Cloud Build (Recommended)

The provided `cloudbuild.yaml` automatically:
1. Builds the Docker image
2. Pushes to Container Registry
3. Deploys to Cloud Run
4. Verifies the deployment

### Option 3: Deploy Both Services

Deploy both the Gemini service and orchestrator:

```bash
# Deploy Gemini service
cd cloud-run-gemini-service
gcloud builds submit --config=cloudbuild.yaml .

# Deploy orchestrator
cd ../claude-gemini-orchestrator
gcloud builds submit --config=cloudbuild.yaml .
```

## Testing the Deployment

### 1. Health Check

```bash
# Test orchestrator health
curl https://your-orchestrator-url.run.app/health

# Expected response:
# {"status":"healthy","claude_configured":true,"gemini_configured":true}
```

### 2. Test Orchestration

```bash
# Test orchestration endpoint
curl -X POST https://your-orchestrator-url.run.app/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing",
    "task_type": "reasoning",
    "collaboration_mode": "debate"
  }'
```

### 3. Test from VS Code

1. Open any code file
2. Select some code
3. Right-click and choose "Execute Claude Code with Full Context"
4. The request will be routed through Cloud Run

## Collaboration Modes

The orchestrator supports multiple collaboration modes:

### 1. **Parallel Mode**
Both models process simultaneously:
```javascript
// VS Code: Select code and use "Compare Models"
const response = await orchestrator.orchestrate({
  prompt: "Optimize this function",
  collaboration_mode: "parallel"
});
```

### 2. **Sequential Mode**
One model analyzes, another synthesizes:
```javascript
// Best for complex analysis
const response = await orchestrator.orchestrate({
  prompt: "Analyze and improve this architecture",
  collaboration_mode: "sequential"
});
```

### 3. **Debate Mode**
Models discuss and refine:
```javascript
// Best for design decisions
const response = await orchestrator.orchestrate({
  prompt: "What's the best approach for this feature?",
  collaboration_mode: "debate"
});
```

### 4. **Consensus Mode**
Models must agree:
```javascript
// Best for critical decisions
const response = await orchestrator.orchestrate({
  prompt: "Should we refactor this module?",
  collaboration_mode: "consensus"
});
```

### 5. **Specialized Mode**
Each model handles their strength:
```javascript
// Default mode - automatic specialization
const response = await orchestrator.orchestrate({
  prompt: "Generate and document this function",
  collaboration_mode: "specialized"
});
```

## Monitoring and Debugging

### View Logs

```bash
# View orchestrator logs
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=claude-gemini-orchestrator" \
  --limit 50

# Stream logs
gcloud alpha logging tail "resource.type=cloud_run_revision \
  AND resource.labels.service_name=claude-gemini-orchestrator"
```

### VS Code Output

1. Open VS Code Output panel (`View > Output`)
2. Select "Claude-Gemini Cloud Run" from dropdown
3. Monitor requests and responses

### Metrics

```bash
# View metrics in Cloud Console
gcloud monitoring metrics-descriptors list \
  --filter="metric.type:run.googleapis.com"
```

## Cost Optimization

### Development Settings
```json
{
  "claudeGeminiAssistant.useLocalServices": true,
  "claudeGeminiAssistant.orchestratorUrl": "http://localhost:8080"
}
```

### Production Settings
- Set minimum instances to 0 for dev environments
- Use Cloud Scheduler to warm up services before work hours
- Implement caching for repeated requests

## Troubleshooting

### Issue: "Service not reachable"
```bash
# Check deployment status
gcloud run services list --region=us-central1

# Check service logs
gcloud logging read "severity>=ERROR" --limit 10
```

### Issue: "API keys not working"
```bash
# Verify secrets exist
gcloud secrets list

# Update secret
echo -n "new-api-key" | gcloud secrets versions add anthropic-api-key --data-file=-
```

### Issue: "VS Code can't connect"
1. Check VS Code settings for correct URL
2. Verify `useLocalServices` setting
3. Check Output panel for errors
4. Test with curl first

## Security Best Practices

1. **Never commit API keys** - Always use Secret Manager
2. **Use service accounts** with minimal permissions
3. **Enable authentication** for production:
   ```bash
   gcloud run deploy claude-gemini-orchestrator \
     --no-allow-unauthenticated
   ```
4. **Set up IAP** (Identity-Aware Proxy) for additional security
5. **Monitor usage** and set up alerts for unusual activity

## Next Steps

1. **Set up monitoring dashboards** in Cloud Console
2. **Configure auto-scaling** based on your needs
3. **Implement caching** to reduce API calls
4. **Add custom workflows** for your specific use cases
5. **Set up CI/CD pipeline** with GitHub Actions

## Support

For issues or questions:
- Check logs in Cloud Console
- Review VS Code Output panel
- Test endpoints with curl
- Verify API keys are valid
- Ensure all Google Cloud APIs are enabled