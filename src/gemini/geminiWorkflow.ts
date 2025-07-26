import * as vscode from 'vscode';
import { 
    Workflow, 
    WorkflowStep, 
    StepResult, 
    WorkflowContext,
    WorkflowPreferences,
    WorkflowArtifact 
} from '../types/interfaces';
import { ClaudeCodeInterface } from '../claude/claudeCodeInterface';
import { ProjectIntelligence } from '../core/projectIntelligence';
import { MemorySystem } from '../core/memorySystem';

export class GeminiWorkflow {
    private currentWorkflow: Workflow | null = null;
    private workflowHistory: Workflow[] = [];
    private complexity: 'simple' | 'standard' | 'comprehensive' = 'standard';
    private isPaused: boolean = false;
    
    // Workflow templates
    private readonly workflowTemplates = {
        simple: {
            name: 'Simple Workflow',
            steps: [
                { id: '1', name: 'Understand', type: 'analysis', description: 'Understand the requirement' },
                { id: '2', name: 'Implement', type: 'implementation', description: 'Implement the solution' },
                { id: '3', name: 'Verify', type: 'validation', description: 'Verify the implementation' }
            ]
        },
        standard: {
            name: 'Standard Workflow',
            steps: [
                { id: '1', name: 'Analyze', type: 'analysis', description: 'Analyze requirements and context' },
                { id: '2', name: 'Design', type: 'analysis', description: 'Design the solution approach' },
                { id: '3', name: 'Implement', type: 'implementation', description: 'Implement the solution' },
                { id: '4', name: 'Test', type: 'validation', description: 'Test the implementation' },
                { id: '5', name: 'Review', type: 'review', description: 'Review and refine' }
            ]
        },
        comprehensive: {
            name: 'Comprehensive Workflow',
            steps: [
                { id: '1', name: 'Discovery', type: 'analysis', description: 'Discover requirements and constraints' },
                { id: '2', name: 'Research', type: 'analysis', description: 'Research existing solutions and patterns' },
                { id: '3', name: 'Architecture', type: 'analysis', description: 'Design system architecture' },
                { id: '4', name: 'Planning', type: 'analysis', description: 'Create implementation plan' },
                { id: '5', name: 'Setup', type: 'implementation', description: 'Set up project structure' },
                { id: '6', name: 'Core Implementation', type: 'implementation', description: 'Implement core functionality' },
                { id: '7', name: 'Integration', type: 'implementation', description: 'Integrate components' },
                { id: '8', name: 'Testing', type: 'validation', description: 'Comprehensive testing' },
                { id: '9', name: 'Documentation', type: 'implementation', description: 'Create documentation' },
                { id: '10', name: 'Review & Polish', type: 'review', description: 'Final review and polish' }
            ]
        }
    };

    constructor(
        private context: vscode.ExtensionContext,
        private claudeInterface: ClaudeCodeInterface,
        private projectIntelligence: ProjectIntelligence,
        private memorySystem: MemorySystem
    ) {
        this.loadWorkflowHistory();
    }

    async startWorkflow(goal?: string): Promise<void> {
        // Get user input for workflow goal if not provided
        if (!goal) {
            goal = await vscode.window.showInputBox({
                prompt: 'What would you like to accomplish?',
                placeHolder: 'Describe your goal or task...',
                ignoreFocusOut: true
            });

            if (!goal) {
                return;
            }
        }

        // Get project context
        const projectContext = await this.getProjectContext();

        // 🔥 NEW: Find similar past workflows and relevant patterns
        const similarWorkflows = await this.findSimilarWorkflows(goal);
        const relevantPatterns = await this.memorySystem.getLearnedPatterns()
            .then(patterns => patterns.filter(p => p.type === 'workflow'));

        // Create workflow context with memory
        const workflowContext: WorkflowContext = {
            goal: goal,
            constraints: await this.getConstraints(),
            preferences: await this.getPreferences(),
            projectContext: projectContext,
            previousExperiences: similarWorkflows,
            learnedPatterns: relevantPatterns
        };

        // Create new workflow
        const template = this.workflowTemplates[this.complexity];
        this.currentWorkflow = {
            id: this.generateId(),
            name: `${template.name}: ${goal.substring(0, 50)}`,
            description: goal,
            steps: this.enrichSteps(template.steps, workflowContext),
            currentStep: 0,
            status: 'planning',
            startTime: new Date(),
            context: workflowContext,
            results: []
        };

        // Show workflow plan
        const proceed = await this.showWorkflowPlan();
        if (!proceed) {
            this.currentWorkflow = null;
            return;
        }

        // Start execution
        this.currentWorkflow.status = 'executing';
        await this.executeWorkflow();
    }

