import * as vscode from 'vscode';
import { MemorySystem } from '../core/memorySystem';
import { ProjectIntelligence } from '../core/projectIntelligence';
import { ExecutionMemory, LearnedPattern, ProjectContext } from '../types/interfaces';

/**
 * MemoryAwareHook ensures that all AI assistant interactions automatically
 * reference relevant memories and patterns before execution, making them
 * memory-aware by default.
 */
export class MemoryAwareHook {
    private disposables: vscode.Disposable[] = [];
    private enabled: boolean = true;

    constructor(
        private _memorySystem: MemorySystem,
        private _projectIntelligence: ProjectIntelligence
    ) {
        this.setupHooks();
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Enhanced context builder that automatically includes relevant memories and patterns
     */
    async buildEnhancedContext(
        baseContext: ProjectContext,
        userInput: string,
        taskType: 'analysis' | 'implementation' | 'debug' | 'refactor' | 'general' = 'general'
    ): Promise<EnhancedContext> {
        if (!this.enabled) {
            return { baseContext, memories: [], patterns: [], insights: [] };
        }

        // Find relevant memories
        const relevantMemories = await this.findRelevantMemories(userInput, baseContext);

        // Find relevant patterns
        const relevantPatterns = await this.findRelevantPatterns(userInput, baseContext, taskType);

        // Generate contextual insights
        const insights = await this.generateContextualInsights(
            userInput, 
            relevantMemories, 
            relevantPatterns, 
            taskType
        );

        return {
            baseContext,
            memories: relevantMemories,
            patterns: relevantPatterns,
            insights
        };
    }

    /**
     * Formats enhanced context for AI consumption
     */
    formatContextForAI(enhancedContext: EnhancedContext): string {
        const sections: string[] = [];

        // Base project context (existing)
        sections.push(this.formatProjectContext(enhancedContext.baseContext));

        // Memory section
        if (enhancedContext.memories.length > 0) {
            sections.push(this.formatMemoryContext(enhancedContext.memories));
        }

        // Pattern section
        if (enhancedContext.patterns.length > 0) {
            sections.push(this.formatPatternContext(enhancedContext.patterns));
        }

        // Insights section
        if (enhancedContext.insights.length > 0) {
            sections.push(this.formatInsightsContext(enhancedContext.insights));
        }

        return sections.join('\n\n');
    }

    /**
     * Registers hooks for automatic memory lookup before AI interactions
     */
    private setupHooks(): void {
        // Hook into VS Code commands that trigger AI interactions
        this.disposables.push(
            vscode.commands.registerCommand('claude-assistant.enhancedExecuteWithContext', 
                async (code: string, context: ProjectContext) => {
                    const enhanced = await this.buildEnhancedContext(context, code, 'implementation');
                    const formattedContext = this.formatContextForAI(enhanced);
                    
                    // Trigger original command with enhanced context
                    return vscode.commands.executeCommand('claude-assistant.executeWithContext', {
                        code,
                        enhancedContext: formattedContext
                    });
                }
            )
        );

        // Hook for workflow initiation
        this.disposables.push(
            vscode.commands.registerCommand('claude-assistant.enhancedStartWorkflow',
                async (goal: string) => {
                    const baseContext = await this._projectIntelligence.getContextForFile(
                        vscode.window.activeTextEditor?.document.uri || vscode.workspace.workspaceFolders?.[0]?.uri!
                    );
                    
                    const enhanced = await this.buildEnhancedContext(baseContext, goal, 'analysis');
                    
                    // Pass enhanced context to workflow
                    return vscode.commands.executeCommand('claude-assistant.startGeminiWorkflow', {
                        goal,
                        enhancedContext: enhanced
                    });
                }
            )
        );
    }

    private async findRelevantMemories(input: string, _context: ProjectContext): Promise<ExecutionMemory[]> {
        const keywords = this.extractKeywords(input);
        let relevantMemories: ExecutionMemory[] = [];

        // Search by keywords
        for (const keyword of keywords) {
            const memories = await this._memorySystem.searchMemories(keyword);
            relevantMemories = relevantMemories.concat(memories);
        }

        // Remove duplicates and sort by relevance
        const uniqueMemories = Array.from(new Map(
            relevantMemories.map(m => [m.id, m])
        ).values());

        // Score memories by relevance
        const scoredMemories = uniqueMemories.map(memory => ({
            memory,
            score: this.calculateMemoryRelevance(memory, input, _context)
        }));

        return scoredMemories
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(item => item.memory);
    }

    private async findRelevantPatterns(
        input: string, 
        _context: ProjectContext, 
        taskType: string
    ): Promise<LearnedPattern[]> {
        const patterns = await this._memorySystem.getLearnedPatterns();
        const keywords = this.extractKeywords(input);

        return patterns.filter(pattern => {
            // Filter by task type relevance
            if (taskType === 'debug' && pattern.type !== 'error') return false;
            if (taskType === 'implementation' && pattern.type === 'error') return false;

            // Check keyword relevance
            const patternText = `${pattern.pattern} ${pattern.examples.join(' ')}`.toLowerCase();
            return keywords.some(keyword => patternText.includes(keyword.toLowerCase()));
        }).sort((a, b) => {
            // Sort by frequency and recency
            const aScore = a.frequency + (Date.now() - a.lastSeen.getTime()) / (1000 * 60 * 60 * 24 * 30);
            const bScore = b.frequency + (Date.now() - b.lastSeen.getTime()) / (1000 * 60 * 60 * 24 * 30);
            return bScore - aScore;
        }).slice(0, 3);
    }

    private async generateContextualInsights(
        _input: string,
        memories: ExecutionMemory[],
        patterns: LearnedPattern[],
        taskType: string
    ): Promise<ContextualInsight[]> {
        const insights: ContextualInsight[] = [];

        // Success pattern insights
        const successfulMemories = memories.filter(m => m.rating && m.rating > 3);
        if (successfulMemories.length > 0) {
            insights.push({
                type: 'success_pattern',
                message: `Based on ${successfulMemories.length} similar successful executions, consider these approaches that worked well before.`,
                confidence: Math.min(successfulMemories.length / 3, 1.0),
                relatedMemories: successfulMemories.slice(0, 2)
            });
        }

        // Error prevention insights
        const errorPatterns = patterns.filter(p => p.type === 'error');
        if (errorPatterns.length > 0 && taskType === 'implementation') {
            insights.push({
                type: 'error_prevention',
                message: `Watch out for these common issues: ${errorPatterns.map(p => p.pattern).join(', ')}`,
                confidence: 0.8,
                relatedPatterns: errorPatterns.slice(0, 2)
            });
        }

        // Workflow efficiency insights
        const workflowPatterns = patterns.filter(p => p.type === 'workflow');
        if (workflowPatterns.length > 0 && taskType === 'analysis') {
            insights.push({
                type: 'workflow_efficiency',
                message: `Consider using these proven workflow patterns: ${workflowPatterns.map(p => p.pattern).join(', ')}`,
                confidence: 0.7,
                relatedPatterns: workflowPatterns.slice(0, 2)
            });
        }

        return insights;
    }

    private calculateMemoryRelevance(memory: ExecutionMemory, input: string, context: ProjectContext): number {
        let score = 0;

        // Keyword matching
        const inputKeywords = this.extractKeywords(input);
        const memoryKeywords = this.extractKeywords(memory.input + ' ' + memory.result);
        const commonKeywords = inputKeywords.filter(k => 
            memoryKeywords.some(mk => mk.toLowerCase().includes(k.toLowerCase()))
        );
        score += commonKeywords.length * 2;

        // Context similarity (same file type, similar project structure)
        if (memory.context.projectType === context.projectType) score += 3;
        if (memory.context.frameworks.some(f => context.frameworks.includes(f))) score += 2;

        // Recency bonus (more recent memories are more relevant)
        const daysSince = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 10 - daysSince);

        // Success rating bonus
        if (memory.rating && memory.rating > 3) score += memory.rating;

        return score;
    }

