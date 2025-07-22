import * as vscode from 'vscode';
import { ClaudeCodeInterface } from './claude/claudeCodeInterface';
import { ProjectIntelligence } from './core/projectIntelligence';
import { MemorySystem } from './core/memorySystem';
import { GeminiWorkflow } from './gemini/geminiWorkflow';
import { IntelligentTriggers } from './hooks/intelligentTriggers';
import { WorkflowPanel } from './ui/workflowPanel';
import { ContextViewer } from './ui/contextViewer';
import { ExtensionContext } from './types/interfaces';

let extensionContext: ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
    console.log('Claude Gemini Assistant is now active!');

    // Initialize core systems
    const claudeInterface = new ClaudeCodeInterface(context);
    const projectIntelligence = new ProjectIntelligence(context);
    const memorySystem = new MemorySystem(context);
    const geminiWorkflow = new GeminiWorkflow(context, claudeInterface, projectIntelligence, memorySystem);
    
    // Initialize UI components
    const workflowPanel = new WorkflowPanel(context, geminiWorkflow);
    const contextViewer = new ContextViewer(context, projectIntelligence);
    
    // Initialize intelligent triggers
    const intelligentTriggers = new IntelligentTriggers(
        context,
        projectIntelligence,
        claudeInterface,
        geminiWorkflow
    );

    // Store extension context
    extensionContext = {
        claudeInterface,
        projectIntelligence,
        memorySystem,
        geminiWorkflow,
        workflowPanel,
        contextViewer,
        intelligentTriggers
    };

    // Register commands
    registerCommands(context, extensionContext);

    // Register views
    registerViews(context, extensionContext);

    // Initialize workspace tracking
    if (vscode.workspace.workspaceFolders) {
        const autoAnalyze = vscode.workspace.getConfiguration('claude-assistant').get('autoAnalyzeProjects');
        if (autoAnalyze) {
            projectIntelligence.analyzeWorkspace();
        }
    }

    // Set up workspace change listener
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(async (e) => {
            if (e.added.length > 0) {
                const autoAnalyze = vscode.workspace.getConfiguration('claude-assistant').get('autoAnalyzeProjects');
                if (autoAnalyze) {
                    for (const folder of e.added) {
                        await projectIntelligence.analyzeFolder(folder.uri);
                    }
                }
            }
        })
    );

    // Set up configuration change listener
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('claude-assistant')) {
                updateConfiguration(extensionContext);
            }
        })
    );
}

function registerCommands(context: vscode.ExtensionContext, extContext: ExtensionContext) {
    // Start Gemini Workflow
    context.subscriptions.push(
        vscode.commands.registerCommand('claude-assistant.startGeminiWorkflow', async () => {
            try {
                await extContext.workflowPanel.show();
                await extContext.geminiWorkflow.startWorkflow();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to start workflow: ${error}`);
            }
        })
    );

    // Analyze Project
    context.subscriptions.push(
        vscode.commands.registerCommand('claude-assistant.analyzeProject', async (uri?: vscode.Uri) => {
            try {
                const targetUri = uri || vscode.workspace.workspaceFolders?.[0]?.uri;
                if (!targetUri) {
                    vscode.window.showErrorMessage('No folder selected for analysis');
                    return;
                }
                
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Analyzing project...",
                    cancellable: true
                }, async (progress, token) => {
                    await extContext.projectIntelligence.analyzeFolder(targetUri, progress, token);
                });
                
                vscode.window.showInformationMessage('Project analysis complete!');
            } catch (error) {
                vscode.window.showErrorMessage(`Project analysis failed: ${error}`);
            }
        })
    );

    // Execute with Context
    context.subscriptions.push(
        vscode.commands.registerCommand('claude-assistant.executeWithContext', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('No active editor');
                    return;
                }

                const selection = editor.selection;
                const text = selection.isEmpty 
                    ? editor.document.getText() 
                    : editor.document.getText(selection);

                const context = await extContext.projectIntelligence.getContextForFile(editor.document.uri);
                const result = await extContext.claudeInterface.executeWithContext(text, context);
                
                // Show result in output channel
                const outputChannel = vscode.window.createOutputChannel('Claude Code Result');
                outputChannel.appendLine(result);
                outputChannel.show();
                
                // Store in memory
                await extContext.memorySystem.recordExecution({
                    input: text,
                    context: context,
                    result: result,
                    timestamp: new Date()
                });
            } catch (error) {
                vscode.window.showErrorMessage(`Execution failed: ${error}`);
            }
        })
    );

    // Show Project Memory
    context.subscriptions.push(
        vscode.commands.registerCommand('claude-assistant.showProjectMemory', async () => {
            try {
                const memories = await extContext.memorySystem.getRecentMemories();
                const quickPick = vscode.window.createQuickPick();
                quickPick.items = memories.map(m => ({
                    label: new Date(m.timestamp).toLocaleString(),
                    description: m.input.substring(0, 50) + '...',
                    detail: m.result.substring(0, 100) + '...',
                    memory: m
                }));
                
                quickPick.onDidChangeSelection(selection => {
                    if (selection[0]) {
                        const memory = (selection[0] as any).memory;
                        // Show detailed memory view
                        vscode.window.showInformationMessage(
                            `Memory from ${new Date(memory.timestamp).toLocaleString()}`,
                            'View Details'
                        ).then(action => {
                            if (action === 'View Details') {
                                const panel = vscode.window.createWebviewPanel(
                                    'memoryDetails',
                                    'Memory Details',
                                    vscode.ViewColumn.One,
                                    {}
                                );
                                panel.webview.html = getMemoryDetailHtml(memory);
                            }
                        });
                    }
                });
                
                quickPick.show();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to show memory: ${error}`);
            }
        })
    );

    // Configure Workflow
    context.subscriptions.push(
        vscode.commands.registerCommand('claude-assistant.configureWorkflow', async () => {
            try {
                const config = vscode.workspace.getConfiguration('claude-assistant');
                const items = [
                    { label: 'simple', description: 'Quick 3-step workflow' },
                    { label: 'standard', description: 'Standard 5-step workflow' },
                    { label: 'comprehensive', description: 'Full 10-step workflow' }
                ];
                const complexity = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select workflow complexity'
                });
                
                if (complexity) {
                    await config.update('workflowComplexity', complexity.label, vscode.ConfigurationTarget.Workspace);
                    vscode.window.showInformationMessage(`Workflow complexity set to ${complexity.label}`);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Configuration failed: ${error}`);
            }
        })
    );

    // Review Last Execution
    context.subscriptions.push(
        vscode.commands.registerCommand('claude-assistant.reviewLastExecution', async () => {
            try {
                const lastExecution = await extContext.memorySystem.getLastExecution();
                if (!lastExecution) {
                    vscode.window.showInformationMessage('No previous execution found');
                    return;
                }
                
                const panel = vscode.window.createWebviewPanel(
                    'executionReview',
                    'Last Execution Review',
                    vscode.ViewColumn.One,
                    { enableScripts: true }
                );
                
                panel.webview.html = getExecutionReviewHtml(lastExecution);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to review execution: ${error}`);
            }
        })
    );
}

