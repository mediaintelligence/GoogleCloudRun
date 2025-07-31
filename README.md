# 🚀 Claude Gemini Assistant for VS Code

An advanced AI-powered development assistant that combines the power of Claude and Gemini models for intelligent code analysis, systematic workflows, and adaptive learning.

## ✨ Features

### 🤖 Core AI Capabilities
- **Multi-Model Intelligence**: Seamlessly switch between Claude and Gemini models
- **Context-Aware Analysis**: Understands your entire project structure and codebase
- **Intelligent Workflows**: Systematic approach to complex development tasks
- **Memory System**: Learns from your coding patterns and preferences
- **Adaptive Learning**: Improves suggestions based on your project history

### 🛠️ Advanced AI Features
- **Code Generation**: Generate code from natural language descriptions
- **Smart Refactoring**: AI-powered code refactoring with multiple strategies
- **Intelligent Debugging**: AI-assisted error detection and resolution
- **Code Explanation**: Get detailed explanations of complex code
- **Performance Optimization**: AI-driven code performance analysis
- **Test Generation**: Automatically generate comprehensive test suites

### 📊 Project Intelligence
- **Project Analysis**: Deep understanding of your project structure
- **Dependency Tracking**: Monitor and analyze project dependencies
- **Change Detection**: Track and learn from code changes
- **Pattern Recognition**: Identify and learn from coding patterns
- **Context Awareness**: Maintain project context across sessions

### 🎯 Workflow Management
- **Systematic Workflows**: Structured approach to complex tasks
- **Phase-based Execution**: Break down tasks into manageable phases
- **Progress Tracking**: Monitor workflow execution and progress
- **Success Criteria**: Define and track completion criteria
- **Execution History**: Review and learn from past executions

## 🚀 Quick Start

### Installation
1. Install the extension from the VS Code marketplace
2. Configure your API keys in settings
3. Start using AI-powered development features

### Basic Usage
1. **Start a Workflow**: `Ctrl+Shift+G` (or `Cmd+Shift+G` on Mac)
2. **Analyze Project**: `Ctrl+Shift+A` 
3. **Execute with Context**: `Ctrl+Shift+C`
4. **Generate Code**: Use the command palette to access AI code generation
5. **Refactor Code**: Select code and use AI refactoring tools

## 🎮 Commands

### Core Commands
- `Start Gemini Workflow` - Begin a systematic AI workflow
- `Analyze Project with Claude` - Deep project analysis
- `Execute Claude Code with Full Context` - Context-aware code execution

### Advanced AI Commands
- `Generate Code with AI` - Create code from descriptions
- `Refactor Code with AI` - Smart code refactoring
- `Debug with AI` - AI-assisted debugging
- `Explain Code with AI` - Get code explanations
- `Optimize Performance with AI` - Performance analysis
- `Generate Tests with AI` - Create test suites

### Management Commands
- `Show Project Learning History` - View project memory
- `Configure Gemini Workflow Settings` - Customize workflows
- `Review Last Claude Code Execution` - Review recent executions
- `Clear Stored API Key` - Security management

## ⚙️ Configuration

### API Keys
```json
{
  "gemini-assistant.apiKey": "your-gemini-api-key",
  "claude-assistant.claudeCodePath": "claude-code"
}
```

### Workflow Settings
```json
{
  "gemini-assistant.bossAgent.fallbackChain": ["claude4", "gpt4o", "gemini25"],
  "gemini-assistant.bossAgent.dailyCostLimit": 100,
  "claude-assistant.workflowComplexity": "standard",
  "claude-assistant.memoryRetention": 30,
  "claude-assistant.contextWindowSize": 10
}
```

### Intelligence Settings
```json
{
  "claude-assistant.autoAnalyzeProjects": true,
  "claude-assistant.intelligentSuggestions": true,
  "claude-assistant.memoryAwareness": true,
  "claude-assistant.maxMemoryReferences": 5,
  "claude-assistant.maxPatternReferences": 3
}
```

## 🏗️ Architecture

### Core Components
- **Multi-Model Orchestrator**: Manages Claude and Gemini interactions
- **Project Intelligence System**: Analyzes and understands project structure
- **Memory System**: Stores and retrieves learning patterns
- **Workflow Engine**: Manages systematic task execution
- **Intelligent Triggers**: Proactive assistance based on events
- **Context Provider**: Maintains project context

### AI Adapters
- **Claude Adapter**: Handles Claude model interactions
- **Gemini Adapter**: Manages Gemini model communications
- **Boss Agent**: Orchestrates multi-model decision making

### UI Components
- **Workflow Panel**: Visual workflow management
- **Context Viewer**: Project context visualization
- **Memory Hooks**: Intelligent assistance triggers

## 🔧 Development

### Prerequisites
- Node.js 18+
- VS Code Extension Development Host
- TypeScript 5.3+

### Setup
```bash
npm install
npm run compile
npm run launch
```

### Building
```bash
npm run package
npm run deploy
```

## 📚 API Reference

### Core Classes
- `ClaudeGeminiAssistant` - Main extension class
- `ProjectIntelligenceSystem` - Project analysis engine
- `MemorySystem` - Learning and memory management
- `GeminiWorkflowEngine` - Workflow execution engine
- `MultiModelOrchestrator` - AI model coordination

### Key Interfaces
- `ExecutionContext` - Context for AI operations
- `ProjectIntelligence` - Project analysis data
- `WorkflowPhase` - Workflow execution phases
- `MemoryEntry` - Learning memory structure

## 🎯 Use Cases

### Code Generation
```typescript
// Generate a function from description
const description = "Create a function that validates email addresses";
// AI generates appropriate code for your project
```

### Smart Refactoring
```typescript
// Select code and choose refactoring type
// AI improves code quality while maintaining functionality
```

### Intelligent Debugging
```typescript
// AI analyzes errors and provides solutions
// Includes prevention tips and best practices
```

### Performance Optimization
```typescript
// AI identifies bottlenecks and suggests optimizations
// Provides performance analysis and improvements
```

## 🔒 Security

- API keys are stored securely in VS Code's SecretStorage
- No code or data is sent to external services without consent
- All communications are encrypted
- Local processing for sensitive operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/mediaintelligence/GoogleCloudRun/issues)
- **Documentation**: [Wiki](https://github.com/mediaintelligence/GoogleCloudRun/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/mediaintelligence/GoogleCloudRun/discussions)

## 🎉 Acknowledgments

- Built with VS Code Extension API
- Powered by Claude and Gemini AI models
- Inspired by modern development workflows
- Community-driven development

---

**Made with ❤️ for developers who love AI-powered coding**