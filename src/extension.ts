import * as vscode from 'vscode';
import { ClaudeCodeInterface } from './claude/claudeCodeInterface';
import { ProjectIntelligence } from './core/projectIntelligence';
import { MemorySystem } from './core/memorySystem';
import { GeminiWorkflow } from './gemini/geminiWorkflow';
import { IntelligentTriggers } from './hooks/intelligentTriggers';
import { MemoryAwareHook } from './hooks/memoryAwareHook';
import { ContextViewer } from './ui/contextViewer';

interface SimpleExtensionContext {
    claudeInterface: ClaudeCodeInterface;
    projectIntelligence: ProjectIntelligence;
    memorySystem: MemorySystem;
    geminiWorkflow: GeminiWorkflow;
    contextViewer: ContextViewer;
    intelligentTriggers: IntelligentTriggers;
    memoryAwareHook: MemoryAwareHook;
}

let extensionContext: SimpleExtensionContext | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('Claude Gemini Assistant is now active!');

    // Initialize core systems
    const projectIntelligence = new ProjectIntelligence(context);
    const memorySystem = new MemorySystem(context);
    const claudeInterface = new ClaudeCodeInterface(context, memorySystem);
    const geminiWorkflow = new GeminiWorkflow(context, claudeInterface, projectIntelligence, memorySystem);
    
    // Initialize UI components
    const contextViewer = new ContextViewer(context, projectIntelligence, memorySystem);

    // Initialize intelligent triggers
    const intelligentTriggers = new IntelligentTriggers(
        context,
        projectIntelligence,
        claudeInterface,
        geminiWorkflow
    );

    // Initialize memory-aware hook for automatic memory/pattern reference
    const memoryAwareHook = new MemoryAwareHook(
        context,
        memorySystem,
        projectIntelligence
    );

    // Store extension context
    extensionContext = {
        claudeInterface,
        projectIntelligence,
        memorySystem,
        geminiWorkflow,
        contextViewer,
        intelligentTriggers,
        memoryAwareHook
    };

    // Register commands
    if (extensionContext) {
        registerCommands(context, extensionContext);

        // Register configuration change handler
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('claude-assistant') && extensionContext) {
                    updateConfiguration(extensionContext);
                }
            })
        );

        // Initialize configuration
        updateConfiguration(extensionContext);
    }

    // Auto-analyze project if enabled
    const config = vscode.workspace.getConfiguration('claude-assistant');
    if (config.get('autoAnalyzeProjects')) {
        setTimeout(() => {
            vscode.commands.executeCommand('claude-assistant.analyzeProject');
        }, 2000);
    }
}

