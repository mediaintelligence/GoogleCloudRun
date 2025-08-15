# Complete Setup Guide: Claude + ChatGPT + Gemini + Grok

## 🚀 All 4 AI Models Integrated!

Your orchestrator now supports:
- **Claude 4.1** (Anthropic)
- **ChatGPT 5** (OpenAI)
- **Gemini 2.5 Pro** (Google)
- **Grok 4 Heavy** (X.AI)

## 📋 Required API Keys

You need to set up API keys for all 4 providers:

```bash
# Set all API keys
export ANTHROPIC_API_KEY="your-claude-api-key"
export OPENAI_API_KEY="your-openai-api-key"
export GEMINI_API_KEY="your-gemini-api-key"
export XAI_API_KEY="your-grok-api-key"  # or GROK_API_KEY

# Add to your shell profile for persistence
echo 'export ANTHROPIC_API_KEY="your-claude-api-key"' >> ~/.zshrc
echo 'export OPENAI_API_KEY="your-openai-api-key"' >> ~/.zshrc
echo 'export GEMINI_API_KEY="your-gemini-api-key"' >> ~/.zshrc
echo 'export XAI_API_KEY="your-grok-api-key"' >> ~/.zshrc
source ~/.zshrc
```

## 🔑 How to Get API Keys

### Claude (Anthropic)
1. Visit: https://console.anthropic.com
2. Sign up or log in
3. Go to API Keys section
4. Create new API key

### ChatGPT (OpenAI)
1. Visit: https://platform.openai.com/api-keys
2. Sign in with OpenAI account
3. Click "Create new secret key"
4. Copy the key immediately

### Gemini (Google)
1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the generated key

### Grok (X.AI)
1. Visit: https://x.ai/api
2. Sign in with X/Twitter account
3. Request API access (currently in beta)
4. Once approved, generate API key

## 🎯 Available Models

### Claude Models
- **CLAUDE_4_1**: Latest Claude (maps to Claude 3.5 Sonnet)
- **SONNET_4_0**: Sonnet model
- **CLAUDE_3_OPUS**: Most capable classic
- **CLAUDE_3_HAIKU**: Fastest Claude

### ChatGPT Models  
- **CHATGPT_5**: Latest GPT (maps to GPT-4 Turbo)
- **GPT_4_TURBO**: GPT-4 Turbo
- **GPT_4**: Standard GPT-4
- **GPT_3_5_TURBO**: Fast and efficient

### Gemini Models
- **GEMINI_2_5_PRO**: Latest Gemini (maps to 2.0 Flash)
- **GEMINI_2_0_FLASH**: Gemini 2.0 Flash
- **GEMINI_1_5_PRO**: Gemini 1.5 Pro
- **GEMINI_1_5_FLASH**: Gemini 1.5 Flash

### Grok Models
- **GROK_4_HEAVY**: Most capable Grok
- **GROK_2**: Fast conversational model

## 🔄 Restart Orchestrator with All Keys

```bash
# Stop current orchestrator
kill $(lsof -t -i:8080)

# Start with all API keys
cd "/Users/bm/Library/CloudStorage/GoogleDrive-ceo@mediaintelligence.ai/My Drive/MIZ/GoogleCloudRun/claude-gemini-orchestrator"
source venv/bin/activate

ANTHROPIC_API_KEY="your-claude-key" \
OPENAI_API_KEY="your-openai-key" \
GEMINI_API_KEY="your-gemini-key" \
XAI_API_KEY="your-grok-key" \
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080
```

## 🧪 Test All 4 Models

### Test Individual Models
```bash
# Test Claude 4.1
curl -X POST http://localhost:8080/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing",
    "task_type": "analysis",
    "preferred_model": "claude-3-5-sonnet-20241022",
    "collaboration_mode": "specialized",
    "max_tokens": 1024
  }'

# Test ChatGPT 5
curl -X POST http://localhost:8080/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a Python web scraper",
    "task_type": "code",
    "preferred_model": "gpt-4-turbo-preview",
    "collaboration_mode": "specialized",
    "max_tokens": 1024
  }'

# Test Gemini 2.5 Pro
curl -X POST http://localhost:8080/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a marketing strategy",
    "task_type": "creative",
    "preferred_model": "gemini-2.0-flash-exp",
    "collaboration_mode": "specialized",
    "max_tokens": 1024
  }'

# Test Grok 4 Heavy
curl -X POST http://localhost:8080/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Analyze current AI trends",
    "task_type": "analysis",
    "preferred_model": "grok-beta",
    "collaboration_mode": "specialized",
    "max_tokens": 1024
  }'
```

### Test Multi-Model Collaboration
```bash
# All 4 models debate a topic
curl -X POST http://localhost:8080/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the future of AI in the next 5 years?",
    "task_type": "analysis",
    "collaboration_mode": "debate",
    "max_tokens": 3000
  }'

# Models work in parallel
curl -X POST http://localhost:8080/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a comprehensive business plan for an AI startup",
    "task_type": "creative",
    "collaboration_mode": "parallel",
    "max_tokens": 4000
  }'
```

## 📊 Check Status

```bash
# Health check - shows which models are configured
curl http://localhost:8080/health | python -m json.tool

# List all models and their status
curl http://localhost:8080/models | python -m json.tool

# View capabilities
curl http://localhost:8080/capabilities | python -m json.tool
```

## 🎭 Collaboration Modes

1. **PARALLEL** - All models work simultaneously
2. **SEQUENTIAL** - Output chains from one model to another
3. **DEBATE** - Models discuss and refine answers
4. **CONSENSUS** - Models must reach agreement
5. **SPECIALIZED** - Each model handles their strength

## 🔧 Task Types

- **ANALYSIS**: Claude 4.1, ChatGPT 5, Grok 4, Gemini 2.5
- **CODE**: Sonnet 4.0, ChatGPT 5, Claude 4.1, GPT-4
- **VISION**: Gemini 2.5, GPT-4 Turbo, Gemini 1.5
- **REASONING**: Claude 4.1, ChatGPT 5, Grok 4, Gemini 2.5
- **CREATIVE**: Sonnet 4.0, ChatGPT 5, Gemini 2.5, Grok 2
- **TRANSLATION**: Gemini 2.5, GPT-3.5, Claude Haiku
- **SUMMARIZATION**: GPT-3.5, Gemini 2.0, Grok 2, Claude Haiku

## 🚨 Troubleshooting

### If models show as not configured:
1. Verify environment variables are set
2. Restart the orchestrator with the keys
3. Check logs: `tail -f logs/orchestrator.log`

### API Endpoints
- Main: http://localhost:8080
- Docs: http://localhost:8080/docs
- Health: http://localhost:8080/health
- Models: http://localhost:8080/models

## 🎉 You're Ready!

Once you've added your API keys and restarted, you'll have all 4 AI providers working together:
- Claude Code for reasoning and analysis
- ChatGPT for versatile tasks
- Gemini for multimodal and speed
- Grok for real-time and conversational

The orchestrator will intelligently route tasks to the best model or combination of models!