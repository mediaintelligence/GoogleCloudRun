# Gemini Assistant for VS Code

[![Version](https://img.shields.io/visual-studio-marketplace/v/your-publisher.gemini-assistant)](https://marketplace.visualstudio.com/items?itemName=your-publisher.gemini-assistant)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/your-publisher.gemini-assistant)](https://marketplace.visualstudio.com/items?itemName=your-publisher.gemini-assistant)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/your-publisher.gemini-assistant)](https://marketplace.visualstudio.com/items?itemName=your-publisher.gemini-assistant)

An intelligent AI-powered development assistant that leverages Google's Gemini AI to transform how you write code. With deep project understanding, systematic workflows, and adaptive learning, Gemini Assistant acts as your personal AI pair programmer.

## ✨ Features

### 🧠 Project Intelligence System
- **Deep Code Analysis**: Automatically analyzes your entire codebase to understand architecture, patterns, and dependencies
- **Context-Aware Suggestions**: Provides recommendations based on your project's specific structure and coding patterns
- **Technology Stack Recognition**: Identifies frameworks, libraries, and tools used in your project
- **Code Quality Metrics**: Tracks complexity, test coverage, and technical debt

### 🚀 Gemini Workflow Engine
- **Systematic Development**: Breaks complex tasks into manageable phases with AI guidance
- **Adaptive Planning**: Gemini creates custom workflows based on your project needs
- **Progress Tracking**: Visual workflow panel shows current phase and completion status
- **Intelligent Reviews**: Each phase includes AI-powered review and validation

### 💾 Persistent Memory System
- **Learning from Experience**: Remembers successful patterns and approaches
- **Context Preservation**: Maintains conversation history across sessions
- **Pattern Recognition**: Identifies and suggests previously successful solutions
- **Team Knowledge Sharing**: Export and import memory for team collaboration

### 🎯 Intelligent Triggers
- **Proactive Assistance**: Detects when you might need help (errors, repetitive edits, etc.)
- **Smart Notifications**: Non-intrusive suggestions that appear when most relevant
- **Custom Triggers**: Configure your own conditions for AI assistance
- **Learning Adaptation**: Improves suggestions based on your acceptance patterns

### 🤖 Gemini AI Integration
- **Multiple Models**: Support for Gemini Pro and Gemini Pro Vision
- **Streaming Responses**: Real-time AI responses for better interactivity
- **Token Optimization**: Efficient prompt engineering to minimize API usage
- **Offline Fallbacks**: Basic functionality when API is unavailable

## 📸 Screenshots

- **Workflow Management**: Systematic development with AI-guided phases
- **Project Analysis**: Deep understanding of your codebase structure
- **AI Conversations**: Natural language interactions with context awareness


## 🚀 Getting Started

### Prerequisites
1. VS Code version 1.85.0 or higher
2. A Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

#### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Gemini Assistant"
4. Click Install

#### From VSIX (Manual Installation)
1. Download the latest `.vsix` file from [Releases](https://github.com/your-username/gemini-assistant/releases)
2. In VS Code, go to Extensions → ... → Install from VSIX
3. Select the downloaded file

### Configuration

1. **Set up your Gemini API Key**:
   - Open Settings (Ctrl+,)
   - Search for "Gemini Assistant"
   - Enter your API key in the secure field
   - Or use Command Palette: `Gemini: Configure API Key`

2. **Choose Your Preferences**:
   ```json
   {
     "gemini-assistant.model": "gemini-pro",
     "gemini-assistant.temperature": 0.7,
     "gemini-assistant.autoAnalyzeProjects": true,
     "gemini-assistant.workflowComplexity": "standard"
   }
   ```

## 📚 Usage

### Basic Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `Gemini: Start Workflow` | Begin a new AI-guided development workflow | Ctrl+Shift+G |
| `Gemini: Ask Question` | Ask Gemini about your code | Ctrl+Shift+A |
| `Gemini: Analyze Project` | Deep analysis of project structure | - |
| `Gemini: Show Memory` | View learned patterns and history | - |

### Example Workflows

#### 1. Adding a New Feature
```
1. Run "Start Workflow" (Ctrl+Shift+G)
2. Describe your feature: "Add user authentication with JWT"
3. Gemini creates phases:
   - Analyze existing auth patterns
   - Design database schema
   - Implement auth middleware
   - Add login/register endpoints
   - Create tests
   - Documentation
4. Follow AI guidance through each phase
```

#### 2. Refactoring Code
```
1. Select code to refactor
2. Right-click → "Ask Gemini"
3. Type: "Refactor this for better performance"
4. Review AI suggestions
5. Apply changes with one click
```

#### 3. Debugging Complex Issues
```
1. When errors appear, Gemini Trigger activates
2. Click "Get AI Help" in the notification
3. Gemini analyzes:
   - Error context
   - Similar past issues
   - Project patterns
4. Receive targeted solution suggestions
```

### Advanced Features

#### Custom Workflow Templates
Create your own workflow templates in `.vscode/gemini-workflows/`:

```json
{
  "name": "API Endpoint",
  "description": "Create a new REST API endpoint",
  "phases": [
    {
      "name": "Design",
      "prompts": ["What should this endpoint do?", "What data does it need?"]
    },
    {
      "name": "Implementation",
      "prompts": ["Generate the route handler", "Add validation"]
    },
    {
      "name": "Testing",
      "prompts": ["Create unit tests", "Add integration tests"]
    }
  ]
}
```

#### Memory Export/Import
Share team knowledge:
```bash
# Export your project memory
Gemini: Export Memory → Save to team-knowledge.json

# Import on another machine
Gemini: Import Memory → Select team-knowledge.json
```

## ⚙️ Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `gemini-assistant.apiKey` | string | - | Your Gemini API key (stored securely) |
| `gemini-assistant.model` | enum | gemini-pro | AI model to use |
| `gemini-assistant.temperature` | number | 0.7 | Response creativity (0-1) |
| `gemini-assistant.maxTokens` | number | 2048 | Maximum response length |
| `gemini-assistant.autoAnalyzeProjects` | boolean | true | Auto-analyze on open |
| `gemini-assistant.workflowComplexity` | enum | standard | Default workflow detail |
| `gemini-assistant.memoryRetention` | number | 30 | Days to keep memories |
| `gemini-assistant.intelligentSuggestions` | boolean | true | Enable proactive AI help |

## 🔒 Privacy & Security

- **API Key Security**: Keys are stored in VS Code's secure storage, never in plain text
- **Local Processing**: Code analysis happens locally; only prompts are sent to Gemini
- **Data Control**: Choose what to share with AI; sensitive files can be excluded
- **No Training**: Your code is not used to train Gemini models
- **Offline Mode**: Basic features work without internet connection

## 🐛 Troubleshooting

### Common Issues

#### "API Key Invalid"
- Ensure your key is from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Check for extra spaces when pasting
- Verify the key has Gemini API access enabled

#### "Rate Limit Exceeded"
- The extension implements automatic retry with backoff
- Consider upgrading your Gemini API tier
- Reduce `maxTokens` in settings

#### "Extension Not Activating"
1. Check VS Code version (≥1.85.0)
2. Look for errors in Output → Gemini Assistant
3. Try reloading window (Ctrl+R)

### Getting Help
- 📖 [Documentation Wiki](https://github.com/your-username/gemini-assistant/wiki)
- 🐛 [Report Issues](https://github.com/your-username/gemini-assistant/issues)
- 💬 [Discussions](https://github.com/your-username/gemini-assistant/discussions)
- 📧 Support: support@your-domain.com

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
```bash
# Clone the repository
git clone https://github.com/your-username/gemini-assistant.git
cd gemini-assistant

# Install dependencies
npm install

# Run in development
npm run watch

# Open VS Code
code .

# Press F5 to launch Extension Development Host
```

## 📈 Roadmap

### Version 1.1 (Q1 2024)
- [ ] Multi-file editing support
- [ ] Team collaboration features
- [ ] Custom AI model fine-tuning
- [ ] Performance profiling integration

### Version 1.2 (Q2 2024)
- [ ] Support for more AI models
- [ ] Advanced debugging assistance
- [ ] Code review automation
- [ ] CI/CD integration

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Google Gemini team for the amazing AI model
- VS Code team for the excellent extension API
- Our contributors and early adopters
- Open source projects that inspired us

---

Made with ❤️ by [Your Name/Team] | [Website](https://your-domain.com) | [Twitter](https://twitter.com/yourhandle)