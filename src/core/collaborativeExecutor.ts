import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { 
    CollaborativeExecution, 
    CollaborationPhase, 
    ModelContribution, 
    ConsensusResult
} from './sessionManager';

export interface CollaborationStrategy {
    type: 'complementary' | 'competitive' | 'consensus';
    description: string;
    phaseSequence: CollaborationPhase[];
}

export interface Disagreement {
    id: string;
    topic: string;
    claudePosition: string;
    geminiPosition: string;
    severity: 'low' | 'medium' | 'high';
    resolved: boolean;
    resolution?: string;
}

export interface Resolution {
    disagreementId: string;
    approach: string;
    reasoning: string;
    confidence: number;
    adoptedFrom: 'claude' | 'gemini' | 'consensus';
}

export interface CollaborationStrategy {
    type: 'complementary' | 'competitive' | 'consensus';
    description: string;
    phaseSequence: CollaborationPhase[];
}

export class CollaborativeExecutor {
    private activeCollaborations: Map<string, CollaborativeExecution> = new Map();
    
    constructor(
        private claudeInterface: any,
        private geminiInterface: any,
        private bossAgent: any,
        private sessionManager: any
    ) {}
    
    async executeCollaboratively(
        task: string,
        context: any,
        strategy: CollaborationStrategy = this.getDefaultStrategy()
    ): Promise<CollaborativeExecution> {
        const execution: CollaborativeExecution = {
            id: uuidv4(),
            task,
            claudeRole: this.assignRole('claude', task, strategy),
            geminiRole: this.assignRole('gemini', task, strategy),
            phases: strategy.phaseSequence,
            currentPhase: 0,
            claudeContributions: [],
            geminiContributions: [],
            consensus: { achieved: false, points: [], disagreements: [], resolutions: [] },
            finalOutput: '',
            confidenceScore: 0,
            timestamp: new Date()
        };
        
        this.activeCollaborations.set(execution.id, execution);
        
        try {
            // Execute collaboration phases
            for (let i = 0; i < execution.phases.length; i++) {
                execution.currentPhase = i;
                const phase = execution.phases[i];
                
                await this.executePhase(execution, phase, context);
                
                // Save progress after each phase
                await this.saveExecutionProgress(execution);
            }
            
            // Generate final consensus
            execution.consensus = await this.buildConsensus(execution);
            execution.finalOutput = await this.synthesizeFinalOutput(execution);
            execution.confidenceScore = this.calculateConfidenceScore(execution);
            
            // Record in session
            const currentSession = await this.sessionManager.getCurrentSession();
            if (currentSession) {
                await this.sessionManager.addExecution(currentSession.id, execution);
            }
            
            return execution;
        } catch (error) {
            console.error('❌ Collaborative execution failed:', error);
            throw error;
        } finally {
            this.activeCollaborations.delete(execution.id);
        }
    }
    
    private async executePhase(
        execution: CollaborativeExecution,
        phase: CollaborationPhase,
        context: any
    ): Promise<void> {
        console.log(`🤝 Executing phase: ${phase.name} (${phase.type})`);
        
        switch (phase.type) {
            case 'parallel_analysis':
                await this.executeParallelAnalysis(execution, phase, context);
                break;
                
            case 'sequential_refinement':
                await this.executeSequentialRefinement(execution, phase, context);
                break;
                
            case 'debate':
                await this.executeDebate(execution, phase, context);
                break;
                
            case 'synthesis':
                await this.executeSynthesis(execution, phase, context);
                break;
        }
    }
    
