// src/extension.ts

import * as vscode from 'vscode';

// Core system imports
import { ProjectIntelligenceSystem } from './core/projectIntelligenceSystem';
import { MemorySystem } from './core/memorySystem';
import { GeminiWorkflowEngine } from './core/geminiWorkflow';
import { ClaudeCodeInterface } from './core/claudeCodeInterface';

// Intelligent systems imports
import { IntelligentTriggers } from './hooks/intelligentTriggers';

// UI components imports
import { WorkflowPanelProvider } from './ui/workflowPanel';
import { ContextViewer } from './ui/contextViewer';
import { ProjectContextProvider } from './ui/contextTreeProvider';

// Type imports
import { 
    GeminiWorkflow, 
    ProjectIntelligence, 
    WorkflowPriority,
    ExecutionContext 
} from './types/interfaces';

/**
 * The main extension entry point that orchestrates our sophisticated
 * development assistant. This class serves as the conductor that coordinates
 * all our intelligent systems - Project Intelligence, Memory, Workflow Engine,
 * and Intelligent Triggers - into a cohesive development environment.
 * 
 * Think of this as the command center that ensures all components work
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
    
    // Intelligent systems
    private intelligentTriggers!: IntelligentTriggers;
    
    // UI providers
    private workflowPanelProvider!: WorkflowPanelProvider;
    private contextViewer!: ContextViewer;
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
        this.claudeCodeInterface = new ClaudeCodeInterface(this.extensionContext);
        
        console.log('🏗️ Initializing Gemini Workflow Engine...');
        this.workflowEngine = new GeminiWorkflowEngine(
            this.extensionContext,
            this.claudeCodeInterface,
            this.memorySystem
        );
    }
    
    /**
     * Initializes intelligent systems that provide proactive assistance.
     */
    private async initializeIntelligentSystems(): Promise<void> {
        console.log('🧩 Initializing Intelligent Triggers System...');
        this.intelligentTriggers = new IntelligentTriggers(
            this.extensionContext,
            this.workflowEngine,
            this.memorySystem,
            this.projectIntelligence
        );
    }
    
    /**
     * Initializes UI components that provide visual interfaces for our systems.
     */
    private async initializeUIComponents(): Promise<void> {
        console.log('🖼️ Initializing UI Components...');
        
        this.workflowPanelProvider = new WorkflowPanelProvider(
            this.extensionContext,
            this.workflowEngine,
            this.projectIntelligence
        );
        
        this.contextViewer = new ContextViewer(
            this.extensionContext,
            this.projectIntelligence,
            this.memorySystem
        );
        
        this.contextProvider = new ProjectContextProvider(
            this.extensionContext,
            this.projectIntelligence,
            this.memorySystem
        );
        
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
            // Primary workflow commands
            {
                id: 'claude-assistant.startGeminiWorkflow',
                handler: () => this.handleStartGeminiWorkflow()
            },
            {
                id: 'claude-assistant.executeWithContext',
                handler: () => this.handleExecuteWithContext()
            },
            {
                id: 'claude-assistant.analyzeProject',
                handler: () => this.handleAnalyzeProject()
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
                    const message = [
                        `Project: ${projectIntel.name}`,
                        `Type: ${projectIntel.projectType}`,
                        `Architecture: ${projectIntel.architecture.primaryPattern}`,
                        `Primary Language: ${projectIntel.technologies.primaryLanguage}`,
                        `Quality Score: ${Math.round(projectIntel.codeQuality.codeComplexity * 10)}/10`
                    ].join('\n');
                    
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
     * Helper methods for command handling and system coordination
     */
    
    private async buildExecutionContext(
        projectIntel: ProjectIntelligence,
        instruction: string
    ): Promise<ExecutionContext> {
        // Get relevant memories
        const relevantMemories = await this.memorySystem.getRelevantMemories(
            instruction,
            projectIntel,
            5
        );
        
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
    
    private generateSuccessCriteria(instruction: string): string[] {
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
    
    private async createMockPhase(instruction: string): Promise<any> {
        return {
            id: 'mock_phase_' + Date.now(),
            name: 'Direct Execution',
            description: instruction,
            type: 'implementation',
            status: 'in-progress'
        };
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