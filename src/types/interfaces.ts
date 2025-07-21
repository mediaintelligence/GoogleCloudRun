import * as vscode from 'vscode';

// Core system interfaces
export interface ExtensionContext {
    claudeInterface: ClaudeCodeInterface;
    projectIntelligence: ProjectIntelligence;
    memorySystem: MemorySystem;
    geminiWorkflow: GeminiWorkflow;
    workflowPanel: any; // Using the actual WorkflowPanel class
    contextViewer: any; // Using the actual ContextViewer class
    intelligentTriggers: IntelligentTriggers;
}

// Claude Code interfaces
export interface ClaudeCodeInterface {
    executeCommand(command: string, args?: string[]): Promise<string>;
    executeWithContext(code: string, context: ProjectContext): Promise<string>;
    isAvailable(): Promise<boolean>;
    updatePath(path: string): void;
}

export interface ClaudeExecutionResult {
    output: string;
    exitCode: number;
    error?: string;
    duration: number;
}

// Project Intelligence interfaces
export interface ProjectIntelligence {
    analyzeWorkspace(): Promise<void>;
    analyzeFolder(uri: vscode.Uri, progress?: vscode.Progress<any>, token?: vscode.CancellationToken): Promise<void>;
    getContextForFile(uri: vscode.Uri): Promise<ProjectContext>;
    getProjectStructure(): ProjectStructure;
    findPatterns(): CodePattern[];
}

export interface ProjectContext {
    projectRoot: string;
    currentFile: string;
    relatedFiles: string[];
    dependencies: string[];
    recentChanges: FileChange[];
    projectType: string;
    frameworks: string[];
    patterns: CodePattern[];
}

export interface ProjectStructure {
    root: string;
    files: FileInfo[];
    directories: DirectoryInfo[];
    totalFiles: number;
    totalSize: number;
    languages: LanguageStats[];
}

export interface FileInfo {
    path: string;
    name: string;
    size: number;
    language: string;
    lastModified: Date;
    complexity?: number;
}

export interface DirectoryInfo {
    path: string;
    name: string;
    fileCount: number;
    subdirectories: string[];
}

export interface LanguageStats {
    language: string;
    fileCount: number;
    totalLines: number;
    percentage: number;
}

export interface CodePattern {
    name: string;
    type: 'architecture' | 'design' | 'code' | 'anti-pattern';
    description: string;
    occurrences: PatternOccurrence[];
    confidence: number;
}

export interface PatternOccurrence {
    file: string;
    line: number;
    snippet: string;
}

export interface FileChange {
    file: string;
    changeType: 'added' | 'modified' | 'deleted';
    timestamp: Date;
}

// Error handling interfaces
export interface ErrorContext {
    message: string;
    file: string;
    line: number;
    severity: vscode.DiagnosticSeverity;
    category: string;
    firstOccurred: Date;
    lastOccurred: Date;
    occurrenceCount: number;
}

// Progress monitoring interfaces
export interface ActivitySummary {
    timeRange: DateRange;
    filesModified: FileModificationSummary[];
    linesAdded: number;
    linesDeleted: number;
    commitsCount: number;
    errorsEncountered: ErrorSummary[];
    searchQueries: string[];
    documentationVisited: string[];
    codeReviews: number;
    discussions: number;
    knowledgeSharing: number;
    focusTimePercentage: number;
    contextSwitchingFrequency: number;
    deepWorkSessions: number;
}

export interface DateRange {
    start: Date;
    end: Date;
}

export interface FileModificationSummary {
    filepath: string;
    modificationsCount: number;
    linesChanged: number;
    lastModified: Date;
}

export interface ErrorSummary {
    errorType: string;
    occurrences: number;
    resolved: number;
    averageResolutionTime: number;
}

export interface WorkflowPhase {
    id: string;
    name: string;
    description: string;
    type: string;
    status: PhaseStatus;
    startedAt?: Date;
    completedAt?: Date;
    estimatedDuration: number;
    actualDuration?: number;
}

export type PhaseStatus = 'pending' | 'in-progress' | 'completed' | 'requires-review' | 'blocked';

// Memory System interfaces
export interface MemorySystem {
    recordExecution(execution: ExecutionMemory): Promise<void>;
    recordPattern(pattern: LearnedPattern): Promise<void>;
    getRecentMemories(count?: number): Promise<ExecutionMemory[]>;
    getLastExecution(): Promise<ExecutionMemory | null>;
    searchMemories(query: string): Promise<ExecutionMemory[]>;
    getLearnedPatterns(): Promise<LearnedPattern[]>;
    setRetentionDays(days: number): void;
    getTreeDataProvider(): vscode.TreeDataProvider<MemoryItem>;
    dispose(): void;
}