    private async executeParallelAnalysis(
        execution: CollaborativeExecution,
        phase: CollaborationPhase,
        context: any
    ): Promise<void> {
        // Both models analyze the problem independently
        const [claudeAnalysis, geminiAnalysis] = await Promise.all([
            this.claudeInterface.analyze(execution.task, context),
            this.geminiInterface.analyze(execution.task, context)
        ]);
        
        execution.claudeContributions.push({
            phase: phase.name,
            content: claudeAnalysis.output,
            timestamp: new Date(),
            confidence: claudeAnalysis.confidence || 0.8
        });
        
        execution.geminiContributions.push({
            phase: phase.name,
            content: geminiAnalysis.output,
            timestamp: new Date(),
            confidence: geminiAnalysis.confidence || 0.8
        });
        
        // Identify agreements and disagreements
        const comparison = this.compareAnalyses(claudeAnalysis, geminiAnalysis);
        if (comparison.disagreements.length > 0) {
            execution.consensus.disagreements.push(...comparison.disagreements);
        }
        
        if (comparison.agreements.length > 0) {
            execution.consensus.points.push(...comparison.agreements);
        }
    }
    
    private async executeSequentialRefinement(
        execution: CollaborativeExecution,
        phase: CollaborationPhase,
        context: any
    ): Promise<void> {
        // Claude provides initial analysis
        const claudeAnalysis = await this.claudeInterface.analyze(execution.task, context);
        
        execution.claudeContributions.push({
            phase: phase.name,
            content: claudeAnalysis.output,
            timestamp: new Date(),
            confidence: claudeAnalysis.confidence || 0.8
        });
        
        // Gemini refines based on Claude's analysis
        const refinementContext = {
            ...context,
            claudeAnalysis: claudeAnalysis.output,
            task: `Refine and improve: ${execution.task}`
        };
        
        const geminiRefinement = await this.geminiInterface.analyze(execution.task, refinementContext);
        
        execution.geminiContributions.push({
            phase: phase.name,
            content: geminiRefinement.output,
            timestamp: new Date(),
            confidence: geminiRefinement.confidence || 0.8
        });
    }
    
    private async executeDebate(
        execution: CollaborativeExecution,
        phase: CollaborationPhase,
        context: any
    ): Promise<void> {
        // Models debate on disagreements
        for (const disagreement of execution.consensus.disagreements) {
            if (typeof disagreement === 'string') continue;
            if (!disagreement.resolved) {
                const debate = await this.facilitateDebate(
                    disagreement,
                    execution,
                    context
                );
                
                execution.consensus.resolutions.push(debate.resolution.approach);
                disagreement.resolved = true;
            }
        }
    }
    
    private async executeSynthesis(
        execution: CollaborativeExecution,
        phase: CollaborationPhase,
        context: any
    ): Promise<void> {
        // Combine all contributions into final synthesis
        const synthesisContext = {
            ...context,
            claudeContributions: execution.claudeContributions,
            geminiContributions: execution.geminiContributions,
            agreements: execution.consensus.points,
            resolutions: execution.consensus.resolutions
        };
        
        const synthesis = await this.bossAgent.synthesize(execution.task, synthesisContext);
        
        execution.finalOutput = synthesis.output;
        execution.confidenceScore = synthesis.confidence;
    }
    
    private async facilitateDebate(
        disagreement: Disagreement,
        execution: CollaborativeExecution,
        context: any
    ): Promise<{ resolution: Resolution }> {
        // Have models explain their reasoning
        const claudeReasoning = await this.claudeInterface.explainReasoning(
            disagreement.claudePosition,
            context
        );
        
        const geminiReasoning = await this.geminiInterface.explainReasoning(
            disagreement.geminiPosition,
            context
        );
        
        // Look for common ground
        const commonGround = this.findCommonGround(
            claudeReasoning,
            geminiReasoning
        );
        
        // Generate resolution
        const resolution: Resolution = {
            disagreementId: disagreement.id,
            approach: commonGround.approach,
            reasoning: commonGround.reasoning,
            confidence: commonGround.confidence,
            adoptedFrom: commonGround.source
        };
        
        return { resolution };
    }
    
