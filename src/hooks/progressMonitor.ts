
import * as vscode from 'vscode';
import { MemorySystem } from '../core/memorySystem';
import { ProjectIntelligence } from '../core/projectIntelligence';
import { 
    WorkflowPhase, 
    PhaseStatus,
    ActivitySummary,
    FileModificationSummary,
    ErrorSummary,
    DateRange
} from '../types/interfaces';

/**
 * ProgressMonitor tracks development progress and productivity patterns
 */
export class ProgressMonitor {
    private sessionStartTime: Date;
    private statusBarItem: vscode.StatusBarItem;
    private fileModifications: Map<string, FileModification[]> = new Map();
    private errorTracking: Map<string, ErrorTracking> = new Map();
    private searchHistory: string[] = [];
    private documentationVisited: string[] = [];
    private focusSessions: FocusSession[] = [];
    private currentFocusSession: FocusSession | null = null;
    private updateInterval: NodeJS.Timeout | null = null;

    constructor(
        private context: vscode.ExtensionContext,
        private memorySystem: MemorySystem,
        private projectIntelligence: ProjectIntelligence
    ) {
        this.sessionStartTime = new Date();
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.show();
        
        this.initializeMonitoring();
        this.loadPreviousSession();
    }

    /**
     * Gets a comprehensive activity summary for the specified time range
     */
    async getActivitySummary(timeRange?: DateRange): Promise<ActivitySummary> {
        const range = timeRange || {
            start: this.sessionStartTime,
            end: new Date()
        };

        const modificationSummaries = this.getFileModificationSummaries(range);
        const errorSummaries = this.getErrorSummaries(range);
        const { linesAdded, linesDeleted } = this.calculateLineChanges(range);
        
        // Calculate productivity metrics
        const focusMetrics = this.calculateFocusMetrics(range);
        const contextSwitching = this.calculateContextSwitching(range);

        return {
            timeRange: range,
            filesModified: modificationSummaries,
            linesAdded: linesAdded,
            linesDeleted: linesDeleted,
            commitsCount: await this.getCommitCount(range),
            errorsEncountered: errorSummaries,
            searchQueries: this.getRecentSearches(range),
            documentationVisited: this.getRecentDocumentation(range),
            codeReviews: 0, // Would integrate with git/PR systems
            discussions: 0, // Would integrate with communication tools
            knowledgeSharing: this.calculateKnowledgeSharing(range),
            focusTimePercentage: focusMetrics.focusPercentage,
            contextSwitchingFrequency: contextSwitching,
            deepWorkSessions: focusMetrics.deepWorkCount
        };
    }

    /**
     * Tracks modifications to a file
     */
    trackFileModification(uri: vscode.Uri, change: vscode.TextDocumentChangeEvent): void {
        const filePath = uri.fsPath;
        const modifications = this.fileModifications.get(filePath) || [];
        
        const linesChanged = change.contentChanges.reduce((sum, change) => {
            const linesAdded = change.text.split('\n').length - 1;
            const linesRemoved = change.range.end.line - change.range.start.line;
            return sum + Math.max(linesAdded, linesRemoved);
        }, 0);

        modifications.push({
            timestamp: new Date(),
            linesChanged: linesChanged,
            changeType: this.categorizeChange(change)
        });

        this.fileModifications.set(filePath, modifications);
        this.updateFocusSession();
    }

    /**
     * Tracks error occurrences and resolutions
     */
    trackError(diagnostic: vscode.Diagnostic, uri: vscode.Uri): void {
        const errorKey = `${diagnostic.message}:${diagnostic.source}`;
        const tracking = this.errorTracking.get(errorKey) || {
            firstOccurrence: new Date(),
            occurrences: [],
            resolutions: []
        };

        tracking.occurrences.push({
            timestamp: new Date(),
            file: uri.fsPath,
            line: diagnostic.range.start.line
        });

        this.errorTracking.set(errorKey, tracking);
    }

    /**
     * Tracks error resolution
     */
    trackErrorResolution(diagnostic: vscode.Diagnostic, resolutionTime: number): void {
        const errorKey = `${diagnostic.message}:${diagnostic.source}`;
        const tracking = this.errorTracking.get(errorKey);
        
        if (tracking) {
            tracking.resolutions.push({
                timestamp: new Date(),
                timeToResolve: resolutionTime
            });
        }
    }

