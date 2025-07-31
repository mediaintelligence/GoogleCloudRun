# 📖 Claude Gemini Assistant - User Guide

## 🎯 Getting Started

### Installation
1. **From VS Code Marketplace**:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "Claude Gemini Assistant"
   - Click Install

2. **Manual Installation**:
   - Download the `.vsix` file
   - In VS Code: Extensions → ... → Install from VSIX
   - Select the downloaded file

### Initial Setup
1. **Configure API Keys**:
   - Open Command Palette (Ctrl+Shift+P)
   - Run "Claude Assistant: Configure API Key"
   - Enter your Gemini API key
   - Enter your Claude API key (if using Claude)

2. **Verify Installation**:
   - Check the status bar for "Claude Assistant" indicator
   - Open Command Palette and search for "Claude Assistant"
   - You should see all available commands

## 🚀 Core Features

### 1. Start Gemini Workflow
**Shortcut**: `Ctrl+Shift+G` (or `Cmd+Shift+G` on Mac)

**What it does**: Begins a systematic AI-guided development workflow

**How to use**:
1. Press `Ctrl+Shift+G`
2. Describe what you want to accomplish
3. AI creates a structured workflow with phases
4. Follow the AI guidance through each phase

**Example**:
```
User: "Add user authentication to my React app"
AI creates workflow:
- Phase 1: Analyze current project structure
- Phase 2: Design authentication system
- Phase 3: Implement login/register components
- Phase 4: Add backend authentication
- Phase 5: Create tests
- Phase 6: Documentation
```

### 2. Analyze Project
**Shortcut**: `Ctrl+Shift+A`

**What it does**: Performs deep analysis of your entire project

**How to use**:
1. Open your project in VS Code
2. Press `Ctrl+Shift+A`
3. AI analyzes:
   - Project structure
   - Dependencies
   - Code patterns
   - Potential improvements
   - Security considerations

**Output**: Detailed analysis in a webview panel

### 3. Execute with Context
**Shortcut**: `Ctrl+Shift+C`

**What it does**: Executes AI commands with full project context

**How to use**:
1. Select code (optional)
2. Press `Ctrl+Shift+C`
3. Describe what you want to do
4. AI considers your entire project context

**Example**:
```
User: "Add error handling to this function"
AI considers:
- Current file context
- Project patterns
- Existing error handling
- Dependencies
- Best practices for your stack
```

## 🛠️ Advanced AI Features

### 1. Generate Code with AI
**Command**: "Claude Assistant: Generate Code with AI"

**What it does**: Creates code from natural language descriptions

**How to use**:
1. Open a file where you want to add code
2. Run the command
3. Describe what you want to generate
4. AI creates appropriate code for your project

**Example**:
```
Description: "Create a function that validates email addresses"
AI generates:
- Email validation function
- Proper error handling
- Comments explaining the logic
- Follows your project's coding style
```

### 2. Refactor Code with AI
**Command**: "Claude Assistant: Refactor Code with AI"

**What it does**: Improves existing code using AI

**How to use**:
1. Select the code you want to refactor
2. Run the command
3. Choose refactoring type:
   - Improve readability
   - Optimize performance
   - Reduce complexity
   - Follow best practices
   - Extract functions/methods
   - Custom refactoring

**Example**:
```
Selected code: Complex function with nested loops
Refactoring type: "Reduce complexity"
AI result: Extracted helper functions, simplified logic, improved readability
```

### 3. Debug with AI
**Command**: "Claude Assistant: Debug with AI"

**What it does**: AI-assisted debugging and error resolution

**How to use**:
1. Open a file with errors
2. Run the command
3. AI analyzes:
   - Error messages
   - Code context
   - Similar past issues
   - Project patterns
4. Provides solutions and prevention tips

**Output**: Webview with detailed debugging information

### 4. Explain Code with AI
**Command**: "Claude Assistant: Explain Code with AI"

**What it does**: Provides detailed explanations of code

**How to use**:
1. Select code to explain (or use entire file)
2. Run the command
3. AI provides:
   - What the code does
   - How it works
   - Key concepts used
   - Potential improvements

**Output**: Webview with comprehensive explanation

### 5. Optimize Performance with AI
**Command**: "Claude Assistant: Optimize Performance with AI"

**What it does**: AI-driven performance analysis and optimization

**How to use**:
1. Select code to optimize
2. Run the command
3. AI identifies:
   - Performance bottlenecks
   - Optimization opportunities
   - Best practices to apply
4. Provides optimized version

**Output**: Webview with performance analysis and improvements

### 6. Generate Tests with AI
**Command**: "Claude Assistant: Generate Tests with AI"

**What it does**: Creates comprehensive test suites

**How to use**:
1. Select code to test
2. Run the command
3. AI generates:
   - Unit tests for all functions
   - Edge case testing
   - Error handling tests
   - Integration tests (if applicable)
