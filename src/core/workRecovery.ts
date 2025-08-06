import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';

export interface RecoveryPoint {
    id: string;
    sessionId: string;
    timestamp: Date;
    description: string;
    
    // Capture complete state
    workflowStates: WorkflowState[];
    executionStates: ExecutionState[];
    memoryState: MemoryState;
    editorStates: EditorState[];
    
    // Capture context
    openFiles: string[];
    cursorPositions: CursorPosition[];
    breakpoints: BreakpointState[];
    
    // Capture progress
    completedTasks: any[];
    pendingTasks: any[];
    
    // Size for optimization
    sizeInBytes: number;
}

export interface WorkflowState {
    id: string;
    title: string;
    status: string;
    currentPhase: number;
    progress: number;
    phases: any[];
    context: any;
}

export interface ExecutionState {
    id: string;
    type: 'claude' | 'gemini' | 'collaborative';
    input: string;
    output: string;
    context: any;
    timestamp: Date;
    status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface MemoryState {
    memories: any[];
    patterns: any[];
    learnedInsights: any[];
    capturedAt: Date;
}

export interface EditorState {
    filePath: string;
    content: string;
    selections: vscode.Selection[];
    scrollPosition: { line: number; character: number };
    isActive: boolean;
}

export interface CursorPosition {
    filePath: string;
    line: number;
    character: number;
}

export interface BreakpointState {
    filePath: string;
    line: number;
    enabled: boolean;
    condition?: string;
    hitCount?: number;
}

export class WorkRecoverySystem {
    private recoveryPoints: Map<string, RecoveryPoint> = new Map();
    private autoSaveTimer: NodeJS.Timeout | null = null;
    private recoveryStoragePath: vscode.Uri;
    
    constructor(
        private sessionManager: any,
        private workflowEngine: any,
        private memorySystem: any,
        private context: vscode.ExtensionContext
    ) {
        this.recoveryStoragePath = vscode.Uri.joinPath(
            context.globalStorageUri,
            'recovery-points'
        );
        this.setupAutoRecovery();
        this.loadRecoveryPoints();
    }
    
    async createRecoveryPoint(
        sessionId: string,
        description: string
    ): Promise<RecoveryPoint> {
        const session = await this.sessionManager.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        const recoveryPoint: RecoveryPoint = {
            id: uuidv4(),
            sessionId,
            timestamp: new Date(),
            description,
            
            // Capture complete state
            workflowStates: await this.captureWorkflowStates(session),
            executionStates: await this.captureExecutionStates(session),
            memoryState: await this.captureMemoryState(),
            editorStates: await this.captureEditorStates(),
            
            // Capture context
            openFiles: this.captureOpenFiles(),
            cursorPositions: this.captureCursorPositions(),
            breakpoints: this.captureBreakpoints(),
            
            // Capture progress
            completedTasks: session.completedTasks,
            pendingTasks: session.pendingTasks,
            
            // Size for optimization
            sizeInBytes: 0
        };
        
        // Calculate size
        recoveryPoint.sizeInBytes = JSON.stringify(recoveryPoint).length;
        
        // Store recovery point
        this.recoveryPoints.set(recoveryPoint.id, recoveryPoint);
        await this.saveRecoveryPoint(recoveryPoint);
        
        console.log(`📍 Created recovery point: ${description}`);
        
        return recoveryPoint;
    }
    
    async restoreFromPoint(recoveryPointId: string): Promise<void> {
        const recoveryPoint = this.recoveryPoints.get(recoveryPointId);
        if (!recoveryPoint) {
            throw new Error('Recovery point not found');
        }
        
        // Show progress notification
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Restoring work session...',
            cancellable: false
        }, async (progress) => {
            // Restore workflows
            progress.report({ increment: 20, message: 'Restoring workflows...' });
            await this.restoreWorkflows(recoveryPoint.workflowStates);
            
            // Restore executions
            progress.report({ increment: 20, message: 'Restoring executions...' });
            await this.restoreExecutions(recoveryPoint.executionStates);
            
            // Restore memory
            progress.report({ increment: 20, message: 'Restoring memory...' });
            await this.restoreMemoryState(recoveryPoint.memoryState);
            
            // Restore editor state
            progress.report({ increment: 20, message: 'Restoring editor...' });
            await this.restoreEditorState(recoveryPoint);
            
            // Restore tasks
            progress.report({ increment: 20, message: 'Restoring tasks...' });
            await this.restoreTasks(recoveryPoint);
            
            return Promise.resolve();
        });
        
