import * as vscode from 'vscode';
import * as path from 'path';
import { 
    ExecutionMemory, 
    LearnedPattern, 
    MemoryItem,
    ProjectContext 
} from '../types/interfaces';

export class MemorySystem implements vscode.TreeDataProvider<MemoryItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<MemoryItem | undefined | null | void> = new vscode.EventEmitter<MemoryItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MemoryItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private memories: ExecutionMemory[] = [];
    private patterns: LearnedPattern[] = [];
    private retentionDays: number = 30;
    private memoryFile: vscode.Uri;
    private patternsFile: vscode.Uri;
    private saveDebounceTimer: NodeJS.Timeout | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.memoryFile = vscode.Uri.joinPath(context.globalStorageUri, 'memories.json');
        this.patternsFile = vscode.Uri.joinPath(context.globalStorageUri, 'patterns.json');
        this.loadMemories();
    }

    async recordExecution(execution: ExecutionMemory): Promise<void> {
        // Add unique ID and timestamp
        execution.id = this.generateId();
        execution.timestamp = execution.timestamp || new Date();
        
        // Add to memories
        this.memories.unshift(execution);
        
        // Learn from this execution
        await this.learnFromExecution(execution);
        
        // Trim old memories
        this.trimOldMemories();
        
        // Save with debounce
        this.scheduleSave();
        
        // Update tree view
        this._onDidChangeTreeData.fire();
    }

    async recordPattern(pattern: LearnedPattern): Promise<void> {
        pattern.id = pattern.id || this.generateId();
        pattern.lastSeen = new Date();
        
        // Check if pattern already exists
        const existingIndex = this.patterns.findIndex(p => p.pattern === pattern.pattern);
        
        if (existingIndex >= 0) {
            // Update existing pattern
            const existing = this.patterns[existingIndex];
            existing.frequency++;
            existing.lastSeen = pattern.lastSeen;
            existing.examples = [...existing.examples, ...pattern.examples].slice(-10); // Keep last 10 examples
            if (pattern.metadata) {
                existing.metadata = { ...existing.metadata, ...pattern.metadata };
            }
        } else {
            // Add new pattern
            this.patterns.push(pattern);
        }
        
        // Sort patterns by frequency
        this.patterns.sort((a, b) => b.frequency - a.frequency);
        
        // Save with debounce
        this.scheduleSave();
        
        // Update tree view
        this._onDidChangeTreeData.fire();
    }

    async getRecentMemories(count: number = 10): Promise<ExecutionMemory[]> {
        return this.memories.slice(0, count);
    }

    async getLastExecution(): Promise<ExecutionMemory | null> {
        return this.memories[0] || null;
    }

    async searchMemories(query: string): Promise<ExecutionMemory[]> {
        const lowerQuery = query.toLowerCase();
        return this.memories.filter(memory => 
            memory.input.toLowerCase().includes(lowerQuery) ||
            memory.result.toLowerCase().includes(lowerQuery) ||
            memory.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
            JSON.stringify(memory.context).toLowerCase().includes(lowerQuery)
        );
    }

    async getLearnedPatterns(): Promise<LearnedPattern[]> {
        return this.patterns;
    }

    setRetentionDays(days: number): void {
        this.retentionDays = days;
        this.trimOldMemories();
    }

    getTreeDataProvider(): vscode.TreeDataProvider<MemoryItem> {
        return this;
    }

    // TreeDataProvider implementation
    getTreeItem(element: MemoryItem): vscode.TreeItem {
        const item = new vscode.TreeItem(
            element.label,
            element.children ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
        );
        
        item.id = element.id;
        item.tooltip = this.getTooltip(element);
        item.contextValue = element.type;
        
        // Set appropriate icon
        switch (element.type) {
            case 'execution':
                item.iconPath = new vscode.ThemeIcon('debug-start');
                break;
            case 'pattern':
                item.iconPath = new vscode.ThemeIcon('lightbulb');
                break;
            case 'category':
                item.iconPath = new vscode.ThemeIcon('folder');
                break;
        }
        
        // Add command to view details
        if (element.type === 'execution' || element.type === 'pattern') {
            item.command = {
                command: 'claude-assistant.viewMemoryItem',
                title: 'View Details',
                arguments: [element]
            };
        }
        
        return item;
    }

    getChildren(element?: MemoryItem): Thenable<MemoryItem[]> {
        if (!element) {
            // Root level - show categories
            return Promise.resolve([
                {
                    id: 'recent-executions',
                    label: 'Recent Executions',
                    type: 'category',
                    children: this.getRecentExecutionItems()
                },
                {
                    id: 'learned-patterns',
                    label: 'Learned Patterns',
                    type: 'category',
                    children: this.getPatternItems()
                }
            ]);
        }
        
        return Promise.resolve(element.children || []);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    dispose(): void {
        this.saveMemories();
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
    }

    private async learnFromExecution(execution: ExecutionMemory): Promise<void> {
        // Extract patterns from successful executions
        if (!execution.result.toLowerCase().includes('error') && 
            !execution.result.toLowerCase().includes('failed')) {
            
            // Learn command patterns
            const commandPattern = this.extractCommandPattern(execution.input);
            if (commandPattern) {
                await this.recordPattern({
                    pattern: commandPattern,
                    type: 'code',
                    frequency: 1,
                    lastSeen: new Date(),
                    examples: [execution.input],
                    metadata: {
                        context: execution.context.projectType,
                        frameworks: execution.context.frameworks
                    }
                });
            }
            
            // Learn workflow patterns
            if (execution.tags?.includes('workflow')) {
                await this.recordPattern({
                    pattern: `Workflow: ${execution.tags.join(' -> ')}`,
                    type: 'workflow',
                    frequency: 1,
                    lastSeen: new Date(),
                    examples: [execution.input],
                    metadata: {
                        duration: execution.timestamp
                    }
                });
            }
        } else {
            // Learn from errors
            const errorPattern = this.extractErrorPattern(execution.result);
            if (errorPattern) {
                await this.recordPattern({
                    pattern: errorPattern,
                    type: 'error',
                    frequency: 1,
                    lastSeen: new Date(),
                    examples: [execution.input],
                    metadata: {
                        solution: this.suggestSolution(errorPattern)
                    }
                });
            }
        }
    }

    private extractCommandPattern(input: string): string | null {
        // Extract common command patterns
        const patterns = [
            /^(create|generate|add)\s+(\w+)\s+(?:for|in|to)\s+(\w+)/i,
            /^(refactor|optimize|improve)\s+(\w+)/i,
            /^(fix|resolve|debug)\s+(.+)/i,
            /^(implement|build|develop)\s+(.+)/i,
            /^(test|validate|check)\s+(.+)/i
        ];
        
        for (const pattern of patterns) {
            const match = input.match(pattern);
            if (match) {
                return match[0];
            }
        }
        
        return null;
    }

    private extractErrorPattern(result: string): string | null {
        // Extract common error patterns
        const errorPatterns = [
            /TypeError:\s+(.+)/,
            /SyntaxError:\s+(.+)/,
            /ReferenceError:\s+(.+)/,
            /Error:\s+(.+)/,
            /failed to\s+(.+)/i,
            /cannot\s+(.+)/i,
            /unable to\s+(.+)/i
        ];
        
        for (const pattern of errorPatterns) {
            const match = result.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        
        return null;
    }

    private suggestSolution(errorPattern: string): string {
        // Simple solution suggestions based on error patterns
        const solutions: { [key: string]: string } = {
            'undefined': 'Check if the variable or property is defined before use',
            'null': 'Add null checks before accessing properties',
            'import': 'Verify import paths and module exports',
            'syntax': 'Check for missing brackets, quotes, or semicolons',
            'type': 'Ensure correct types are being used',
            'permission': 'Check file permissions and access rights',
            'network': 'Verify network connectivity and endpoints'
        };
        
        const lowerError = errorPattern.toLowerCase();
        for (const [key, solution] of Object.entries(solutions)) {
            if (lowerError.includes(key)) {
                return solution;
            }
        }
        
        return 'Review the error message and check documentation';
    }

    private getRecentExecutionItems(): MemoryItem[] {
        return this.memories.slice(0, 20).map(memory => ({
            id: memory.id!,
            label: new Date(memory.timestamp).toLocaleString(),
            type: 'execution',
            timestamp: memory.timestamp
        }));
    }

    private getPatternItems(): MemoryItem[] {
        return this.patterns.slice(0, 20).map(pattern => ({
            id: pattern.id!,
            label: `${pattern.pattern} (${pattern.frequency}x)`,
            type: 'pattern',
            timestamp: pattern.lastSeen
        }));
    }

    private getTooltip(element: MemoryItem): string {
        if (element.type === 'execution') {
            const memory = this.memories.find(m => m.id === element.id);
            if (memory) {
                return `Input: ${memory.input.substring(0, 100)}...\nResult: ${memory.result.substring(0, 100)}...`;
            }
        } else if (element.type === 'pattern') {
            const pattern = this.patterns.find(p => p.id === element.id);
            if (pattern) {
                return `Type: ${pattern.type}\nLast seen: ${pattern.lastSeen.toLocaleString()}\nExamples: ${pattern.examples.length}`;
            }
        }
        
        return element.label;
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private trimOldMemories(): void {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
        
        this.memories = this.memories.filter(memory => 
            new Date(memory.timestamp) > cutoffDate
        );
    }

    private scheduleSave(): void {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        
        this.saveDebounceTimer = setTimeout(() => {
            this.saveMemories();
        }, 5000); // Save after 5 seconds of inactivity
    }

    private async loadMemories(): Promise<void> {
        try {
            // Load execution memories
            const memoriesData = await vscode.workspace.fs.readFile(this.memoryFile);
            this.memories = JSON.parse(memoriesData.toString());
            
            // Convert date strings back to Date objects
            this.memories.forEach(memory => {
                memory.timestamp = new Date(memory.timestamp);
            });
        } catch (error) {
            // File doesn't exist yet
            this.memories = [];
        }
        
        try {
            // Load learned patterns
            const patternsData = await vscode.workspace.fs.readFile(this.patternsFile);
            this.patterns = JSON.parse(patternsData.toString());
            
            // Convert date strings back to Date objects
            this.patterns.forEach(pattern => {
                pattern.lastSeen = new Date(pattern.lastSeen);
            });
        } catch (error) {
            // File doesn't exist yet
            this.patterns = [];
        }
    }

    private async saveMemories(): Promise<void> {
        try {
            // Ensure directory exists
            await vscode.workspace.fs.createDirectory(this.context.globalStorageUri);
            
            // Save execution memories
            await vscode.workspace.fs.writeFile(
                this.memoryFile,
                Buffer.from(JSON.stringify(this.memories, null, 2), 'utf8')
            );
            
            // Save learned patterns
            await vscode.workspace.fs.writeFile(
                this.patternsFile,
                Buffer.from(JSON.stringify(this.patterns, null, 2), 'utf8')
            );
        } catch (error) {
            console.error('Failed to save memories:', error);
        }
    }
}