    /**
     * Tracks search queries for understanding what developers are looking for
     */
    trackSearch(query: string): void {
        this.searchHistory.push(query);
        
        // Keep only recent searches
        if (this.searchHistory.length > 1000) {
            this.searchHistory = this.searchHistory.slice(-500);
        }
    }

    /**
     * Tracks documentation visits
     */
    trackDocumentationVisit(url: string): void {
        this.documentationVisited.push(url);
        
        // Keep only recent visits
        if (this.documentationVisited.length > 500) {
            this.documentationVisited = this.documentationVisited.slice(-250);
        }
    }

    /**
     * Updates workflow phase progress
     */
    updatePhaseProgress(phase: WorkflowPhase, status: PhaseStatus): void {
        // This would integrate with the workflow system
        const progress = this.calculatePhaseProgress(phase);
        this.updateStatusBar(progress);
    }

    /**
     * Gets productivity insights
     */
    async getProductivityInsights(): Promise<ProductivityInsights> {
        const lastWeek: DateRange = {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date()
        };

        const summary = await this.getActivitySummary(lastWeek);
        
        return {
            productivityScore: this.calculateProductivityScore(summary),
            strengths: this.identifyStrengths(summary),
            improvementAreas: this.identifyImprovementAreas(summary),
            recommendations: await this.generateRecommendations(summary),
            trends: this.analyzeTrends(summary)
        };
    }

    /**
     * Calculates focus metrics
     */
    private calculateFocusMetrics(range: DateRange): FocusMetrics {
        const relevantSessions = this.focusSessions.filter(s => 
            s.startTime >= range.start && s.startTime <= range.end
        );

        const totalTime = range.end.getTime() - range.start.getTime();
        const focusTime = relevantSessions.reduce((sum, s) => 
            sum + (s.endTime.getTime() - s.startTime.getTime()), 0
        );

        const deepWorkSessions = relevantSessions.filter(s => 
            s.endTime.getTime() - s.startTime.getTime() > 25 * 60 * 1000 // 25+ minutes
        );

        return {
            focusPercentage: (focusTime / totalTime) * 100,
            deepWorkCount: deepWorkSessions.length,
            averageSessionLength: focusTime / relevantSessions.length || 0
        };
    }

