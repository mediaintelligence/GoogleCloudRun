import * as vscode from 'vscode';
import { 
    ErrorContext, 
    LearnedPattern, 
    ProjectContext
} from '../types/interfaces';
import { ClaudeCodeInterface } from '../core/claudeCodeInterface';
import { MemorySystem } from '../core/memorySystem';
import { ProjectIntelligence } from '../core/projectIntelligence';

/**
 * Utility function to create a simplified ExecutionContext
 */
function createSimpleExecutionContext(projectContext: any, instruction: string): any {
    return {
        projectIntelligence: projectContext,
        currentWorkflow: {
            id: 'temp_' + Date.now(),
            title: 'Error Fix',
            description: instruction,
            status: 'executing'
        },
        currentPhase: {
            id: 'temp_phase',
            name: 'Error Analysis',
            description: instruction,
            type: 'analysis'
        },
        relevantMemories: [],
        similarExecutions: [],
        learnedPatterns: [],
        activeFiles: [],
        recentChanges: [],
        currentErrors: [],
        suggestedApproaches: [],
        cautionAreas: [],
        successCriteria: ['Fix the error']
    };
}

/**
 * Sophisticated error pattern detection and analysis system.
 * Learns from past errors and provides intelligent resolution suggestions.
 */
export class ErrorPatternDetector {
    private errorPatterns: Map<string, ErrorPattern> = new Map();
    private resolutionHistory: ResolutionHistory[] = [];
    private activeErrors: Map<string, TrackedError> = new Map();
    private diagnosticCollection: vscode.DiagnosticCollection;
    private analysisThrottle: Map<string, number> = new Map();

    constructor(
        private _claudeInterface: ClaudeCodeInterface,
        private _memorySystem: MemorySystem,
        private _projectIntelligence: ProjectIntelligence
    ) {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('claude-error-patterns');
        this.initializePatterns();
        this.setupListeners();
    }

    /**
     * Analyzes current diagnostics and provides intelligent suggestions
     */
    async analyzeDiagnostics(uri: vscode.Uri): Promise<ErrorAnalysis[]> {
        const diagnostics = vscode.languages.getDiagnostics(uri);
        const analyses: ErrorAnalysis[] = [];

        for (const diagnostic of diagnostics) {
            if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
                const analysis = await this.analyzeError(uri, diagnostic);
                if (analysis) {
                    analyses.push(analysis);
                }
            }
        }