    async executeStep(step: WorkflowStep): Promise<StepResult> {
        const startTime = Date.now();
        const result: StepResult = {
            stepId: step.id,
            status: 'success',
            output: '',
            duration: 0,
            timestamp: new Date(),
            artifacts: []
        };

        try {
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Executing: ${step.name}`,
                cancellable: true
            }, async (progress, token) => {
                // Check for cancellation
                token.onCancellationRequested(() => {
                    this.pauseWorkflow();
                });

                // Execute based on step type
                switch (step.type) {
                    case 'analysis':
                        result.output = await this.executeAnalysisStep(step, progress);
                        break;
                    case 'implementation':
                        result.output = await this.executeImplementationStep(step, progress);
                        break;
                    case 'validation':
                        result.output = await this.executeValidationStep(step, progress);
                        break;
                    case 'review':
                        result.output = await this.executeReviewStep(step, progress);
                        break;
                }

                // Extract artifacts
                result.artifacts = this.extractArtifacts(result.output);
            });

            result.duration = Date.now() - startTime;

            // Record in memory
            await this.memorySystem.recordExecution({
                input: `Workflow Step: ${step.name}`,
                context: this.currentWorkflow!.context.projectContext,
                result: result.output,
                timestamp: new Date(),
                tags: ['workflow', step.type, this.currentWorkflow!.name]
            });

        } catch (error: any) {
            result.status = 'failure';
            result.output = error.message;
            result.duration = Date.now() - startTime;
        }

        return result;
    }

    getCurrentWorkflow(): Workflow | null {
        return this.currentWorkflow;
    }

    getWorkflowHistory(): Workflow[] {
        return this.workflowHistory;
    }

    pauseWorkflow(): void {
        if (this.currentWorkflow && this.currentWorkflow.status === 'executing') {
            this.isPaused = true;
            this.currentWorkflow.status = 'paused';
            vscode.window.showInformationMessage('Workflow paused');
        }
    }

    resumeWorkflow(): void {
        if (this.currentWorkflow && this.currentWorkflow.status === 'paused') {
            this.isPaused = false;
            this.currentWorkflow.status = 'executing';
            this.executeWorkflow(); // Continue execution
        }
    }

    cancelWorkflow(): void {
        if (this.currentWorkflow) {
            this.currentWorkflow.status = 'failed';
            this.currentWorkflow.endTime = new Date();
            this.workflowHistory.push(this.currentWorkflow);
            this.currentWorkflow = null;
            this.saveWorkflowHistory();
            vscode.window.showWarningMessage('Workflow cancelled');
        }
    }

    setComplexity(level: 'simple' | 'standard' | 'comprehensive'): void {
        this.complexity = level;
    }

    private async executeWorkflow(): Promise<void> {
        if (!this.currentWorkflow) {
            return;
        }

        while (this.currentWorkflow.currentStep < this.currentWorkflow.steps.length) {
            if (this.isPaused) {
                return;
            }

            const step = this.currentWorkflow.steps[this.currentWorkflow.currentStep];
            
            // Check if user wants to continue
            if (this.currentWorkflow.context.preferences.reviewRequired && this.currentWorkflow.currentStep > 0) {
                const continueChoice = await vscode.window.showInformationMessage(
                    `Ready to execute: ${step.name}`,
                    'Continue',
                    'Skip',
                    'Cancel'
                );

                if (continueChoice === 'Cancel') {
                    this.cancelWorkflow();
                    return;
                } else if (continueChoice === 'Skip') {
                    this.currentWorkflow.results.push({
                        stepId: step.id,
                        status: 'skipped',
                        output: 'Step skipped by user',
                        duration: 0,
                        timestamp: new Date()
                    });
                    this.currentWorkflow.currentStep++;
                    continue;
                }
            }

            // Execute step
            const result = await this.executeStep(step);
            this.currentWorkflow.results.push(result);

            // Check for failure
            if (result.status === 'failure' && step.required) {
                vscode.window.showErrorMessage(`Step failed: ${step.name}`);
                this.currentWorkflow.status = 'failed';
                break;
            }

            this.currentWorkflow.currentStep++;
        }

        // Complete workflow
        if (this.currentWorkflow.currentStep >= this.currentWorkflow.steps.length) {
            this.currentWorkflow.status = 'completed';
            this.currentWorkflow.endTime = new Date();
            vscode.window.showInformationMessage('Workflow completed successfully!');
            
            // Show summary
            await this.showWorkflowSummary();
        }

        // Save to history
        this.workflowHistory.push(this.currentWorkflow);
        this.saveWorkflowHistory();
        this.currentWorkflow = null;
    }

    private async executeAnalysisStep(
        step: WorkflowStep, 
        progress: vscode.Progress<any>
    ): Promise<string> {
        progress.report({ message: 'Analyzing project context...' });
        
        const prompts = step.prompts || [
            `Analyze the project for: ${step.description}`,
            'Consider the current project structure and patterns',
            'Identify key requirements and constraints'
        ];

        const prompt = prompts.join('\n');
        const context = this.currentWorkflow!.context.projectContext;
        
        return await this.claudeInterface.executeWithContext(prompt, context);
    }

    private async executeImplementationStep(
        step: WorkflowStep,
        progress: vscode.Progress<any>
    ): Promise<string> {
        progress.report({ message: 'Implementing solution...' });
        
        // Get previous analysis results
        const previousResults = this.currentWorkflow!.results
            .filter(r => r.status === 'success')
            .map(r => r.output)
            .join('\n\n');

        const prompts = step.prompts || [
            `Implement: ${step.description}`,
            'Use the analysis from previous steps',
            'Follow project conventions and patterns',
            `Previous results:\n${previousResults}`
        ];

        const prompt = prompts.join('\n');
        const context = this.currentWorkflow!.context.projectContext;
        
        return await this.claudeInterface.executeWithContext(prompt, context);
    }

    private async executeValidationStep(
        step: WorkflowStep,
        progress: vscode.Progress<any>
    ): Promise<string> {
        progress.report({ message: 'Validating implementation...' });
        
        const prompts = step.prompts || [
            `Validate: ${step.description}`,
            'Check for errors and edge cases',
            'Verify against requirements',
            'Suggest improvements if needed'
        ];

        const prompt = prompts.join('\n');
        const context = this.currentWorkflow!.context.projectContext;
        
        return await this.claudeInterface.executeWithContext(prompt, context);
    }

    private async executeReviewStep(
        step: WorkflowStep,
        progress: vscode.Progress<any>
    ): Promise<string> {
        progress.report({ message: 'Reviewing results...' });
        
        const allResults = this.currentWorkflow!.results
            .map(r => `${r.stepId}: ${r.output.substring(0, 200)}...`)
            .join('\n\n');

        const prompts = step.prompts || [
            `Review: ${step.description}`,
            'Summarize what was accomplished',
            'Identify any remaining issues',
            'Suggest next steps',
            `All results:\n${allResults}`
        ];

        const prompt = prompts.join('\n');
        const context = this.currentWorkflow!.context.projectContext;
        
        return await this.claudeInterface.executeWithContext(prompt, context);
    }

    private enrichSteps(
        templateSteps: any[], 
        context: WorkflowContext
    ): WorkflowStep[] {
        return templateSteps.map(step => ({
            ...step,
            required: true,
            estimatedDuration: this.estimateStepDuration(step.type),
            prompts: this.generateStepPrompts(step, context)
        }));
    }

    private estimateStepDuration(type: string): number {
        const estimates: { [key: string]: number } = {
            'analysis': 30,
            'implementation': 120,
            'validation': 60,
            'review': 45
        };
        return estimates[type] || 60;
    }

    private generateStepPrompts(step: any, context: WorkflowContext): string[] {
        const prompts: string[] = [];
        
        // Add goal context
        prompts.push(`Goal: ${context.goal}`);
        
        // Add constraints
        if (context.constraints.length > 0) {
            prompts.push(`Constraints: ${context.constraints.join(', ')}`);
        }
        
        // Add project-specific context
        prompts.push(`Project Type: ${context.projectContext.projectType}`);
        if (context.projectContext.frameworks.length > 0) {
            prompts.push(`Frameworks: ${context.projectContext.frameworks.join(', ')}`);
        }
        
        return prompts;
    }

    private extractArtifacts(output: string): WorkflowArtifact[] {
        const artifacts: WorkflowArtifact[] = [];
        
        // Extract code blocks
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        while ((match = codeBlockRegex.exec(output)) !== null) {
            artifacts.push({
                type: 'code',
                content: match[2].trim()
            });
        }
        
        // Extract file paths mentioned
        const filePathRegex = /(?:file:|create|modify|update)\s+([^\s]+\.\w+)/gi;
        while ((match = filePathRegex.exec(output)) !== null) {
            artifacts.push({
                type: 'code',
                content: match[1],
                path: match[1]
            });
        }
        
        return artifacts;
    }

    private async getProjectContext(): Promise<any> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder open');
        }
        
        const activeEditor = vscode.window.activeTextEditor;
        const uri = activeEditor?.document.uri || workspaceFolder.uri;
        
        return await this.projectIntelligence.getContextForFile(uri);
    }

    private async getConstraints(): Promise<string[]> {
        const constraintsInput = await vscode.window.showInputBox({
            prompt: 'Any constraints or requirements? (comma-separated, optional)',
            placeHolder: 'e.g., TypeScript only, no external dependencies, must be fast',
            ignoreFocusOut: true
        });
        
        return constraintsInput ? constraintsInput.split(',').map(c => c.trim()) : [];
    }

    private async getPreferences(): Promise<WorkflowPreferences> {
        const config = vscode.workspace.getConfiguration('claude-assistant');
        return {
            complexity: this.complexity,
            autoExecute: true,
            reviewRequired: this.complexity !== 'simple',
            preserveContext: true
        };
    }

    private async showWorkflowPlan(): Promise<boolean> {
        if (!this.currentWorkflow) {
            return false;
        }

        const steps = this.currentWorkflow.steps
            .map((step, index) => `${index + 1}. ${step.name} - ${step.description}`)
            .join('\n');

        const message = `Workflow Plan:\n\n${steps}\n\nEstimated time: ${this.estimateTotalDuration()} minutes`;
        
        const choice = await vscode.window.showInformationMessage(
            message,
            { modal: true },
            'Proceed',
            'Cancel'
        );
        
        return choice === 'Proceed';
    }

    private async findSimilarWorkflows(goal: string): Promise<Workflow[]> {
        // Extract keywords from the goal
        const goalKeywords = this.extractKeywords(goal);
        
        return this.workflowHistory.filter(workflow => {
            // Check goal similarity
            const workflowKeywords = this.extractKeywords(workflow.description);
            const commonKeywords = goalKeywords.filter(keyword =>
                workflowKeywords.some(wk => wk.toLowerCase().includes(keyword.toLowerCase()))
            );
            
            // Return workflows with at least 2 common keywords or name similarity
            return commonKeywords.length >= 2 || 
                   workflow.name.toLowerCase().includes(goal.toLowerCase().substring(0, 20));
        }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
          .slice(0, 3); // Most recent 3 similar workflows
    }

    private extractKeywords(text: string): string[] {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3)
            .filter(word => !this.isStopWord(word))
            .slice(0, 10);
    }

    private isStopWord(word: string): boolean {
        const stopWords = [
            'this', 'that', 'with', 'have', 'will', 'from', 'they', 'been',
            'their', 'said', 'each', 'which', 'would', 'there', 'could',
            'other', 'after', 'first', 'well', 'also', 'where', 'much',
            'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like'
        ];
        return stopWords.includes(word);
    }

    private async showWorkflowSummary(): Promise<void> {
        if (!this.currentWorkflow) {
            return;
        }

        const duration = this.currentWorkflow.endTime 
            ? (this.currentWorkflow.endTime.getTime() - this.currentWorkflow.startTime.getTime()) / 1000 / 60
            : 0;

        const successfulSteps = this.currentWorkflow.results.filter(r => r.status === 'success').length;
        const failedSteps = this.currentWorkflow.results.filter(r => r.status === 'failure').length;
        const skippedSteps = this.currentWorkflow.results.filter(r => r.status === 'skipped').length;

        const summary = `
Workflow Complete!

Goal: ${this.currentWorkflow.context.goal}
Duration: ${duration.toFixed(1)} minutes
Steps: ${successfulSteps} successful, ${failedSteps} failed, ${skippedSteps} skipped

Artifacts generated: ${this.currentWorkflow.results.flatMap(r => r.artifacts || []).length}
        `.trim();

        await vscode.window.showInformationMessage(
            summary,
            { modal: true },
            'View Details',
            'Close'
        ).then(choice => {
            if (choice === 'View Details') {
                vscode.commands.executeCommand('claude-assistant.showWorkflowDetails', this.currentWorkflow);
            }
        });
    }

    private estimateTotalDuration(): number {
        if (!this.currentWorkflow) {
            return 0;
        }
        return this.currentWorkflow.steps.reduce((total, step) => 
            total + (step.estimatedDuration || 60), 0
        ) / 60;
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private async loadWorkflowHistory(): Promise<void> {
        try {
            const historyFile = vscode.Uri.joinPath(this.context.globalStorageUri, 'workflow-history.json');
            const data = await vscode.workspace.fs.readFile(historyFile);
            this.workflowHistory = JSON.parse(data.toString());
            
            // Convert date strings back to Date objects
            this.workflowHistory.forEach(workflow => {
                workflow.startTime = new Date(workflow.startTime);
                if (workflow.endTime) {
                    workflow.endTime = new Date(workflow.endTime);
                }
                workflow.results.forEach(result => {
                    result.timestamp = new Date(result.timestamp);
                });
            });
        } catch (error) {
            // File doesn't exist yet
            this.workflowHistory = [];
        }
    }

    private async saveWorkflowHistory(): Promise<void> {
        try {
            const historyFile = vscode.Uri.joinPath(this.context.globalStorageUri, 'workflow-history.json');
            await vscode.workspace.fs.writeFile(
                historyFile,
                Buffer.from(JSON.stringify(this.workflowHistory, null, 2), 'utf8')
            );
        } catch (error) {
            console.error('Failed to save workflow history:', error);
        }
    }
}