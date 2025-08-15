# 🚀 Claude-Gemini Coding MOA

An advanced AI-powered development assistant that combines the power of Claude and Gemini models through intelligent orchestration. **Fully compatible with both VS Code and Cursor!**

## 🏗️ Architecture

This project implements a **Multi-Orchestrator Architecture (MOA)** that intelligently routes development tasks between Claude and Gemini AI models:

- **VS Code Extension**: The main Claude Gemini Assistant extension (compatible with Cursor)
- **Cloud Run Orchestrator**: FastAPI service that routes between AI models
- **Boss Agent Router**: Intelligent model selection for optimal performance
- **Multi-Model Collaboration**: Parallel, sequential, debate, and consensus modes

## 🚀 Quick Start

### 1. Setup API Keys
```bash
./setup-api-keys.sh
```

### 2. Deploy to Cloud Run
```bash
./deploy-orchestrator.sh
```

### 3. Deploy Extension to VS Code & Cursor
```bash
./deploy-editors.sh
```

### 4. Configure & Test
Update your editor settings with the orchestrator URL provided after deployment.

## 📚 Documentation

- **[Quick Start](QUICK_START.md)** - 4-step deployment guide
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[VS Code Extension](src/)** - Extension source code
- **[Orchestrator Service](claude-gemini-orchestrator/)** - Cloud Run service

## ✨ Features

### 🤖 AI Orchestration
- **Intelligent Routing**: Automatically selects the best AI model for each task
- **Multi-Model Collaboration**: Claude and Gemini work together for optimal results
- **Context Awareness**: Maintains project context across AI interactions

### 🛠️ Development Tools
- **Code Generation**: AI-powered code creation from natural language
- **Smart Refactoring**: Intelligent code improvement suggestions
- **Debugging Assistance**: AI-guided error resolution
- **Performance Optimization**: Code analysis and improvement recommendations

### 🎯 Workflow Management
- **Systematic Workflows**: Structured approach to complex development tasks
- **Phase-based Execution**: Break down tasks into manageable phases
- **Progress Tracking**: Monitor workflow execution and completion

### 🔌 Editor Integration
- **VS Code**: Full extension marketplace integration
- **Cursor**: Built-in AI assistance compatibility
- **Cross-Editor**: Same extension works seamlessly in both editors

## 🔧 Development

### Prerequisites
- Node.js 18+
- Python 3.8+
- Docker
- Google Cloud CLI

### Local Development
```bash
# Install dependencies
npm install

# Build extension
npm run compile

# Launch extension
npm run launch
```

### Cloud Service Development
```bash
cd claude-gemini-orchestrator
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### Extension Deployment
```bash
# Deploy to both VS Code and Cursor
./deploy-editors.sh

# Or deploy to specific editor
./deploy-vscode.sh    # VS Code only
./deploy-cursor.sh    # Cursor only
```

## 🌐 API Endpoints

The orchestrator service provides:

- `POST /orchestrate` - Main AI orchestration endpoint
- `POST /workflow` - Execute complex AI workflows
- `POST /compare` - Compare responses from different models
- `GET /capabilities` - Model capabilities and strengths
- `GET /models` - Available AI models

## 🔒 Security

- API keys stored securely in Google Secret Manager
- Service account with minimal required permissions
- HTTPS enforced for all communications
- CORS configured for web access

## 📊 Performance

- **Auto-scaling**: 1-100 instances based on demand
- **Resource optimization**: 4GB RAM, 2 vCPUs per instance
- **High concurrency**: 100 concurrent requests per instance
- **Fast response**: Optimized for development workflow integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/mediaintelligence/GoogleCloudRun/issues)
- **Documentation**: [Deployment Guide](DEPLOYMENT_GUIDE.md)
- **Architecture**: See [src/](src/) for extension details

---

**Built with ❤️ for developers who love AI-powered coding in VS Code and Cursor! 🚀✨**