    private compareAnalyses(
        claudeAnalysis: any,
        geminiAnalysis: any
    ): { agreements: string[], disagreements: Disagreement[] } {
        const agreements: string[] = [];
        const disagreements: Disagreement[] = [];
        
        // Simple comparison logic - in practice, this would be more sophisticated
        const claudePoints = this.extractKeyPoints(claudeAnalysis.output);
        const geminiPoints = this.extractKeyPoints(geminiAnalysis.output);
        
        // Find agreements
        for (const claudePoint of claudePoints) {
            for (const geminiPoint of geminiPoints) {
                if (this.similarityScore(claudePoint, geminiPoint) > 0.8) {
                    agreements.push(claudePoint);
                }
            }
        }
        
        // Find disagreements
        for (const claudePoint of claudePoints) {
            let hasAgreement = false;
            for (const geminiPoint of geminiPoints) {
                if (this.similarityScore(claudePoint, geminiPoint) > 0.8) {
                    hasAgreement = true;
                    break;
                }
            }
            
            if (!hasAgreement) {
                disagreements.push({
                    id: uuidv4(),
                    topic: claudePoint,
                    claudePosition: claudePoint,
                    geminiPosition: 'Disagrees with this approach',
                    severity: 'medium',
                    resolved: false
                });
            }
        }
        
        return { agreements, disagreements };
    }
    
    private findCommonGround(
        claudeReasoning: any,
        geminiReasoning: any
    ): { approach: string, reasoning: string, confidence: number, source: 'claude' | 'gemini' | 'consensus' } {
        // Simple common ground finding - in practice, this would use more sophisticated NLP
        const claudeApproach = this.extractApproach(claudeReasoning.output);
        const geminiApproach = this.extractApproach(geminiReasoning.output);
        
        if (this.similarityScore(claudeApproach, geminiApproach) > 0.7) {
            return {
                approach: claudeApproach,
                reasoning: 'Both models agree on this approach',
                confidence: 0.9,
                source: 'consensus'
            };
        }
        
        // Choose the more confident approach
        if (claudeReasoning.confidence > geminiReasoning.confidence) {
            return {
                approach: claudeApproach,
                reasoning: 'Claude has higher confidence in this approach',
                confidence: claudeReasoning.confidence,
                source: 'claude'
            };
        } else {
            return {
                approach: geminiApproach,
                reasoning: 'Gemini has higher confidence in this approach',
                confidence: geminiReasoning.confidence,
                source: 'gemini'
            };
        }
    }
    
    private assignRole(
        model: 'claude' | 'gemini',
        task: string,
        strategy: CollaborationStrategy
    ): string {
        // Role assignment based on task type and strategy
        const taskType = this.classifyTask(task);
        
        switch (strategy.type) {
            case 'complementary':
                return this.assignComplementaryRole(model, taskType);
            case 'competitive':
                return this.assignCompetitiveRole(model, taskType);
            case 'consensus':
                return this.assignConsensusRole(model, taskType);
            default:
                return 'analyzer';
        }
    }
    
    private classifyTask(task: string): string {
        const lowerTask = task.toLowerCase();
        
        if (lowerTask.includes('debug') || lowerTask.includes('error')) {
            return 'debugging';
        } else if (lowerTask.includes('refactor') || lowerTask.includes('optimize')) {
            return 'refactoring';
        } else if (lowerTask.includes('generate') || lowerTask.includes('create')) {
            return 'generation';
        } else if (lowerTask.includes('test') || lowerTask.includes('validate')) {
            return 'testing';
        } else {
            return 'analysis';
        }
    }
    
    private assignComplementaryRole(
        model: 'claude' | 'gemini',
        taskType: string
    ): string {
        if (model === 'claude') {
            switch (taskType) {
                case 'debugging':
                    return 'analyzer';
                case 'refactoring':
                    return 'reviewer';
                case 'generation':
                    return 'implementer';
                case 'testing':
                    return 'advisor';
                default:
                    return 'analyzer';
            }
        } else {
            switch (taskType) {
                case 'debugging':
                    return 'implementer';
                case 'refactoring':
                    return 'implementer';
                case 'generation':
                    return 'reviewer';
                case 'testing':
                    return 'implementer';
                default:
                    return 'implementer';
            }
        }
    }
    
