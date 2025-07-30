import * as vscode from 'vscode';
import { 
    Trigger, 
    TriggerCondition, 
    TriggerContext, 
    TriggerAction 
} from '../types/interfaces';
// import { ProjectIntelligence } from '../core/projectIntelligence';
import { ClaudeCodeInterface } from '../core/claudeCodeInterface';
// import { GeminiWorkflowEngine } from '../core/geminiWorkflow';

export class IntelligentTriggers {
    private triggers: Map<string, Trigger> = new Map();
    private enabled: boolean = true;
    private disposables: vscode.Disposable[] = [];
    private recentEdits: vscode.TextDocumentChangeEvent[] = [];
    private editDebounceTimer: NodeJS.Timeout | null = null;
    private claudeInterface: ClaudeCodeInterface;
    // private geminiWorkflow: GeminiWorkflowEngine;

    constructor(
        private _projectIntelligence: any
    ) {
        // Create instances needed for the existing code
        this.claudeInterface = new ClaudeCodeInterface();
        // this.geminiWorkflow = new GeminiWorkflowEngine();
        this.initializeDefaultTriggers();
        this.setupEventListeners();
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.clearAllTriggers();
        } else {
            this.initializeDefaultTriggers();
        }
    }

    registerTrigger(trigger: Trigger): void {
        if (this.enabled) {
            this.triggers.set(trigger.id, trigger);
        }
    }

    dispose(): void {
        this.clearAllTriggers();
        this.disposables.forEach(d => d.dispose());
        if (this.editDebounceTimer) {
            clearTimeout(this.editDebounceTimer);
        }
    }

    private initializeDefaultTriggers(): void {
        // Error pattern trigger
        this.registerTrigger({
            id: 'error-pattern',
            name: 'Error Pattern Detection',
            type: 'error',
            condition: new ErrorPatternCondition(),
            action: new ErrorSuggestionAction(this.claudeInterface),
            priority: 10,
            enabled: true
        });

        // Code completion trigger
        this.registerTrigger({
            id: 'smart-completion',
            name: 'Smart Code Completion',
            type: 'completion',
            condition: new CompletionPatternCondition(),
            action: new SmartCompletionAction(this.claudeInterface),
            priority: 5,
            enabled: true
        });

        // Refactoring suggestion trigger
        this.registerTrigger({
            id: 'refactor-suggestion',
            name: 'Refactoring Suggestions',
            type: 'refactor',
            condition: new RefactorCondition(),
            action: new RefactorSuggestionAction(this.claudeInterface),
            priority: 3,
            enabled: true
        });

        // Documentation trigger
        this.registerTrigger({
            id: 'doc-generation',
            name: 'Documentation Generation',
            type: 'documentation',
            condition: new MissingDocumentationCondition(),
            action: new DocumentationAction(this.claudeInterface),
            priority: 2,
            enabled: true
        });

        // Complex task detection
        this.registerTrigger({
            id: 'complex-task',
            name: 'Complex Task Detection',
            type: 'pattern',
            condition: new ComplexTaskCondition(),
            action: new WorkflowSuggestionAction(),
            priority: 8,
            enabled: true
        });
    }

    private setupEventListeners(): void {
        // Text document change listener
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                if (this.enabled) {
                    this.handleTextChange(event);
                }
            })
        );

        // Diagnostics change listener
        this.disposables.push(
            vscode.languages.onDidChangeDiagnostics((event) => {
                if (this.enabled) {
                    this.handleDiagnosticsChange(event);
                }
            })
        );

        // Cursor position change listener
        this.disposables.push(
            vscode.window.onDidChangeTextEditorSelection((event) => {
                if (this.enabled && event.kind !== vscode.TextEditorSelectionChangeKind.Command) {
                    this.handleSelectionChange(event);
                }
            })
        );
    }

    private handleTextChange(event: vscode.TextDocumentChangeEvent): void {
        // Store recent edits
        this.recentEdits.push(event);
        if (this.recentEdits.length > 20) {
            this.recentEdits.shift();
        }

        // Debounce trigger evaluation
        if (this.editDebounceTimer) {
            clearTimeout(this.editDebounceTimer);
        }

        this.editDebounceTimer = setTimeout(async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document === event.document) {
                await this.evaluateTriggers(editor, 'completion');
            }
        }, 1000); // Wait 1 second after typing stops
    }

    private async handleDiagnosticsChange(event: vscode.DiagnosticChangeEvent): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        // Check if diagnostics affect current document
        for (const uri of event.uris) {
            if (uri.toString() === editor.document.uri.toString()) {
                await this.evaluateTriggers(editor, 'error');
                break;
            }
        }
    }

    private async handleSelectionChange(event: vscode.TextEditorSelectionChangeEvent): Promise<void> {
        // Only evaluate pattern triggers on selection change
        await this.evaluateTriggers(event.textEditor, 'pattern');
    }

    private async evaluateTriggers(
        editor: vscode.TextEditor, 
        triggerType?: string
    ): Promise<void> {
        const context = await this.buildTriggerContext(editor);
        
        // Sort triggers by priority
        const sortedTriggers = Array.from(this.triggers.values())
            .filter(t => t.enabled && (!triggerType || t.type === triggerType))
            .sort((a, b) => b.priority - a.priority);

        // Evaluate triggers
        for (const trigger of sortedTriggers) {
            try {
                const shouldExecute = await trigger.condition.evaluate(context);
                if (shouldExecute) {
                    await trigger.action.execute(context);
                    // Only execute highest priority matching trigger
                    break;
                }
            } catch (error) {
                console.error(`Error evaluating trigger ${trigger.id}:`, error);
            }
        }
    }

    private async buildTriggerContext(editor: vscode.TextEditor): Promise<TriggerContext> {
        const projectContext = await this._projectIntelligence.getContextForFile(editor.document.uri);
        const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);

        return {
            document: editor.document,
            position: editor.selection.active,
            recentEdits: this.recentEdits.filter(e => e.document === editor.document),
            diagnostics: diagnostics,
            projectContext: projectContext
        };
    }

    private clearAllTriggers(): void {
        this.triggers.clear();
        if (this.editDebounceTimer) {
            clearTimeout(this.editDebounceTimer);
            this.editDebounceTimer = null;
        }
    }
    
    handleDiagnosticChanges(event: vscode.DiagnosticChangeEvent): void {
        if (!this.enabled) return;
        
        // Process diagnostic changes for each affected URI
        for (const uri of event.uris) {
            const diagnostics = vscode.languages.getDiagnostics(uri);
            if (diagnostics.length > 0) {
                // Check if any triggers should fire based on diagnostics
                this.checkDiagnosticTriggers(uri, diagnostics);
            }
        }
    }
    
    handleFileChange(uri: vscode.Uri, changeType: 'created' | 'modified' | 'deleted'): void {
        if (!this.enabled) return;
        
        // Handle file changes based on type
        switch (changeType) {
            case 'created':
                // Check if new file needs boilerplate or setup
                this.checkNewFileTriggers(uri);
                break;
            case 'modified':
                // Check if modifications trigger any patterns
                this.checkModificationTriggers(uri);
                break;
            case 'deleted':
                // Check if deletion requires cleanup
                this.checkDeletionTriggers(uri);
                break;
        }
    }
    
    async analyzeTriggerConditions(): Promise<void> {
        if (!this.enabled) return;
        
        // Analyze current workspace state for proactive triggers
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) return;
        
        const document = activeEditor.document;
        const position = activeEditor.selection.active;
        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        
        // Build trigger context
        const context: TriggerContext = {
            document,
            position,
            recentEdits: this.recentEdits,
            diagnostics,
            projectContext: await this.getProjectContext()
        };
        
        // Check each registered trigger
        for (const trigger of this.triggers.values()) {
            if (trigger.enabled && await trigger.condition.evaluate(context)) {
                await trigger.action.execute(context);
            }
        }
    }
    
    private checkDiagnosticTriggers(_uri: vscode.Uri, diagnostics: vscode.Diagnostic[]): void {
        // Implementation for checking diagnostic-based triggers
        const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
        if (errors.length > 3) {
            // Multiple errors detected, might need assistance
            const trigger = this.triggers.get('error-assistance');
            if (trigger && trigger.enabled) {
                // Execute error assistance trigger
                vscode.commands.executeCommand('claude-assistant.executeWithContext');
            }
        }
    }
    
    private checkNewFileTriggers(_uri: vscode.Uri): void {
        // Implementation for new file triggers
        const fileName = vscode.workspace.asRelativePath(_uri);
        if (fileName.endsWith('.test.ts') || fileName.endsWith('.spec.ts')) {
            // New test file created
            vscode.window.showInformationMessage(
                'Would you like help setting up this test file?',
                'Yes',
                'No'
            ).then(choice => {
                if (choice === 'Yes') {
                    vscode.commands.executeCommand('claude-assistant.executeWithContext');
                }
            });
        }
    }
    
    private checkModificationTriggers(_uri: vscode.Uri): void {
        // Implementation for file modification triggers
        // Could analyze the nature of changes and suggest improvements
    }
    
    private checkDeletionTriggers(_uri: vscode.Uri): void {
        // Implementation for file deletion triggers
        // Could check for orphaned imports or references
    }
    
    private async getProjectContext(): Promise<any> {
        // Get project context from project intelligence
        const context = await this._projectIntelligence.getContextForFile(
            vscode.window.activeTextEditor?.document.uri || vscode.Uri.file('')
        );
        return context;
    }
}

