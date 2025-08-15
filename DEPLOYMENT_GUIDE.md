# 🚀 Claude-Gemini Coding MOA Deployment Guide

This guide will walk you through deploying the Claude-Gemini Multi-Orchestrator Architecture (MOA) to Google Cloud Run and installing the extension in VS Code and Cursor.

## 🏗️ Architecture Overview

The Claude-Gemini Coding MOA consists of:

- **VS Code Extension**: The main Claude Gemini Assistant extension (compatible with Cursor)
- **Cloud Run Orchestrator**: A FastAPI service that intelligently routes between Claude and Gemini models
- **Multi-Model Intelligence**: Boss Agent Router that selects optimal AI models for each task

## 📋 Prerequisites

1. **Google Cloud Project** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Docker** installed and running
4. **Node.js 18+** installed for extension building
5. **API Keys** for:
   - Anthropic Claude API
   - Google Gemini API

## 🔑 Step 1: Setup API Keys

First, set up your API keys as Google Cloud secrets:

```bash
./setup-api-keys.sh
```

This script will:
- Check your gcloud authentication
- Create `anthropic-api-key` secret
- Create `gemini-api-key` secret

## 🚀 Step 2: Deploy the Orchestrator

Deploy the Claude-Gemini orchestrator to Cloud Run:

```bash
./deploy-orchestrator.sh
```

This script will:
- Build and push the Docker image
- Deploy to Cloud Run
- Configure the service with proper resources
- Test the health endpoint
- Provide the service URL

## 🔌 Step 3: Deploy Extension to VS Code & Cursor

### Option A: Deploy to Both Editors (Recommended)
```bash
./deploy-editors.sh
```

This script will:
- Build and package the extension
- Automatically install in VS Code (if CLI available)
- Automatically install in Cursor (if CLI available)
- Provide manual installation instructions

### Option B: Deploy to VS Code Only
```bash
./deploy-vscode.sh
```

### Option C: Deploy to Cursor Only
```bash
./deploy-cursor.sh
```

## ⚙️ Step 4: Configure Editors

### VS Code Configuration
Update your VS Code settings with the orchestrator URL:

```json
{
  "claudeGeminiAssistant.orchestratorUrl": "YOUR_SERVICE_URL",
  "claudeGeminiAssistant.useLocalServices": false
}
```

### Cursor Configuration
Update your Cursor settings with the orchestrator URL:

```json
{
  "claudeGeminiAssistant.orchestratorUrl": "YOUR_SERVICE_URL",
  "claudeGeminiAssistant.useLocalServices": false
}
```

**Note**: Cursor is built on VS Code, so the same extension and configuration works in both editors!

## 🧪 Step 5: Test the Deployment

### Test the Orchestrator
```bash
./test-orchestrator.sh <YOUR_SERVICE_URL>
```

### Test the Extension
1. Open VS Code or Cursor
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Claude Assistant: Start Gemini Workflow"
4. The extension should respond with AI assistance

## 🔍 Available Endpoints

### Core Endpoints
- `GET /` - Service information
- `GET /health` - Health check
- `POST /orchestrate` - Main AI orchestration endpoint
- `POST /workflow` - Execute complex AI workflows
- `POST /compare` - Compare responses from different models
- `GET /capabilities` - Model capabilities and strengths
- `GET /models` - Available AI models

### Collaboration Modes
- **Parallel**: Both models work simultaneously
- **Sequential**: One model's output feeds into another
- **Debate**: Models discuss and refine responses
- **Consensus**: Models must reach agreement
- **Specialized**: Each model handles their expertise

## 🎯 Task Types

The orchestrator supports various task types:
- **Analysis**: Deep analysis and evaluation
- **Code**: Code generation and review
- **Vision**: Image and visual tasks
- **Reasoning**: Complex logical reasoning
- **Creative**: Creative writing and generation
- **Translation**: Language translation
- **Summarization**: Text summarization

## 🔧 Configuration Options

### Environment Variables
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `GEMINI_API_KEY`: Your Gemini API key
- `GCP_PROJECT_ID`: Google Cloud project ID

### Service Configuration
- **Memory**: 4GB
- **CPU**: 2 vCPUs
- **Max Instances**: 100
- **Min Instances**: 1
- **Concurrency**: 100
- **Timeout**: 300 seconds

### Extension Configuration
- **Orchestrator URL**: Your Cloud Run service URL
- **API Keys**: Stored securely in editor settings
- **Workflow Settings**: Customizable AI workflow parameters

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Error**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Secrets Not Found**
   ```bash
   ./setup-api-keys.sh
   ```

3. **Docker Build Fails**
   ```bash
   # Check Docker is running
   docker ps
   
   # Clean up images
   docker system prune -a
   ```

4. **Service Won't Start**
   ```bash
   # Check logs
   gcloud logs read --service=claude-gemini-orchestrator --limit=50
   
   # Check service status
   gcloud run services describe claude-gemini-orchestrator --region=us-central1
   ```

5. **Extension Won't Install**
   ```bash
   # Check Node.js version
   node --version  # Should be 18+
   
   # Rebuild extension
   npm run clean
   npm install
   npm run compile
   npm run package
   ```

6. **Extension Not Working**
   - Verify orchestrator URL is correct
   - Check extension is enabled
   - Restart VS Code/Cursor
   - Check extension output panel for errors

### Health Checks

Monitor your service health:

```bash
# Check service status
gcloud run services list --region=us-central1

# View recent logs
gcloud logs tail --service=claude-gemini-orchestrator --region=us-central1
```

## 📊 Monitoring and Scaling

### Auto-scaling
The service automatically scales based on demand:
- **Min instances**: 1 (always running)
- **Max instances**: 100 (scales up during high load)

### Resource Monitoring
Monitor resource usage in Google Cloud Console:
- Cloud Run > Services > claude-gemini-orchestrator
- Cloud Monitoring > Metrics

## 🔒 Security

- **API keys** are stored securely in Google Secret Manager
- **Service account** has minimal required permissions
- **HTTPS** is enforced for all communications
- **CORS** is configured for web access
- **Extension settings** are stored securely in editor

## 💰 Cost Optimization

- **Min instances**: Set to 0 for cost savings (adds cold start latency)
- **Max instances**: Adjust based on expected load
- **Memory/CPU**: Optimize based on actual usage patterns

## 🎯 Editor-Specific Features

### VS Code
- Full extension marketplace integration
- Command palette integration
- Status bar integration
- Output panel integration

### Cursor
- Same features as VS Code
- Built-in AI assistance compatibility
- Enhanced code completion
- Seamless workflow integration

## 🆘 Support

If you encounter issues:

1. Check the service logs: `gcloud logs read --service=claude-gemini-orchestrator`
2. Verify API keys are working
3. Check service account permissions
4. Review the troubleshooting section above
5. Check extension output panel in VS Code/Cursor

## 🎉 Success!

Once deployed, your Claude-Gemini Coding MOA will be available at the provided service URL and the extension will be installed in both VS Code and Cursor. The orchestrator will intelligently route requests between Claude and Gemini models, providing optimal AI assistance for your development tasks.

---

**Happy coding with AI in VS Code and Cursor! 🚀✨**
