// src/extension.ts

import * as vscode from 'vscode';

// Core system imports
import { ProjectIntelligenceSystem } from './core/projectIntelligenceSystem';
import { MemorySystem } from './core/memorySystem';
import { GeminiWorkflowEngine } from './core/geminiWorkflow';
import { ClaudeCodeInterface } from './core/claudeCodeInterface';

// Enhanced systems imports
import { SessionManager } from './core/sessionManager';
import { CollaborativeExecutor } from './core/collaborativeExecutor';
import { HistoryTracker } from './core/historyTracker';
import { WorkRecoverySystem } from './core/workRecovery';

// Intelligent systems imports
import { IntelligentTriggers } from './hooks/intelligentTriggers';
import { MemoryAwareHook } from './hooks/memoryAwareHook';

// UI components imports
import { WorkflowPanelProvider } from './ui/workflowPanel';
import { ProjectContextProvider } from './ui/contextTreeProvider';

// Type imports
import { 
    GeminiWorkflow, 
    ProjectIntelligence, 
    WorkflowPriority,
    ExecutionContext,
    WorkflowPhase
} from './types/interfaces';

/**
 * The main extension entry point that orchestrates our sophisticated
 * development assistant. This class serves as the conductor that coordinates
 * all our intelligent systems - Project Intelligence, Memory, Workflow Engine,
 * and Intelligent Triggers - into a cohesive development environment.
 * * Think of this as the command center that ensures all components work
 * together seamlessly to provide contextually appropriate assistance at
 * exactly the right moments. When you interact with any part of our system,
 * this coordination layer ensures that all relevant intelligence contributes
 * to providing the most effective assistance possible.
 */
class ClaudeGeminiAssistant {
    // Core systems
    private projectIntelligence!: ProjectIntelligenceSystem;
    private memorySystem!: MemorySystem;
    private workflowEngine!: GeminiWorkflowEngine;
    private claudeCodeInterface!: ClaudeCodeInterface;
    
    // Enhanced systems
    private sessionManager!: SessionManager;
    private collaborativeExecutor!: CollaborativeExecutor;
    private historyTracker!: HistoryTracker;
    private workRecoverySystem!: WorkRecoverySystem;
    
    // Intelligent systems
    private intelligentTriggers!: IntelligentTriggers;
    private memoryAwareHook!: MemoryAwareHook;
    
    // UI providers
    private workflowPanelProvider!: WorkflowPanelProvider;
    private contextProvider!: ProjectContextProvider;
    
    // Extension state
    private extensionContext: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;
    private statusBarItem: vscode.StatusBarItem;
    
    // Active state tracking
    private activeWorkflows: Map<string, GeminiWorkflow> = new Map();
    private isInitialized: boolean = false;
    
    constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
        this.outputChannel = vscode.window.createOutputChannel('Claude Gemini Assistant');
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        
        console.log('🚀 Claude Gemini Assistant starting initialization...');
    }
    
    /**
     * Initializes all core systems in the correct order, ensuring each
     * system has access to the dependencies it needs to function effectively.
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.log('⚠️ Assistant already initialized');
            return;
        }
        
        try {
            console.log('🔧 Initializing core systems...');
            
            // Phase 1: Initialize foundational systems
            await this.initializeFoundationSystems();
            
            // Phase 2: Initialize intelligent systems that depend on foundations
            await this.initializeIntelligentSystems();
            
            // Phase 3: Initialize UI components
            await this.initializeUIComponents();
            
            // Phase 4: Set up VS Code integrations
            await this.setupVSCodeIntegrations();
            
            // Phase 5: Start monitoring and intelligent assistance
            await this.startIntelligentMonitoring();
            
            this.isInitialized = true;
            console.log('✅ Claude Gemini Assistant fully initialized and ready');
            
            // Show initialization complete message
            this.showInitializationComplete();
            
        } catch (error) {
            console.error('❌ Failed to initialize Claude Gemini Assistant:', error);
            vscode.window.showErrorMessage(`Failed to initialize assistant: ${error}`);
            throw error;
        }
    }
    
    /**
     * Initializes the foundational systems that other systems depend upon.
     */
    private async initializeFoundationSystems(): Promise<void> {
        console.log('📊 Initializing Project Intelligence System...');
        this.projectIntelligence = new ProjectIntelligenceSystem(this.extensionContext);
        
        console.log('🧠 Initializing Memory System...');
        this.memorySystem = new MemorySystem(this.extensionContext);
        
        console.log('🔌 Initializing Claude Code Interface...');
        this.claudeCodeInterface = new ClaudeCodeInterface();
        
        console.log('🏗️ Initializing Gemini Workflow Engine...');
        this.workflowEngine = new GeminiWorkflowEngine();
        
        console.log('📋 Initializing Session Manager...');
        this.sessionManager = new SessionManager(
            this.extensionContext,
            this.projectIntelligence
        );
        
        console.log('🤝 Initializing Collaborative Executor...');
        this.collaborativeExecutor = new CollaborativeExecutor(
            this.claudeCodeInterface,
            this.workflowEngine, // Using workflow engine as Gemini interface for now
            this.workflowEngine, // Using workflow engine as boss agent for now
            this.sessionManager
        );
        
        console.log('📚 Initializing History Tracker...');
        this.historyTracker = new HistoryTracker(
            this.extensionContext
        );
        
        console.log('🔄 Initializing Work Recovery System...');
        this.workRecoverySystem = new WorkRecoverySystem(
            this.sessionManager,
            this.workflowEngine,
            this.memorySystem
        );
    }
    
    /**
     * Initializes intelligent systems that provide proactive assistance.
     */
    private async initializeIntelligentSystems(): Promise<void> {
        console.log('🧩 Initializing Intelligent Triggers System...');
        this.intelligentTriggers = new IntelligentTriggers(
            this.projectIntelligence.getProjectIntelligenceInstance()
        );

        console.log('🧠 Initializing Memory-Aware Hook System...');
        this.memoryAwareHook = new MemoryAwareHook(
            this.memorySystem,
            this.projectIntelligence.getProjectIntelligenceInstance()
        );
    }
    
    /**
     * Initializes UI components that provide visual interfaces for our systems.
     */
    private async initializeUIComponents(): Promise<void> {
        console.log('🖼️ Initializing UI Components...');
        
        this.workflowPanelProvider = new WorkflowPanelProvider(
            this.extensionContext,
            this.projectIntelligence
        );
        

        
        this.contextProvider = new ProjectContextProvider();
        
        // Register webview providers
        this.extensionContext.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                'claude-assistant.workflow',
                this.workflowPanelProvider
            )
        );
        
        this.extensionContext.subscriptions.push(
            vscode.window.registerTreeDataProvider(
                'claude-assistant.context',
                this.contextProvider
            )
        );
    }
    
    /**
     * Sets up all VS Code integrations including commands, event listeners,
     * and status bar items.
     */
    private async setupVSCodeIntegrations(): Promise<void> {
        console.log('⚙️ Setting up VS Code integrations...');
        
        // Register all commands
        this.registerCommands();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize status bar
        this.setupStatusBar();
        
        // Set up file system monitoring
        this.setupFileSystemMonitoring();
    }
    
    /**
     * Registers all commands that users can invoke through VS Code.
     */
    private registerCommands(): void {
        const commands = [
            // Core workflow commands
            {
                id: 'claude-assistant.startGeminiWorkflow',
                handler: () => this.handleStartGeminiWorkflow()
            },
            {
                id: 'claude-assistant.analyzeProject',
                handler: () => this.handleAnalyzeProject()
            },
            {
                id: 'claude-assistant.executeWithContext',
                handler: () => this.handleExecuteWithContext()
            },
            
            // NEW: Advanced AI Features
            {
                id: 'claude-assistant.generateCode',
                handler: () => this.handleGenerateCode()
            },
            {
                id: 'claude-assistant.refactorCode',
                handler: () => this.handleRefactorCode()
            },
            {
                id: 'claude-assistant.debugWithAI',
                handler: () => this.handleDebugWithAI()
            },
            {
                id: 'claude-assistant.explainCode',
                handler: () => this.handleExplainCode()
            },
            {
                id: 'claude-assistant.optimizePerformance',
                handler: () => this.handleOptimizePerformance()
            },
            {
                id: 'claude-assistant.generateTests',
                handler: () => this.handleGenerateTests()
            },
            
            // Session management commands
            {
                id: 'claude-assistant.createSession',
                handler: () => this.handleCreateSession()
            },
            {
                id: 'claude-assistant.resumeSession',
                handler: () => this.handleResumeSession()
            },
            {
                id: 'claude-assistant.saveSession',
                handler: () => this.handleSaveSession()
            },
            {
                id: 'claude-assistant.viewSessionHistory',
                handler: () => this.handleViewSessionHistory()
            },
            
            // Collaboration commands
            {
                id: 'claude-assistant.startCollaboration',
                handler: () => this.handleStartCollaboration()
            },
            {
                id: 'claude-assistant.collaborativeDebug',
                handler: () => this.handleCollaborativeDebug()
            },
            {
                id: 'claude-assistant.collaborativeRefactor',
                handler: () => this.handleCollaborativeRefactor()
            },
            {
                id: 'claude-assistant.compareApproaches',
                handler: () => this.handleCompareApproaches()
            },
            
            // Recovery commands
            {
                id: 'claude-assistant.createRecoveryPoint',
                handler: () => this.handleCreateRecoveryPoint()
            },
            {
                id: 'claude-assistant.restoreFromRecovery',
                handler: () => this.handleRestoreFromRecovery()
            },
            
            // Information and configuration commands
            {
                id: 'claude-assistant.showProjectMemory',
                handler: () => this.handleShowProjectMemory()
            },
            {
                id: 'claude-assistant.configureWorkflow',
                handler: () => this.handleConfigureWorkflow()
            },
            {
                id: 'claude-assistant.reviewLastExecution',
                handler: () => this.handleReviewLastExecution()
            },
            {
                id: 'claude-assistant.clearApiKey',
                handler: () => this.handleClearApiKey()
            }
        ];
        
        // Register each command with VS Code
        for (const command of commands) {
            const disposable = vscode.commands.registerCommand(command.id, command.handler);
            this.extensionContext.subscriptions.push(disposable);
        }
        
        console.log(`📝 Registered ${commands.length} commands`);
    }
    
    /**
     * Sets up event listeners for VS Code events that our systems need to monitor.
     */
    private setupEventListeners(): void {
        // Listen for diagnostic changes (errors, warnings)
        const diagnosticListener = vscode.languages.onDidChangeDiagnostics((event) => {
            this.intelligentTriggers.handleDiagnosticChanges(event);
        });
        
        // Listen for file changes
        const fileChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
            this.intelligentTriggers.handleFileChange(event.document.uri, 'modified');
        });
        
        // Listen for file creation and deletion
        const fileCreateListener = vscode.workspace.onDidCreateFiles((event) => {
            for (const file of event.files) {
                this.intelligentTriggers.handleFileChange(file, 'created');
            }
        });
        
        const fileDeleteListener = vscode.workspace.onDidDeleteFiles((event) => {
            for (const file of event.files) {
                this.intelligentTriggers.handleFileChange(file, 'deleted');
            }
        });
        
        // Listen for workspace changes
        const workspaceListener = vscode.workspace.onDidChangeWorkspaceFolders((event) => {
            this.handleWorkspaceChange(event);
        });
        
        // Register all listeners for cleanup
        this.extensionContext.subscriptions.push(
            diagnosticListener,
            fileChangeListener,
            fileCreateListener,
            fileDeleteListener,
            workspaceListener
        );
        
        console.log('👂 Event listeners configured');
    }
    
    /**
     * Starts intelligent monitoring that provides proactive assistance.
     */
    private async startIntelligentMonitoring(): Promise<void> {
        console.log('🔍 Starting intelligent monitoring...');
        
        // Start periodic analysis of trigger conditions
        setInterval(() => {
            this.intelligentTriggers.analyzeTriggerConditions().catch(console.error);
        }, 30000); // Every 30 seconds
        
        // Start periodic project intelligence updates
        setInterval(() => {
            this.updateProjectIntelligence().catch(console.error);
        }, 300000); // Every 5 minutes
        
        // Start periodic memory maintenance
        setInterval(() => {
            this.performMemoryMaintenance().catch(console.error);
        }, 3600000); // Every hour
        
        console.log('🎯 Intelligent monitoring active');
    }
    
    /**
     * Command Handlers - These methods handle user-invoked commands
     */
    
    /**
     * Handles the main command to start a new Gemini workflow.
     * This demonstrates how user intent gets translated into systematic
     * development processes.
     */
    private async handleStartGeminiWorkflow(): Promise<void> {
        try {
            // Get project intelligence first
            const projectIntel = await this.projectIntelligence.getProjectIntelligence();
            if (!projectIntel) {
                vscode.window.showWarningMessage('No workspace is open. Please open a project folder first.');
                return;
            }
            
            // Get workflow details from user
            const workflowTitle = await vscode.window.showInputBox({
                prompt: 'What would you like to accomplish?',
                placeHolder: 'e.g., "Add user authentication", "Refactor data layer", "Fix performance issues"',
                ignoreFocusOut: true
            });
            
            if (!workflowTitle) return;
            
            const workflowDescription = await vscode.window.showInputBox({
                prompt: 'Provide more details about what you want to achieve',
                placeHolder: 'Describe your requirements, constraints, or specific goals...',
                ignoreFocusOut: true
            });
            
            if (!workflowDescription) return;
            
            // Get priority level
            const priorityOptions = [
                { label: 'High Priority', detail: 'Urgent work that blocks other tasks', value: 'high' as WorkflowPriority },
                { label: 'Medium Priority', detail: 'Important work that should be completed soon', value: 'medium' as WorkflowPriority },
                { label: 'Low Priority', detail: 'Nice-to-have improvements or enhancements', value: 'low' as WorkflowPriority }
            ];
            
            const selectedPriority = await vscode.window.showQuickPick(priorityOptions, {
                placeHolder: 'Select priority level for this workflow'
            });
            
            const priority = selectedPriority?.value || 'medium';
            
            // Start the workflow
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Creating Gemini Workflow...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "Analyzing requirements..." });
                
                const workflow = await this.workflowEngine.startWorkflow(
                    workflowTitle,
                    workflowDescription,
                    projectIntel,
                    priority
                );
                
                progress.report({ increment: 50, message: "Setting up workflow phases..." });
                
                // Track active workflow
                this.activeWorkflows.set(workflow.id, workflow);
                
                progress.report({ increment: 100, message: "Workflow ready!" });
                
                // Show workflow panel
                await vscode.commands.executeCommand('claude-assistant.workflow.focus');
                
                // Ask if user wants to start execution immediately
                const startNow = await vscode.window.showInformationMessage(
                    `Workflow "${workflow.title}" created with ${workflow.phases.length} phases. Start execution now?`,
                    'Start Now', 'Review First'
                );
                
                if (startNow === 'Start Now') {
                    await this.executeWorkflowPhase(workflow.id, projectIntel);
                }
            });
            
        } catch (error) {
            console.error('Error starting Gemini workflow:', error);
            vscode.window.showErrorMessage(`Failed to start workflow: ${error}`);
        }
    }
    
    /**
     * Handles direct execution of Claude Code with comprehensive context.
     * This provides immediate assistance while still leveraging all our
     * intelligence systems.
     */
    private async handleExecuteWithContext(): Promise<void> {
        try {
            const projectIntel = await this.projectIntelligence.getProjectIntelligence();
            if (!projectIntel) {
                vscode.window.showWarningMessage('No workspace is open. Please open a project folder first.');
                return;
            }
            
            // Get instruction from user
            const instruction = await vscode.window.showInputBox({
                prompt: 'What would you like Claude Code to help you with?',
                placeHolder: 'e.g., "Fix the error in this function", "Add error handling", "Optimize this algorithm"',
                ignoreFocusOut: true
            });
            
            if (!instruction) return;
            
            // Build comprehensive execution context
            const context = await this.buildExecutionContext(projectIntel, instruction);
            
            // Execute with Claude Code
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Executing with Claude Code...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "Preparing context..." });
                
                const execution = await this.claudeCodeInterface.executeWithContext(
                    instruction,
                    context,
                    projectIntel.rootPath
                );
                
                progress.report({ increment: 100, message: "Execution completed!" });
                
                // Record the experience
                const mockWorkflow = await this.createMockWorkflow(instruction, projectIntel);
                await this.memorySystem.recordExperience(execution, mockWorkflow, projectIntel);
                
                // Show results
                if (execution.success) {
                    vscode.window.showInformationMessage(
                        `Claude Code execution completed successfully in ${Math.round(execution.duration / 1000)}s`
                    );
                } else {
                    vscode.window.showWarningMessage(
                        `Claude Code execution encountered issues. Check output for details.`
                    );
                }
            });
            
        } catch (error) {
            console.error('Error executing with context:', error);
            vscode.window.showErrorMessage(`Execution failed: ${error}`);
        }
    }
    
    /**
     * Handles project analysis command that provides comprehensive
     * understanding of the current project state.
     */
    private async handleAnalyzeProject(): Promise<void> {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Analyzing project...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "Scanning project structure..." });
                
                const projectIntel = await this.projectIntelligence.getProjectIntelligence(true);
                
                progress.report({ increment: 100, message: "Analysis complete!" });
                
                if (projectIntel) {
                    // Show analysis results
                    vscode.window.showInformationMessage(
                        'Project analysis complete!',
                        'View Details'
                    ).then(selection => {
                        if (selection === 'View Details') {
                            // Show detailed analysis in a new document
                            this.showDetailedAnalysis(projectIntel);
                        }
                    });
                } else {
                    vscode.window.showWarningMessage('No project found to analyze. Please open a project folder.');
                }
            });
            
        } catch (error) {
            console.error('Error analyzing project:', error);
            vscode.window.showErrorMessage(`Project analysis failed: ${error}`);
        }
    }

    /**
     * Handles clearing the stored API key
     */
    private async handleClearApiKey(): Promise<void> {
        try {
            await this.extensionContext.secrets.delete('gemini-api-key');
            vscode.window.showInformationMessage('API key cleared successfully');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to clear API key');
        }
    }

    // NEW: Advanced AI Feature Implementations
    
    /**
     * Generates code based on natural language description
     */
    private async handleGenerateCode(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const description = await vscode.window.showInputBox({
            prompt: 'Describe the code you want to generate:',
            placeHolder: 'e.g., "Create a function that validates email addresses"'
        });

        if (!description) return;

        try {
            const projectIntel = await this.projectIntelligence.getProjectIntelligence();
            if (!projectIntel) {
                vscode.window.showErrorMessage('Failed to get project intelligence');
                return;
            }
            // Create a basic context object
            const basicContext = {
                projectIntelligence: projectIntel,
                currentWorkflow: await this.createMockWorkflow(description, projectIntel),
                currentPhase: await this.createMockPhase(description),
                relevantMemories: [],
                similarExecutions: [],
                learnedPatterns: [],
                activeFiles: this.getActiveFiles(),
                recentChanges: [],
                currentErrors: this.getCurrentErrors(),
                suggestedApproaches: [],
                cautionAreas: [],
                successCriteria: this.generateSuccessCriteria(description)
            };
            
            const prompt = `Generate code for: ${description}\n\nRequirements:\n- Use the current file's language and style\n- Include proper error handling\n- Add comments for clarity\n- Follow best practices for the language`;
            
            const response = await this.claudeCodeInterface.executeWithContext(prompt, basicContext, editor.document.uri.fsPath);
            
            // Insert the generated code
            const position = editor.selection.active;
            await editor.edit(editBuilder => {
                editBuilder.insert(position, response.output || response.context || '');
            });
            
            vscode.window.showInformationMessage('Code generated successfully!');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to generate code: ' + error);
        }
    }

    /**
     * Refactors selected code using AI
     */
    private async handleRefactorCode(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            vscode.window.showErrorMessage('Please select code to refactor');
            return;
        }

        const selectedCode = editor.document.getText(editor.selection);
        const refactorType = await vscode.window.showQuickPick([
            'Improve readability',
            'Optimize performance',
            'Reduce complexity',
            'Follow best practices',
            'Extract functions/methods',
            'Custom refactoring'
        ], {
            placeHolder: 'Choose refactoring type'
        });

        if (!refactorType) return;

        try {
            const projectIntel = await this.projectIntelligence.getProjectIntelligence();
            if (!projectIntel) {
                vscode.window.showErrorMessage('Failed to get project intelligence');
                return;
            }
            const basicContext = {
                projectIntelligence: projectIntel,
                currentWorkflow: await this.createMockWorkflow(`Refactor code: ${refactorType}`, projectIntel),
                currentPhase: await this.createMockPhase(`Refactor code: ${refactorType}`),
                relevantMemories: [],
                similarExecutions: [],
                learnedPatterns: [],
                activeFiles: this.getActiveFiles(),
                recentChanges: [],
                currentErrors: this.getCurrentErrors(),
                suggestedApproaches: [],
                cautionAreas: [],
                successCriteria: this.generateSuccessCriteria(`Refactor code: ${refactorType}`)
            };
            
            const prompt = `Refactor this code to ${refactorType.toLowerCase()}:\n\n${selectedCode}\n\nRequirements:\n- Maintain the same functionality\n- Improve code quality\n- Add comments if needed\n- Follow language best practices`;
            
            const response = await this.claudeCodeInterface.executeWithContext(prompt, basicContext, editor.document.uri.fsPath);
            
            // Replace the selected code
            await editor.edit(editBuilder => {
                editBuilder.replace(editor.selection, response.output || response.context || '');
            });
            
            vscode.window.showInformationMessage('Code refactored successfully!');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to refactor code: ' + error);
        }
    }

    /**
     * Debugs code using AI assistance
     */
    private async handleDebugWithAI(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
        const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
        
        if (errors.length === 0) {
            vscode.window.showInformationMessage('No errors found in the current file');
            return;
        }

        try {
            const projectIntel = await this.projectIntelligence.getProjectIntelligence();
            if (!projectIntel) {
                vscode.window.showErrorMessage('Failed to get project intelligence');
                return;
            }
            const basicContext = {
                projectIntelligence: projectIntel,
                currentWorkflow: await this.createMockWorkflow('Debug code errors', projectIntel),
                currentPhase: await this.createMockPhase('Debug code errors'),
                relevantMemories: [],
                similarExecutions: [],
                learnedPatterns: [],
                activeFiles: this.getActiveFiles(),
                recentChanges: [],
                currentErrors: this.getCurrentErrors(),
                suggestedApproaches: [],
                cautionAreas: [],
                successCriteria: this.generateSuccessCriteria('Debug code errors')
            };
            
            const errorDetails = errors.map(e => `Line ${e.range.start.line + 1}: ${e.message}`).join('\n');
            const fileContent = editor.document.getText();
            
            const prompt = `Debug these errors in the code:\n\nErrors:\n${errorDetails}\n\nCode:\n${fileContent}\n\nProvide:\n1. Explanation of each error\n2. Suggested fixes\n3. Prevention tips`;
            
            const response = await this.claudeCodeInterface.executeWithContext(prompt, basicContext, editor.document.uri.fsPath);
            
            // Show results in a new webview
            const panel = vscode.window.createWebviewPanel(
                'debugResults',
                'AI Debug Results',
                vscode.ViewColumn.Beside,
                { enableScripts: true }
            );
            
            panel.webview.html = this.getDebugResultsHtml(response.output || response.context || '');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to debug with AI: ' + error);
        }
    }

    /**
     * Explains selected code using AI
     */
    private async handleExplainCode(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const selectedCode = editor.selection.isEmpty 
            ? editor.document.getText() 
            : editor.document.getText(editor.selection);

        try {
            const projectIntel = await this.projectIntelligence.getProjectIntelligence();
            if (!projectIntel) {
                vscode.window.showErrorMessage('Failed to get project intelligence');
                return;
            }
            const basicContext = {
                projectIntelligence: projectIntel,
                currentWorkflow: await this.createMockWorkflow('Explain code', projectIntel),
                currentPhase: await this.createMockPhase('Explain code'),
                relevantMemories: [],
                similarExecutions: [],
                learnedPatterns: [],
                activeFiles: this.getActiveFiles(),
                recentChanges: [],
                currentErrors: this.getCurrentErrors(),
                suggestedApproaches: [],
                cautionAreas: [],
                successCriteria: this.generateSuccessCriteria('Explain code')
            };
            
            const prompt = `Explain this code in detail:\n\n${selectedCode}\n\nProvide:\n1. What the code does\n2. How it works\n3. Key concepts used\n4. Potential improvements`;
            
            const response = await this.claudeCodeInterface.executeWithContext(prompt, basicContext, editor.document.uri.fsPath);
            
            // Show explanation in a new webview
            const panel = vscode.window.createWebviewPanel(
                'codeExplanation',
                'Code Explanation',
                vscode.ViewColumn.Beside,
                { enableScripts: true }
            );
            
            panel.webview.html = this.getCodeExplanationHtml(response.output || response.context || '');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to explain code: ' + error);
        }
    }

    /**
     * Optimizes code performance using AI
     */
    private async handleOptimizePerformance(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const selectedCode = editor.selection.isEmpty 
            ? editor.document.getText() 
            : editor.document.getText(editor.selection);

        try {
            const projectIntel = await this.projectIntelligence.getProjectIntelligence();
            if (!projectIntel) {
                vscode.window.showErrorMessage('Failed to get project intelligence');
                return;
            }
            const basicContext = {
                projectIntelligence: projectIntel,
                currentWorkflow: await this.createMockWorkflow('Optimize code performance', projectIntel),
                currentPhase: await this.createMockPhase('Optimize code performance'),
                relevantMemories: [],
                similarExecutions: [],
                learnedPatterns: [],
                activeFiles: this.getActiveFiles(),
                recentChanges: [],
                currentErrors: this.getCurrentErrors(),
                suggestedApproaches: [],
                cautionAreas: [],
                successCriteria: this.generateSuccessCriteria('Optimize code performance')
            };
            
            const prompt = `Analyze and optimize this code for performance:\n\n${selectedCode}\n\nProvide:\n1. Performance bottlenecks identified\n2. Optimized version\n3. Performance improvements explanation\n4. Best practices applied`;
            
            const response = await this.claudeCodeInterface.executeWithContext(prompt, basicContext, editor.document.uri.fsPath);
            
            // Show optimization results
            const panel = vscode.window.createWebviewPanel(
                'performanceOptimization',
                'Performance Optimization',
                vscode.ViewColumn.Beside,
                { enableScripts: true }
            );
            
            panel.webview.html = this.getPerformanceOptimizationHtml(response.output || response.context || '');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to optimize performance: ' + error);
        }
    }

    /**
     * Generates tests for selected code
     */
    private async handleGenerateTests(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const selectedCode = editor.selection.isEmpty 
            ? editor.document.getText() 
            : editor.document.getText(editor.selection);

        try {
            const projectIntel = await this.projectIntelligence.getProjectIntelligence();
            if (!projectIntel) {
                vscode.window.showErrorMessage('Failed to get project intelligence');
                return;
            }
            const basicContext = {
                projectIntelligence: projectIntel,
                currentWorkflow: await this.createMockWorkflow('Generate tests', projectIntel),
                currentPhase: await this.createMockPhase('Generate tests'),
                relevantMemories: [],
                similarExecutions: [],
                learnedPatterns: [],
                activeFiles: this.getActiveFiles(),
                recentChanges: [],
                currentErrors: this.getCurrentErrors(),
                suggestedApproaches: [],
                cautionAreas: [],
                successCriteria: this.generateSuccessCriteria('Generate tests')
            };
            
            const prompt = `Generate comprehensive tests for this code:\n\n${selectedCode}\n\nRequirements:\n1. Unit tests for all functions/methods\n2. Edge case testing\n3. Error handling tests\n4. Integration tests if applicable\n5. Use appropriate testing framework for the language`;
            
            const response = await this.claudeCodeInterface.executeWithContext(prompt, basicContext, editor.document.uri.fsPath);
            
            // Create a new test file
            const testFileName = editor.document.fileName.replace(/\.(\w+)$/, '.test.$1');
            const testUri = vscode.Uri.file(testFileName);
            
            const testDocument = await vscode.workspace.openTextDocument(testUri);
            const testEditor = await vscode.window.showTextDocument(testDocument);
            
            await testEditor.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(0, 0), response.output || response.context || '');
            });
            
            vscode.window.showInformationMessage(`Tests generated in ${testFileName}`);
        } catch (error) {
            vscode.window.showErrorMessage('Failed to generate tests: ' + error);
        }
    }

    // Helper methods for webview content
    private getDebugResultsHtml(content: string): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI Debug Results</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
                    .debug-section { margin-bottom: 20px; }
                    .error-item { background: #f5f5f5; padding: 10px; margin: 10px 0; border-left: 4px solid #ff4444; }
                    .fix-item { background: #f0f8ff; padding: 10px; margin: 10px 0; border-left: 4px solid #0066cc; }
                    pre { background: #f8f8f8; padding: 10px; border-radius: 4px; overflow-x: auto; }
                </style>
            </head>
            <body>
                <h1>🔍 AI Debug Results</h1>
                <div class="debug-section">
                    ${content.replace(/\n/g, '<br>')}
                </div>
            </body>
            </html>
        `;
    }

    private getCodeExplanationHtml(content: string): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Code Explanation</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
                    .explanation-section { margin-bottom: 20px; }
                    .concept { background: #f0f8ff; padding: 15px; margin: 10px 0; border-radius: 8px; }
                    .improvement { background: #fff8f0; padding: 15px; margin: 10px 0; border-radius: 8px; }
                    pre { background: #f8f8f8; padding: 10px; border-radius: 4px; overflow-x: auto; }
                </style>
            </head>
            <body>
                <h1>📚 Code Explanation</h1>
                <div class="explanation-section">
                    ${content.replace(/\n/g, '<br>')}
                </div>
            </body>
            </html>
        `;
    }

    private getPerformanceOptimizationHtml(content: string): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Performance Optimization</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
                    .optimization-section { margin-bottom: 20px; }
                    .bottleneck { background: #fff0f0; padding: 15px; margin: 10px 0; border-radius: 8px; }
                    .optimization { background: #f0fff0; padding: 15px; margin: 10px 0; border-radius: 8px; }
                    .best-practice { background: #f0f0ff; padding: 15px; margin: 10px 0; border-radius: 8px; }
                    pre { background: #f8f8f8; padding: 10px; border-radius: 4px; overflow-x: auto; }
                </style>
            </head>
            <body>
                <h1>⚡ Performance Optimization</h1>
                <div class="optimization-section">
                    ${content.replace(/\n/g, '<br>')}
                </div>
            </body>
            </html>
        `;
    }
    
    /**
     * Helper methods for command handling and system coordination
     */
    
    private async buildExecutionContext(
        projectIntel: ProjectIntelligence,
        instruction: string
    ): Promise<ExecutionContext> {
        // Get relevant memories
        const relevantMemories = await this.memorySystem.searchMemories(instruction);
        
        // Get applicable patterns
        const applicablePatterns = await this.memorySystem.getApplicablePatterns(
            instruction,
            projectIntel,
            3
        );
        
        // Build comprehensive context
        const context: ExecutionContext = {
            projectIntelligence: projectIntel,
            currentWorkflow: await this.createMockWorkflow(instruction, projectIntel),
            currentPhase: await this.createMockPhase(instruction),
            relevantMemories,
            similarExecutions: [], // Would be populated from memory system
            learnedPatterns: applicablePatterns,
            activeFiles: this.getActiveFiles(),
            recentChanges: [], // Would be populated from file monitoring
            currentErrors: this.getCurrentErrors(),
            suggestedApproaches: [], // Would be generated based on context
            cautionAreas: [], // Would be identified from project analysis
            successCriteria: this.generateSuccessCriteria(instruction)
        };
        
        return context;
    }
    
    private async executeWorkflowPhase(workflowId: string, projectIntel: ProjectIntelligence): Promise<void> {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) {
            vscode.window.showErrorMessage('Workflow not found');
            return;
        }
        
        try {
            const isComplete = await this.workflowEngine.executeNextPhase(workflowId, projectIntel);
            
            if (isComplete) {
                vscode.window.showInformationMessage(`Workflow "${workflow.title}" completed successfully!`);
                this.activeWorkflows.delete(workflowId);
            } else {
                // Ask if user wants to continue to next phase
                const continueExecution = await vscode.window.showInformationMessage(
                    `Phase completed. Continue to next phase?`,
                    'Continue', 'Pause'
                );
                
                if (continueExecution === 'Continue') {
                    await this.executeWorkflowPhase(workflowId, projectIntel);
                }
            }
            
        } catch (error) {
            console.error('Error executing workflow phase:', error);
            vscode.window.showErrorMessage(`Phase execution failed: ${error}`);
        }
    }
    
    private setupStatusBar(): void {
        this.statusBarItem.text = '$(robot) Claude Assistant';
        this.statusBarItem.tooltip = 'Claude Gemini Assistant - Click for quick actions';
        this.statusBarItem.command = 'claude-assistant.startGeminiWorkflow';
        this.statusBarItem.show();
        
        this.extensionContext.subscriptions.push(this.statusBarItem);
    }
    
    private setupFileSystemMonitoring(): void {
        // Set up file system watchers for project intelligence updates
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
        
        fileWatcher.onDidChange((uri) => {
            this.intelligentTriggers.handleFileChange(uri, 'modified');
        });
        
        fileWatcher.onDidCreate((uri) => {
            this.intelligentTriggers.handleFileChange(uri, 'created');
        });
        
        fileWatcher.onDidDelete((uri) => {
            this.intelligentTriggers.handleFileChange(uri, 'deleted');
        });
        
        this.extensionContext.subscriptions.push(fileWatcher);
    }
    
    private showInitializationComplete(): void {
        this.outputChannel.appendLine('🎉 Claude Gemini Assistant is ready!');
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine('Available commands:');
        this.outputChannel.appendLine('• Ctrl+Shift+G: Start Gemini Workflow');
        this.outputChannel.appendLine('• Ctrl+Shift+C: Execute with Context');
        this.outputChannel.appendLine('• Command Palette: Search for "Claude" commands');
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine('The assistant is now monitoring your development activity');
        this.outputChannel.appendLine('and will offer proactive assistance when helpful.');
        
        // Update status bar to show ready state
        this.statusBarItem.text = '$(robot) Claude Ready';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    }
    
    // Additional helper methods
    private getActiveFiles(): string[] {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            return [activeEditor.document.uri.fsPath];
        }
        return [];
    }
    
    private getCurrentErrors(): any[] {
        // Would collect current diagnostics
        return [];
    }
    
    private generateSuccessCriteria(_instruction: string): string[] {
        return [
            'Task completed as requested',
            'No new errors introduced',
            'Code quality maintained or improved',
            'Changes align with project patterns'
        ];
    }
    
    private async updateProjectIntelligence(): Promise<void> {
        try {
            await this.projectIntelligence.getProjectIntelligence(false);
        } catch (error) {
            console.error('Error updating project intelligence:', error);
        }
    }
    
    private async performMemoryMaintenance(): Promise<void> {
        // Memory maintenance would be handled by the memory system
        console.log('🧹 Performing memory maintenance...');
    }
    
    private async handleWorkspaceChange(event: vscode.WorkspaceFoldersChangeEvent): Promise<void> {
        // Handle workspace changes by reinitializing relevant systems
        if (event.added.length > 0) {
            console.log('📁 New workspace folders detected, updating project intelligence...');
            await this.projectIntelligence.getProjectIntelligence(true);
        }
    }
    
    // Placeholder methods for remaining command handlers
    private async handleShowProjectMemory(): Promise<void> {
        vscode.window.showInformationMessage('Project memory viewer would be shown here');
    }
    
    private async handleConfigureWorkflow(): Promise<void> {
        vscode.window.showInformationMessage('Workflow configuration would be shown here');
    }
    
    private async handleReviewLastExecution(): Promise<void> {
        vscode.window.showInformationMessage('Last execution review would be shown here');
    }
    
    private async showDetailedAnalysis(projectIntel: ProjectIntelligence): Promise<void> {
        // Would create and show a detailed analysis document
        console.log('Showing detailed analysis for:', projectIntel.name);
    }
    
    private async createMockWorkflow(instruction: string, projectIntel: ProjectIntelligence): Promise<GeminiWorkflow> {
        // Creates a simple workflow for tracking standalone executions
        return {
            id: 'mock_' + Date.now(),
            projectId: projectIntel.projectId,
            title: 'Direct Execution',
            description: instruction,
            createdAt: new Date(),
            lastUpdated: new Date(),
            status: 'executing',
            priority: 'medium',
            complexity: 'simple',
            phases: [],
            currentPhaseIndex: 0,
            initialContext: projectIntel,
            contextUpdates: [],
            learningOutcomes: [],
            claudeCodeExecutions: [],
            totalExecutionTime: 0,
            successCriteria: [],
            completionPercentage: 0
        };
    }
    
    private async createMockPhase(instruction: string): Promise<WorkflowPhase> {
        return {
            id: 'mock_phase_' + Date.now(),
            name: 'Direct Execution',
            description: instruction,
            type: 'implementation',
            status: 'in-progress',
            estimatedDuration: 5000,
            reviewCriteria: ['Task completed successfully'],
            actions: []
        };
    }
    
    // Enhanced Session Management Handlers
    
    private async handleCreateSession(): Promise<void> {
        try {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter session name',
                placeHolder: 'e.g., Feature Development Session'
            });
            
            if (!name) return;
            
            const description = await vscode.window.showInputBox({
                prompt: 'Enter session description',
                placeHolder: 'Describe what you plan to work on...'
            });
            
            if (!description) return;
            
            const session = await this.sessionManager.createSession(name, description);
            
            vscode.window.showInformationMessage(
                `Session "${session.name}" created successfully!`
            );
            
        } catch (error) {
            console.error('Error creating session:', error);
            vscode.window.showErrorMessage(`Failed to create session: ${error}`);
        }
    }
    
    private async handleResumeSession(): Promise<void> {
        try {
            const sessions = await this.sessionManager.getAllSessions();
            
            if (sessions.length === 0) {
                vscode.window.showInformationMessage('No saved sessions found');
                return;
            }
            
            const sessionOptions = sessions.map(session => ({
                label: session.name,
                description: session.description,
                detail: `Last accessed: ${session.lastAccessedAt.toLocaleString()}`,
                value: session.id
            }));
            
            const selectedSession = await vscode.window.showQuickPick(sessionOptions, {
                placeHolder: 'Select session to resume'
            });
            
            if (!selectedSession) return;
            
            await this.sessionManager.resumeSession(selectedSession.value);
            
        } catch (error) {
            console.error('Error resuming session:', error);
            vscode.window.showErrorMessage(`Failed to resume session: ${error}`);
        }
    }
    
    private async handleSaveSession(): Promise<void> {
        try {
            const currentSession = await this.sessionManager.getCurrentSession();
            if (!currentSession) {
                vscode.window.showWarningMessage('No active session to save');
                return;
            }
            
            await this.sessionManager.saveSession(currentSession);
            vscode.window.showInformationMessage('Session saved successfully!');
            
        } catch (error) {
            console.error('Error saving session:', error);
            vscode.window.showErrorMessage(`Failed to save session: ${error}`);
        }
    }
    
    private async handleViewSessionHistory(): Promise<void> {
        try {
            const currentSession = await this.sessionManager.getCurrentSession();
            if (!currentSession) {
                vscode.window.showWarningMessage('No active session');
                return;
            }
            
            const insights = await this.historyTracker.generateInsights(currentSession.id);
            
            // Show insights in a webview
            const panel = vscode.window.createWebviewPanel(
                'sessionHistory',
                'Session History & Insights',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            
            panel.webview.html = this.getSessionHistoryHtml(currentSession, insights);
            
        } catch (error) {
            console.error('Error viewing session history:', error);
            vscode.window.showErrorMessage(`Failed to view session history: ${error}`);
        }
    }
    
    // Enhanced Collaboration Handlers
    
    private async handleStartCollaboration(): Promise<void> {
        try {
            const task = await vscode.window.showInputBox({
                prompt: 'What would you like Claude and Gemini to collaborate on?',
                placeHolder: 'e.g., Design a new API endpoint, Debug this complex issue'
            });
            
            if (!task) return;
            
            const currentSession = await this.sessionManager.getCurrentSession();
            if (!currentSession) {
                vscode.window.showWarningMessage('Please create or resume a session first');
                return;
            }
            
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Starting Claude-Gemini Collaboration...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "Initializing collaboration..." });
                
                const execution = await this.collaborativeExecutor.executeCollaboratively(
                    task,
                    { sessionId: currentSession.id },
                    { type: 'complementary', description: 'Claude analyzes, Gemini implements', phaseSequence: [] }
                );
                
                progress.report({ increment: 100, message: "Collaboration complete!" });
                
                // Show results
                const panel = vscode.window.createWebviewPanel(
                    'collaborationResults',
                    'Collaboration Results',
                    vscode.ViewColumn.Beside,
                    { enableScripts: true }
                );
                
                panel.webview.html = this.getCollaborationResultsHtml(execution);
            });
            
        } catch (error) {
            console.error('Error starting collaboration:', error);
            vscode.window.showErrorMessage(`Collaboration failed: ${error}`);
        }
    }
    
    private async handleCollaborativeDebug(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        
        const selectedCode = editor.selection.isEmpty 
            ? editor.document.getText() 
            : editor.document.getText(editor.selection);
        
        const task = `Debug this code:\n\n${selectedCode}`;
        
        try {
            const currentSession = await this.sessionManager.getCurrentSession();
            if (!currentSession) {
                vscode.window.showWarningMessage('Please create or resume a session first');
                return;
            }
            
            const execution = await this.collaborativeExecutor.executeCollaboratively(
                task,
                { sessionId: currentSession.id, filePath: editor.document.uri.fsPath },
                { type: 'complementary', description: 'Claude analyzes, Gemini debugs', phaseSequence: [] }
            );
            
            // Show debug results
            const panel = vscode.window.createWebviewPanel(
                'collaborativeDebug',
                'Collaborative Debug Results',
                vscode.ViewColumn.Beside,
                { enableScripts: true }
            );
            
            panel.webview.html = this.getCollaborativeDebugHtml(execution);
            
        } catch (error) {
            console.error('Error in collaborative debug:', error);
            vscode.window.showErrorMessage(`Collaborative debug failed: ${error}`);
        }
    }
    
    private async handleCollaborativeRefactor(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            vscode.window.showErrorMessage('Please select code to refactor');
            return;
        }
        
        const selectedCode = editor.document.getText(editor.selection);
        const task = `Refactor this code for better quality:\n\n${selectedCode}`;
        
        try {
            const currentSession = await this.sessionManager.getCurrentSession();
            if (!currentSession) {
                vscode.window.showWarningMessage('Please create or resume a session first');
                return;
            }
            
            const execution = await this.collaborativeExecutor.executeCollaboratively(
                task,
                { sessionId: currentSession.id, filePath: editor.document.uri.fsPath },
                { type: 'complementary', description: 'Claude reviews, Gemini refactors', phaseSequence: [] }
            );
            
            // Show refactor results
            const panel = vscode.window.createWebviewPanel(
                'collaborativeRefactor',
                'Collaborative Refactor Results',
                vscode.ViewColumn.Beside,
                { enableScripts: true }
            );
            
            panel.webview.html = this.getCollaborativeRefactorHtml(execution);
            
        } catch (error) {
            console.error('Error in collaborative refactor:', error);
            vscode.window.showErrorMessage(`Collaborative refactor failed: ${error}`);
        }
    }
    
    private async handleCompareApproaches(): Promise<void> {
        const task = await vscode.window.showInputBox({
            prompt: 'What would you like to compare approaches for?',
            placeHolder: 'e.g., Implement user authentication, Optimize database queries'
        });
        
        if (!task) return;
        
        try {
            const currentSession = await this.sessionManager.getCurrentSession();
            if (!currentSession) {
                vscode.window.showWarningMessage('Please create or resume a session first');
                return;
            }
            
            const execution = await this.collaborativeExecutor.executeCollaboratively(
                task,
                { sessionId: currentSession.id },
                { type: 'competitive', description: 'Both models provide different approaches', phaseSequence: [] }
            );
            
            // Show comparison results
            const panel = vscode.window.createWebviewPanel(
                'approachComparison',
                'Approach Comparison',
                vscode.ViewColumn.Beside,
                { enableScripts: true }
            );
            
            panel.webview.html = this.getApproachComparisonHtml(execution);
            
        } catch (error) {
            console.error('Error comparing approaches:', error);
            vscode.window.showErrorMessage(`Approach comparison failed: ${error}`);
        }
    }
    
    // Enhanced Recovery Handlers
    
    private async handleCreateRecoveryPoint(): Promise<void> {
        try {
            const currentSession = await this.sessionManager.getCurrentSession();
            if (!currentSession) {
                vscode.window.showWarningMessage('No active session');
                return;
            }
            
            const description = await vscode.window.showInputBox({
                prompt: 'Enter description for recovery point',
                placeHolder: 'e.g., Before major refactor, After feature completion'
            });
            
            if (!description) return;
            
            await this.workRecoverySystem.createRecoveryPoint(
                currentSession.id,
                description
            );
            
            vscode.window.showInformationMessage('Recovery point created successfully!');
            
        } catch (error) {
            console.error('Error creating recovery point:', error);
            vscode.window.showErrorMessage(`Failed to create recovery point: ${error}`);
        }
    }
    
    private async handleRestoreFromRecovery(): Promise<void> {
        try {
            const currentSession = await this.sessionManager.getCurrentSession();
            if (!currentSession) {
                vscode.window.showWarningMessage('No active session');
                return;
            }
            
            const recoveryPoints = await this.workRecoverySystem.getRecoveryPoints(currentSession.id);
            
            if (recoveryPoints.length === 0) {
                vscode.window.showInformationMessage('No recovery points found for this session');
                return;
            }
            
            const pointOptions = recoveryPoints.map(point => ({
                label: point.description,
                description: point.timestamp.toLocaleString(),
                value: point.id
            }));
            
            const selectedPoint = await vscode.window.showQuickPick(pointOptions, {
                placeHolder: 'Select recovery point to restore from'
            });
            
            if (!selectedPoint) return;
            
            await this.workRecoverySystem.restoreFromPoint(selectedPoint.value);
            
        } catch (error) {
            console.error('Error restoring from recovery point:', error);
            vscode.window.showErrorMessage(`Failed to restore from recovery point: ${error}`);
        }
    }
    
    // Helper methods for webview content
    private getSessionHistoryHtml(session: any, insights: any): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Session History</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
                    .session-header { margin-bottom: 30px; }
                    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
                    .metric-card { background: var(--vscode-editor-background); padding: 15px; border-radius: 8px; border: 1px solid var(--vscode-panel-border); }
                    .recommendations { background: var(--vscode-input-background); padding: 15px; border-radius: 8px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="session-header">
                    <h1>${session.name}</h1>
                    <p>${session.description}</p>
                    <small>Created: ${session.createdAt.toLocaleString()}</small>
                </div>
                
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h3>Total Executions</h3>
                        <div class="metric-value">${insights.totalExecutions}</div>
                    </div>
                    <div class="metric-card">
                        <h3>Success Rate</h3>
                        <div class="metric-value">${(insights.successRate * 100).toFixed(1)}%</div>
                    </div>
                    <div class="metric-card">
                        <h3>Average Time</h3>
                        <div class="metric-value">${Math.round(insights.averageExecutionTime / 1000)}s</div>
                    </div>
                    <div class="metric-card">
                        <h3>Total Cost</h3>
                        <div class="metric-value">$${insights.totalCost.toFixed(4)}</div>
                    </div>
                </div>
                
                <div class="recommendations">
                    <h3>Recommendations</h3>
                    <ul>
                        ${insights.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            </body>
            </html>
        `;
    }
    
    private getCollaborationResultsHtml(execution: any): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Collaboration Results</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
                    .collaboration-header { margin-bottom: 30px; }
                    .contributions { margin-bottom: 30px; }
                    .contribution { background: var(--vscode-editor-background); padding: 15px; margin: 10px 0; border-radius: 8px; }
                    .consensus { background: var(--vscode-input-background); padding: 15px; border-radius: 8px; }
                </style>
            </head>
            <body>
                <div class="collaboration-header">
                    <h1>🤝 Collaboration Results</h1>
                    <p><strong>Task:</strong> ${execution.task}</p>
                    <p><strong>Confidence Score:</strong> ${(execution.confidenceScore * 100).toFixed(1)}%</p>
                </div>
                
                <div class="contributions">
                    <h2>Claude Contributions</h2>
                    ${execution.claudeContributions.map((c: any) => `
                        <div class="contribution">
                            <h4>${c.phase}</h4>
                            <p>${c.content}</p>
                            <small>Confidence: ${(c.confidence * 100).toFixed(1)}%</small>
                        </div>
                    `).join('')}
                    
                    <h2>Gemini Contributions</h2>
                    ${execution.geminiContributions.map((c: any) => `
                        <div class="contribution">
                            <h4>${c.phase}</h4>
                            <p>${c.content}</p>
                            <small>Confidence: ${(c.confidence * 100).toFixed(1)}%</small>
                        </div>
                    `).join('')}
                </div>
                
                <div class="consensus">
                    <h2>Final Consensus</h2>
                    <p><strong>Achieved:</strong> ${execution.consensus.achieved ? 'Yes' : 'No'}</p>
                    <h3>Agreements:</h3>
                    <ul>
                        ${execution.consensus.points.map((point: string) => `<li>${point}</li>`).join('')}
                    </ul>
                    <h3>Final Output:</h3>
                    <pre>${execution.finalOutput}</pre>
                </div>
            </body>
            </html>
        `;
    }
    
    private getCollaborativeDebugHtml(execution: any): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Collaborative Debug Results</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
                    .debug-results { background: var(--vscode-editor-background); padding: 20px; border-radius: 8px; }
                    .error-analysis { background: #fff0f0; padding: 15px; margin: 10px 0; border-radius: 8px; }
                    .solution { background: #f0fff0; padding: 15px; margin: 10px 0; border-radius: 8px; }
                </style>
            </head>
            <body>
                <h1>🔍 Collaborative Debug Results</h1>
                <div class="debug-results">
                    <h2>Analysis</h2>
                    ${execution.claudeContributions.map((c: any) => `
                        <div class="error-analysis">
                            <h4>${c.phase}</h4>
                            <p>${c.content}</p>
                        </div>
                    `).join('')}
                    
                    <h2>Solution</h2>
                    ${execution.geminiContributions.map((c: any) => `
                        <div class="solution">
                            <h4>${c.phase}</h4>
                            <p>${c.content}</p>
                        </div>
                    `).join('')}
                    
                    <h2>Final Debug Output</h2>
                    <pre>${execution.finalOutput}</pre>
                </div>
            </body>
            </html>
        `;
    }
    
    private getCollaborativeRefactorHtml(execution: any): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Collaborative Refactor Results</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
                    .refactor-results { background: var(--vscode-editor-background); padding: 20px; border-radius: 8px; }
                    .review { background: #fff8f0; padding: 15px; margin: 10px 0; border-radius: 8px; }
                    .refactored { background: #f0fff0; padding: 15px; margin: 10px 0; border-radius: 8px; }
                </style>
            </head>
            <body>
                <h1>🔄 Collaborative Refactor Results</h1>
                <div class="refactor-results">
                    <h2>Code Review</h2>
                    ${execution.claudeContributions.map((c: any) => `
                        <div class="review">
                            <h4>${c.phase}</h4>
                            <p>${c.content}</p>
                        </div>
                    `).join('')}
                    
                    <h2>Refactored Code</h2>
                    ${execution.geminiContributions.map((c: any) => `
                        <div class="refactored">
                            <h4>${c.phase}</h4>
                            <pre>${c.content}</pre>
                        </div>
                    `).join('')}
                    
                    <h2>Final Refactored Output</h2>
                    <pre>${execution.finalOutput}</pre>
                </div>
            </body>
            </html>
        `;
    }
    
    private getApproachComparisonHtml(execution: any): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Approach Comparison</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
                    .comparison { background: var(--vscode-editor-background); padding: 20px; border-radius: 8px; }
                    .approach { background: var(--vscode-input-background); padding: 15px; margin: 10px 0; border-radius: 8px; }
                    .claude-approach { border-left: 4px solid #0066cc; }
                    .gemini-approach { border-left: 4px solid #1a73e8; }
                </style>
            </head>
            <body>
                <h1>⚖️ Approach Comparison</h1>
                <div class="comparison">
                    <h2>Claude's Approach</h2>
                    ${execution.claudeContributions.map((c: any) => `
                        <div class="approach claude-approach">
                            <h4>${c.phase}</h4>
                            <p>${c.content}</p>
                        </div>
                    `).join('')}
                    
                    <h2>Gemini's Approach</h2>
                    ${execution.geminiContributions.map((c: any) => `
                        <div class="approach gemini-approach">
                            <h4>${c.phase}</h4>
                            <p>${c.content}</p>
                        </div>
                    `).join('')}
                    
                    <h2>Comparison Analysis</h2>
                    <div class="approach">
                        <h4>Agreements</h4>
                        <ul>
                            ${execution.consensus.points.map((point: string) => `<li>${point}</li>`).join('')}
                        </ul>
                        
                        <h4>Disagreements</h4>
                        <ul>
                            ${execution.consensus.disagreements.map((disagreement: string) => `<li>${disagreement}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <h2>Final Recommendation</h2>
                    <pre>${execution.finalOutput}</pre>
                </div>
            </body>
            </html>
        `;
    }
    
    /**
     * Cleanup method called when extension is deactivated
     */
    dispose(): void {
        console.log('🛑 Claude Gemini Assistant shutting down...');
        
        // Dispose of systems that need cleanup
        if (this.projectIntelligence) {
            this.projectIntelligence.dispose();
        }
        
        if (this.memoryAwareHook) {
            this.memoryAwareHook.dispose();
        }
        
        if (this.workRecoverySystem) {
            this.workRecoverySystem.dispose();
        }
        
        // Clear active workflows
        this.activeWorkflows.clear();
        
        console.log('✅ Claude Gemini Assistant shutdown complete');
    }
}

// Extension activation function - called when VS Code loads the extension
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('🚀 Activating Claude Gemini Assistant...');
    
    try {
        // Create and initialize the main assistant
        const assistant = new ClaudeGeminiAssistant(context);
        await assistant.initialize();
        
        // Store assistant instance for deactivation
        context.subscriptions.push({
            dispose: () => assistant.dispose()
        });
        
        console.log('✅ Claude Gemini Assistant activated successfully');
        
    } catch (error) {
        console.error('❌ Failed to activate Claude Gemini Assistant:', error);
        vscode.window.showErrorMessage(`Failed to activate assistant: ${error}`);
        throw error;
    }
}

// Extension deactivation function - called when VS Code unloads the extension
export function deactivate(): void {
    console.log('🛑 Claude Gemini Assistant deactivating...');
    // Cleanup is handled by the dispose methods registered in subscriptions
}
