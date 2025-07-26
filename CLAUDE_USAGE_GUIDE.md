# Using Claude in VS Code - Complete Guide

## 🚀 Quick Start

### 1. Your Extension Development Setup
- **Window 1**: VS Code with `claude-gemini-assistant` (where you develop)
- **Window 2**: Extension Development Host (where you USE the extension)

### 2. Launch Your Extension
In Window 1 (claude-gemini-assistant):
- Run → Start Debugging
- A new window opens (Extension Development Host)

### 3. Open Your Project in Extension Host
In Window 2 (Extension Development Host):
- File → Open Folder
- Navigate to your project, e.g.:
  - `/Users/bm/Library/CloudStorage/GoogleDrive-ceo@mediaintelligence.ai/My Drive/MIZ/MIZOKICloudRun-`
  - Or any other project you want to work on

### 4. Use Claude Commands

Press `Cmd+Shift+P` and type:

#### **"Claude Assistant: Execute with Context"**
- Runs Claude with full project understanding
- Example: "Add error handling to this function"
- Claude sees your entire project structure

#### **"Claude Assistant: Start Gemini Workflow"**
- Multi-step guided development
- Example: "Implement user authentication"
- Breaks down into phases with Claude guidance

#### **"Claude Assistant: Analyze Project"**
- Deep scan of your codebase
- Identifies patterns, frameworks, structure
- Builds context for better assistance

#### **"Claude Assistant: Show Project Memory"**
- View what the system has learned
- See patterns and successful approaches
- Export/import team knowledge

## 📁 Working Directory Examples

### For Your MIZOKI Project:
```bash
1. Launch extension (Window 1)
2. In Extension Host (Window 2):
   - Open: /Users/bm/.../MIZ/MIZOKICloudRun-
   - Cmd+Shift+P → "Claude Assistant: Analyze Project"
   - Now Claude understands your cloud run setup!
```

### For Any Project:
```bash
1. Open the project folder in Extension Host
2. Use Claude commands with full context
3. The extension remembers patterns for next time
```

## 🎯 Real Usage Examples

### Example 1: Fix an Error
```
1. See error in your code
2. Cmd+Shift+P → "Claude Assistant: Execute with Context"
3. Type: "Fix this TypeError on line 45"
4. Claude analyzes with full project context
```

### Example 2: Add New Feature
```
1. Cmd+Shift+P → "Claude Assistant: Start Gemini Workflow"
2. Type: "Add Redis caching to improve performance"
3. Follow guided phases:
   - Analysis: Claude reviews current architecture
   - Design: Suggests caching approach
   - Implementation: Provides code
   - Testing: Generates tests
```

### Example 3: Refactor Code
```
1. Select code block
2. Right-click → "Ask Claude"
3. Type: "Refactor this for better performance"
4. Get context-aware suggestions
```

## ⚙️ Configuration

### Set Claude Path (Already Updated)
Your extension now uses: `/opt/homebrew/bin/claude`

### Adjust Settings
Cmd+, → Search "claude-assistant":
- `workflowComplexity`: simple/standard/comprehensive
- `autoAnalyzeProjects`: Auto-scan on open
- `memoryRetention`: Days to keep patterns

## 🔄 Workflow

1. **Develop** in Window 1 (claude-gemini-assistant)
2. **Test** in Window 2 (Extension Host)
3. **Reload** with Cmd+R after changes
4. **Use** Claude commands in your actual projects

## 💡 Pro Tips

- **Project Context**: Always open project folder first
- **Memory**: Completes workflows to build knowledge
- **Patterns**: The more you use it, the smarter it gets
- **Team Share**: Export memory for team use

## 🚨 Troubleshooting

### "Claude command not found"
- Already fixed! Now uses `/opt/homebrew/bin/claude`

### "No project context"
- Make sure you opened a folder, not just files
- Run "Analyze Project" first

### "Extension not showing"
- Reload window: Cmd+R
- Check original window for compilation errors

## Ready to Use!

Your Claude integration is set up. Open any project in the Extension Host window and start using Claude with full context awareness!