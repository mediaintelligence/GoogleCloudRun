# Gemini AI Orchestration Service for Cloud Run

A production-ready Google Cloud Run service that provides intelligent AI orchestration using Google's Gemini models (Gemini Pro, Gemini 1.5 Pro, Gemini 1.5 Flash).

## Features

- **Multiple Gemini Models**: Support for Gemini Pro, Gemini 1.5 Pro, Gemini 1.5 Flash, and Gemini Pro Vision
- **RESTful API**: Clean API endpoints for text generation, chat, code analysis, and workflows
- **Cloud Native**: Optimized for Google Cloud Run with health checks, auto-scaling, and monitoring
- **Secure**: Non-root container, secret management, and safety settings
- **Production Ready**: Multi-stage Docker build, proper error handling, and logging

## API Endpoints

- `GET /` - Service information and available endpoints
- `GET /health` - Health check endpoint for Cloud Run
- `POST /generate` - Generate text using Gemini models
- `POST /chat` - Chat conversation with context
- `POST /analyze-code` - Analyze code (review, optimize, explain, debug)
- `POST /workflow` - Execute complex multi-step AI workflows
- `POST /orchestrate` - Intelligent model routing based on task type
- `GET /models` - List available Gemini models

## Quick Start

### Local Development

1. **Clone and navigate to the service directory:**
   ```bash
   cd cloud-run-gemini-service
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

3. **Install dependencies:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Run locally:**
   ```bash
   python -m uvicorn app.main:app --reload --port 8080
   ```

5. **Test the service:**
   ```bash
   # Health check
   curl http://localhost:8080/health

   # Generate text
   curl -X POST http://localhost:8080/generate \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Explain quantum computing in simple terms"}'
   ```

### Docker Local Testing

1. **Build the Docker image:**
   ```bash
   docker build -t gemini-service .
   ```

2. **Run the container:**
   ```bash
   docker run -p 8080:8080 \
     -e GEMINI_API_KEY="your-api-key" \
     gemini-service
   ```

## Deployment to Google Cloud Run

### Prerequisites

1. **Set up Google Cloud:**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable required APIs:**
   ```bash
   gcloud services enable \
     run.googleapis.com \
     cloudbuild.googleapis.com \
     secretmanager.googleapis.com \
     artifactregistry.googleapis.com
   ```

3. **Create a service account:**
   ```bash
   gcloud iam service-accounts create gemini-service-account \
     --display-name="Gemini Service Account"
   ```

4. **Store your Gemini API key in Secret Manager:**
   ```bash
   echo -n "your-gemini-api-key" | gcloud secrets create gemini-api-key \
     --data-file=- \
     --replication-policy="automatic"

   # Grant access to the service account
   gcloud secrets add-iam-policy-binding gemini-api-key \
     --member="serviceAccount:gemini-service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

### Deploy with Cloud Build

1. **Update project ID in configuration files:**
   ```bash
   # Replace PROJECT_ID in cloud-run.yaml and cloudbuild.yaml
   sed -i 's/PROJECT_ID/YOUR_PROJECT_ID/g' cloud-run.yaml
   sed -i 's/PROJECT_ID/YOUR_PROJECT_ID/g' cloudbuild.yaml
   ```

2. **Deploy using Cloud Build:**
   ```bash
   gcloud builds submit --config=cloudbuild.yaml .
   ```

### Direct Deployment

Alternatively, deploy directly:

```bash
# Build and push image
docker build -t gcr.io/YOUR_PROJECT_ID/gemini-orchestration-service .
docker push gcr.io/YOUR_PROJECT_ID/gemini-orchestration-service

# Deploy to Cloud Run
gcloud run deploy gemini-orchestration-service \
  --image gcr.io/YOUR_PROJECT_ID/gemini-orchestration-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
  --service-account=gemini-service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## API Usage Examples

### Generate Text

```python
import requests

response = requests.post(
    "https://your-service-url.run.app/generate",
    json={
        "prompt": "Write a haiku about cloud computing",
        "model": "gemini-1.5-pro",
        "temperature": 0.7,
        "max_tokens": 100
    }
)
print(response.json())
```

### Chat Conversation

```python
response = requests.post(
    "https://your-service-url.run.app/chat",
    json={
        "messages": [
            {"role": "user", "content": "What is Docker?"},
            {"role": "assistant", "content": "Docker is a containerization platform..."},
            {"role": "user", "content": "How does it differ from VMs?"}
        ],
        "model": "gemini-1.5-pro"
    }
)
```

### Analyze Code

```python
response = requests.post(
    "https://your-service-url.run.app/analyze-code",
    json={
        "code": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
        "language": "python",
        "analysis_type": "optimize"
    }
)
```

### Execute Workflow

```python
response = requests.post(
    "https://your-service-url.run.app/workflow",
    json={
        "workflow_type": "code_review_and_fix",
        "steps": [
            {
                "type": "analyze",
                "name": "review_code",
                "code": "your_code_here",
                "language": "python",
                "analysis_type": "review"
            },
            {
                "type": "generate",
                "name": "generate_improvements",
                "prompt": "Based on the review, generate improved code"
            }
        ]
    }
)
```

## Configuration

### Environment Variables

- `GEMINI_API_KEY` - Your Google Gemini API key (required)
- `GCP_PROJECT_ID` - Google Cloud project ID
- `PORT` - Service port (default: 8080)
- `LOG_LEVEL` - Logging level (INFO, DEBUG, WARNING, ERROR)
- `ENVIRONMENT` - Environment name (development, staging, production)

### Model Selection

The service intelligently routes requests to appropriate models:
- **gemini-1.5-pro**: Best for complex reasoning and code tasks
- **gemini-1.5-flash**: Optimized for speed and simple tasks
- **gemini-pro**: Standard model for general use
- **gemini-pro-vision**: For image and vision tasks

## Monitoring

### Health Checks

The service includes comprehensive health checks:
- **Startup Probe**: Ensures service starts correctly
- **Liveness Probe**: Detects if service needs restart
- **Readiness Probe**: Determines if service can accept traffic

### Logs

View logs in Google Cloud Console:
```bash
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=gemini-orchestration-service" \
  --limit 50
```

## Security Best Practices

1. **API Key Management**: Always use Secret Manager for API keys
2. **Service Account**: Use dedicated service account with minimal permissions
3. **Network Security**: Configure Cloud Run ingress settings appropriately
4. **Rate Limiting**: Implement rate limiting for production use
5. **Authentication**: Add authentication for production endpoints

## Cost Optimization

- **Min Instances**: Set to 0 for development, 1+ for production
- **Max Instances**: Configure based on expected load
- **CPU/Memory**: Start with 1 CPU/2Gi memory, adjust based on usage
- **Concurrency**: Set appropriate request concurrency limits

## Troubleshooting

### Common Issues

1. **API Key not working:**
   - Verify key in Google AI Studio
   - Check Secret Manager permissions
   - Ensure service account has access

2. **Deployment fails:**
   - Check Cloud Build logs
   - Verify all APIs are enabled
   - Confirm project ID is correct

3. **Service returns 500 errors:**
   - Check application logs
   - Verify environment variables
   - Test with curl to isolate issues

## Support

For issues or questions:
- Check Cloud Run logs for detailed error messages
- Review the health check endpoint for service status
- Ensure all required Google Cloud APIs are enabled

## License

This service is part of the MIZ OKI 3.0 project.