    /**
     * Calculates context switching frequency
     */
    private calculateContextSwitching(range: DateRange): number {
        let switches = 0;
        let lastFile: string | null = null;

        for (const [file, mods] of this.fileModifications.entries()) {
            const relevantMods = mods.filter(m => 
                m.timestamp >= range.start && m.timestamp <= range.end
            );

            for (const mod of relevantMods) {
                if (lastFile && lastFile !== file) {
                    switches++;
                }
                lastFile = file;
            }
        }

        const hours = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60);
        return switches / hours; // Switches per hour
    }

    /**
     * Updates the current focus session
     */
    private updateFocusSession(): void {
        const now = new Date();
        
        if (!this.currentFocusSession) {
            this.currentFocusSession = {
                startTime: now,
                endTime: now,
                filesModified: new Set(),
                linesChanged: 0,
                interruptions: 0
            };
        } else {
            const timeSinceLastActivity = now.getTime() - this.currentFocusSession.endTime.getTime();
            
            // If more than 5 minutes have passed, end the session
            if (timeSinceLastActivity > 5 * 60 * 1000) {
                this.focusSessions.push({
                    ...this.currentFocusSession,
                    filesModified: this.currentFocusSession.filesModified
                });
                
                this.currentFocusSession = {
                    startTime: now,
                    endTime: now,
                    filesModified: new Set(),
                    linesChanged: 0,
                    interruptions: 0
                };
            } else {
                this.currentFocusSession.endTime = now;
            }
        }
    }

    /**
     * Gets file modification summaries
     */
    private getFileModificationSummaries(range: DateRange): FileModificationSummary[] {
        const summaries: FileModificationSummary[] = [];

        for (const [filepath, modifications] of this.fileModifications.entries()) {
            const relevantMods = modifications.filter(m => 
                m.timestamp >= range.start && m.timestamp <= range.end
            );

            if (relevantMods.length > 0) {
                summaries.push({
                    filepath: filepath,
                    modificationsCount: relevantMods.length,
                    linesChanged: relevantMods.reduce((sum, m) => sum + m.linesChanged, 0),
                    lastModified: relevantMods[relevantMods.length - 1].timestamp
                });
            }
        }

        return summaries.sort((a, b) => b.modificationsCount - a.modificationsCount);
    }

    /**
     * Gets error summaries
     */
    private getErrorSummaries(range: DateRange): ErrorSummary[] {
        const summaries: Map<string, ErrorSummary> = new Map();

        for (const [errorType, tracking] of this.errorTracking.entries()) {
            const relevantOccurrences = tracking.occurrences.filter(o => 
                o.timestamp >= range.start && o.timestamp <= range.end
            );
            const relevantResolutions = tracking.resolutions.filter(r => 
                r.timestamp >= range.start && r.timestamp <= range.end
            );

            if (relevantOccurrences.length > 0) {
                const avgResolutionTime = relevantResolutions.length > 0
                    ? relevantResolutions.reduce((sum, r) => sum + r.timeToResolve, 0) / relevantResolutions.length
                    : 0;

                summaries.set(errorType, {
                    errorType: errorType.split(':')[0], // Extract just the error message
                    occurrences: relevantOccurrences.length,
                    resolved: relevantResolutions.length,
                    averageResolutionTime: avgResolutionTime
                });
            }
        }

        return Array.from(summaries.values());
    }

    /**
     * Calculates lines added and deleted
     */
    private calculateLineChanges(range: DateRange): { linesAdded: number; linesDeleted: number } {
        // This is a simplified calculation
        // In a real implementation, this would integrate with git
        let linesAdded = 0;
        let linesDeleted = 0;

        for (const modifications of this.fileModifications.values()) {
            const relevantMods = modifications.filter(m => 
                m.timestamp >= range.start && m.timestamp <= range.end
            );

            for (const mod of relevantMods) {
                if (mod.changeType === 'addition') {
                    linesAdded += mod.linesChanged;
                } else if (mod.changeType === 'deletion') {
                    linesDeleted += mod.linesChanged;
                } else {
                    // For modifications, split evenly
                    linesAdded += Math.floor(mod.linesChanged / 2);
                    linesDeleted += Math.floor(mod.linesChanged / 2);
                }
            }
        }

        return { linesAdded, linesDeleted };
    }

    /**
     * Gets commit count for the time range
     */
    private async getCommitCount(range: DateRange): Promise<number> {
        // This would integrate with git
        // For now, return an estimate based on file modifications
        const significantChanges = Array.from(this.fileModifications.values())
            .filter(mods => mods.some(m => 
                m.timestamp >= range.start && 
                m.timestamp <= range.end && 
                m.linesChanged > 10
            ));

        return Math.floor(significantChanges.length / 3); // Rough estimate
    }

    /**
     * Calculates knowledge sharing metric
     */
    private calculateKnowledgeSharing(range: DateRange): number {
        // Based on documentation visits and search patterns
        const docVisits = this.documentationVisited.filter(visit => {
            // Would need timestamps for accurate filtering
            return true; // Placeholder
        }).length;

        const helpfulSearches = this.searchHistory.filter(query => 
            query.includes('how to') || 
            query.includes('example') || 
            query.includes('tutorial')
        ).length;

        return Math.min(10, (docVisits + helpfulSearches) / 10); // Scale to 0-10
    }

    /**
     * Calculates overall productivity score
     */
    private calculateProductivityScore(summary: ActivitySummary): number {
        const weights = {
            focusTime: 0.3,
            codeOutput: 0.25,
            errorResolution: 0.2,
            contextSwitching: 0.15,
            deepWork: 0.1
        };

        const focusScore = summary.focusTimePercentage / 100;
        const codeScore = Math.min(1, (summary.linesAdded + summary.linesDeleted) / 1000);
        const errorScore = this.calculateErrorResolutionScore(summary.errorsEncountered);
        const contextScore = Math.max(0, 1 - (summary.contextSwitchingFrequency / 10));
        const deepWorkScore = Math.min(1, summary.deepWorkSessions / 5);

        return (
            focusScore * weights.focusTime +
            codeScore * weights.codeOutput +
            errorScore * weights.errorResolution +
            contextScore * weights.contextSwitching +
            deepWorkScore * weights.deepWork
        ) * 100;
    }

    /**
     * Identifies developer strengths
     */
    private identifyStrengths(summary: ActivitySummary): string[] {
        const strengths: string[] = [];

        if (summary.focusTimePercentage > 60) {
            strengths.push('Excellent focus and concentration');
        }
        if (summary.deepWorkSessions > 3) {
            strengths.push('Strong deep work habits');
        }
        if (this.calculateErrorResolutionScore(summary.errorsEncountered) > 0.7) {
            strengths.push('Quick error resolution');
        }
        if (summary.contextSwitchingFrequency < 5) {
            strengths.push('Minimal context switching');
        }

        return strengths;
    }

    /**
     * Identifies areas for improvement
     */
    private identifyImprovementAreas(summary: ActivitySummary): string[] {
        const areas: string[] = [];

        if (summary.focusTimePercentage < 40) {
            areas.push('Increase focused coding time');
        }
        if (summary.contextSwitchingFrequency > 10) {
            areas.push('Reduce context switching between files');
        }
        if (summary.deepWorkSessions < 1) {
            areas.push('Schedule more deep work sessions');
        }
        if (this.calculateErrorResolutionScore(summary.errorsEncountered) < 0.5) {
            areas.push('Improve error resolution efficiency');
        }

        return areas;
    }

    /**
     * Generates personalized recommendations
     */
    private async generateRecommendations(summary: ActivitySummary): Promise<string[]> {
        const recommendations: string[] = [];

        // Time management recommendations
        if (summary.focusTimePercentage < 50) {
            recommendations.push('Try the Pomodoro Technique: 25 minutes of focused work followed by 5-minute breaks');
        }

        // Error handling recommendations
        const errorScore = this.calculateErrorResolutionScore(summary.errorsEncountered);
        if (errorScore < 0.6) {
            recommendations.push('Use Claude Assistant\'s error pattern detection for faster resolution');
        }

        // Context switching recommendations
        if (summary.contextSwitchingFrequency > 8) {
            recommendations.push('Group related file changes together to reduce context switching');
        }

        // Deep work recommendations
        if (summary.deepWorkSessions < 2) {
            recommendations.push('Block out at least 2 hours daily for uninterrupted coding');
        }

        return recommendations;
    }

    /**
     * Analyzes productivity trends
     */
    private analyzeTrends(summary: ActivitySummary): ProductivityTrend[] {
        // This would compare with historical data
        // For now, return placeholder trends
        return [
            {
                metric: 'Focus Time',
                direction: 'improving',
                change: 15,
                recommendation: 'Keep up the good work!'
            },
            {
                metric: 'Error Resolution',
                direction: 'stable',
                change: 0,
                recommendation: 'Consider using more automated tools'
            }
        ];
    }

    /**
     * Calculates error resolution score
     */
    private calculateErrorResolutionScore(errors: ErrorSummary[]): number {
        if (errors.length === 0) return 1;

        const totalOccurrences = errors.reduce((sum, e) => sum + e.occurrences, 0);
        const totalResolved = errors.reduce((sum, e) => sum + e.resolved, 0);
        const avgResolutionTime = errors.reduce((sum, e) => 
            sum + (e.averageResolutionTime * e.resolved), 0
        ) / totalResolved || 0;

        const resolutionRate = totalResolved / totalOccurrences;
        const timeScore = Math.max(0, 1 - (avgResolutionTime / (10 * 60 * 1000))); // 10 minutes baseline

        return (resolutionRate * 0.7) + (timeScore * 0.3);
    }

    /**
     * Updates the status bar with current progress
     */
    private updateStatusBar(progress: number): void {
        const icon = progress < 50 ? '$(circle-large-outline)' : '$(check-all)';
        this.statusBarItem.text = `${icon} Progress: ${progress}%`;
        this.statusBarItem.tooltip = `Click for detailed productivity insights`;
        this.statusBarItem.command = 'claude-assistant.showProductivityInsights';
    }

    /**
     * Categorizes the type of change
     */
    private categorizeChange(change: vscode.TextDocumentChangeEvent): 'addition' | 'deletion' | 'modification' {
        const hasAdditions = change.contentChanges.some(c => c.text.length > 0);
        const hasDeletions = change.contentChanges.some(c => c.range.end.line > c.range.start.line);

        if (hasAdditions && !hasDeletions) return 'addition';
        if (!hasAdditions && hasDeletions) return 'deletion';
        return 'modification';
    }

    /**
     * Calculates phase progress
     */
    private calculatePhaseProgress(phase: WorkflowPhase): number {
        // This would integrate with the workflow system
        return 50; // Placeholder
    }

    /**
     * Gets recent searches within time range
     */
    private getRecentSearches(range: DateRange): string[] {
        // Would need timestamps on searches for accurate filtering
        return this.searchHistory.slice(-20);
    }

    /**
     * Gets recent documentation visits within time range
     */
    private getRecentDocumentation(range: DateRange): string[] {
        // Would need timestamps on visits for accurate filtering
        return this.documentationVisited.slice(-20);
    }

    /**
     * Initializes monitoring systems
     */
    private initializeMonitoring(): void {
        // Update status bar periodically
        this.updateInterval = setInterval(() => {
            const progress = 75; // Placeholder - would calculate real progress
            this.updateStatusBar(progress);
        }, 30000); // Every 30 seconds

        // Set up file change tracking
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.uri.scheme === 'file') {
                this.trackFileModification(event.document.uri, event);
            }
        });

        // Set up error tracking
        vscode.languages.onDidChangeDiagnostics(event => {
            for (const uri of event.uris) {
                const diagnostics = vscode.languages.getDiagnostics(uri);
                for (const diagnostic of diagnostics) {
                    if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
                        this.trackError(diagnostic, uri);
                    }
                }
            }
        });
    }

    /**
     * Loads previous session data
     */
    private async loadPreviousSession(): Promise<void> {
        try {
            const sessionFile = vscode.Uri.joinPath(
                this.context.globalStorageUri,
                'progress-session.json'
            );
            const data = await vscode.workspace.fs.readFile(sessionFile);
            const session = JSON.parse(data.toString());
            
            // Restore relevant data
            // Implementation would deserialize the saved state
        } catch (error) {
            // No previous session or error loading
            console.log('No previous session to load');
        }
    }

    /**
     * Saves current session data
     */
    async saveSession(): Promise<void> {
        const sessionData = {
            sessionStartTime: this.sessionStartTime,
            fileModifications: Array.from(this.fileModifications.entries()),
            errorTracking: Array.from(this.errorTracking.entries()),
            searchHistory: this.searchHistory,
            documentationVisited: this.documentationVisited,
            focusSessions: this.focusSessions
        };

        const sessionFile = vscode.Uri.joinPath(
            this.context.globalStorageUri,
            'progress-session.json'
        );

        await vscode.workspace.fs.writeFile(
            sessionFile,
            Buffer.from(JSON.stringify(sessionData, null, 2), 'utf8')
        );
    }

    dispose(): void {
        this.statusBarItem.dispose();
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.saveSession();
    }
}

// Supporting interfaces
interface FileModification {
    timestamp: Date;
    linesChanged: number;
    changeType: 'addition' | 'deletion' | 'modification';
}

interface ErrorTracking {
    firstOccurrence: Date;
    occurrences: {
        timestamp: Date;
        file: string;
        line: number;
    }[];
    resolutions: {
        timestamp: Date;
        timeToResolve: number;
    }[];
}

interface FocusSession {
    startTime: Date;
    endTime: Date;
    filesModified: Set<string>;
    linesChanged: number;
    interruptions: number;
}

interface FocusMetrics {
    focusPercentage: number;
    deepWorkCount: number;
    averageSessionLength: number;
}

interface ProductivityInsights {
    productivityScore: number;
    strengths: string[];
    improvementAreas: string[];
    recommendations: string[];
    trends: ProductivityTrend[];
}

interface ProductivityTrend {
    metric: string;
    direction: 'improving' | 'declining' | 'stable';
    change: number;
    recommendation: string;
}