    private extractKeywords(text: string): string[] {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3)
            .filter(word => !this.isStopWord(word))
            .slice(0, 15);
    }

    private isStopWord(word: string): boolean {
        const stopWords = [
            'this', 'that', 'with', 'have', 'will', 'from', 'they', 'been',
            'their', 'said', 'each', 'which', 'would', 'there', 'could',
            'function', 'method', 'class', 'interface', 'import', 'export'
        ];
        return stopWords.includes(word);
    }

    private formatProjectContext(context: ProjectContext): string {
        return `## Project Context
Project Root: ${context.projectRoot}
Current File: ${context.currentFile}
Project Type: ${context.projectType}
Frameworks: ${context.frameworks.join(', ')}`;
    }

    private formatMemoryContext(memories: ExecutionMemory[]): string {
        return `## Relevant Past Experiences (${memories.length} found)
${memories.map((m, i) => 
    `${i + 1}. **${new Date(m.timestamp).toLocaleDateString()}**: ${m.input.substring(0, 80)}...
   → Result: ${m.result.substring(0, 100)}...
   ${m.rating ? `★ Rating: ${m.rating}/5` : ''} ${m.tags ? `[${m.tags.join(', ')}]` : ''}`
).join('\n')}`;
    }

    private formatPatternContext(patterns: LearnedPattern[]): string {
        return `## Learned Patterns (${patterns.length} applicable)
${patterns.map((p, i) => 
    `${i + 1}. **${p.pattern}** (${p.type}, used ${p.frequency}x)
   Last seen: ${p.lastSeen.toLocaleDateString()}
   ${p.metadata?.solution ? `💡 Solution: ${p.metadata.solution}` : ''}
   Examples: ${p.examples.slice(0, 2).join('; ')}`
).join('\n')}`;
    }

    private formatInsightsContext(insights: ContextualInsight[]): string {
        return `## Contextual Insights
${insights.map((insight, i) => 
    `${i + 1}. **${insight.type.replace('_', ' ').toUpperCase()}** (${Math.round(insight.confidence * 100)}% confidence)
   ${insight.message}`
).join('\n')}`;
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}

export interface EnhancedContext {
    baseContext: ProjectContext;
    memories: ExecutionMemory[];
    patterns: LearnedPattern[];
    insights: ContextualInsight[];
}

export interface ContextualInsight {
    type: 'success_pattern' | 'error_prevention' | 'workflow_efficiency' | 'optimization';
    message: string;
    confidence: number;
    relatedMemories?: ExecutionMemory[];
    relatedPatterns?: LearnedPattern[];
}