// Condition implementations
class ErrorPatternCondition implements TriggerCondition {
    async evaluate(context: TriggerContext): Promise<boolean> {
        // Check for errors in diagnostics
        const errors = context.diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
        if (errors.length === 0) {
            return false;
        }

        // Check if cursor is near an error
        const cursorLine = context.position.line;
        return errors.some(error => {
            const errorLine = error.range.start.line;
            return Math.abs(errorLine - cursorLine) <= 2; // Within 2 lines
        });
    }
}

class CompletionPatternCondition implements TriggerCondition {
    async evaluate(context: TriggerContext): Promise<boolean> {
        // Check for incomplete patterns
        const line = context.document.lineAt(context.position.line);
        const textBeforeCursor = line.text.substring(0, context.position.character);
        
        // Common patterns that suggest completion needed
        const patterns = [
            /function\s+\w*$/,
            /class\s+\w*$/,
            /interface\s+\w*$/,
            /import\s+.*\s+from\s+['"]$/,
            /\.\s*$/,
            /=>\s*$/,
            /async\s+$/,
            /await\s+$/
        ];

        return patterns.some(pattern => pattern.test(textBeforeCursor));
    }
}

class RefactorCondition implements TriggerCondition {
    async evaluate(context: TriggerContext): Promise<boolean> {
        // Check for code smells
        const selection = context.document.getText(
            new vscode.Range(
                context.position.line - 10,
                0,
                context.position.line + 10,
                0
            )
        );

        // Simple heuristics for refactoring opportunities
        const codeSmells = [
            /function\s+\w+\s*\([^)]{50,}\)/, // Long parameter list
            /if\s*\([^)]+\)\s*{[^}]{200,}}/, // Long if block
            /\/\/\s*TODO|FIXME|HACK/i, // Technical debt markers
            /copy|paste|duplicate/i, // Comments suggesting duplication
            /\b(\w+)\s*=\s*\1\s*[+\-*/]/, // Repetitive operations
        ];

        return codeSmells.some(smell => smell.test(selection));
    }
}

