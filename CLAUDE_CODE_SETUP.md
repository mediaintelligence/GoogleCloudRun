# Claude Code + Gemini Integration Setup

## Quick Start

Your orchestrator is running and ready to integrate Claude Code with Gemini models!

### 1. Set API Keys

You need to configure API keys for both services:

```bash
# Option 1: Set environment variables temporarily
export ANTHROPIC_API_KEY="your-claude-api-key-here"
export GEMINI_API_KEY="your-gemini-api-key-here"

# Option 2: Add to your shell profile (~/.zshrc or ~/.bash_profile)
echo 'export ANTHROPIC_API_KEY="your-claude-api-key-here"' >> ~/.zshrc
echo 'export GEMINI_API_KEY="your-gemini-api-key-here"' >> ~/.zshrc
source ~/.zshrc
```

### 2. Restart Orchestrator with API Keys

```bash
# Stop current orchestrator
kill $(lsof -t -i:8080)

# Start with API keys
cd "/Users/bm/Library/CloudStorage/GoogleDrive-ceo@mediaintelligence.ai/My Drive/MIZ/GoogleCloudRun/claude-gemini-orchestrator"
source venv/bin/activate
ANTHROPIC_API_KEY="your-key" GEMINI_API_KEY="your-key" python -m uvicorn app.main:app --host 0.0.0.0 --port 8080
```

### 3. Available Models

Your system is configured with these model mappings:

- **CLAUDE_4_1** → Claude 3.5 Sonnet (Latest)
- **SONNET_4_0** → Claude 3.5 Sonnet  
- **GEMINI_2_5_PRO** → Gemini 2.0 Flash (Latest)
- **GEMINI_2_0_FLASH** → Gemini 2.0 Flash

### 4. Collaboration Modes

The orchestrator supports 5 collaboration modes:

1. **PARALLEL** - Both models work simultaneously
2. **SEQUENTIAL** - One model's output feeds another
3. **DEBATE** - Models discuss and refine responses
4. **CONSENSUS** - Models must reach agreement
5. **SPECIALIZED** - Each model handles their expertise

### 5. Test the Integration

```bash
# Test code generation with both models
curl -X POST http://localhost:8080/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a Python web scraper",
    "task_type": "code",
    "collaboration_mode": "specialized",
    "max_tokens": 2048
  }'

# Test analysis with debate mode
curl -X POST http://localhost:8080/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Analyze the pros and cons of microservices",
    "task_type": "analysis",
    "collaboration_mode": "debate",
    "max_tokens": 2048
  }'
```

### 6. VS Code Extension Integration

The VS Code extension can interact with the orchestrator:

1. Open VS Code in the project directory
2. Press `F5` to launch the extension
3. Use keyboard shortcuts:
   - `Ctrl+Shift+G` - Start Gemini Workflow
   - `Ctrl+Shift+C` - Execute with Context
   - `Ctrl+Shift+P` → "Claude Assistant"

### 7. API Endpoints

- **Main Orchestration**: `POST /orchestrate`
- **Workflow Execution**: `POST /workflow`
- **Model Comparison**: `POST /compare`
- **Smart Routing**: `POST /smart-route`
- **API Documentation**: http://localhost:8080/docs

### 8. Example: Using Both Claude Code and Gemini

```python
import requests

# Smart route automatically selects best model and mode
response = requests.post("http://localhost:8080/smart-route", json={
    "prompt": "Create a REST API with authentication",
    "max_tokens": 3000,
    "temperature": 0.7
})

result = response.json()
print(f"Primary Model: {result['models_used']['primary']}")
print(f"Supporting Model: {result['models_used']['supporting']}")
print(f"Collaboration Mode: {result['collaboration_mode']}")
print(f"Response: {result['response']}")
```

## Getting API Keys

### Claude (Anthropic) API Key
1. Go to https://console.anthropic.com
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key

### Gemini API Key
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the generated key

## Troubleshooting

If you see "API not configured" errors:
1. Verify environment variables are set: `echo $ANTHROPIC_API_KEY`
2. Restart the orchestrator after setting keys
3. Check logs: `tail -f logs/orchestrator.log`

## Support

- Orchestrator API Docs: http://localhost:8080/docs
- Health Check: http://localhost:8080/health
- Available Models: http://localhost:8080/models