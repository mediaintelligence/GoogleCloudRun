import * as vscode from 'vscode';
import { ProjectContext, FileInfo, CodePattern, FileChange } from '../types/interfaces';
import { ProjectIntelligence } from '../core/projectIntelligence';

export class ContextViewer implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _currentContext?: ProjectContext;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly projectIntelligence: ProjectIntelligence
    ) {}

    public async show(): Promise<void> {
        if (this._view) {
            this._view.show?.(true);
        } else {
            // Create new webview panel
            const panel = vscode.window.createWebviewPanel(
                'claudeContext',
                'Claude Assistant Context',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            panel.webview.html = this._getHtmlForWebview(panel.webview);
            this._setupMessageHandling(panel.webview);
        }
    }

    public async updateContext(uri?: vscode.Uri): Promise<void> {
        try {
            const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
            if (!targetUri) {
                return;
            }

            const context = await this.projectIntelligence.getContextForFile(targetUri);
            this._currentContext = context;

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'updateContext',
                    context: this._serializeContext(context)
                });
            }
        } catch (error) {
            console.error('Failed to update context:', error);
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

        // Update context when view becomes visible
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.updateContext();
            }
        });

        // Initial context update
        this.updateContext();
    }

    public dispose(): void {
        this._view = undefined;
    }

    private _setupMessageHandling(webview: vscode.Webview): void {
        webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'openFile':
                        const doc = await vscode.workspace.openTextDocument(message.path);
                        await vscode.window.showTextDocument(doc);
                        break;
                    case 'analyzeProject':
                        await vscode.commands.executeCommand('claude-assistant.analyzeProject');
                        break;
                    case 'refreshContext':
                        await this.updateContext();
                        break;
                    case 'viewPattern':
                        this._showPatternDetails(message.pattern);
                        break;
                }
            },
            null,
            this.context.subscriptions
        );
    }

    private _showPatternDetails(pattern: CodePattern): void {
        const panel = vscode.window.createWebviewPanel(
            'patternDetails',
            `Pattern: ${pattern.name}`,
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = this._getPatternDetailsHtml(pattern);
    }

    private _serializeContext(context: ProjectContext): any {
        return {
            ...context,
            recentChanges: context.recentChanges.map(change => ({
                ...change,
                timestamp: change.timestamp.toISOString()
            }))
        };
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = this._getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Project Context</title>
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

        .context-container {
            max-width: 100%;
        }

        .context-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .context-title {
            font-size: 18px;
            font-weight: bold;
        }

        .refresh-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 14px;
            cursor: pointer;
            border-radius: 2px;
            font-size: 13px;
        }

        .refresh-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .section {
            margin-bottom: 24px;
            padding: 16px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
        }

        .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 12px;
            color: var(--vscode-symbolIcon-classForeground);
        }

        .info-grid {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 8px 16px;
            font-size: 13px;
        }

        .info-label {
            color: var(--vscode-descriptionForeground);
        }

        .info-value {
            word-break: break-all;
        }

        .file-list,
        .pattern-list,
        .change-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .file-item,
        .pattern-item,
        .change-item {
            padding: 8px 12px;
            margin-bottom: 4px;
            background-color: var(--vscode-list-inactiveSelectionBackground);
            border-radius: 2px;
            cursor: pointer;
            transition: background-color 0.2s;
            font-size: 13px;
        }

        .file-item:hover,
        .pattern-item:hover,
        .change-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .file-icon,
        .pattern-icon,
        .change-icon {
            margin-right: 8px;
            opacity: 0.8;
        }

        .framework-badge {
            display: inline-block;
            padding: 2px 8px;
            margin: 2px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 10px;
            font-size: 11px;
        }

        .dependency-item {
            display: inline-block;
            padding: 4px 8px;
            margin: 2px;
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 2px;
            font-size: 12px;
        }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            opacity: 0.6;
        }

        .pattern-confidence {
            float: right;
            font-size: 11px;
            opacity: 0.7;
        }

        .change-type {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 2px;
            font-size: 11px;
            text-transform: uppercase;
            margin-left: 8px;
        }

        .change-type.added {
            background-color: var(--vscode-gitDecoration-addedResourceForeground);
            color: var(--vscode-editor-background);
        }

        .change-type.modified {
            background-color: var(--vscode-gitDecoration-modifiedResourceForeground);
            color: var(--vscode-editor-background);
        }

        .change-type.deleted {
            background-color: var(--vscode-gitDecoration-deletedResourceForeground);
            color: var(--vscode-editor-background);
        }

        .analyze-button {
            width: 100%;
            margin-top: 12px;
            padding: 8px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 13px;
        }

        .analyze-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
