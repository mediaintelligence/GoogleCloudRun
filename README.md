# Claude Code Assistant with Gemini Methodology

An intelligent VS Code extension that combines Claude Code CLI capabilities with systematic project analysis and learning, following the Gemini workflow methodology.

## Features

### 🚀 Intelligent Project Analysis
- Automatic project structure understanding
- Codebase pattern recognition
- Dependency and architecture analysis
- Context-aware suggestions

### 🧠 Learning & Memory System
- Persistent project knowledge base
- Pattern learning from your coding style
- Historical context retention
- Incremental understanding improvement

### 🔄 Gemini Workflow Integration
- Systematic problem-solving approach
- Multi-step workflow orchestration
- Context preservation across sessions
- Intelligent task decomposition

### 💡 Proactive Assistance
- Smart trigger detection
- Context-aware code suggestions
- Error pattern recognition
- Automated workflow suggestions

## Installation

1. Install the extension from VS Code Marketplace
2. Ensure Claude Code CLI is installed and accessible:
   ```bash
   pip install claude-code
   ```
3. Configure extension settings as needed

## Usage

### Quick Start

1. **Analyze Project**: Right-click on a folder and select "Analyze Project with Claude"
2. **Start Workflow**: Use `Ctrl+Shift+G` (or `Cmd+Shift+G` on Mac) to start a Gemini workflow
3. **Execute with Context**: Select code and use `Ctrl+Shift+C` to execute with full project context

### Commands

- `Claude Assistant: Start Gemini Workflow` - Begin a systematic workflow session
- `Claude Assistant: Analyze Project` - Deep dive into project structure and patterns
- `Claude Assistant: Execute with Context` - Run Claude Code with full project understanding
- `Claude Assistant: Show Project Memory` - View learned patterns and history
- `Claude Assistant: Configure Workflow` - Adjust workflow settings

### Keyboard Shortcuts

- `Ctrl+Shift+G` / `Cmd+Shift+G` - Start Gemini Workflow
- `Ctrl+Shift+C` / `Cmd+Shift+C` - Execute with Context

## Configuration

### Extension Settings

- `claude-assistant.claudeCodePath`: Path to Claude Code executable
- `claude-assistant.autoAnalyzeProjects`: Enable automatic project analysis
- `claude-assistant.intelligentSuggestions`: Enable AI-powered suggestions
- `claude-assistant.workflowComplexity`: Workflow detail level (simple/standard/comprehensive)
- `claude-assistant.memoryRetention`: Days to retain learned patterns
- `claude-assistant.contextWindowSize`: Number of interactions to include in context

## Project Memory

The extension maintains a `.claude-memory` directory in your project root containing:
- Project analysis results
- Learned patterns
- Workflow history
- Context snapshots

This data helps improve suggestions and maintain context across sessions.

## Privacy & Security

- All processing happens locally using Claude Code CLI
- No code is sent to external servers
- Memory files are stored locally in your project
- Sensitive data detection and exclusion

## Requirements

- VS Code 1.70.0 or higher
- Claude Code CLI installed
- Node.js 16.x or higher

## Known Issues

- Initial project analysis may take time for large codebases
- Memory files can grow large over time (use cleanup command)

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs to our GitHub repository.

## License

MIT License - see LICENSE file for details

## Support

For issues, feature requests, or questions:
- GitHub Issues: [repository-url]
- Documentation: [docs-url]

---

**Note**: This extension requires a valid Claude Code CLI installation. It acts as an intelligent interface to Claude Code, not a replacement.