class MissingDocumentationCondition implements TriggerCondition {
    async evaluate(context: TriggerContext): Promise<boolean> {
        const line = context.position.line;
        const document = context.document;
        
        // Check if we're at a function/class/interface declaration
        const currentLine = document.lineAt(line).text;
        const declarationPatterns = [
            /^\s*(export\s+)?(function|class|interface)\s+\w+/,
            /^\s*(public|private|protected)\s+\w+\s*\(/,
            /^\s*\w+\s*:\s*\([^)]*\)\s*=>/
        ];

        if (!declarationPatterns.some(p => p.test(currentLine))) {
            return false;
        }

        // Check if documentation already exists above
        if (line > 0) {
            const previousLine = document.lineAt(line - 1).text.trim();
            return !previousLine.includes('*/') && !previousLine.includes('//');
        }

        return true;
    }
}

class ComplexTaskCondition implements TriggerCondition {
    async evaluate(context: TriggerContext): Promise<boolean> {
        // Check if recent edits suggest a complex task
        if (context.recentEdits.length < 5) {
            return false;
        }

        // Count different types of changes
        const fileChanges = new Set(context.recentEdits.map(e => e.document.fileName));
        const totalChanges = context.recentEdits.reduce((sum, e) => sum + e.contentChanges.length, 0);

        // Complex task indicators
        return fileChanges.size > 3 || totalChanges > 50;
    }
}

