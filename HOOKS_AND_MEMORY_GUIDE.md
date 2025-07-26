# Hooks, Memory, and Patterns in Claude/Gemini Assistant

## Overview

The Claude/Gemini Assistant VSCode extension implements a sophisticated system of hooks, memory persistence, and pattern recognition to enhance code assistance. This guide explains how these systems work and how to set them up properly.

## Key Components

### 1. **Intelligent Triggers (Hooks System)**

The extension uses an event-driven hooks system implemented in `src/hooks/intelligentTriggers.ts`:

#### Hook Types:
- **Error Pattern Detection** - Monitors diagnostics and suggests fixes
- **Smart Code Completion** - Detects incomplete code patterns  
- **Refactoring Suggestions** - Identifies code smells
- **Documentation Generation** - Detects missing documentation
- **Complex Task Detection** - Identifies when workflow assistance is needed

#### How Hooks Work:
1. **Event Listeners**: Hooks listen to VSCode events:
   - Text document changes (`onDidChangeTextDocument`)
   - Diagnostics changes (`onDidChangeDiagnostics`)
   - Cursor position changes (`onDidChangeTextEditorSelection`)

2. **Trigger Evaluation**: When events occur, the system:
   - Builds a context with project information
   - Evaluates trigger conditions
   - Executes actions for matching triggers (sorted by priority)

3. **Debouncing**: Text changes are debounced (1 second delay) to avoid overwhelming the system

#### Setting Up Hooks:
```typescript
// Hooks are automatically initialized in extension.ts
const intelligentTriggers = new IntelligentTriggers(
    context,
    projectIntelligence,
    claudeInterface,
    geminiWorkflow
);

// Enable/disable via settings
"claude-assistant.intelligentSuggestions": true
```

### 2. **Memory System**

The memory system (`src/core/memorySystem.ts`) provides persistent storage of:
- Execution history
- Learned patterns
- Successful solutions

#### How Memory Works:

1. **Storage Structure**:
   - Memories stored in: `globalStorageUri/memories.json`
   - Patterns stored in: `globalStorageUri/patterns.json`
   - Auto-saves with 5-second debounce

2. **Memory Recording**:
   ```typescript
   // Every execution is recorded
   await memorySystem.recordExecution({
       input: "user command",
       context: projectContext,
       result: "execution result",
       timestamp: new Date(),
       tags: ['workflow', 'type']
   });
   ```

3. **Pattern Learning**:
   - Extracts patterns from successful executions
   - Updates pattern frequency and examples
   - Learns from errors and their solutions

4. **Memory Retention**:
   - Configurable retention period (default: 30 days)
   - Old memories automatically trimmed

### 3. **Pattern Recognition**

The system recognizes and learns several pattern types:

#### Pattern Types:
1. **Code Patterns** - Common coding constructs and idioms
2. **Error Patterns** - Recurring error types and fixes
3. **Workflow Patterns** - Successful task completion sequences
4. **Architecture Patterns** - Project structure and design patterns

#### Error Pattern Detection (`src/hooks/errorPatternDetector.ts`):
- Pre-configured patterns for common errors
- Learning from resolution history
- AI-powered suggestions when patterns don't match

### 4. **How Assistants Reference Memory Before Starting**

Both Claude and Gemini assistants reference memory and patterns through the **Project Context** system:

#### Context Building Process:
1. **Project Analysis** (on workspace open or command):
   ```typescript
   await projectIntelligence.analyzeWorkspace();
   ```

2. **Context Creation** (before each execution):
   ```typescript
   const context = await projectIntelligence.getContextForFile(uri);
   // Contains:
   // - Project structure
   // - Related files
   // - Dependencies
   // - Recent changes
   // - Detected patterns
   // - Previous executions
   ```

3. **Memory Integration**:
   - Recent executions are searched for similar tasks
   - Learned patterns are matched against current context
   - Successful solutions are prioritized

4. **Context Injection**:
   ```typescript
   // Claude receives full context
   const result = await claudeInterface.executeWithContext(code, context);
   
   // Gemini workflows include context in each step
   const workflowContext = {
       goal: userGoal,
       projectContext: context,
       constraints: constraints,
       preferences: preferences
   };
   ```

## Configuration

### Essential Settings:
```json
{
    "claude-assistant.intelligentSuggestions": true,
    "claude-assistant.autoAnalyzeProjects": true,
    "claude-assistant.memoryRetention": 30,
    "claude-assistant.workflowComplexity": "standard"
}
```

## Best Practices

1. **Enable Auto-Analysis**: Let the system analyze your project on startup
2. **Review Memory**: Use "Show Project Memory" command to see what's been learned
3. **Train the System**: Rate executions to improve pattern recognition
4. **Export/Import Memory**: Share learned patterns with your team
5. **Clean Old Patterns**: Periodically review and clean outdated patterns

## Memory and Pattern Flow

```
User Action → Event Trigger → Context Building → Memory Search
                                    ↓
                          Pattern Matching ← Learned Patterns
                                    ↓
                          AI Execution (with context)
                                    ↓
                          Result → Memory Recording
                                    ↓
                              Pattern Learning
```

## Troubleshooting

1. **Hooks Not Firing**: Check if intelligent suggestions are enabled
2. **No Memory Persistence**: Verify storage permissions in `globalStorageUri`
3. **Patterns Not Learning**: Ensure executions complete successfully
4. **Context Missing**: Run "Analyze Project" command manually

## Advanced Usage

### Custom Triggers:
```typescript
intelligentTriggers.registerTrigger({
    id: 'custom-trigger',
    name: 'Custom Pattern',
    type: 'pattern',
    condition: new CustomCondition(),
    action: new CustomAction(),
    priority: 10,
    enabled: true
});
```

### Memory Search:
```typescript
const relevantMemories = await memorySystem.searchMemories("authentication");
```

### Pattern Export:
```
Command: "Claude: Export Memory"
Saves patterns to shareable JSON file
```

This system creates an intelligent, learning assistant that improves over time by remembering successful patterns and solutions specific to your project.