function registerCommands(context: vscode.ExtensionContext, extContext: SimpleExtensionContext) {
    // Start Gemini Workflow command
    context.subscriptions.push(
        vscode.commands.registerCommand('claude-assistant.startGeminiWorkflow', async () => {
            const goal = await vscode.window.showInputBox({
                prompt: 'What would you like to accomplish? (e.g., "Add user authentication", "Optimize database queries")',
                placeHolder: 'Enter your goal here...'
            });

            if (goal) {
                await extContext.geminiWorkflow.startWorkflow(goal);
            }
        })
    );

    // Analyze Project command
    context.subscriptions.push(
        vscode.commands.registerCommand('claude-assistant.analyzeProject', async () => {
            const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;
            if (!workspaceUri) {
                vscode.window.showErrorMessage('No workspace folder is open');
                return;
            }

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing project...',
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ message: 'Scanning project structure...' });
                    await extContext.projectIntelligence.analyzeWorkspace();
                    
                    progress.report({ message: 'Building intelligence model...' });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    vscode.window.showInformationMessage('Project analysis complete!');
                } catch (error) {
                    vscode.window.showErrorMessage(`Analysis failed: ${error}`);
                }
            });
        })
    );

    // Execute with Context command
    context.subscriptions.push(
        vscode.commands.registerCommand('claude-assistant.executeWithContext', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            
            if (!selectedText) {
                vscode.window.showErrorMessage('Please select some code to execute');
                return;
            }

            try {
                const context = await extContext.projectIntelligence.getContextForFile(editor.document.uri);
                const result = await extContext.claudeInterface.executeWithContext(selectedText, context);
                
                // Show result in new document
                const doc = await vscode.workspace.openTextDocument({
                    content: result,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc);
                
            } catch (error) {
                vscode.window.showErrorMessage(`Execution failed: ${error}`);
            }
        })
    );

    // Show Project Memory command
    context.subscriptions.push(
        vscode.commands.registerCommand('claude-assistant.showProjectMemory', async () => {
            const memories = await extContext.memorySystem.getRecentMemories(20);
            const patterns = await extContext.memorySystem.getLearnedPatterns();

            const panel = vscode.window.createWebviewPanel(
                'projectMemory',
                'Project Memory',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = getMemoryWebviewContent(memories, patterns);
        })
    );

    // Configure Workflow command
    context.subscriptions.push(
        vscode.commands.registerCommand('claude-assistant.configureWorkflow', async () => {
            const complexityOptions = ['simple', 'standard', 'comprehensive'];
            const complexity = await vscode.window.showQuickPick(complexityOptions, {
                placeHolder: 'Select workflow complexity level'
            });

            if (complexity) {
                const config = vscode.workspace.getConfiguration('claude-assistant');
                await config.update('workflowComplexity', complexity, vscode.ConfigurationTarget.Workspace);
                vscode.window.showInformationMessage(`Workflow complexity set to: ${complexity}`);
            }
        })
    );

    // Review Last Execution command
    context.subscriptions.push(
        vscode.commands.registerCommand('claude-assistant.reviewLastExecution', async () => {
            const lastMemory = await extContext.memorySystem.getLastExecution();
            if (!lastMemory) {
                vscode.window.showInformationMessage('No recent executions found');
                return;
            }

            const panel = vscode.window.createWebviewPanel(
                'lastExecution',
                'Last Execution Review',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = getMemoryDetailHtml(lastMemory);
        })
    );
}

function updateConfiguration(extContext: SimpleExtensionContext) {
    const config = vscode.workspace.getConfiguration('claude-assistant');
    
    // Update Claude path
    const claudePath = config.get<string>('claudeCodePath');
    if (claudePath) {
        extContext.claudeInterface.updatePath(claudePath);
    }
    
    // Update memory retention
    const retentionDays = config.get<number>('memoryRetention');
    if (retentionDays) {
        extContext.memorySystem.setRetentionDays(retentionDays);
    }
    
    // Update intelligent suggestions
    extContext.intelligentTriggers.setEnabled(config.get('intelligentSuggestions') || true);
    
    // Update memory awareness
    extContext.memoryAwareHook.setEnabled(config.get('memoryAwareness') || true);
}

function getMemoryDetailHtml(memory: any): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Execution Details</title>
            <style>
                body { font-family: var(--vscode-font-family); padding: 20px; }
                .memory-item { border: 1px solid var(--vscode-panel-border); margin: 10px 0; padding: 15px; border-radius: 5px; }
                .timestamp { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
                .input { background: var(--vscode-textCodeBlock-background); padding: 10px; margin: 10px 0; border-radius: 3px; }
                .result { background: var(--vscode-editor-background); padding: 10px; margin: 10px 0; border-radius: 3px; }
            </style>
        </head>
        <body>
            <h2>Execution Review</h2>
            <div class="memory-item">
                <div class="timestamp">Executed: ${new Date(memory.timestamp).toLocaleString()}</div>
                <h3>Input:</h3>
                <div class="input">${memory.input}</div>
                <h3>Result:</h3>
                <div class="result">${memory.result}</div>
                ${memory.tags ? `<p><strong>Tags:</strong> ${memory.tags.join(', ')}</p>` : ''}
                ${memory.rating ? `<p><strong>Rating:</strong> ${memory.rating}/5</p>` : ''}
            </div>
        </body>
        </html>
    `;
}

function getMemoryWebviewContent(memories: any[], patterns: any[]): string {
    const memoryHtml = memories.map(memory => `
        <div class="memory-item">
            <div class="timestamp">${new Date(memory.timestamp).toLocaleDateString()}</div>
            <div class="input-preview">${memory.input.substring(0, 100)}...</div>
            <div class="result-preview">${memory.result.substring(0, 150)}...</div>
            ${memory.tags ? `<div class="tags">${memory.tags.join(', ')}</div>` : ''}
        </div>
    `).join('');

    const patternHtml = patterns.map(pattern => `
        <div class="pattern-item">
            <div class="pattern-name">${pattern.pattern}</div>
            <div class="pattern-meta">${pattern.type} - Used ${pattern.frequency} times</div>
            <div class="pattern-examples">${pattern.examples.slice(0, 2).join(', ')}</div>
        </div>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Project Memory</title>
            <style>
                body { font-family: var(--vscode-font-family); padding: 20px; }
                .section { margin: 20px 0; }
                .memory-item, .pattern-item { 
                    border: 1px solid var(--vscode-panel-border); 
                    margin: 10px 0; 
                    padding: 15px; 
                    border-radius: 5px; 
                }
                .timestamp { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
                .input-preview { font-weight: bold; margin: 5px 0; }
                .result-preview { color: var(--vscode-descriptionForeground); }
                .tags { font-size: 0.8em; color: var(--vscode-textLink-foreground); }
                .pattern-name { font-weight: bold; }
                .pattern-meta { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
                .pattern-examples { font-size: 0.8em; margin-top: 5px; }
            </style>
        </head>
        <body>
            <h1>Project Memory & Learning</h1>
            
            <div class="section">
                <h2>Recent Executions (${memories.length})</h2>
                ${memoryHtml}
            </div>
            
            <div class="section">
                <h2>Learned Patterns (${patterns.length})</h2>
                ${patternHtml}
            </div>
        </body>
        </html>
    `;
}

export function deactivate() {
    console.log('Claude Gemini Assistant deactivated');
    
    // Cleanup
    if (extensionContext) {
        extensionContext.intelligentTriggers.dispose();
        extensionContext.memoryAwareHook.dispose();
        extensionContext.memorySystem.dispose();
    }
}