    private assignCompetitiveRole(
        model: 'claude' | 'gemini',
        taskType: string
    ): string {
        return 'analyzer'; // Both models analyze independently
    }
    
    private assignConsensusRole(
        model: 'claude' | 'gemini',
        taskType: string
    ): string {
        return 'advisor'; // Both models provide advice for consensus
    }
    
    private getDefaultStrategy(): CollaborationStrategy {
        return {
            type: 'complementary',
            description: 'Claude analyzes, Gemini implements',
            phaseSequence: [
                {
                    name: 'Parallel Analysis',
                    type: 'parallel_analysis',
                    description: 'Both models analyze the problem independently',
                    duration: 30
                },
                {
                    name: 'Sequential Refinement',
                    type: 'sequential_refinement',
                    description: 'Claude provides analysis, Gemini refines',
                    duration: 45
                },
                {
                    name: 'Debate Disagreements',
                    type: 'debate',
                    description: 'Models debate on any disagreements',
                    duration: 30
                },
                {
                    name: 'Final Synthesis',
                    type: 'synthesis',
                    description: 'Combine all contributions into final output',
                    duration: 15
                }
            ]
        };
    }
    
    private async buildConsensus(execution: CollaborativeExecution): Promise<ConsensusResult> {
        const agreements = execution.consensus.points;
        const disagreements = execution.consensus.disagreements.filter(d => 
            typeof d !== 'string' && !d.resolved
        );
        const resolutions = execution.consensus.resolutions;
        
        return {
            achieved: disagreements.length === 0,
            points: agreements,
            disagreements: disagreements.map(d => (d as any).topic),
            resolutions: resolutions
        };
    }
    
    private async synthesizeFinalOutput(execution: CollaborativeExecution): Promise<string> {
        if (execution.finalOutput) {
            return execution.finalOutput;
        }
        
        // Combine all contributions
        const allContributions = [
            ...execution.claudeContributions.map(c => `Claude: ${c.content}`),
            ...execution.geminiContributions.map(c => `Gemini: ${c.content}`)
        ];
        
        return allContributions.join('\n\n---\n\n');
    }
    
    private calculateConfidenceScore(execution: CollaborativeExecution): number {
        const claudeConfidence = execution.claudeContributions.reduce(
            (sum, c) => sum + c.confidence, 0
        ) / execution.claudeContributions.length;
        
        const geminiConfidence = execution.geminiContributions.reduce(
            (sum, c) => sum + c.confidence, 0
        ) / execution.geminiContributions.length;
        
        const consensusBonus = execution.consensus.achieved ? 0.1 : 0;
        
        return Math.min(1.0, (claudeConfidence + geminiConfidence) / 2 + consensusBonus);
    }
    
    private async saveExecutionProgress(execution: CollaborativeExecution): Promise<void> {
        // Save progress to session
        const currentSession = await this.sessionManager.getCurrentSession();
        if (currentSession) {
            await this.sessionManager.addExecution(currentSession.id, execution);
        }
    }
    
    private extractKeyPoints(text: string): string[] {
        // Simple key point extraction - in practice, this would use NLP
        return text.split('\n').filter(line => 
            line.trim().length > 0 && 
            (line.includes(':') || line.includes('-') || line.includes('•'))
        );
    }
    
    private extractApproach(text: string): string {
        // Simple approach extraction
        const lines = text.split('\n');
        return lines.find(line => 
            line.toLowerCase().includes('approach') || 
            line.toLowerCase().includes('method') ||
            line.toLowerCase().includes('strategy')
        ) || lines[0] || text;
    }
    
    private similarityScore(text1: string, text2: string): number {
        // Simple similarity scoring - in practice, this would use embeddings
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        
        const commonWords = words1.filter(word => words2.includes(word));
        return commonWords.length / Math.max(words1.length, words2.length);
    }
} 