export interface ExecutionMemory {
    id?: string;
    input: string;
    context: ProjectContext;
    result: string;
    timestamp: Date;
    tags?: string[];
    rating?: number;
}

export interface LearnedPattern {
    id?: string;
    pattern: string;
    type: 'code' | 'workflow' | 'error' | 'solution';
    frequency: number;
    lastSeen: Date;
    examples: string[];
    metadata?: any;
}

export interface MemoryItem {
    id: string;
    label: string;
    type: 'execution' | 'pattern' | 'category';
    timestamp?: Date;
    children?: MemoryItem[];
}

// Gemini Workflow interfaces
export interface GeminiWorkflow {
    startWorkflow(): Promise<void>;
    executeStep(step: WorkflowStep): Promise<StepResult>;
    getCurrentWorkflow(): Workflow | null;
    getWorkflowHistory(): Workflow[];
    pauseWorkflow(): void;
    resumeWorkflow(): void;
    cancelWorkflow(): void;
    setComplexity(level: 'simple' | 'standard' | 'comprehensive'): void;
}

export interface Workflow {
    id: string;
    name: string;
    description: string;
    steps: WorkflowStep[];
    currentStep: number;
    status: 'planning' | 'executing' | 'paused' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    context: WorkflowContext;
    results: StepResult[];
}

export interface WorkflowStep {
    id: string;
    name: string;
    description: string;
    type: 'analysis' | 'implementation' | 'validation' | 'review';
    required: boolean;
    estimatedDuration?: number;
    dependencies?: string[];
    prompts?: string[];
}

export interface StepResult {
    stepId: string;
    status: 'success' | 'failure' | 'skipped';
    output: string;
    duration: number;
    timestamp: Date;
    artifacts?: WorkflowArtifact[];
}

export interface WorkflowContext {
    goal: string;
    constraints: string[];
    preferences: WorkflowPreferences;
    projectContext: ProjectContext;
}

export interface WorkflowPreferences {
    complexity: 'simple' | 'standard' | 'comprehensive';
    autoExecute: boolean;
    reviewRequired: boolean;
    preserveContext: boolean;
}

export interface WorkflowArtifact {
    type: 'code' | 'documentation' | 'diagram' | 'report';
    content: string;
    path?: string;
}

// Intelligent Triggers interfaces
export interface IntelligentTriggers {
    setEnabled(enabled: boolean): void;
    registerTrigger(trigger: Trigger): void;
    dispose(): void;
}

export interface Trigger {
    id: string;
    name: string;
    type: 'error' | 'pattern' | 'completion' | 'refactor' | 'documentation';
    condition: TriggerCondition;
    action: TriggerAction;
    priority: number;
    enabled: boolean;
}

export interface TriggerCondition {
    evaluate(context: TriggerContext): boolean | Promise<boolean>;
}

export interface TriggerContext {
    document: vscode.TextDocument;
    position: vscode.Position;
    recentEdits: vscode.TextDocumentChangeEvent[];
    diagnostics: vscode.Diagnostic[];
    projectContext: ProjectContext;
}

export interface TriggerAction {
    execute(context: TriggerContext): void | Promise<void>;
}

// UI Component interfaces
export interface WorkflowPanel {
    show(): Promise<void>;
    update(workflow: Workflow): void;
    dispose(): void;
}

export interface ContextViewer extends vscode.TreeDataProvider<ContextItem> {
    refresh(): void;
}

export interface ContextItem {
    id: string;
    label: string;
    type: 'project' | 'file' | 'dependency' | 'pattern';
    description?: string;
    tooltip?: string;
    iconPath?: vscode.ThemeIcon;
    children?: ContextItem[];
    command?: vscode.Command;
}

// Configuration interfaces
export interface ExtensionConfiguration {
    claudeCodePath: string;
    autoAnalyzeProjects: boolean;
    intelligentSuggestions: boolean;
    workflowComplexity: 'simple' | 'standard' | 'comprehensive';
    memoryRetention: number;
    contextWindowSize: number;
}

// Event interfaces
export interface WorkflowEvent {
    type: 'started' | 'step-completed' | 'paused' | 'resumed' | 'completed' | 'failed';
    workflow: Workflow;
    data?: any;
}

export interface MemoryEvent {
    type: 'execution-recorded' | 'pattern-learned' | 'memory-cleaned';
    data: any;
}

// Error handling
export interface ExtensionError extends Error {
    code: string;
    component: string;
    recoverable: boolean;
}