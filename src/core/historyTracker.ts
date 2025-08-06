import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';

export interface HistoryEntry {
    id: string;
    sessionId: string;
    timestamp: Date;
    type: 'execution' | 'decision' | 'workflow' | 'collaboration';
    
    // Execution details
    model: 'claude' | 'gemini' | 'both';
    input: string;
    output: string;
    context: any;
    
    // Performance metrics
    executionTime: number;
    tokensUsed: number;
    cost: number;
    
    // Quality metrics
    userRating?: number;
    successMetrics: SuccessMetrics;
    
    // Relationships
    parentId?: string;
    childIds: string[];
    relatedIds: string[];
    
    // Learning outcomes
    patternsIdentified: string[];
    lessonsLearned: string[];
    improvementSuggestions: string[];
}

export interface SuccessMetrics {
    accuracy: number;
    completeness: number;
    relevance: number;
    efficiency: number;
    overallScore: number;
}

export interface HistoryFilters {
    type?: string;
    model?: string;
    dateRange?: { start: Date; end: Date };
    minRating?: number;
    sessionId?: string;
}

export interface SessionInsights {
    totalExecutions: number;
    modelUsage: ModelUsageStats;
    successRate: number;
    averageExecutionTime: number;
    totalCost: number;
    topPatterns: string[];
    recommendations: string[];
}

export interface ModelUsageStats {
    claude: number;
    gemini: number;
    collaborative: number;
    total: number;
}

export interface HistoryIndex {
    byType: Map<string, HistoryEntry[]>;
    byModel: Map<string, HistoryEntry[]>;
    bySession: Map<string, HistoryEntry[]>;
    byPattern: Map<string, HistoryEntry[]>;
    byDate: Map<string, HistoryEntry[]>;
    index(entry: HistoryEntry): Promise<void>;
    searchSimilar(task: string, context: any, limit: number): Promise<HistoryEntry[]>;
}

export class HistoryTracker {
    private historyDatabase: Map<string, HistoryEntry[]> = new Map();
    private indexedHistory: HistoryIndex;
    private analytics: AnalyticsEngine;
    
    constructor(
        private context: vscode.ExtensionContext,
        private sessionManager: any
    ) {
        this.indexedHistory = this.createHistoryIndex();
        this.analytics = new AnalyticsEngine();
        this.loadHistoryDatabase();
    }
    
    async recordEntry(entry: Partial<HistoryEntry>): Promise<HistoryEntry> {
        const fullEntry: HistoryEntry = {
            id: uuidv4(),
            timestamp: new Date(),
            childIds: [],
            relatedIds: [],
            patternsIdentified: [],
            lessonsLearned: [],
            improvementSuggestions: [],
            successMetrics: {
                accuracy: 0,
                completeness: 0,
                relevance: 0,
                efficiency: 0,
                overallScore: 0
            },
            ...entry
        } as HistoryEntry;
        
        // Add to session history
        if (fullEntry.sessionId) {
            const sessionHistory = this.historyDatabase.get(fullEntry.sessionId) || [];
            sessionHistory.push(fullEntry);
            this.historyDatabase.set(fullEntry.sessionId, sessionHistory);
        }
        
        // Index for fast retrieval
        await this.indexedHistory.index(fullEntry);
        
        // Analyze for patterns
        const patterns = await this.analytics.analyzeEntry(fullEntry);
        fullEntry.patternsIdentified = patterns;
        
        // Calculate success metrics
        fullEntry.successMetrics = await this.calculateSuccessMetrics(fullEntry);
        
        // Save to persistent storage
        await this.saveEntry(fullEntry);
        
        console.log(`📝 Recorded history entry: ${fullEntry.type} by ${fullEntry.model}`);
        
        return fullEntry;
    }
    
    async findSimilarExecutions(
        task: string,
        context: any,
        limit: number = 10
    ): Promise<HistoryEntry[]> {
        return this.indexedHistory.searchSimilar(task, context, limit);
    }
    
    async getSessionHistory(
        sessionId: string,
        filters?: HistoryFilters
    ): Promise<HistoryEntry[]> {
        let history = this.historyDatabase.get(sessionId) || [];
        
        if (filters) {
            history = this.applyFilters(history, filters);
        }
        
        return history.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }
    
