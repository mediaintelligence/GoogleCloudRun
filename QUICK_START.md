# 🚀 Quick Start - Deploy Claude-Gemini Coding MOA

## ⚡ 4-Step Deployment

### 1️⃣ Setup API Keys
```bash
./setup-api-keys.sh
```
- Creates Google Cloud secrets for your API keys
- Requires: Anthropic API key + Gemini API key

### 2️⃣ Deploy to Cloud Run
```bash
./deploy-orchestrator.sh
```
- Builds and deploys the orchestrator service
- Provides the service URL for configuration

### 3️⃣ Deploy Extension to VS Code & Cursor
```bash
./deploy-editors.sh
```
- Builds and packages the extension
- Automatically installs in both editors (if CLIs available)
- Provides manual installation instructions

### 4️⃣ Test & Configure
```bash
# Test the orchestrator
./test-orchestrator.sh <YOUR_SERVICE_URL>

# Test the extension in VS Code/Cursor
# Press Ctrl+Shift+P → "Claude Assistant: Start Gemini Workflow"
```

## 🔑 Get Your API Keys

- **Anthropic Claude**: https://console.anthropic.com/
- **Google Gemini**: https://makersuite.google.com/app/apikey

## 🌐 What You Get

- **Intelligent AI Orchestration**: Routes between Claude and Gemini models
- **Multi-Model Collaboration**: Parallel, sequential, debate, and consensus modes
- **Cloud-Native**: Auto-scaling, high availability, global deployment
- **VS Code & Cursor Integration**: Seamless development workflow integration
- **Cross-Editor Compatibility**: Same extension works in both editors

## 📚 Full Documentation

- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Complete setup instructions
- **[README](README.md)** - Project overview and features
- **[Architecture](claude-gemini-orchestrator/)** - Service implementation details

## 🎯 Ready to Deploy?

Run the commands above and you'll have a production-ready Claude-Gemini Coding MOA in minutes, working in both VS Code and Cursor!

---

**Need help? Check the [Deployment Guide](DEPLOYMENT_GUIDE.md) for troubleshooting.**
