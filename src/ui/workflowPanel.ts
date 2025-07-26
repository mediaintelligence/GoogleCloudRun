// src/ui/workflowPanel.ts

import * as vscode from 'vscode';
import { GeminiWorkflowEngine } from '../core/geminiWorkflow';
import { ProjectIntelligenceSystem } from '../core/projectIntelligence';
import { 
    GeminiWorkflow, 
    WorkflowPhase, 
    ProjectIntelligence,
    WorkflowStatus,
    PhaseStatus 
} from '../types/interfaces';

/**
 * The WorkflowPanelProvider creates a sophisticated visual interface for
 * managing and monitoring Gemini workflows. Think of this panel as your
 * mission control center for systematic development processes - it shows
 * you exactly what phases your workflow will go through, tracks progress
 * in real-time, and gives you control over execution.
 * 
 * This panel demonstrates how complex, multi-phase development processes
 * can be made transparent and manageable through thoughtful UI design.
 * Rather than hiding the systematic methodology behind automation, we
 * make it visible so you can understand and guide the process.
 */
export class WorkflowPanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'claude-assistant.workflow';
    
    private extensionContext: vscode.ExtensionContext;
    private workflowEngine: GeminiWorkflowEngine;
    private projectIntelligence: ProjectIntelligenceSystem;
    private webviewView?: vscode.WebviewView;
    
    // State tracking
    private activeWorkflow?: GeminiWorkflow;
    private refreshTimer?: NodeJS.Timer;
    
    constructor(
        extensionContext: vscode.ExtensionContext,
        workflowEngine: GeminiWorkflowEngine,
        projectIntelligence: ProjectIntelligenceSystem
    ) {
        this.extensionContext = extensionContext;
        this.workflowEngine = workflowEngine;
        this.projectIntelligence = projectIntelligence;
    }
    
    /**
     * Called by VS Code when the webview is first created.
     * Sets up the webview with appropriate options and initial content.
     */
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void {
        this.webviewView = webviewView;
        
        // Configure webview options
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionContext.extensionUri]
        };
        
        // Set up message handling between webview and extension
        this.setupMessageHandling(webviewView);
        
        // Load initial content
        this.updateWebviewContent();
        
        // Set up periodic refresh
        this.startPeriodicRefresh();
        
        console.log('🖼️ Workflow panel initialized');
    }
    
    /**
     * Sets up bidirectional communication between the webview and our extension.
     * This allows the UI to trigger actions and receive updates from our systems.
     */
    private setupMessageHandling(webviewView: vscode.WebviewView): void {
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'startNewWorkflow':
                    await this.handleStartNewWorkflow();
                    break;
                
                case 'executeNextPhase':
                    await this.handleExecuteNextPhase(message.workflowId);
                    break;
                
                case 'pauseWorkflow':
                    await this.handlePauseWorkflow(message.workflowId);
                    break;
                
                case 'resumeWorkflow':
                    await this.handleResumeWorkflow(message.workflowId);
                    break;
                
                case 'showPhaseDetails':
                    await this.handleShowPhaseDetails(message.phaseId);
                    break;
                
                case 'refreshPanel':
                    await this.updateWebviewContent();
                    break;
                
                case 'exportWorkflowReport':
                    await this.handleExportWorkflowReport(message.workflowId);
                    break;
                
                default:
                    console.warn('Unknown message type:', message.type);
            }
        });
    }
    
    /**
     * Updates the active workflow being displayed in the panel.
     * This method ensures the UI stays synchronized with workflow state.
     */
    async updateActiveWorkflow(workflow: GeminiWorkflow): Promise<void> {
        this.activeWorkflow = workflow;
        await this.updateWebviewContent();
    }
    
    /**
     * Generates and updates the HTML content for the webview.
     * This method creates the complete UI that users interact with.
     */
    private async updateWebviewContent(): Promise<void> {
        if (!this.webviewView) return;
        
        try {
            // Get current project context
            const projectIntel = await this.projectIntelligence.getProjectIntelligence();
            
            // Build the complete HTML interface
            const html = await this.buildWorkflowPanelHTML(projectIntel);
            
            // Update webview content
            this.webviewView.webview.html = html;
            
        } catch (error) {
            console.error('Error updating workflow panel:', error);
            this.webviewView.webview.html = this.buildErrorHTML(error);
        }
    }
    
    /**
     * Builds the complete HTML interface for the workflow panel.
     * This method creates a sophisticated, interactive UI that makes
     * complex workflow management accessible and intuitive.
     */
    private async buildWorkflowPanelHTML(projectIntel: ProjectIntelligence | null): Promise<string> {
        const styles = this.buildCSS();
        const scripts = this.buildJavaScript();
        
        // Build different content based on whether we have an active workflow
        let mainContent: string;
        
        if (this.activeWorkflow) {
            mainContent = this.buildActiveWorkflowContent(this.activeWorkflow, projectIntel);
        } else {
            mainContent = this.buildWelcomeContent(projectIntel);
        }
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Workflow Panel</title>
    ${styles}
</head>
<body>
    <div class="workflow-panel">
        ${this.buildHeader()}
        ${mainContent}
        ${this.buildFooter()}
    </div>
    ${scripts}
</body>
</html>`;
    }
    
    /**
     * Builds the content for when there's an active workflow.
     * This shows detailed progress, phase information, and control options.
     */
    private buildActiveWorkflowContent(workflow: GeminiWorkflow, projectIntel: ProjectIntelligence | null): string {
        const progressPercentage = this.calculateWorkflowProgress(workflow);
        const currentPhase = workflow.phases[workflow.currentPhaseIndex];
        const statusColor = this.getStatusColor(workflow.status);
        
        return `
        <div class="active-workflow">
            <!-- Workflow Overview -->
            <div class="workflow-overview">
                <h2 class="workflow-title">${workflow.title}</h2>
                <p class="workflow-description">${workflow.description}</p>
                
                <div class="workflow-metadata">
                    <div class="metadata-item">
                        <span class="label">Status:</span>
                        <span class="status-badge ${workflow.status}" style="background-color: ${statusColor};">
                            ${this.formatStatus(workflow.status)}
                        </span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">Priority:</span>
                        <span class="priority-badge ${workflow.priority}">${workflow.priority}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">Complexity:</span>
                        <span class="complexity-badge ${workflow.complexity}">${workflow.complexity}</span>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div class="progress-section">
                    <div class="progress-header">
                        <span class="progress-label">Overall Progress</span>
                        <span class="progress-percentage">${Math.round(progressPercentage)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercentage}%;"></div>
                    </div>
                    <div class="progress-info">
                        Phase ${workflow.currentPhaseIndex + 1} of ${workflow.phases.length}
                        ${currentPhase ? `- ${currentPhase.name}` : ''}
                    </div>
                </div>
            </div>
            
            <!-- Current Phase Details -->
            ${currentPhase ? this.buildCurrentPhaseSection(currentPhase) : ''}
            
            <!-- Phases Timeline -->
            <div class="phases-timeline">
                <h3>Workflow Phases</h3>
                ${this.buildPhasesTimeline(workflow.phases, workflow.currentPhaseIndex)}
            </div>
            
            <!-- Action Controls -->
            <div class="action-controls">
                ${this.buildActionButtons(workflow)}
            </div>
            
            <!-- Execution History -->
            ${workflow.claudeCodeExecutions.length > 0 ? this.buildExecutionHistory(workflow) : ''}
        </div>`;
    }
    
    /**
     * Builds the current phase section showing detailed information
     * about what's currently being executed.
     */
    private buildCurrentPhaseSection(phase: WorkflowPhase): string {
        const phaseStatusColor = this.getPhaseStatusColor(phase.status);
        const timeInfo = this.formatPhaseTimeInfo(phase);
        
        return `
        <div class="current-phase-section">
            <h3>Current Phase</h3>
            <div class="phase-card current">
                <div class="phase-header">
                    <div class="phase-title-row">
                        <h4 class="phase-name">${phase.name}</h4>
                        <span class="phase-status-badge ${phase.status}" style="background-color: ${phaseStatusColor};">
                            ${this.formatPhaseStatus(phase.status)}
                        </span>
                    </div>
                    <p class="phase-description">${phase.description}</p>
                </div>
                
                <div class="phase-details">
                    <div class="phase-info">
                        <div class="info-item">
                            <span class="label">Type:</span>
                            <span class="value">${phase.type}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Time:</span>
                            <span class="value">${timeInfo}</span>
                        </div>
                    </div>
                    
                    ${phase.reviewCriteria.length > 0 ? `
                    <div class="review-criteria">
                        <h5>Success Criteria:</h5>
                        <ul>
                            ${phase.reviewCriteria.map(criteria => `<li>${criteria}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    
                    ${phase.actions.length > 0 ? `
                    <div class="phase-actions">
                        <h5>Actions in this Phase:</h5>
                        <ul>
                            ${phase.actions.map(action => `
                                <li>
                                    <span class="action-name">${action.name}</span>
                                    <span class="action-type">(${action.type})</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>`;
    }
    
    /**
     * Builds a visual timeline showing all phases and their status.
     * This gives users a clear overview of the entire workflow process.
     */
    private buildPhasesTimeline(phases: WorkflowPhase[], currentPhaseIndex: number): string {
        return `
        <div class="timeline">
            ${phases.map((phase, index) => {
                const isCompleted = index < currentPhaseIndex;
                const isCurrent = index === currentPhaseIndex;
                const isPending = index > currentPhaseIndex;
                
                let phaseClass = 'timeline-item';
                if (isCompleted) phaseClass += ' completed';
                if (isCurrent) phaseClass += ' current';
                if (isPending) phaseClass += ' pending';
                
                return `
                <div class="${phaseClass}" data-phase-id="${phase.id}">
                    <div class="timeline-marker">
                        <div class="marker-circle">
                            ${isCompleted ? '✓' : (isCurrent ? '●' : '○')}
                        </div>
                        ${index < phases.length - 1 ? '<div class="marker-line"></div>' : ''}
                    </div>
                    <div class="timeline-content">
                        <h5 class="timeline-title">${phase.name}</h5>
                        <p class="timeline-description">${phase.description}</p>
                        <div class="timeline-meta">
                            <span class="phase-type">${phase.type}</span>
                            <span class="estimated-time">${this.formatDuration(phase.estimatedDuration)}</span>
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    }
    
    /**
     * Builds action buttons based on current workflow state.
     * Different buttons are available depending on what's appropriate.
     */
    private buildActionButtons(workflow: GeminiWorkflow): string {
        const buttons = [];
        
        if (workflow.status === 'paused' || workflow.status === 'planning') {
            buttons.push(`
                <button class="action-btn primary" onclick="executeNextPhase('${workflow.id}')">
                    <span class="btn-icon">▶</span>
                    Start/Resume Execution
                </button>
            `);
        }
        
        if (workflow.status === 'executing') {
            buttons.push(`
                <button class="action-btn secondary" onclick="pauseWorkflow('${workflow.id}')">
                    <span class="btn-icon">⏸</span>
                    Pause Workflow
                </button>
            `);
        }
        
        buttons.push(`
            <button class="action-btn tertiary" onclick="exportWorkflowReport('${workflow.id}')">
                <span class="btn-icon">📊</span>
                Export Report
            </button>
        `);
        
        buttons.push(`
            <button class="action-btn tertiary" onclick="refreshPanel()">
                <span class="btn-icon">🔄</span>
                Refresh
            </button>
        `);
        
        return `<div class="button-group">${buttons.join('')}</div>`;
    }
    
    /**
     * Builds the welcome content shown when no workflow is active.
     * This encourages users to start new workflows and shows project context.
     */
    private buildWelcomeContent(projectIntel: ProjectIntelligence | null): string {
        return `
        <div class="welcome-content">
            <div class="welcome-header">
                <h2>🤖 Claude Gemini Assistant</h2>
                <p>Ready to help you build software systematically</p>
            </div>
            
            ${projectIntel ? `
            <div class="project-overview">
                <h3>Current Project</h3>
                <div class="project-card">
                    <h4>${projectIntel.name}</h4>
                    <div class="project-details">
                        <div class="detail-item">
                            <span class="label">Type:</span>
                            <span class="value">${projectIntel.projectType}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Language:</span>
                            <span class="value">${projectIntel.technologies.primaryLanguage}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Architecture:</span>
                            <span class="value">${projectIntel.architecture.primaryPattern}</span>
                        </div>
                    </div>
                </div>
            </div>
            ` : `
            <div class="no-project">
                <p>No workspace is currently open. Open a project folder to get started.</p>
            </div>
            `}
            
            <div class="quick-start">
                <h3>Get Started</h3>
                <button class="action-btn primary large" onclick="startNewWorkflow()">
                    <span class="btn-icon">🚀</span>
                    Start New Workflow
                </button>
                
                <div class="workflow-examples">
                    <h4>Common Workflows:</h4>
                    <ul>
                        <li>🔧 Add new feature or component</li>
                        <li>🐛 Debug and fix issues</li>
                        <li>♻️ Refactor existing code</li>
                        <li>🧪 Add or improve testing</li>
                        <li>📚 Update documentation</li>
                        <li>⚡ Optimize performance</li>
                    </ul>
                </div>
            </div>
        </div>`;
    }
    
    /**
     * Builds comprehensive CSS styles for the workflow panel.
     * These styles create a modern, professional interface that's easy to use.
     */
    private buildCSS(): string {
        return `
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                line-height: 1.4;
                color: var(--vscode-foreground);
                background-color: var(--vscode-sideBar-background);
            }
            
            .workflow-panel {
                padding: 16px;
                height: 100vh;
                overflow-y: auto;
            }
            
            /* Header Styles */
            .panel-header {
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid var(--vscode-sideBar-border);
            }
            
            .panel-title {
                font-size: 16px;
                font-weight: 600;
                color: var(--vscode-foreground);
                margin-bottom: 4px;
            }
            
            .panel-subtitle {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
            }
            
            /* Workflow Overview Styles */
            .workflow-overview {
                margin-bottom: 24px;
                padding: 16px;
                background-color: var(--vscode-editor-background);
                border-radius: 6px;
                border: 1px solid var(--vscode-sideBar-border);
            }
            
            .workflow-title {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 8px;
                color: var(--vscode-foreground);
            }
            
            .workflow-description {
                font-size: 13px;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 16px;
                line-height: 1.5;
            }
            
            .workflow-metadata {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-bottom: 16px;
            }
            
            .metadata-item {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .label {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
                font-weight: 500;
            }
            
            .status-badge, .priority-badge, .complexity-badge {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 500;
                color: white;
            }
            
            .status-badge.executing { background-color: #007acc; }
            .status-badge.paused { background-color: #f9b232; }
            .status-badge.completed { background-color: #388a34; }
            .status-badge.planning { background-color: #6c6c6c; }
            
            .priority-badge.high { background-color: #e74c3c; }
            .priority-badge.medium { background-color: #f39c12; }
            .priority-badge.low { background-color: #95a5a6; }
            
            .complexity-badge.simple { background-color: #27ae60; }
            .complexity-badge.moderate { background-color: #f39c12; }
            .complexity-badge.complex { background-color: #e67e22; }
            .complexity-badge.advanced { background-color: #e74c3c; }
            
            /* Progress Bar Styles */
            .progress-section {
                margin-top: 16px;
            }
            
            .progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .progress-label {
                font-size: 12px;
                font-weight: 500;
                color: var(--vscode-foreground);
            }
            
            .progress-percentage {
                font-size: 12px;
                font-weight: 600;
                color: var(--vscode-charts-blue);
            }
            
            .progress-bar {
                width: 100%;
                height: 6px;
                background-color: var(--vscode-progressBar-background);
                border-radius: 3px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background-color: var(--vscode-progressBar-foreground);
                transition: width 0.3s ease;
            }
            
            .progress-info {
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
                margin-top: 4px;
            }
            
            /* Phase Styles */
            .current-phase-section {
                margin-bottom: 24px;
            }
            
            .phase-card {
                background-color: var(--vscode-editor-background);
                border: 1px solid var(--vscode-sideBar-border);
                border-radius: 6px;
                padding: 16px;
            }
            
            .phase-card.current {
                border-color: var(--vscode-charts-blue);
                box-shadow: 0 0 0 1px var(--vscode-charts-blue);
            }
            
            .phase-header {
                margin-bottom: 12px;
            }
            
            .phase-title-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .phase-name {
                font-size: 14px;
                font-weight: 600;
                color: var(--vscode-foreground);
            }
            
            .phase-status-badge {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 500;
                color: white;
            }
            
            .phase-description {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
                line-height: 1.4;
            }
            
            /* Timeline Styles */
            .phases-timeline {
                margin-bottom: 24px;
            }
            
            .timeline {
                margin-top: 16px;
            }
            
            .timeline-item {
                display: flex;
                gap: 12px;
                margin-bottom: 16px;
                opacity: 0.6;
                transition: opacity 0.2s;
            }
            
            .timeline-item.completed {
                opacity: 1;
            }
            
            .timeline-item.current {
                opacity: 1;
            }
            
            .timeline-item:hover {
                opacity: 1;
                cursor: pointer;
            }
            
            .timeline-marker {
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 24px;
            }
            
            .marker-circle {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                background-color: var(--vscode-sideBar-border);
                color: var(--vscode-foreground);
                margin-bottom: 4px;
            }
            
            .timeline-item.completed .marker-circle {
                background-color: var(--vscode-charts-green);
                color: white;
            }
            
            .timeline-item.current .marker-circle {
                background-color: var(--vscode-charts-blue);
                color: white;
            }
            
            .marker-line {
                width: 2px;
                height: 32px;
                background-color: var(--vscode-sideBar-border);
            }
            
            .timeline-content {
                flex: 1;
                min-width: 0;
            }
            
            .timeline-title {
                font-size: 13px;
                font-weight: 500;
                margin-bottom: 4px;
                color: var(--vscode-foreground);
            }
            
            .timeline-description {
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
                line-height: 1.3;
                margin-bottom: 6px;
            }
            
            .timeline-meta {
                display: flex;
                gap: 12px;
                font-size: 10px;
                color: var(--vscode-descriptionForeground);
            }
            
            /* Button Styles */
            .action-controls {
                margin-bottom: 24px;
            }
            
            .button-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .action-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                min-height: 32px;
            }
            
            .action-btn.primary {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
            }
            
            .action-btn.primary:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            
            .action-btn.secondary {
                background-color: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
            }
            
            .action-btn.secondary:hover {
                background-color: var(--vscode-button-secondaryHoverBackground);
            }
            
            .action-btn.tertiary {
                background-color: transparent;
                color: var(--vscode-foreground);
                border: 1px solid var(--vscode-sideBar-border);
            }
            
            .action-btn.tertiary:hover {
                background-color: var(--vscode-list-hoverBackground);
            }
            
            .action-btn.large {
                padding: 12px 24px;
                font-size: 14px;
                min-height: 40px;
            }
            
            .btn-icon {
                font-size: 14px;
            }
            
            /* Welcome Content Styles */
            .welcome-content {
                text-align: center;
            }
            
            .welcome-header {
                margin-bottom: 32px;
            }
            
            .welcome-header h2 {
                font-size: 20px;
                margin-bottom: 8px;
                color: var(--vscode-foreground);
            }
            
            .welcome-header p {
                color: var(--vscode-descriptionForeground);
                font-size: 14px;
            }
            
            .project-overview {
                margin-bottom: 32px;
                text-align: left;
            }
            
            .project-card {
                background-color: var(--vscode-editor-background);
                border: 1px solid var(--vscode-sideBar-border);
                border-radius: 6px;
                padding: 16px;
                margin-top: 12px;
            }
            
            .project-card h4 {
                margin-bottom: 12px;
                color: var(--vscode-foreground);
            }
            
            .project-details {
                display: grid;
                gap: 8px;
            }
            
            .detail-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .quick-start {
                text-align: left;
            }
            
            .workflow-examples {
                margin-top: 24px;
                padding: 16px;
                background-color: var(--vscode-editor-background);
                border-radius: 6px;
                border: 1px solid var(--vscode-sideBar-border);
            }
            
            .workflow-examples h4 {
                margin-bottom: 12px;
                font-size: 13px;
                color: var(--vscode-foreground);
            }
            
            .workflow-examples ul {
                list-style: none;
                padding: 0;
            }
            
            .workflow-examples li {
                padding: 4px 0;
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
            }
            
            /* Utility Classes */
            .text-center { text-align: center; }
            .mb-16 { margin-bottom: 16px; }
            .mb-24 { margin-bottom: 24px; }
            
            /* Responsive adjustments */
            @media (max-width: 300px) {
                .workflow-metadata {
                    grid-template-columns: 1fr;
                }
                
                .phase-title-row {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }
            }
        </style>`;
    }
    
    /**
     * Builds JavaScript for interactive functionality in the webview.
     */
    private buildJavaScript(): string {
        return `
        <script>
            const vscode = acquireVsCodeApi();
            
            function startNewWorkflow() {
                vscode.postMessage({ type: 'startNewWorkflow' });
            }
            
            function executeNextPhase(workflowId) {
                vscode.postMessage({ 
                    type: 'executeNextPhase', 
                    workflowId: workflowId 
                });
            }
            
            function pauseWorkflow(workflowId) {
                vscode.postMessage({ 
                    type: 'pauseWorkflow', 
                    workflowId: workflowId 
                });
            }
            
            function resumeWorkflow(workflowId) {
                vscode.postMessage({ 
                    type: 'resumeWorkflow', 
                    workflowId: workflowId 
                });
            }
            
            function refreshPanel() {
                vscode.postMessage({ type: 'refreshPanel' });
            }
            
            function exportWorkflowReport(workflowId) {
                vscode.postMessage({ 
                    type: 'exportWorkflowReport', 
                    workflowId: workflowId 
                });
            }
            
            function showPhaseDetails(phaseId) {
                vscode.postMessage({ 
                    type: 'showPhaseDetails', 
                    phaseId: phaseId 
                });
            }
            
            // Add click handlers for timeline items
            document.addEventListener('DOMContentLoaded', function() {
                const timelineItems = document.querySelectorAll('.timeline-item');
                timelineItems.forEach(item => {
                    item.addEventListener('click', function() {
                        const phaseId = this.getAttribute('data-phase-id');
                        if (phaseId) {
                            showPhaseDetails(phaseId);
                        }
                    });
                });
            });
        </script>`;
    }
    
    /**
     * Helper methods for UI generation and formatting
     */
    
    private buildHeader(): string {
        return `
        <div class="panel-header">
            <h1 class="panel-title">Workflow Manager</h1>
            <p class="panel-subtitle">Systematic development with Claude</p>
        </div>`;
    }
    
    private buildFooter(): string {
        return `
        <div class="panel-footer">
            <p style="font-size: 11px; color: var(--vscode-descriptionForeground); text-align: center; margin-top: 24px;">
                Claude Gemini Assistant • Following systematic development methodology
            </p>
        </div>`;
    }
    
    private buildErrorHTML(error: any): string {
        return `
        <div style="padding: 20px; text-align: center;">
            <h3 style="color: var(--vscode-errorForeground);">Error Loading Workflow Panel</h3>
            <p style="color: var(--vscode-descriptionForeground); margin: 16px 0;">
                ${error?.message || 'An unknown error occurred'}
            </p>
            <button onclick="refreshPanel()" style="padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;">
                Retry
            </button>
        </div>`;
    }
    
    private calculateWorkflowProgress(workflow: GeminiWorkflow): number {
        if (workflow.phases.length === 0) return 0;
        return (workflow.currentPhaseIndex / workflow.phases.length) * 100;
    }
    
    private getStatusColor(status: WorkflowStatus): string {
        const colors = {
            'planning': '#6c6c6c',
            'analyzing': '#007acc',
            'executing': '#007acc',
            'reviewing': '#f9b232',
            'completed': '#388a34',
            'paused': '#f9b232',
            'cancelled': '#e74c3c'
        };
        return colors[status] || '#6c6c6c';
    }
    
    private getPhaseStatusColor(status: PhaseStatus): string {
        const colors = {
            'pending': '#6c6c6c',
            'in-progress': '#007acc',
            'completed': '#388a34',
            'requires-review': '#f9b232',
            'blocked': '#e74c3c'
        };
        return colors[status] || '#6c6c6c';
    }
    
    private formatStatus(status: WorkflowStatus): string {
        return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
    }
    
    private formatPhaseStatus(status: PhaseStatus): string {
        return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
    }
    
    private formatPhaseTimeInfo(phase: WorkflowPhase): string {
        if (phase.actualDuration) {
            return `Completed in ${this.formatDuration(phase.actualDuration)}`;
        } else if (phase.startedAt) {
            const elapsed = Date.now() - phase.startedAt.getTime();
            return `Running for ${this.formatDuration(elapsed)}`;
        } else {
            return `Estimated: ${this.formatDuration(phase.estimatedDuration)}`;
        }
    }
    
    private formatDuration(ms: number): string {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    private buildExecutionHistory(workflow: GeminiWorkflow): string {
        // Would build a section showing Claude Code execution history
        return `
        <div class="execution-history">
            <h3>Execution History</h3>
            <p style="color: var(--vscode-descriptionForeground); font-size: 12px;">
                ${workflow.claudeCodeExecutions.length} Claude Code executions completed
            </p>
        </div>`;
    }
    
    private startPeriodicRefresh(): void {
        // Refresh the panel every 30 seconds when there's an active workflow
        this.refreshTimer = setInterval(() => {
            if (this.activeWorkflow && this.activeWorkflow.status === 'executing') {
                this.updateWebviewContent();
            }
        }, 30000);
    }
    
    // Message handlers for webview interactions
    private async handleStartNewWorkflow(): Promise<void> {
        await vscode.commands.executeCommand('claude-assistant.startGeminiWorkflow');
    }
    
    private async handleExecuteNextPhase(workflowId: string): Promise<void> {
        // Would trigger next phase execution
        console.log('Execute next phase for workflow:', workflowId);
    }
    
    private async handlePauseWorkflow(workflowId: string): Promise<void> {
        // Would pause workflow execution
        console.log('Pause workflow:', workflowId);
    }
    
    private async handleResumeWorkflow(workflowId: string): Promise<void> {
        // Would resume workflow execution
        console.log('Resume workflow:', workflowId);
    }
    
    private async handleShowPhaseDetails(phaseId: string): Promise<void> {
        // Would show detailed phase information
        console.log('Show phase details:', phaseId);
    }
    
    private async handleExportWorkflowReport(workflowId: string): Promise<void> {
        // Would export workflow report
        console.log('Export workflow report:', workflowId);
    }
    
    /**
     * Cleanup method
     */
    dispose(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
    }
}