    async generateInsights(sessionId: string): Promise<SessionInsights> {
        const history = await this.getSessionHistory(sessionId);
        
        return {
            totalExecutions: history.length,
            modelUsage: this.analyzeModelUsage(history),
            successRate: this.calculateSuccessRate(history),
            averageExecutionTime: this.calculateAverageTime(history),
            totalCost: this.calculateTotalCost(history),
            topPatterns: this.extractTopPatterns(history),
            recommendations: await this.generateRecommendations(history)
        };
    }
    
    async getGlobalInsights(): Promise<SessionInsights> {
        const allHistory: HistoryEntry[] = [];
        
        for (const sessionHistory of this.historyDatabase.values()) {
            allHistory.push(...sessionHistory);
        }
        
        return {
            totalExecutions: allHistory.length,
            modelUsage: this.analyzeModelUsage(allHistory),
            successRate: this.calculateSuccessRate(allHistory),
            averageExecutionTime: this.calculateAverageTime(allHistory),
            totalCost: this.calculateTotalCost(allHistory),
            topPatterns: this.extractTopPatterns(allHistory),
            recommendations: await this.generateRecommendations(allHistory)
        };
    }
    
    async searchHistory(
        query: string,
        filters?: HistoryFilters
    ): Promise<HistoryEntry[]> {
        const results: HistoryEntry[] = [];
        const queryLower = query.toLowerCase();
        
        for (const sessionHistory of this.historyDatabase.values()) {
            for (const entry of sessionHistory) {
                if (this.matchesQuery(entry, queryLower) && this.matchesFilters(entry, filters)) {
                    results.push(entry);
                }
            }
        }
        
        return results.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }
    
    async getTrends(days: number = 30): Promise<any> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const recentHistory: HistoryEntry[] = [];
        
        for (const sessionHistory of this.historyDatabase.values()) {
            recentHistory.push(...sessionHistory.filter(entry => 
                new Date(entry.timestamp) > cutoffDate
            ));
        }
        