function registerViews(context: vscode.ExtensionContext, extContext: ExtensionContext) {
    // Register tree data providers
    vscode.window.createTreeView('claude-assistant.memory', {
        treeDataProvider: extContext.memorySystem.getTreeDataProvider(),
        showCollapseAll: true
    });

    // Register webview providers
    vscode.window.registerWebviewViewProvider(
        'claude-assistant.workflow',
        extContext.workflowPanel
    );
    
    vscode.window.registerWebviewViewProvider(
        'claude-assistant.context',
        extContext.contextViewer
    );
}

function updateConfiguration(extContext: ExtensionContext) {
    const config = vscode.workspace.getConfiguration('claude-assistant');
    
    // Update claude interface
    extContext.claudeInterface.updatePath(config.get('claudeCodePath') || 'claude-code');
    
    // Update memory retention
    extContext.memorySystem.setRetentionDays(config.get('memoryRetention') || 30);
    
    // Update workflow complexity
    extContext.geminiWorkflow.setComplexity(config.get('workflowComplexity') || 'standard');
    
    // Update intelligent suggestions
    extContext.intelligentTriggers.setEnabled(config.get('intelligentSuggestions') || true);
}

function getMemoryDetailHtml(memory: any): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { 
                    font-family: var(--vscode-font-family); 
                    padding: 20px;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }
                .section { 
                    margin-bottom: 20px;
                    border: 1px solid var(--vscode-panel-border);
                    padding: 15px;
                    border-radius: 5px;
                }
                h2 { 
                    color: var(--vscode-titleBar-activeForeground);
                    margin-top: 0;
                }
                pre { 
                    background: var(--vscode-textBlockQuote-background);
                    padding: 10px;
                    border-radius: 3px;
                    overflow-x: auto;
                }
                .timestamp {
                    color: var(--vscode-descriptionForeground);
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <h1>Memory Details</h1>
            <p class="timestamp">${new Date(memory.timestamp).toLocaleString()}</p>
            
            <div class="section">
                <h2>Input</h2>
                <pre>${escapeHtml(memory.input)}</pre>
            </div>
            
            <div class="section">
                <h2>Context</h2>
                <pre>${escapeHtml(JSON.stringify(memory.context, null, 2))}</pre>
            </div>
            
            <div class="section">
                <h2>Result</h2>
                <pre>${escapeHtml(memory.result)}</pre>
            </div>
        </body>
        </html>
    `;
}

function getExecutionReviewHtml(execution: any): string {
    return getMemoryDetailHtml(execution); // Reuse the same format
}

function escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

export function deactivate() {
    // Cleanup
    if (extensionContext) {
        extensionContext.intelligentTriggers.dispose();
        extensionContext.workflowPanel.dispose();
        extensionContext.memorySystem.dispose();
    }
}