        return analyses;
    }

    /**
     * Provides deep analysis of a specific error
     */
    private async analyzeError(
        uri: vscode.Uri, 
        diagnostic: vscode.Diagnostic
    ): Promise<ErrorAnalysis | null> {
        const errorKey = this.generateErrorKey(uri, diagnostic);
        
        // Throttle analysis to prevent overwhelming the system
        const lastAnalysis = this.analysisThrottle.get(errorKey) || 0;
        const now = Date.now();
        if (now - lastAnalysis < 5000) { // 5 second throttle
            return null;
        }
        this.analysisThrottle.set(errorKey, now);

        // Check if we've seen this error pattern before
        const pattern = this.findMatchingPattern(diagnostic);
        const previousResolutions = this.findPreviousResolutions(diagnostic.message);
        
        // Get project context for better analysis
        const projectContext = await this._projectIntelligence.getContextForFile(uri);
        
        // Build comprehensive error context
        const errorContext: ErrorContext = {
            message: diagnostic.message,
            file: uri.fsPath,
            line: diagnostic.range.start.line,
            severity: diagnostic.severity,
            category: this.categorizeError(diagnostic),
            firstOccurred: new Date(),
            lastOccurred: new Date(),
            occurrenceCount: 1
        };

        // Get intelligent suggestions
        const suggestions = await this.generateSuggestions(
            errorContext, 
            pattern, 
            previousResolutions,
            projectContext
        );

        // Track this error
        this.trackError(errorKey, errorContext, suggestions);

        return {
            error: errorContext,
            pattern: pattern,
            suggestions: suggestions,
            confidence: this.calculateConfidence(pattern, previousResolutions),
            relatedErrors: this.findRelatedErrors(errorContext)
        };
    }

    /**
     * Generates intelligent suggestions for error resolution
     */
    private async generateSuggestions(
        error: ErrorContext,
        pattern: ErrorPattern | null,
        previousResolutions: ResolutionHistory[],
        _projectContext: ProjectContext
    ): Promise<ErrorSuggestion[]> {
        const suggestions: ErrorSuggestion[] = [];

        // Add pattern-based suggestions
        if (pattern) {
            suggestions.push(...pattern.commonFixes.map(fix => ({
                type: 'pattern-based' as const,
                description: fix.description,
                code: fix.code,
                confidence: pattern.successRate,
                source: 'learned-pattern'
            })));
        }

        // Add history-based suggestions
        if (previousResolutions.length > 0) {
            const successfulResolutions = previousResolutions
                .filter(r => r.successful)
                .sort((a, b) => b.effectiveness - a.effectiveness)
                .slice(0, 3);

            suggestions.push(...successfulResolutions.map(res => ({
                type: 'historical' as const,
                description: `Previously successful: ${res.description}`,
                code: res.code,
                confidence: res.effectiveness,
                source: 'resolution-history'
            })));
        }

        // Get AI-powered suggestions if no good matches found
        if (suggestions.length === 0 || suggestions.every(s => s.confidence < 0.7)) {
            const aiSuggestion = await this.getAISuggestion(error, _projectContext);
            if (aiSuggestion) {
                suggestions.push(aiSuggestion);
            }
        }

        // Sort by confidence
        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Gets AI-powered suggestion using Claude
     */
    private async getAISuggestion(
        error: ErrorContext,
        _projectContext: ProjectContext
    ): Promise<ErrorSuggestion | null> {
        try {
            const document = await vscode.workspace.openTextDocument(error.file);
            const errorLine = document.lineAt(error.line);
            const surroundingCode = this.getCodeContext(document, error.line);

            const prompt = `
Error Analysis Request:

Error: ${error.message}
File: ${error.file}
Line ${error.line}: ${errorLine.text}

Surrounding code:
${surroundingCode}

Project type: ${_projectContext.projectType}
Frameworks: ${_projectContext.frameworks.join(', ')}

Provide a specific fix for this error. Include:
1. What's causing the error
2. The exact code change needed
3. Why this fix works

Keep the response concise and code-focused.
            `.trim();

            const executionContext = createSimpleExecutionContext(_projectContext, prompt);
            const response = await this._claudeInterface.executeWithContext(prompt, executionContext, vscode.workspace.rootPath || '');
            
            return {
                type: 'ai-generated',
                description: 'AI-suggested fix',
                code: response.output,
                confidence: 0.8,
                source: 'claude-analysis'
            };
        } catch (error) {
            console.error('Failed to get AI suggestion:', error);
            return null;
        }
    }

    /**
     * Tracks error occurrence and resolution attempts
     */
    private trackError(
        key: string, 
        error: ErrorContext, 
        suggestions: ErrorSuggestion[]
    ): void {
        const existing = this.activeErrors.get(key);
        
        if (existing) {
            existing.occurrenceCount++;
            existing.lastSeen = new Date();
            existing.suggestions = suggestions;
        } else {
            this.activeErrors.set(key, {
                error: error,
                firstSeen: new Date(),
                lastSeen: new Date(),
                occurrenceCount: 1,
                suggestions: suggestions,
                resolutionAttempts: []
            });
        }
    }

    /**
     * Records the outcome of a resolution attempt
     */
    async recordResolution(
        errorKey: string,
        suggestion: ErrorSuggestion,
        successful: boolean,
        timeToResolve: number
    ): Promise<void> {
        const trackedError = this.activeErrors.get(errorKey);
        if (!trackedError) return;

        // Record in resolution history
        const resolution: ResolutionHistory = {
            errorPattern: this.extractPattern(trackedError.error.message),
            description: suggestion.description,
            code: suggestion.code || '',
            successful: successful,
            effectiveness: successful ? this.calculateEffectiveness(timeToResolve) : 0,
            timestamp: new Date(),
            context: {
                errorMessage: trackedError.error.message,
                fileType: this.getFileType(trackedError.error.file),
                suggestionType: suggestion.type
            }
        };

        this.resolutionHistory.push(resolution);

        // Update pattern statistics
        if (successful) {
            this.updatePatternSuccess(trackedError.error.message, suggestion);
        }

        // Learn from this resolution
        await this.learnFromResolution(resolution, trackedError);

        // Remove from active errors if resolved
        if (successful) {
            this.activeErrors.delete(errorKey);
        }
    }

    /**
     * Learns from resolution attempts to improve future suggestions
     */
    private async learnFromResolution(
        resolution: ResolutionHistory,
        trackedError: TrackedError
    ): Promise<void> {
        if (resolution.successful) {
            // Create a learned pattern
            const pattern: LearnedPattern = {
                pattern: resolution.errorPattern,
                type: 'error',
                frequency: 1,
                lastSeen: new Date(),
                examples: [trackedError.error.message],
                metadata: {
                    resolution: resolution.code,
                    timeToResolve: resolution.timestamp.getTime() - trackedError.firstSeen.getTime(),
                    effectiveness: resolution.effectiveness
                }
            };

            await this._memorySystem.recordPattern(pattern);
        }

        // Record execution memory
        await this._memorySystem.recordExecution({
            input: `Fix error: ${trackedError.error.message}`,
            context: await this._projectIntelligence.getContextForFile(
                vscode.Uri.file(trackedError.error.file)
            ),
            result: resolution.successful ? 'Success' : 'Failed',
            timestamp: new Date(),
            tags: ['error-resolution', resolution.successful ? 'success' : 'failure']
        });
    }

    /**
     * Finds errors that might be related to the current one
     */
    private findRelatedErrors(error: ErrorContext): ErrorContext[] {
        const related: ErrorContext[] = [];
        
        // Look for errors in the same file
        const fileErrors = Array.from(this.activeErrors.values())
            .filter(e => e.error.file === error.file && e.error.message !== error.message)
            .map(e => e.error);
        
        related.push(...fileErrors);

        // Look for similar error patterns
        const similarErrors = Array.from(this.activeErrors.values())
            .filter(e => {
                const similarity = this.calculateSimilarity(e.error.message, error.message);
                return similarity > 0.7 && e.error.message !== error.message;
            })
            .map(e => e.error);

        related.push(...similarErrors);

        return related.slice(0, 5); // Limit to 5 related errors
    }

    /**
     * Calculates string similarity between error messages
     */
    private calculateSimilarity(a: string, b: string): number {
        const setA = new Set(a.toLowerCase().split(/\s+/));
        const setB = new Set(b.toLowerCase().split(/\s+/));
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        return intersection.size / union.size;
    }

    /**
     * Gets surrounding code context for better error analysis
     */
    private getCodeContext(document: vscode.TextDocument, errorLine: number): string {
        const startLine = Math.max(0, errorLine - 5);
        const endLine = Math.min(document.lineCount - 1, errorLine + 5);
        
        const lines: string[] = [];
        for (let i = startLine; i <= endLine; i++) {
            const prefix = i === errorLine ? '>>> ' : '    ';
            lines.push(`${prefix}${i + 1}: ${document.lineAt(i).text}`);
        }
        
        return lines.join('\n');
    }

    /**
     * Initializes common error patterns
     */
    private initializePatterns(): void {
        // TypeScript/JavaScript patterns
        this.addPattern({
            id: 'ts-undefined-variable',
            regex: /Cannot find name '(\w+)'/,
            category: 'reference',
            commonFixes: [
                {
                    description: 'Import the missing module',
                    code: "import { $1 } from './module';"
                },
                {
                    description: 'Declare the variable',
                    code: "const $1 = "
                }
            ],
            successRate: 0.85
        });

        this.addPattern({
            id: 'ts-property-missing',
            regex: /Property '(\w+)' does not exist on type/,
            category: 'type',
            commonFixes: [
                {
                    description: 'Add property to interface',
                    code: "$1?: any;"
                },
                {
                    description: 'Use optional chaining',
                    code: "object?.$1"
                }
            ],
            successRate: 0.8
        });

        // More patterns can be added here
    }

    private addPattern(pattern: ErrorPattern): void {
        this.errorPatterns.set(pattern.id, pattern);
    }

    private findMatchingPattern(diagnostic: vscode.Diagnostic): ErrorPattern | null {
        for (const pattern of this.errorPatterns.values()) {
            if (pattern.regex.test(diagnostic.message)) {
                return pattern;
            }
        }
        return null;
    }

    private findPreviousResolutions(errorMessage: string): ResolutionHistory[] {
        const pattern = this.extractPattern(errorMessage);
        return this.resolutionHistory.filter(r => 
            r.errorPattern === pattern && r.successful
        );
    }

    private extractPattern(errorMessage: string): string {
        // Remove specific identifiers to create a general pattern
        return errorMessage
            .replace(/'[^']+'/g, "'*'")
            .replace(/"[^"]+"/g, '"*"')
            .replace(/\d+/g, '#');
    }

    private categorizeError(diagnostic: vscode.Diagnostic): string {
        const message = diagnostic.message.toLowerCase();
        
        if (message.includes('type') || message.includes('interface')) return 'type';
        if (message.includes('import') || message.includes('module')) return 'import';
        if (message.includes('undefined') || message.includes('null')) return 'reference';
        if (message.includes('syntax')) return 'syntax';
        if (message.includes('async') || message.includes('await')) return 'async';
        
        return 'general';
    }

    private generateErrorKey(uri: vscode.Uri, diagnostic: vscode.Diagnostic): string {
        return `${uri.fsPath}:${diagnostic.range.start.line}:${diagnostic.message}`;
    }

    private calculateConfidence(
        pattern: ErrorPattern | null, 
        previousResolutions: ResolutionHistory[]
    ): number {
        if (pattern && previousResolutions.length > 0) {
            const avgEffectiveness = previousResolutions.reduce((sum, r) => sum + r.effectiveness, 0) / previousResolutions.length;
            return (pattern.successRate + avgEffectiveness) / 2;
        } else if (pattern) {
            return pattern.successRate;
        } else if (previousResolutions.length > 0) {
            return previousResolutions.reduce((sum, r) => sum + r.effectiveness, 0) / previousResolutions.length;
        }
        return 0.5;
    }

    private calculateEffectiveness(timeToResolve: number): number {
        // Quick resolutions are more effective
        if (timeToResolve < 30000) return 1.0; // < 30 seconds
        if (timeToResolve < 60000) return 0.9; // < 1 minute
        if (timeToResolve < 300000) return 0.7; // < 5 minutes
        if (timeToResolve < 600000) return 0.5; // < 10 minutes
        return 0.3;
    }

    private updatePatternSuccess(errorMessage: string, _suggestion: ErrorSuggestion): void {
        const pattern = Array.from(this.errorPatterns.values()).find(p => 
            p.regex.test(errorMessage)
        );
        
        if (pattern) {
            // Simple success rate update (could be more sophisticated)
            pattern.successRate = (pattern.successRate * 0.9) + 0.1;
        }
    }

    private getFileType(filePath: string): string {
        const ext = filePath.split('.').pop() || '';
        return ext;
    }

    private setupListeners(): void {
        // Listen for diagnostic changes
        vscode.languages.onDidChangeDiagnostics(async (event) => {
            for (const uri of event.uris) {
                await this.analyzeDiagnostics(uri);
            }
        });

        // Clean up old errors periodically
        setInterval(() => {
            const oneHourAgo = Date.now() - 3600000;
            for (const [key, error] of this.activeErrors.entries()) {
                if (error.lastSeen.getTime() < oneHourAgo) {
                    this.activeErrors.delete(key);
                }
            }
        }, 300000); // Every 5 minutes
    }

    dispose(): void {
        this.diagnosticCollection.dispose();
    }
}

// Supporting interfaces
interface ErrorPattern {
    id: string;
    regex: RegExp;
    category: string;
    commonFixes: {
        description: string;
        code: string;
    }[];
    successRate: number;
}

interface TrackedError {
    error: ErrorContext;
    firstSeen: Date;
    lastSeen: Date;
    occurrenceCount: number;
    suggestions: ErrorSuggestion[];
    resolutionAttempts: ResolutionAttempt[];
}

interface ResolutionAttempt {
    suggestion: ErrorSuggestion;
    timestamp: Date;
    successful: boolean;
}

interface ResolutionHistory {
    errorPattern: string;
    description: string;
    code: string;
    successful: boolean;
    effectiveness: number;
    timestamp: Date;
    context: {
        errorMessage: string;
        fileType: string;
        suggestionType: string;
    };
}

interface ErrorAnalysis {
    error: ErrorContext;
    pattern: ErrorPattern | null;
    suggestions: ErrorSuggestion[];
    confidence: number;
    relatedErrors: ErrorContext[];
}

interface ErrorSuggestion {
    type: 'pattern-based' | 'historical' | 'ai-generated';
    description: string;
    code?: string;
    confidence: number;
    source: string;
}