        return {
            totalExecutions: recentHistory.length,
            dailyAverage: recentHistory.length / days,
            modelTrends: this.calculateModelTrends(recentHistory),
            successTrends: this.calculateSuccessTrends(recentHistory),
            costTrends: this.calculateCostTrends(recentHistory)
        };
    }
    
    private createHistoryIndex(): HistoryIndex {
        const index = {
            byType: new Map<string, HistoryEntry[]>(),
            byModel: new Map<string, HistoryEntry[]>(),
            bySession: new Map<string, HistoryEntry[]>(),
            byPattern: new Map<string, HistoryEntry[]>(),
            byDate: new Map<string, HistoryEntry[]>(),
            
            async index(entry: HistoryEntry): Promise<void> {
                // Index by type
                if (!this.byType.has(entry.type)) {
                    this.byType.set(entry.type, []);
                }
                this.byType.get(entry.type)!.push(entry);
                
                // Index by model
                if (!this.byModel.has(entry.model)) {
                    this.byModel.set(entry.model, []);
                }
                this.byModel.get(entry.model)!.push(entry);
                
                // Index by session
                if (!this.bySession.has(entry.sessionId)) {
                    this.bySession.set(entry.sessionId, []);
                }
                this.bySession.get(entry.sessionId)!.push(entry);
                
                // Index by date (daily)
                const dateKey = entry.timestamp.toISOString().split('T')[0];
                if (!this.byDate.has(dateKey)) {
                    this.byDate.set(dateKey, []);
                }
                this.byDate.get(dateKey)!.push(entry);
                
                // Index by patterns
                for (const pattern of entry.patternsIdentified) {
                    if (!this.byPattern.has(pattern)) {
                        this.byPattern.set(pattern, []);
                    }
                    this.byPattern.get(pattern)!.push(entry);
                }
            },
            
            async searchSimilar(task: string, context: any, limit: number): Promise<HistoryEntry[]> {
                // Simple similarity search - in practice, this would use embeddings
                const results: HistoryEntry[] = [];
                const taskLower = task.toLowerCase();
                
                for (const entries of this.byType.values()) {
                    for (const entry of entries) {
                        if (entry.input.toLowerCase().includes(taskLower) ||
                            entry.output.toLowerCase().includes(taskLower)) {
                            results.push(entry);
                            if (results.length >= limit) break;
                        }
                    }
                    if (results.length >= limit) break;
                }
                
                return results;
            }
        };
        
        return index;
    }
    
    private async indexEntry(entry: HistoryEntry): Promise<void> {
        // Index by type
        if (!this.indexedHistory.byType.has(entry.type)) {
            this.indexedHistory.byType.set(entry.type, []);
        }
        this.indexedHistory.byType.get(entry.type)!.push(entry);
        
        // Index by model
        if (!this.indexedHistory.byModel.has(entry.model)) {
            this.indexedHistory.byModel.set(entry.model, []);
        }
        this.indexedHistory.byModel.get(entry.model)!.push(entry);
        
        // Index by session
        if (!this.indexedHistory.bySession.has(entry.sessionId)) {
            this.indexedHistory.bySession.set(entry.sessionId, []);
        }
        this.indexedHistory.bySession.get(entry.sessionId)!.push(entry);
        
        // Index by date (daily)
        const dateKey = entry.timestamp.toISOString().split('T')[0];
        if (!this.indexedHistory.byDate.has(dateKey)) {
            this.indexedHistory.byDate.set(dateKey, []);
        }
        this.indexedHistory.byDate.get(dateKey)!.push(entry);
        
        // Index by patterns
        for (const pattern of entry.patternsIdentified) {
            if (!this.indexedHistory.byPattern.has(pattern)) {
                this.indexedHistory.byPattern.set(pattern, []);
            }
            this.indexedHistory.byPattern.get(pattern)!.push(entry);
        }
    }
    
    private async calculateSuccessMetrics(entry: HistoryEntry): Promise<SuccessMetrics> {
        // Calculate metrics based on entry type and content
        let accuracy = 0.8; // Default
        let completeness = 0.8;
        let relevance = 0.8;
        let efficiency = 0.8;
        
        // Analyze output quality
        if (entry.output) {
            accuracy = this.analyzeAccuracy(entry.output);
            completeness = this.analyzeCompleteness(entry.output);
            relevance = this.analyzeRelevance(entry.input, entry.output);
        }
        
        // Analyze efficiency based on execution time
        if (entry.executionTime) {
            efficiency = this.analyzeEfficiency(entry.executionTime, entry.type);
        }
        
        const overallScore = (accuracy + completeness + relevance + efficiency) / 4;
        
        return {
            accuracy,
            completeness,
            relevance,
            efficiency,
            overallScore
        };
    }
    
    private analyzeAccuracy(output: string): number {
        // Simple accuracy analysis - in practice, this would be more sophisticated
        const hasError = output.toLowerCase().includes('error') || 
                        output.toLowerCase().includes('failed') ||
                        output.toLowerCase().includes('cannot');
        
        return hasError ? 0.3 : 0.9;
    }
    
    private analyzeCompleteness(output: string): number {
        // Analyze if the output addresses the input comprehensively
        const lines = output.split('\n').filter(line => line.trim().length > 0);
        return Math.min(1.0, lines.length / 10); // Normalize to 0-1
    }
    
    private analyzeRelevance(input: string, output: string): number {
        // Simple relevance analysis
        const inputWords = input.toLowerCase().split(/\s+/);
        const outputWords = output.toLowerCase().split(/\s+/);
        
        const commonWords = inputWords.filter(word => 
            outputWords.includes(word) && word.length > 3
        );
        
        return Math.min(1.0, commonWords.length / Math.max(inputWords.length, 1));
    }
    
    private analyzeEfficiency(executionTime: number, type: string): number {
        // Analyze efficiency based on execution time and type
        const expectedTime = this.getExpectedTime(type);
        return Math.min(1.0, expectedTime / Math.max(executionTime, 1));
    }
    
    private getExpectedTime(type: string): number {
        switch (type) {
            case 'execution':
                return 5000; // 5 seconds
            case 'workflow':
                return 30000; // 30 seconds
            case 'collaboration':
                return 60000; // 1 minute
            default:
                return 10000; // 10 seconds
        }
    }
    
    private analyzeModelUsage(history: HistoryEntry[]): ModelUsageStats {
        const stats: ModelUsageStats = {
            claude: 0,
            gemini: 0,
            collaborative: 0,
            total: history.length
        };
        
        for (const entry of history) {
            switch (entry.model) {
                case 'claude':
                    stats.claude++;
                    break;
                case 'gemini':
                    stats.gemini++;
                    break;
                case 'both':
                    stats.collaborative++;
                    break;
            }
        }
        
        return stats;
    }
    
    private calculateSuccessRate(history: HistoryEntry[]): number {
        if (history.length === 0) return 0;
        
        const successful = history.filter(entry => 
            entry.successMetrics.overallScore > 0.7
        ).length;
        
        return successful / history.length;
    }
    
    private calculateAverageTime(history: HistoryEntry[]): number {
        if (history.length === 0) return 0;
        
        const totalTime = history.reduce((sum, entry) => sum + entry.executionTime, 0);
        return totalTime / history.length;
    }
    
    private calculateTotalCost(history: HistoryEntry[]): number {
        return history.reduce((sum, entry) => sum + entry.cost, 0);
    }
    
    private extractTopPatterns(history: HistoryEntry[]): string[] {
        const patternCounts = new Map<string, number>();
        
        for (const entry of history) {
            for (const pattern of entry.patternsIdentified) {
                patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
            }
        }
        
        return Array.from(patternCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([pattern]) => pattern);
    }
    
    private async generateRecommendations(history: HistoryEntry[]): Promise<string[]> {
        const recommendations: string[] = [];
        
        // Analyze patterns and generate recommendations
        const modelUsage = this.analyzeModelUsage(history);
        const successRate = this.calculateSuccessRate(history);
        
        if (modelUsage.collaborative / modelUsage.total < 0.2) {
            recommendations.push('Consider using collaborative mode more often for complex tasks');
        }
        
        if (successRate < 0.8) {
            recommendations.push('Review failed executions to improve success rate');
        }
        
        if (modelUsage.claude / modelUsage.total > 0.8) {
            recommendations.push('Try using Gemini for different types of tasks');
        }
        
        return recommendations;
    }
    
    private applyFilters(history: HistoryEntry[], filters: HistoryFilters): HistoryEntry[] {
        return history.filter(entry => this.matchesFilters(entry, filters));
    }
    
    private matchesFilters(entry: HistoryEntry, filters?: HistoryFilters): boolean {
        if (!filters) return true;
        
        if (filters.type && entry.type !== filters.type) return false;
        if (filters.model && entry.model !== filters.model) return false;
        if (filters.minRating && (entry.userRating || 0) < filters.minRating) return false;
        if (filters.sessionId && entry.sessionId !== filters.sessionId) return false;
        
        if (filters.dateRange) {
            const entryDate = new Date(entry.timestamp);
            if (entryDate < filters.dateRange.start || entryDate > filters.dateRange.end) {
                return false;
            }
        }
        
        return true;
    }
    
    private matchesQuery(entry: HistoryEntry, query: string): boolean {
        return entry.input.toLowerCase().includes(query) ||
               entry.output.toLowerCase().includes(query) ||
               entry.patternsIdentified.some(pattern => 
                   pattern.toLowerCase().includes(query)
               );
    }
    
    private calculateModelTrends(history: HistoryEntry[]): any {
        // Calculate trends over time
        const dailyStats = new Map<string, ModelUsageStats>();
        
        for (const entry of history) {
            const dateKey = entry.timestamp.toISOString().split('T')[0];
            const stats = dailyStats.get(dateKey) || {
                claude: 0, gemini: 0, collaborative: 0, total: 0
            };
            
            switch (entry.model) {
                case 'claude':
                    stats.claude++;
                    break;
                case 'gemini':
                    stats.gemini++;
                    break;
                case 'both':
                    stats.collaborative++;
                    break;
            }
            
            stats.total++;
            dailyStats.set(dateKey, stats);
        }
        
        return Array.from(dailyStats.entries());
    }
    
    private calculateSuccessTrends(history: HistoryEntry[]): any {
        // Calculate success rate trends over time
        const dailySuccess = new Map<string, { success: number; total: number }>();
        
        for (const entry of history) {
            const dateKey = entry.timestamp.toISOString().split('T')[0];
            const stats = dailySuccess.get(dateKey) || { success: 0, total: 0 };
            
            if (entry.successMetrics.overallScore > 0.7) {
                stats.success++;
            }
            stats.total++;
            
            dailySuccess.set(dateKey, stats);
        }
        
        return Array.from(dailySuccess.entries()).map(([date, stats]) => ({
            date,
            successRate: stats.total > 0 ? stats.success / stats.total : 0
        }));
    }
    
    private calculateCostTrends(history: HistoryEntry[]): any {
        // Calculate cost trends over time
        const dailyCosts = new Map<string, number>();
        
        for (const entry of history) {
            const dateKey = entry.timestamp.toISOString().split('T')[0];
            const currentCost = dailyCosts.get(dateKey) || 0;
            dailyCosts.set(dateKey, currentCost + entry.cost);
        }
        
        return Array.from(dailyCosts.entries());
    }
    
    private async loadHistoryDatabase(): Promise<void> {
        try {
            const historyPath = vscode.Uri.joinPath(
                this.context.globalStorageUri,
                'history'
            );
            
            // Load history from storage
            const files = await vscode.workspace.fs.readDirectory(historyPath);
            
            for (const file of files) {
                if (file[1] === vscode.FileType.File && file[0].endsWith('.json')) {
                    const filePath = vscode.Uri.joinPath(historyPath, file[0]);
                    const data = await vscode.workspace.fs.readFile(filePath);
                    const sessionHistory = JSON.parse(data.toString()) as HistoryEntry[];
                    
                    // Convert dates
                    sessionHistory.forEach(entry => {
                        entry.timestamp = new Date(entry.timestamp);
                    });
                    
                    const sessionId = file[0].replace('.json', '');
                    this.historyDatabase.set(sessionId, sessionHistory);
                }
            }
            
            console.log(`📚 Loaded history database with ${this.historyDatabase.size} sessions`);
        } catch (error) {
            console.error('❌ Failed to load history database:', error);
        }
    }
    
    private async saveEntry(entry: HistoryEntry): Promise<void> {
        try {
            const historyPath = vscode.Uri.joinPath(
                this.context.globalStorageUri,
                'history'
            );
            
            await vscode.workspace.fs.createDirectory(historyPath);
            
            const filePath = vscode.Uri.joinPath(
                historyPath,
                `${entry.sessionId}.json`
            );
            
            // Get existing history for this session
            const existingHistory = this.historyDatabase.get(entry.sessionId) || [];
            existingHistory.push(entry);
            
            // Save to file
            await vscode.workspace.fs.writeFile(
                filePath,
                Buffer.from(JSON.stringify(existingHistory, null, 2), 'utf8')
            );
        } catch (error) {
            console.error('❌ Failed to save history entry:', error);
        }
    }
}