<body>
    <div class="context-container">
        <div class="context-header">
            <div class="context-title">Project Context</div>
            <button class="refresh-button" onclick="refreshContext()">🔄 Refresh</button>
        </div>

        <div id="context-content">
            <div class="empty-state">
                <div>No context loaded</div>
                <button class="analyze-button" onclick="analyzeProject()">Analyze Project</button>
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        let currentContext = null;

        function refreshContext() {
            vscode.postMessage({ command: 'refreshContext' });
        }

        function analyzeProject() {
            vscode.postMessage({ command: 'analyzeProject' });
        }

        function openFile(path) {
            vscode.postMessage({ command: 'openFile', path: path });
        }

        function viewPattern(pattern) {
            vscode.postMessage({ command: 'viewPattern', pattern: pattern });
        }

        function formatPath(fullPath) {
            const parts = fullPath.split(/[\\\\/]/);
            return parts.slice(-3).join('/');
        }

        function formatTimestamp(timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) return 'just now';
            if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
            if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
            return Math.floor(diff / 86400000) + 'd ago';
        }

        function renderContext(context) {
            if (!context) return;
            
            currentContext = context;
            const container = document.getElementById('context-content');
            
            let html = '';

            // Project Info Section
            html += \`
                <div class="section">
                    <div class="section-title">📁 Project Information</div>
                    <div class="info-grid">
                        <div class="info-label">Current File:</div>
                        <div class="info-value">\${formatPath(context.currentFile)}</div>
                        <div class="info-label">Project Type:</div>
                        <div class="info-value">\${context.projectType}</div>
                        <div class="info-label">Project Root:</div>
                        <div class="info-value">\${formatPath(context.projectRoot)}</div>
                    </div>
                    \${context.frameworks.length > 0 ? \`
                        <div style="margin-top: 12px;">
                            <div class="info-label">Frameworks:</div>
                            <div style="margin-top: 4px;">
                                \${context.frameworks.map(fw => \`<span class="framework-badge">\${fw}</span>\`).join('')}
                            </div>
                        </div>
                    \` : ''}
                </div>
            \`;

            // Related Files Section
            if (context.relatedFiles && context.relatedFiles.length > 0) {
                html += \`
                    <div class="section">
                        <div class="section-title">🔗 Related Files</div>
                        <ul class="file-list">
                            \${context.relatedFiles.map(file => \`
                                <li class="file-item" onclick="openFile('\${file}')">
                                    <span class="file-icon">📄</span>
                                    \${formatPath(file)}
                                </li>
                            \`).join('')}
                        </ul>
                    </div>
                \`;
            }

            // Dependencies Section
            if (context.dependencies && context.dependencies.length > 0) {
                html += \`
                    <div class="section">
                        <div class="section-title">📦 Dependencies</div>
                        <div>
                            \${context.dependencies.map(dep => \`
                                <span class="dependency-item">\${dep}</span>
                            \`).join('')}
                        </div>
                    </div>
                \`;
            }

            // Code Patterns Section
            if (context.patterns && context.patterns.length > 0) {
                html += \`
                    <div class="section">
                        <div class="section-title">🎯 Detected Patterns</div>
                        <ul class="pattern-list">
                            \${context.patterns.map(pattern => \`
                                <li class="pattern-item" onclick='viewPattern(\${JSON.stringify(pattern)})'>
                                    <span class="pattern-icon">💡</span>
                                    \${pattern.name}
                                    <span class="pattern-confidence">\${Math.round(pattern.confidence * 100)}%</span>
                                </li>
                            \`).join('')}
                        </ul>
                    </div>
                \`;
            }

            // Recent Changes Section
            if (context.recentChanges && context.recentChanges.length > 0) {
                html += \`
                    <div class="section">
                        <div class="section-title">🕐 Recent Changes</div>
                        <ul class="change-list">
                            \${context.recentChanges.map(change => \`
                                <li class="change-item" onclick="openFile('\${change.file}')">
                                    <span class="change-icon">📝</span>
                                    \${formatPath(change.file)}
                                    <span class="change-type \${change.changeType}">\${change.changeType}</span>
                                    <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">
                                        \${formatTimestamp(change.timestamp)}
                                    </div>
                                </li>
                            \`).join('')}
                        </ul>
                    </div>
                \`;
            }

            container.innerHTML = html;
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'updateContext':
                    renderContext(message.context);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }

    private _getPatternDetailsHtml(pattern: CodePattern): string {
        const occurrencesHtml = pattern.occurrences.map(occ => `
            <div class="occurrence">
                <div class="occurrence-file">${occ.file}</div>
                ${occ.line > 0 ? `<div class="occurrence-line">Line ${occ.line}</div>` : ''}
                <pre class="occurrence-snippet">${this._escapeHtml(occ.snippet)}</pre>
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
        .pattern-info {
            margin-bottom: 20px;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
        }
        .confidence {
            display: inline-block;
            padding: 4px 12px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 12px;
            font-size: 14px;
            font-weight: bold;
        }
        .occurrence {
            margin-bottom: 20px;
            padding: 15px;
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 4px;
        }
        .occurrence-file {
            font-weight: bold;
            margin-bottom: 5px;
            color: var(--vscode-terminal-ansiCyan);
        }
        .occurrence-line {
            font-size: 12px;
            opacity: 0.8;
            margin-bottom: 10px;
        }
        .occurrence-snippet {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <h1>${pattern.name}</h1>
    
    <div class="pattern-info">
        <p><strong>Type:</strong> ${pattern.type}</p>
        <p><strong>Description:</strong> ${pattern.description}</p>
        <p><strong>Confidence:</strong> <span class="confidence">${Math.round(pattern.confidence * 100)}%</span></p>
        <p><strong>Occurrences:</strong> ${pattern.occurrences.length}</p>
    </div>

    <h2>Occurrences</h2>
    ${occurrencesHtml}
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