        vscode.window.showInformationMessage(
            `Work session restored from ${recoveryPoint.description}`
        );
    }
    
    async getRecoveryPoints(sessionId?: string): Promise<RecoveryPoint[]> {
        if (sessionId) {
            return Array.from(this.recoveryPoints.values())
                .filter(point => point.sessionId === sessionId)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
        
        return Array.from(this.recoveryPoints.values())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    
    async deleteRecoveryPoint(pointId: string): Promise<void> {
        const point = this.recoveryPoints.get(pointId);
        if (!point) {
            throw new Error('Recovery point not found');
        }
        
        this.recoveryPoints.delete(pointId);
        
        // Delete from storage
        const pointPath = vscode.Uri.joinPath(
            this.recoveryStoragePath,
            `${pointId}.json`
        );
        
        try {
            await vscode.workspace.fs.delete(pointPath);
            console.log(`🗑️ Deleted recovery point: ${point.description}`);
        } catch (error) {
            console.error('❌ Failed to delete recovery point:', error);
        }
    }
    
    async cleanupOldRecoveryPoints(maxAge: number = 7): Promise<void> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAge);
        
        const pointsToDelete: string[] = [];
        
        for (const [pointId, point] of this.recoveryPoints.entries()) {
            if (new Date(point.timestamp) < cutoffDate) {
                pointsToDelete.push(pointId);
            }
        }
        
        for (const pointId of pointsToDelete) {
            await this.deleteRecoveryPoint(pointId);
        }
        
        console.log(`🧹 Cleaned up ${pointsToDelete.length} old recovery points`);
    }
    
    private async captureWorkflowStates(session: any): Promise<WorkflowState[]> {
        const workflowStates: WorkflowState[] = [];
        
        for (const workflow of session.workflows) {
            if (workflow.status === 'active' || workflow.status === 'paused') {
                workflowStates.push({
                    id: workflow.id,
                    title: workflow.title,
                    status: workflow.status,
                    currentPhase: workflow.currentPhase,
                    progress: workflow.progress,
                    phases: workflow.phases,
                    context: workflow.context
                });
            }
        }
        
        return workflowStates;
    }
    
    private async captureExecutionStates(session: any): Promise<ExecutionState[]> {
        const executionStates: ExecutionState[] = [];
        
        // Capture recent executions
        const recentExecutions = [
            ...session.claudeExecutions.slice(-5),
            ...session.geminiExecutions.slice(-5),
            ...session.collaborativeExecutions.slice(-5)
        ];
        
        for (const execution of recentExecutions) {
            executionStates.push({
                id: execution.id,
                type: this.getExecutionType(execution),
                input: execution.instruction || execution.prompt || execution.task,
                output: execution.output || execution.response || execution.finalOutput,
                context: execution.context,
                timestamp: execution.timestamp,
                status: 'completed'
            });
        }
        
        return executionStates;
    }
    
    private async captureMemoryState(): Promise<MemoryState> {
        // Capture current memory state
        const memories = await this.memorySystem.getRecentMemories(20);
        const patterns = await this.memorySystem.getLearnedPatterns();
        
        return {
            memories: memories.map(m => ({
                id: m.id,
                input: m.input,
                result: m.result,
                timestamp: m.timestamp,
                tags: m.tags
            })),
            patterns: patterns.map(p => ({
                pattern: p.pattern,
                type: p.type,
                frequency: p.frequency,
                lastSeen: p.lastSeen
            })),
            learnedInsights: [],
            capturedAt: new Date()
        };
    }
    
    private async captureEditorStates(): Promise<EditorState[]> {
        const editorStates: EditorState[] = [];
        
        // Capture all open editors
        for (const tabGroup of vscode.window.tabGroups) {
            for (const tab of tabGroup.tabs) {
                if (tab.input && 'uri' in tab.input) {
                    const uri = tab.input.uri;
                    if (uri.scheme === 'file') {
                        try {
                            const document = await vscode.workspace.openTextDocument(uri);
                            const editor = vscode.window.activeTextEditor;
                            
                            editorStates.push({
                                filePath: uri.fsPath,
                                content: document.getText(),
                                selections: editor?.selections ? [...editor.selections] : [],
                                scrollPosition: { line: 0, character: 0 },
                                isActive: editor?.document.uri.fsPath === uri.fsPath
                            });
                        } catch (error) {
                            console.error('Failed to capture editor state:', error);
                        }
                    }
                }
            }
        }
        
        return editorStates;
    }
    
    private captureOpenFiles(): string[] {
        return Array.from(vscode.window.tabGroups).flatMap(g => 
            g.tabs.map(t => (t.input as any)?.uri?.fsPath).filter(Boolean)
        );
    }
    
    private captureCursorPositions(): CursorPosition[] {
        const positions: CursorPosition[] = [];
        
        for (const tabGroup of Array.from(vscode.window.tabGroups)) {
            for (const tab of tabGroup.tabs) {
                if (tab.input && 'uri' in tab.input) {
                    const uri = tab.input.uri;
                    if (uri.scheme === 'file') {
                        // Note: Getting cursor position for non-active editors is complex
                        // This is a simplified version
                        positions.push({
                            filePath: uri.fsPath,
                            line: 0,
                            character: 0
                        });
                    }
                }
            }
        }
        
        return positions;
    }
    
    private captureBreakpoints(): BreakpointState[] {
        return vscode.debug.breakpoints.map(bp => ({
            filePath: (bp as any).location?.uri.fsPath || '',
            line: (bp as any).location?.range.start.line || 0,
            enabled: bp.enabled,
            condition: (bp as any).condition,
            hitCount: (bp as any).hitCondition ? parseInt((bp as any).hitCondition) : undefined
        }));
    }
    
    private async restoreWorkflows(workflowStates: WorkflowState[]): Promise<void> {
        for (const workflowState of workflowStates) {
            try {
                // Restore workflow to engine
                await this.workflowEngine.restoreWorkflow(workflowState);
                console.log(`🔄 Restored workflow: ${workflowState.title}`);
            } catch (error) {
                console.error(`❌ Failed to restore workflow: ${workflowState.title}`, error);
            }
        }
    }
    
    private async restoreExecutions(executionStates: ExecutionState[]): Promise<void> {
        // Restore execution history to memory system
        for (const executionState of executionStates) {
            try {
                await this.memorySystem.recordExecution({
                    id: executionState.id,
                    input: executionState.input,
                    result: executionState.output,
                    context: executionState.context,
                    timestamp: executionState.timestamp,
                    tags: [executionState.type]
                });
            } catch (error) {
                console.error(`❌ Failed to restore execution: ${executionState.id}`, error);
            }
        }
    }
    
    private async restoreMemoryState(memoryState: MemoryState): Promise<void> {
        try {
            // Restore memories
            for (const memory of memoryState.memories) {
                await this.memorySystem.recordExecution(memory);
            }
            
            // Restore patterns
            for (const pattern of memoryState.patterns) {
                await this.memorySystem.recordPattern(pattern);
            }
            
            console.log(`🧠 Restored ${memoryState.memories.length} memories and ${memoryState.patterns.length} patterns`);
        } catch (error) {
            console.error('❌ Failed to restore memory state:', error);
        }
    }
    
    private async restoreEditorState(recoveryPoint: RecoveryPoint): Promise<void> {
        // Restore open files
        for (const filePath of recoveryPoint.openFiles) {
            try {
                const uri = vscode.Uri.file(filePath);
                await vscode.window.showTextDocument(uri, { preview: false });
            } catch (error) {
                console.error(`❌ Failed to restore file: ${filePath}`, error);
            }
        }
        
        // Restore editor content for captured states
        for (const editorState of recoveryPoint.editorStates) {
            try {
                const uri = vscode.Uri.file(editorState.filePath);
                const document = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(document);
                
                // Restore content if different
                const currentContent = document.getText();
                if (currentContent !== editorState.content) {
                    await editor.edit(editBuilder => {
                        const fullRange = new vscode.Range(
                            document.positionAt(0),
                            document.positionAt(currentContent.length)
                        );
                        editBuilder.replace(fullRange, editorState.content);
                    });
                }
                
                // Restore selections
                if (editorState.selections.length > 0) {
                    editor.selections = editorState.selections;
                }
                
                console.log(`📝 Restored editor: ${editorState.filePath}`);
            } catch (error) {
                console.error(`❌ Failed to restore editor: ${editorState.filePath}`, error);
            }
        }
    }
    
    private async restoreTasks(recoveryPoint: RecoveryPoint): Promise<void> {
        const session = await this.sessionManager.getCurrentSession();
        if (!session) {
            console.warn('⚠️ No active session to restore tasks to');
            return;
        }
        
        // Restore completed tasks
        session.completedTasks = recoveryPoint.completedTasks;
        
        // Restore pending tasks
        session.pendingTasks = recoveryPoint.pendingTasks;
        
        await this.sessionManager.saveSession(session);
        
        console.log(`📋 Restored ${recoveryPoint.completedTasks.length} completed and ${recoveryPoint.pendingTasks.length} pending tasks`);
    }
    
    private setupAutoRecovery(): void {
        // Auto-save recovery points every 5 minutes
        this.autoSaveTimer = setInterval(async () => {
            const activeSession = await this.sessionManager.getActiveSession();
            if (activeSession) {
                await this.createRecoveryPoint(
                    activeSession.id,
                    `Auto-save at ${new Date().toLocaleTimeString()}`
                );
            }
        }, 5 * 60 * 1000);
        
        // Create recovery point on window close
        vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            const activeSession = await this.sessionManager.getActiveSession();
            if (activeSession) {
                await this.createRecoveryPoint(
                    activeSession.id,
                    'Workspace change recovery'
                );
            }
        });
        
        // Create recovery point before major operations
        vscode.commands.registerCommand('claude-assistant.createRecoveryPoint', async () => {
            const activeSession = await this.sessionManager.getActiveSession();
            if (activeSession) {
                const description = await vscode.window.showInputBox({
                    prompt: 'Enter description for recovery point',
                    placeHolder: 'e.g., Before major refactor'
                });
                
                if (description) {
                    await this.createRecoveryPoint(activeSession.id, description);
                    vscode.window.showInformationMessage('Recovery point created successfully');
                }
            }
        });
    }
    
    private async loadRecoveryPoints(): Promise<void> {
        try {
            await vscode.workspace.fs.createDirectory(this.recoveryStoragePath);
            
            const files = await vscode.workspace.fs.readDirectory(this.recoveryStoragePath);
            
            for (const file of files) {
                if (file[1] === vscode.FileType.File && file[0].endsWith('.json')) {
                    const filePath = vscode.Uri.joinPath(this.recoveryStoragePath, file[0]);
                    const data = await vscode.workspace.fs.readFile(filePath);
                    const recoveryPoint = JSON.parse(data.toString()) as RecoveryPoint;
                    
                    // Convert dates
                    recoveryPoint.timestamp = new Date(recoveryPoint.timestamp);
                    recoveryPoint.executionStates.forEach(exec => {
                        exec.timestamp = new Date(exec.timestamp);
                    });
                    recoveryPoint.memoryState.capturedAt = new Date(recoveryPoint.memoryState.capturedAt);
                    
                    const pointId = file[0].replace('.json', '');
                    this.recoveryPoints.set(pointId, recoveryPoint);
                }
            }
            
            console.log(`📂 Loaded ${this.recoveryPoints.size} recovery points`);
        } catch (error) {
            console.error('❌ Failed to load recovery points:', error);
        }
    }
    
    private async saveRecoveryPoint(recoveryPoint: RecoveryPoint): Promise<void> {
        try {
            const pointPath = vscode.Uri.joinPath(
                this.recoveryStoragePath,
                `${recoveryPoint.id}.json`
            );
            
            await vscode.workspace.fs.writeFile(
                pointPath,
                Buffer.from(JSON.stringify(recoveryPoint, null, 2), 'utf8')
            );
        } catch (error) {
            console.error('❌ Failed to save recovery point:', error);
        }
    }
    
    private getExecutionType(execution: any): 'claude' | 'gemini' | 'collaborative' {
        if ('claudeRole' in execution) {
            return 'collaborative';
        } else if ('instruction' in execution) {
            return 'claude';
        } else {
            return 'gemini';
        }
    }
    
    dispose(): void {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
    }
} 