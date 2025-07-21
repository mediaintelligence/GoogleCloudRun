import * as vscode from 'vscode';
import { Workflow, WorkflowStep, StepResult } from '../types/interfaces';
import { GeminiWorkflow } from '../core/geminiWorkflow';

export class WorkflowPanel implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _currentWorkflow?: Workflow;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly geminiWorkflow: GeminiWorkflow
    ) {}

    public async show(): Promise<void> {
        if (this._view) {
            this._view.show?.(true);
        } else {
            // Create new webview panel
            const panel = vscode.window.createWebviewPanel(
                'claudeWorkflow',
                'Claude Assistant Workflow',
                vscode.ViewColumn.Two,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            panel.webview.html = this._getHtmlForWebview(panel.webview);
            this._setupMessageHandling(panel.webview);
        }
    }

    public update(workflow: Workflow): void {
        this._currentWorkflow = workflow;
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateWorkflow',
                workflow: this._serializeWorkflow(workflow)
            });
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        this._setupMessageHandling(webviewView.webview);

        // Update with current workflow if exists
        const currentWorkflow = this.geminiWorkflow.getCurrentWorkflow();
        if (currentWorkflow) {
            this.update(currentWorkflow);
        }
    }

    public dispose(): void {
        this._view = undefined;
    }

    private _setupMessageHandling(webview: vscode.Webview): void {
        webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'startWorkflow':
                        await vscode.commands.executeCommand('claude-assistant.startGeminiWorkflow');
                        break;
                    case 'pauseWorkflow':
                        this.geminiWorkflow.pauseWorkflow();
                        break;
                    case 'resumeWorkflow':
                        this.geminiWorkflow.resumeWorkflow();
                        break;
                    case 'cancelWorkflow':
                        this.geminiWorkflow.cancelWorkflow();
                        break;
                    case 'viewStepDetails':
                        this._showStepDetails(message.stepId);
                        break;
                    case 'exportWorkflow':
                        await this._exportWorkflow();
                        break;
                }
            },
            null,
            this.context.subscriptions
        );
    }

    private _showStepDetails(stepId: string): void {
        if (!this._currentWorkflow) {
            return;
        }

        const step = this._currentWorkflow.steps.find(s => s.id === stepId);
        const result = this._currentWorkflow.results.find(r => r.stepId === stepId);

        if (step && result) {
            const panel = vscode.window.createWebviewPanel(
                'stepDetails',
                `Step: ${step.name}`,
                vscode.ViewColumn.Beside,
                { enableScripts: true }
            );

            panel.webview.html = this._getStepDetailsHtml(step, result);
        }
    }

    private async _exportWorkflow(): Promise<void> {
        if (!this._currentWorkflow) {
            return;
        }

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(`workflow-${Date.now()}.json`),
            filters: {
                'JSON': ['json']
            }
        });

        if (uri) {
            const content = JSON.stringify(this._currentWorkflow, null, 2);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            vscode.window.showInformationMessage('Workflow exported successfully');
        }
    }

    private _serializeWorkflow(workflow: Workflow): any {
        return {
            ...workflow,
            startTime: workflow.startTime.toISOString(),
            endTime: workflow.endTime?.toISOString(),
            results: workflow.results.map(r => ({
                ...r,
                timestamp: r.timestamp.toISOString()
            }))
        };
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'workflow.css')
        );
        
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'workflow.js')
        );

        const nonce = this._getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Claude Assistant Workflow</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            overflow-x: hidden;
        }

        .workflow-container {
            max-width: 100%;
        }

        .workflow-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .workflow-title {
            font-size: 18px;
            font-weight: bold;
        }

        .workflow-actions {
            display: flex;
            gap: 10px;
        }

        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 14px;
            cursor: pointer;
            border-radius: 2px;
            font-size: 13px;
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .workflow-progress {
            margin: 20px 0;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background-color: var(--vscode-progressBar-background);
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background-color: var(--vscode-progressBar-foreground);
            transition: width 0.3s ease;
        }

        .workflow-steps {
            margin-top: 20px;
        }

        .step {
            display: flex;
            align-items: center;
            padding: 12px;
            margin-bottom: 8px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .step:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .step.active {
            background-color: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
        }

        .step.completed {
            opacity: 0.8;
        }

        .step-icon {
            width: 24px;
            height: 24px;
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            font-size: 14px;
        }

        .step-icon.pending {
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-placeholderForeground);
        }

        .step-icon.active {
            background-color: var(--vscode-progressBar-foreground);
            color: var(--vscode-editor-background);
        }

        .step-icon.completed {
            background-color: var(--vscode-terminal-ansiGreen);
            color: var(--vscode-editor-background);
        }

        .step-icon.failed {
            background-color: var(--vscode-terminal-ansiRed);
            color: var(--vscode-editor-background);
        }

        .step-icon.skipped {
            background-color: var(--vscode-terminal-ansiYellow);
            color: var(--vscode-editor-background);
        }

        .step-content {
            flex: 1;
        }

        .step-name {
            font-weight: bold;
            margin-bottom: 4px;
        }

        .step-description {
            font-size: 12px;
            opacity: 0.8;
        }

        .step-duration {
            font-size: 11px;
            opacity: 0.6;
            margin-left: auto;
        }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            opacity: 0.6;
        }

        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }

        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .status-badge.planning {
            background-color: var(--vscode-terminal-ansiBlue);
            color: var(--vscode-editor-background);
        }

        .status-badge.executing {
            background-color: var(--vscode-progressBar-foreground);
            color: var(--vscode-editor-background);
        }

        .status-badge.paused {
            background-color: var(--vscode-terminal-ansiYellow);
            color: var(--vscode-editor-background);
        }

        .status-badge.completed {
            background-color: var(--vscode-terminal-ansiGreen);
            color: var(--vscode-editor-background);
        }

        .status-badge.failed {
            background-color: var(--vscode-terminal-ansiRed);
            color: var(--vscode-editor-background);
        }
    </style>
