import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';

// Import Disagreement type from collaborativeExecutor
export interface Disagreement {
    id: string;
    topic: string;
    claudePosition: string;
    geminiPosition: string;
    severity: 'low' | 'medium' | 'high';
    resolved: boolean;
    resolution?: string;
}

export interface WorkSession {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    lastAccessedAt: Date;
    status: 'active' | 'paused' | 'completed' | 'archived';
    
    // Workflow state
    workflows: SavedWorkflow[];
    currentWorkflowId?: string;
    
    // Execution history
    claudeExecutions: ClaudeExecution[];
    geminiExecutions: GeminiExecution[];
    collaborativeExecutions: CollaborativeExecution[];
    
    // Context and memory
    projectSnapshot: ProjectSnapshot;
    memorySnapshot: MemorySnapshot;
    learnedPatterns: PatternSnapshot[];
    
    // Progress tracking
    completedTasks: CompletedTask[];
    pendingTasks: PendingTask[];
    blockedTasks: BlockedTask[];
    
    // Collaboration state
    collaborationMode: boolean;
    sharedContext: SharedContext;
    decisionLog: DecisionEntry[];
}

export interface WorkflowPhase {
    id: string;
    name: string;
    description: string;
    type: string;
    status: string;
    estimatedDuration: number;
    reviewCriteria: string[];
    actions: any[];
}

export interface SavedWorkflow {
    id: string;
    title: string;
    description: string;
    status: 'active' | 'paused' | 'completed' | 'failed';
    currentPhase: number;
    phases: WorkflowPhase[];
    progress: number;
    createdAt: Date;
    lastUpdated: Date;
}

export interface ClaudeExecution {
    id: string;
    instruction: string;
    output: string;
    context: any;
    timestamp: Date;
    duration: number;
    success: boolean;
    rating?: number;
}

export interface GeminiExecution {
    id: string;
    prompt: string;
    response: string;
    context: any;
    timestamp: Date;
    duration: number;
    success: boolean;
    rating?: number;
}

export interface CollaborativeExecution {
    id: string;
    task: string;
    claudeRole: string;
    geminiRole: string;
    phases: CollaborationPhase[];
    currentPhase: number;
    claudeContributions: ModelContribution[];
    geminiContributions: ModelContribution[];
    consensus: ConsensusResult;
    finalOutput: string;
    confidenceScore: number;
    timestamp: Date;
}

export interface ProjectSnapshot {
    projectId: string;
    rootPath: string;
    name: string;
    projectType: string;
    fileCount: number;
    technologies: any;
    patterns: any[];
    capturedAt: Date;
}

export interface MemorySnapshot {
    memories: any[];
    patterns: any[];
    capturedAt: Date;
}

export interface PatternSnapshot {
    pattern: string;
    type: string;
    frequency: number;
    lastSeen: Date;
    examples: string[];
}

export interface CompletedTask {
    id: string;
    name: string;
    description: string;
    completedAt: Date;
    duration: number;
    workflowId?: string;
    executionId?: string;
}

export interface PendingTask {
    id: string;
    name: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    estimatedDuration: number;
    dependencies: string[];
    workflowId?: string;
}

export interface BlockedTask {
    id: string;
    name: string;
    description: string;
    blockReason: string;
    blockedAt: Date;
    workflowId?: string;
}

export interface SharedContext {
    projectRoot: string;
    currentFile?: string;
    openFiles: string[];
    recentChanges: any[];
    activeWorkflows: string[];
}

export interface DecisionEntry {
    id: string;
    timestamp: Date;
    decision: string;
    reasoning: string;
    alternatives: string[];
    outcome: string;
    model: 'claude' | 'gemini' | 'both';
}

export interface CollaborationPhase {
    name: string;
    type: 'parallel_analysis' | 'sequential_refinement' | 'debate' | 'synthesis';
    description: string;
    duration: number;
}

export interface ModelContribution {
    phase: string;
    content: string;
    timestamp: Date;
    confidence: number;
}

export interface ConsensusResult {
    achieved: boolean;
    points: string[];
    disagreements: (string | Disagreement)[];
    resolutions: string[];
}

export class SessionManager {
    private activeSessions: Map<string, WorkSession> = new Map();
    private sessionStoragePath: vscode.Uri;
    private autoSaveInterval: NodeJS.Timeout | null = null;
    private currentSessionId: string | null = null;
    
    constructor(
        private _context: vscode.ExtensionContext,
        private _projectIntelligence: any
    ) {
        this.sessionStoragePath = vscode.Uri.joinPath(
            _context.globalStorageUri, 
            'sessions'
        );
        this.initializeSessionManager();
    }
    