4. Creates test file automatically

**Output**: New test file with comprehensive test suite

## 📊 Project Intelligence

### Memory System
The extension learns from your coding patterns and preferences:

**What it tracks**:
- Successful code patterns
- Frequently used approaches
- Project-specific conventions
- Error resolution strategies

**How to view**:
- Command: "Claude Assistant: Show Project Learning History"
- Shows learned patterns and suggestions

### Context Awareness
The AI maintains context across sessions:

**What it remembers**:
- Project structure
- Recent changes
- Active files
- Current errors
- Workflow progress

**Benefits**:
- More relevant suggestions
- Consistent recommendations
- Reduced repetition
- Better understanding of your style

## ⚙️ Configuration

### API Settings
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

## 🎮 Keyboard Shortcuts

| Command | Windows/Linux | Mac |
|---------|---------------|-----|
| Start Gemini Workflow | Ctrl+Shift+G | Cmd+Shift+G |
| Execute with Context | Ctrl+Shift+C | Cmd+Shift+C |
| Analyze Project | Ctrl+Shift+A | Cmd+Shift+A |

## 🔧 Troubleshooting

### Common Issues

**1. "API Key Invalid"**
- Ensure your key is from Google AI Studio
- Check for extra spaces when pasting
- Verify the key has Gemini API access

**2. "Rate Limit Exceeded"**
- Extension implements automatic retry
- Consider upgrading your API tier
- Reduce `maxTokens` in settings

**3. "Extension Not Activating"**
- Check VS Code version (≥1.85.0)
- Look for errors in Output → Claude Assistant
- Try reloading window (Ctrl+R)

**4. "Commands Not Appearing"**
- Check if extension is enabled
- Reload VS Code window
- Check for TypeScript compilation errors

### Getting Help

**Debug Mode**:
1. Open Command Palette
2. Run "Developer: Toggle Developer Tools"
3. Check Console for errors

**Logs**:
1. Open Output panel (View → Output)
2. Select "Claude Assistant" from dropdown
3. Check for error messages

**Support Channels**:
- GitHub Issues: Report bugs
- GitHub Discussions: Ask questions
- Documentation: Check README and Wiki

## 🎯 Best Practices

### 1. Effective Prompts
**Be specific**: Instead of "fix this", say "optimize this function for performance"

**Provide context**: "This is a React component that handles user authentication"

**Set expectations**: "Generate a function that validates email addresses with proper error handling"

### 2. Workflow Usage
**Start with analysis**: Use "Analyze Project" before starting complex workflows

**Break down tasks**: Use systematic workflows for complex features

**Review results**: Always review AI-generated code before implementing

### 3. Memory Management
**Regular cleanup**: Clear old memories periodically

**Export important patterns**: Save useful patterns for team sharing

**Customize settings**: Adjust memory retention based on your needs

### 4. Security
**API key management**: Use secure storage, never hardcode keys

**Code review**: Always review AI-generated code for security issues

**Sensitive data**: Be careful with sensitive information in prompts

## 🚀 Advanced Usage

### Custom Workflows
Create your own workflow templates:

1. Create `.vscode/claude-workflows/` directory
2. Add JSON workflow files
3. Reference them in your projects

### Team Collaboration
**Share knowledge**:
- Export project memories
- Import team patterns
- Use consistent settings

**Code standards**:
- Configure project-specific patterns
- Share workflow templates
- Maintain consistent AI usage

### Integration with Other Tools
**Git integration**: AI can help with commit messages and code reviews

**Testing frameworks**: Generate tests for your specific testing setup

**CI/CD**: Integrate AI suggestions into your pipeline

## 📈 Performance Tips

### 1. Optimize API Usage
- Use specific prompts to reduce token usage
- Enable intelligent suggestions for proactive help
- Configure appropriate context window sizes

### 2. Improve Response Quality
- Provide detailed context in prompts
- Use systematic workflows for complex tasks
- Review and learn from AI suggestions

### 3. Speed Up Development
- Use keyboard shortcuts
- Configure auto-analysis for new projects
- Set up intelligent triggers for common tasks

## 🎉 Success Stories

### Example 1: React App Development
**Challenge**: Building a complex React app with authentication
**Solution**: Used systematic workflow to break down the task
**Result**: Completed in 1/3 the time with better code quality

### Example 2: Legacy Code Refactoring
**Challenge**: Refactoring a large, complex codebase
**Solution**: Used AI analysis to understand patterns and suggest improvements
**Result**: Identified 40% improvement opportunities, implemented safely

### Example 3: Debugging Complex Issues
**Challenge**: Intermittent bugs in production
**Solution**: Used AI debugging to analyze patterns and suggest fixes
**Result**: Resolved issues that had been problematic for weeks

---

**Happy coding with AI assistance! 🚀** 