</head>
<body>
    <div class="workflow-container">
        <div id="empty-state" class="empty-state">
            <div class="empty-state-icon">🚀</div>
            <div>No active workflow</div>
            <button onclick="startWorkflow()" style="margin-top: 16px;">Start New Workflow</button>
        </div>
        
        <div id="workflow-content" style="display: none;">
            <div class="workflow-header">
                <div>
                    <div class="workflow-title" id="workflow-title">Workflow</div>
                    <span class="status-badge" id="workflow-status"></span>
                </div>
                <div class="workflow-actions">
                    <button id="pause-btn" onclick="pauseWorkflow()">Pause</button>
                    <button id="resume-btn" onclick="resumeWorkflow()" style="display: none;">Resume</button>
                    <button id="cancel-btn" onclick="cancelWorkflow()">Cancel</button>
                    <button id="export-btn" onclick="exportWorkflow()">Export</button>
                </div>
            </div>

            <div class="workflow-progress">
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill"></div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px;">
                    <span id="progress-text">0 of 0 steps completed</span>
                    <span id="duration-text">Duration: 0m</span>
                </div>
            </div>

            <div class="workflow-steps" id="workflow-steps">
                <!-- Steps will be rendered here -->
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        let currentWorkflow = null;
        let updateTimer = null;

        function startWorkflow() {
            vscode.postMessage({ command: 'startWorkflow' });
        }

        function pauseWorkflow() {
            vscode.postMessage({ command: 'pauseWorkflow' });
        }

        function resumeWorkflow() {
            vscode.postMessage({ command: 'resumeWorkflow' });
        }

        function cancelWorkflow() {
            vscode.postMessage({ command: 'cancelWorkflow' });
        }

        function exportWorkflow() {
            vscode.postMessage({ command: 'exportWorkflow' });
        }

        function viewStepDetails(stepId) {
            vscode.postMessage({ command: 'viewStepDetails', stepId: stepId });
        }

        function updateWorkflowUI(workflow) {
            currentWorkflow = workflow;
            
            // Show/hide appropriate sections
            document.getElementById('empty-state').style.display = 'none';
            document.getElementById('workflow-content').style.display = 'block';

            // Update header
            document.getElementById('workflow-title').textContent = workflow.name;
            const statusBadge = document.getElementById('workflow-status');
            statusBadge.textContent = workflow.status;
            statusBadge.className = 'status-badge ' + workflow.status;

            // Update buttons
            const pauseBtn = document.getElementById('pause-btn');
            const resumeBtn = document.getElementById('resume-btn');
            const cancelBtn = document.getElementById('cancel-btn');
            
            if (workflow.status === 'executing') {
                pauseBtn.style.display = 'inline-block';
                resumeBtn.style.display = 'none';
                cancelBtn.disabled = false;
            } else if (workflow.status === 'paused') {
                pauseBtn.style.display = 'none';
                resumeBtn.style.display = 'inline-block';
                cancelBtn.disabled = false;
            } else {
                pauseBtn.style.display = 'none';
                resumeBtn.style.display = 'none';
                cancelBtn.disabled = true;
            }

            // Update progress
            const completedSteps = workflow.results.filter(r => r.status !== 'skipped').length;
            const progress = (completedSteps / workflow.steps.length) * 100;
            document.getElementById('progress-fill').style.width = progress + '%';
            document.getElementById('progress-text').textContent = 
                completedSteps + ' of ' + workflow.steps.length + ' steps completed';

            // Update duration
            updateDuration();

            // Render steps
            renderSteps(workflow);
        }

        function renderSteps(workflow) {
            const container = document.getElementById('workflow-steps');
            container.innerHTML = '';

            workflow.steps.forEach((step, index) => {
                const result = workflow.results.find(r => r.stepId === step.id);
                const isActive = index === workflow.currentStep;
                const isCompleted = result !== undefined;
                
                const stepEl = document.createElement('div');
                stepEl.className = 'step';
                if (isActive) stepEl.classList.add('active');
                if (isCompleted) stepEl.classList.add('completed');
                
                let iconContent = index + 1;
                let iconClass = 'pending';
                
                if (result) {
                    switch (result.status) {
                        case 'success':
                            iconContent = '✓';
                            iconClass = 'completed';
                            break;
                        case 'failure':
                            iconContent = '✗';
                            iconClass = 'failed';
                            break;
                        case 'skipped':
                            iconContent = '⟶';
                            iconClass = 'skipped';
                            break;
                    }
                } else if (isActive) {
                    iconClass = 'active';
                    if (workflow.status === 'executing') {
                        iconContent = '⟳';
                    }
                }
                
                stepEl.innerHTML = \`
                    <div class="step-icon \${iconClass}">\${iconContent}</div>
                    <div class="step-content">
                        <div class="step-name">\${step.name}</div>
                        <div class="step-description">\${step.description}</div>
                    </div>
                    \${result ? \`<div class="step-duration">\${formatDuration(result.duration)}</div>\` : ''}
                \`;
                
                stepEl.onclick = () => viewStepDetails(step.id);
                container.appendChild(stepEl);
            });
        }

        function updateDuration() {
            if (!currentWorkflow) return;
            
            const start = new Date(currentWorkflow.startTime);
            const end = currentWorkflow.endTime ? new Date(currentWorkflow.endTime) : new Date();
            const duration = Math.floor((end - start) / 1000 / 60); // minutes
            
            document.getElementById('duration-text').textContent = 
                'Duration: ' + duration + 'm';
        }

        function formatDuration(ms) {
            const seconds = Math.floor(ms / 1000);
            if (seconds < 60) return seconds + 's';
            const minutes = Math.floor(seconds / 60);
            return minutes + 'm ' + (seconds % 60) + 's';
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'updateWorkflow':
                    updateWorkflowUI(message.workflow);
                    break;
            }
        });

        // Update duration every 10 seconds
        updateTimer = setInterval(updateDuration, 10000);
    </script>
</body>
</html>`;
    }

    private _getStepDetailsHtml(step: WorkflowStep, result: StepResult): string {
        const artifacts = result.artifacts || [];
        const artifactsHtml = artifacts.map(a => `
            <div class="artifact">
                <div class="artifact-type">${a.type}</div>
                <pre>${this._escapeHtml(a.content)}</pre>
                ${a.path ? `<div class="artifact-path">Path: ${a.path}</div>` : ''}
            </div>
        `).join('');

        return `<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        h1 { font-size: 20px; margin-bottom: 10px; }
        .section {
            margin-bottom: 20px;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
        }
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .status.success {
            background-color: var(--vscode-terminal-ansiGreen);
            color: var(--vscode-editor-background);
        }
        .status.failure {
            background-color: var(--vscode-terminal-ansiRed);
            color: var(--vscode-editor-background);
        }
        pre {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            white-space: pre-wrap;
        }
        .artifact {
            margin-bottom: 15px;
            padding: 10px;
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 4px;
        }
        .artifact-type {
            font-weight: bold;
            margin-bottom: 5px;
            color: var(--vscode-terminal-ansiCyan);
        }
        .artifact-path {
            font-size: 12px;
            opacity: 0.8;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <h1>${step.name}</h1>
    <div class="status ${result.status}">${result.status.toUpperCase()}</div>
    
    <div class="section">
        <h2>Description</h2>
        <p>${step.description}</p>
    </div>

    <div class="section">
        <h2>Output</h2>
        <pre>${this._escapeHtml(result.output)}</pre>
    </div>

    ${artifacts.length > 0 ? `
        <div class="section">
            <h2>Artifacts</h2>
            ${artifactsHtml}
        </div>
    ` : ''}

    <div class="section">
        <h2>Metadata</h2>
        <p>Duration: ${result.duration}ms</p>
        <p>Timestamp: ${new Date(result.timestamp).toLocaleString()}</p>
    </div>
</body>
</html>`;
    }

    private _escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}