/**
 * Utility function to create a simplified ExecutionContext
 */
function createSimpleExecutionContext(projectContext: any, instruction: string): any {
    return {
        projectIntelligence: projectContext,
        currentWorkflow: {
            id: 'temp_' + Date.now(),
            title: 'Quick Task',
            description: instruction,
            status: 'executing'
        },
        currentPhase: {
            id: 'temp_phase',
            name: 'Analysis',
            description: instruction,
            type: 'analysis'
        },
        relevantMemories: [],
        similarExecutions: [],
        learnedPatterns: [],
        activeFiles: vscode.window.activeTextEditor ? [vscode.window.activeTextEditor.document.uri.fsPath] : [],
        recentChanges: [],
        currentErrors: [],
        suggestedApproaches: [],
        cautionAreas: [],
        successCriteria: ['Complete the requested task']
    };
}

// Action implementations
class ErrorSuggestionAction implements TriggerAction {
    constructor(private claudeInterface: ClaudeCodeInterface) {}

    async execute(context: TriggerContext): Promise<void> {
        const errors = context.diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
        if (errors.length === 0) {
            return;
        }

        const nearestError = this.findNearestError(errors, context.position);
        if (!nearestError) {
            return;
        }

        // Get code context around error
        const errorContext = context.document.getText(
            new vscode.Range(
                Math.max(0, nearestError.range.start.line - 5),
                0,
                Math.min(context.document.lineCount - 1, nearestError.range.end.line + 5),
                0
            )
        );

        const prompt = `
Error: ${nearestError.message}
Code context:
${errorContext}

Suggest a fix for this error.
        `.trim();

        try {
            const executionContext = createSimpleExecutionContext(context.projectContext, prompt);
            const suggestion = await this.claudeInterface.executeWithContext(prompt, executionContext, vscode.workspace.rootPath || '');
            
            // Show suggestion as code action
            const action = new vscode.CodeAction(
                'Claude: Fix this error',
                vscode.CodeActionKind.QuickFix
            );
            
            action.command = {
                command: 'claude-assistant.applySuggestion',
                title: 'Apply Claude suggestion',
                arguments: [suggestion, nearestError.range]
            };

            // Store in hover provider
            this.showSuggestionHover(nearestError.range, suggestion.output);
        } catch (error) {
            console.error('Failed to get error suggestion:', error);
        }
    }

    private findNearestError(
        errors: vscode.Diagnostic[], 
        position: vscode.Position
    ): vscode.Diagnostic | null {
        let nearest: vscode.Diagnostic | null = null;
        let minDistance = Infinity;

        for (const error of errors) {
            const distance = Math.abs(error.range.start.line - position.line);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = error;
            }
        }

        return nearest;
    }

    private showSuggestionHover(range: vscode.Range, suggestion: string): void {
        // This would ideally integrate with VS Code's hover provider
        // For now, show as information message
        vscode.window.showInformationMessage(
            'Claude suggests a fix for this error',
            'View',
            'Apply'
        ).then(choice => {
            if (choice === 'View') {
                vscode.window.showInformationMessage(suggestion);
            } else if (choice === 'Apply') {
                // Apply the suggestion
                vscode.commands.executeCommand('claude-assistant.applySuggestion', suggestion, range);
            }
        });
    }
}

class SmartCompletionAction implements TriggerAction {
    constructor(
        private claudeInterface: ClaudeCodeInterface
    ) {}