    async initializeSessionManager(): Promise<void> {
        try {
            // Ensure sessions directory exists
            await vscode.workspace.fs.createDirectory(this.sessionStoragePath);
            
            // Load any existing sessions
            await this.loadExistingSessions();
            
            console.log('✅ Session Manager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Session Manager:', error);
        }
    }
    
    async createSession(name: string, description: string): Promise<WorkSession> {
        const session: WorkSession = {
            id: uuidv4(),
            name,
            description,
            createdAt: new Date(),
            lastAccessedAt: new Date(),
            status: 'active',
            workflows: [],
            claudeExecutions: [],
            geminiExecutions: [],
            collaborativeExecutions: [],
            projectSnapshot: await this.captureProjectSnapshot(),
            memorySnapshot: await this.captureMemorySnapshot(),
            learnedPatterns: [],
            completedTasks: [],
            pendingTasks: [],
            blockedTasks: [],
            collaborationMode: false,
            sharedContext: this.createSharedContext(),
            decisionLog: []
        };
        
        this.activeSessions.set(session.id, session);
        this.currentSessionId = session.id;
        
        await this.saveSession(session);
        this.startAutoSave();
        
        console.log(`✅ Created new session: ${session.name}`);
        
        return session;
    }
    
    async resumeSession(sessionId: string): Promise<WorkSession> {
        try {
            // Load session from storage
            const sessionPath = vscode.Uri.joinPath(
                this.sessionStoragePath,
                `${sessionId}.json`
            );
            
            const sessionData = await vscode.workspace.fs.readFile(sessionPath);
            const session = JSON.parse(sessionData.toString()) as WorkSession;
            
            // Convert date strings back to Date objects
            session.createdAt = new Date(session.createdAt);
            session.lastAccessedAt = new Date();
            session.claudeExecutions.forEach(exec => {
                exec.timestamp = new Date(exec.timestamp);
            });
            session.geminiExecutions.forEach(exec => {
                exec.timestamp = new Date(exec.timestamp);
            });
            session.collaborativeExecutions.forEach(exec => {
                exec.timestamp = new Date(exec.timestamp);
            });
            session.completedTasks.forEach(task => {
                task.completedAt = new Date(task.completedAt);
            });
            session.blockedTasks.forEach(task => {
                task.blockedAt = new Date(task.blockedAt);
            });
            session.decisionLog.forEach(decision => {
                decision.timestamp = new Date(decision.timestamp);
            });
            
            // Restore session state
            session.status = 'active';
            this.currentSessionId = session.id;
            
            // Restore project context
            await this.restoreProjectContext(session.projectSnapshot);
            
            // Restore memory state
            await this.restoreMemoryState(session.memorySnapshot);
            
            this.activeSessions.set(session.id, session);
            this.startAutoSave();
            
            // Show session restored notification
            vscode.window.showInformationMessage(
                `Session "${session.name}" restored. ${session.pendingTasks.length} pending tasks.`
            );
            
            console.log(`✅ Resumed session: ${session.name}`);
            
            return session;
        } catch (error) {
            console.error('❌ Failed to resume session:', error);
            throw error;
        }
    }
    
    async getCurrentSession(): Promise<WorkSession | null> {
        if (!this.currentSessionId) {
            return null;
        }
        
        return this.activeSessions.get(this.currentSessionId) || null;
    }
    
    async getActiveSession(): Promise<WorkSession | null> {
        return this.getCurrentSession();
    }
    
    async saveSession(session: WorkSession): Promise<void> {
        try {
            const sessionPath = vscode.Uri.joinPath(
                this.sessionStoragePath,
                `${session.id}.json`
            );
            
            // Ensure directory exists
            await vscode.workspace.fs.createDirectory(this.sessionStoragePath);
            
            // Update last accessed time
            session.lastAccessedAt = new Date();
            
            // Save session data
            const sessionData = JSON.stringify(session, null, 2);
            await vscode.workspace.fs.writeFile(
                sessionPath,
                Buffer.from(sessionData, 'utf8')
            );
            
            console.log(`💾 Saved session: ${session.name}`);
        } catch (error) {
            console.error('❌ Failed to save session:', error);
            throw error;
        }
    }
    