// Analytics engine for pattern analysis
class AnalyticsEngine {
    async analyzeEntry(entry: HistoryEntry): Promise<string[]> {
        const patterns: string[] = [];
        
        // Analyze input patterns
        patterns.push(...this.analyzeInputPatterns(entry.input));
        
        // Analyze output patterns
        patterns.push(...this.analyzeOutputPatterns(entry.output));
        
        // Analyze execution patterns
        patterns.push(...this.analyzeExecutionPatterns(entry));
        
        return patterns;
    }
    
    private analyzeInputPatterns(input: string): string[] {
        const patterns: string[] = [];
        
        if (input.toLowerCase().includes('debug')) patterns.push('debugging-request');
        if (input.toLowerCase().includes('refactor')) patterns.push('refactoring-request');
        if (input.toLowerCase().includes('generate')) patterns.push('code-generation');
        if (input.toLowerCase().includes('test')) patterns.push('testing-request');
        if (input.toLowerCase().includes('optimize')) patterns.push('optimization-request');
        
        return patterns;
    }
    
    private analyzeOutputPatterns(output: string): string[] {
        const patterns: string[] = [];
        
        if (output.includes('function') || output.includes('class')) patterns.push('code-structure');
        if (output.includes('error') || output.includes('exception')) patterns.push('error-handling');
        if (output.includes('//') || output.includes('/*')) patterns.push('commented-code');
        if (output.includes('import') || output.includes('require')) patterns.push('dependency-management');
        
        return patterns;
    }
    
    private analyzeExecutionPatterns(entry: HistoryEntry): string[] {
        const patterns: string[] = [];
        
        if (entry.executionTime > 30000) patterns.push('long-execution');
        if (entry.executionTime < 5000) patterns.push('quick-execution');
        if (entry.cost > 0.1) patterns.push('high-cost');
        if (entry.successMetrics.overallScore > 0.9) patterns.push('high-quality');
        if (entry.successMetrics.overallScore < 0.5) patterns.push('low-quality');
        
        return patterns;
    }
} 