    async execute(context: TriggerContext): Promise<void> {
        // const line = context.document.lineAt(context.position.line);
        // const _prefix = line.text.substring(0, context.position.character);
        // const _suffix = line.text.substring(context.position.character);

        // Get surrounding code
        const before = context.document.getText(
            new vscode.Range(
                Math.max(0, context.position.line - 10),
                0,
                context.position.line,
                context.position.character
            )
        );

        const after = context.document.getText(
            new vscode.Range(
                context.position.line,
                context.position.character,
                Math.min(context.document.lineCount - 1, context.position.line + 10),
                0
            )
        );

        const prompt = `
Complete the code at the cursor position:

Before cursor:
${before}

Cursor position (complete here): |

After cursor:
${after}

Provide only the completion text, no explanation.
        `.trim();

        try {
            const executionContext = createSimpleExecutionContext(context.projectContext, prompt);
            const completion = await this.claudeInterface.executeWithContext(prompt, executionContext, vscode.workspace.rootPath || '');
            
            // Insert completion as snippet
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document === context.document) {
                editor.insertSnippet(new vscode.SnippetString(completion.output), context.position);
            }
        } catch (error) {
            console.error('Failed to get completion:', error);
        }
    }
}

class RefactorSuggestionAction implements TriggerAction {
    constructor(private claudeInterface: ClaudeCodeInterface) {}

    async execute(context: TriggerContext): Promise<void> {
        const selection = context.document.getText(
            new vscode.Range(
                Math.max(0, context.position.line - 20),
                0,
                Math.min(context.document.lineCount - 1, context.position.line + 20),
                0
            )
        );

        const prompt = `
Analyze this code for refactoring opportunities:

${selection}

Suggest specific refactoring improvements. Be concise.
        `.trim();

        try {
            const executionContext = createSimpleExecutionContext(context.projectContext, prompt);
            const suggestions = await this.claudeInterface.executeWithContext(prompt, executionContext, vscode.workspace.rootPath || '');
            
            // Show as information message with action
            vscode.window.showInformationMessage(
                'Claude found refactoring opportunities',
                'View Suggestions'
            ).then(choice => {
                if (choice === 'View Suggestions') {
                    // Show in output channel
                    const channel = vscode.window.createOutputChannel('Claude Refactoring Suggestions');
                    channel.appendLine(suggestions.output);
                    channel.show();
                }
            });
        } catch (error) {
            console.error('Failed to get refactoring suggestions:', error);
        }
    }
}

class DocumentationAction implements TriggerAction {
    constructor(private claudeInterface: ClaudeCodeInterface) {}

    async execute(context: TriggerContext): Promise<void> {
        const line = context.position.line;
        // const _functionLine = context.document.lineAt(line).text;
        
        // Get full function/class definition
        let endLine = line;
        let braceCount = 0;
        let foundStart = false;
        
        for (let i = line; i < Math.min(line + 50, context.document.lineCount); i++) {
            const lineText = context.document.lineAt(i).text;
            for (const char of lineText) {
                if (char === '{') {
                    braceCount++;
                    foundStart = true;
                } else if (char === '}') {
                    braceCount--;
                }
            }
            
            if (foundStart && braceCount === 0) {
                endLine = i;
                break;
            }
        }

        const definition = context.document.getText(
            new vscode.Range(line, 0, endLine + 1, 0)
        );

        const prompt = `
Generate documentation for this code:

${definition}

Use appropriate documentation format for the language.
Include parameter descriptions, return value, and examples if relevant.
        `.trim();

        try {
            const executionContext = createSimpleExecutionContext(context.projectContext, prompt);
            const documentation = await this.claudeInterface.executeWithContext(prompt, executionContext, vscode.workspace.rootPath || '');
            
            // Insert documentation above the definition
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document === context.document) {
                const position = new vscode.Position(line, 0);
                editor.insertSnippet(
                    new vscode.SnippetString(documentation + '\n'),
                    position
                );
            }
        } catch (error) {
            console.error('Failed to generate documentation:', error);
        }
    }
}

class WorkflowSuggestionAction implements TriggerAction {
    constructor() {}

    async execute(context: TriggerContext): Promise<void> {
        // Analyze recent changes to understand task
        const recentFiles = new Set(context.recentEdits.map(e => e.document.fileName));
        const changeCount = context.recentEdits.reduce((sum, e) => sum + e.contentChanges.length, 0);

        const message = `You seem to be working on a complex task involving ${recentFiles.size} files with ${changeCount} changes. Would you like to use the Gemini workflow to organize your work?`;

        vscode.window.showInformationMessage(
            message,
            'Start Workflow',
            'Dismiss'
        ).then(choice => {
            if (choice === 'Start Workflow') {
                vscode.commands.executeCommand('claude-assistant.startGeminiWorkflow');
            }
        });
    }
}