    async getAllSessions(): Promise<WorkSession[]> {
        try {
            const sessions: WorkSession[] = [];
            
            // Get all session files
            const files = await vscode.workspace.fs.readDirectory(this.sessionStoragePath);
            
            for (const file of files) {
                if (file[1] === vscode.FileType.File && file[0].endsWith('.json')) {
                    const sessionPath = vscode.Uri.joinPath(this.sessionStoragePath, file[0]);
                    const sessionData = await vscode.workspace.fs.readFile(sessionPath);
                    const session = JSON.parse(sessionData.toString()) as WorkSession;
                    
                    // Convert dates
                    session.createdAt = new Date(session.createdAt);
                    session.lastAccessedAt = new Date(session.lastAccessedAt);
                    
                    sessions.push(session);
                }
            }
            
            return sessions.sort((a, b) => 
                new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
            );
        } catch (error) {
            console.error('❌ Failed to load sessions:', error);
            return [];
        }
    }
    
    async addExecution(
        sessionId: string,
        execution: ClaudeExecution | GeminiExecution | CollaborativeExecution
    ): Promise<void> {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        if ('claudeRole' in execution) {
            session.collaborativeExecutions.push(execution as CollaborativeExecution);
        } else if ('instruction' in execution) {
            session.claudeExecutions.push(execution as ClaudeExecution);
        } else {
            session.geminiExecutions.push(execution as GeminiExecution);
        }
        
        session.lastAccessedAt = new Date();
        await this.saveSession(session);
    }
    
    async addTask(
        sessionId: string,
        task: PendingTask
    ): Promise<void> {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        session.pendingTasks.push(task);
        session.lastAccessedAt = new Date();
        await this.saveSession(session);
    }
    
    async completeTask(
        sessionId: string,
        taskId: string,
        duration: number
    ): Promise<void> {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        const taskIndex = session.pendingTasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            throw new Error('Task not found');
        }
        
        const task = session.pendingTasks.splice(taskIndex, 1)[0];
        const completedTask: CompletedTask = {
            id: task.id,
            name: task.name,
            description: task.description,
            completedAt: new Date(),
            duration,
            workflowId: task.workflowId,
            executionId: undefined
        };
        
        session.completedTasks.push(completedTask);
        session.lastAccessedAt = new Date();
        await this.saveSession(session);
    }
    
    private async captureProjectSnapshot(): Promise<ProjectSnapshot> {
        const projectIntel = await this._projectIntelligence.getProjectIntelligence();
        
        return {
            projectId: projectIntel?.projectId || '',
            rootPath: projectIntel?.rootPath || '',
            name: projectIntel?.name || '',
            projectType: projectIntel?.projectType || '',
            fileCount: projectIntel?.fileCount || 0,
            technologies: projectIntel?.technologies || {},
            patterns: projectIntel?.patterns || [],
            capturedAt: new Date()
        };
    }
    
    private async captureMemorySnapshot(): Promise<MemorySnapshot> {
        return {
            memories: [], // Would be populated from memory system
            patterns: [], // Would be populated from memory system
            capturedAt: new Date()
        };
    }
    
    private createSharedContext(): SharedContext {
        return {
            projectRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
            currentFile: vscode.window.activeTextEditor?.document.uri.fsPath,
            openFiles: vscode.window.tabGroups.all.flatMap(g => 
                g.tabs.map(t => (t.input as any)?.uri?.fsPath).filter(Boolean)
            ),
            recentChanges: [],
            activeWorkflows: []
        };
    }
    
    private async restoreProjectContext(snapshot: ProjectSnapshot): Promise<void> {
        // Restore project context from snapshot
        console.log(`🔄 Restoring project context for: ${snapshot.name}`);
    }
    
    private async restoreMemoryState(_snapshot: MemorySnapshot): Promise<void> {
        // Restore memory state from snapshot
        console.log(`🧠 Restoring memory state`);
    }
    
    private async loadExistingSessions(): Promise<void> {
        try {
            const sessions = await this.getAllSessions();
            for (const session of sessions) {
                this.activeSessions.set(session.id, session);
            }
            console.log(`📂 Loaded ${sessions.length} existing sessions`);
        } catch (error) {
            console.error('❌ Failed to load existing sessions:', error);
        }
    }
    
    private startAutoSave(): void {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        this.autoSaveInterval = setInterval(async () => {
            for (const session of this.activeSessions.values()) {
                if (session.status === 'active') {
                    await this.saveSession(session);
                }
            }
        }, 30000); // Auto-save every 30 seconds
    }
    
    dispose(): void {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        // Save all active sessions before disposing
        for (const session of this.activeSessions.values()) {
            if (session.status === 'active') {
                this.saveSession(session);
            }
        }
    }
} 