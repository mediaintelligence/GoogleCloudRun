// src/core/bossAgentRouter.ts

import * as vscode from 'vscode';
import { 
    LLMRequest, 
    LLMResponse, 
    ModelProvider, 
    RoutingDecision, 
    RequestFingerprint,
    TaskComplexity,
    PerformanceMetrics 
} from '../types/bossAgentTypes';

/**
 * The Boss Agent Router - Intelligent Multi-Model Orchestration
 * * This is the heart of our multi-model AI platform. The Boss Agent analyzes
 * incoming requests and intelligently routes them to the optimal AI model
 * based on task complexity, context requirements, cost considerations, and
 * learned performance patterns.
 * * Key Features:
 * - Intelligent model selection based on request analysis
 * - Fallback cascading for reliability
 * - Performance learning and optimization
 * - Cost-aware routing decisions
 * - Context-aware model matching
 */
export class BossAgentRouter {
    private routingHistory: Map<string, PerformanceMetrics> = new Map();
    
    constructor(
        private _context: vscode.ExtensionContext
    ) {
        this.loadPerformanceHistory();
    }
    
    /**
     * The main routing decision engine - analyzes request and selects optimal model
     */
    async route(request: LLMRequest): Promise<RoutingDecision> {
        const fingerprint = await this.generateFingerprint(request);
        const complexity = this.analyzeComplexity(request, fingerprint);
        const _contextNeeds = await this.analyzeContextNeeds(request);
        
        // Get routing policy from configuration
        const _routingPolicy = this.getRoutingPolicy();
        
        // Make intelligent routing decision
        const decision = await this.makeRoutingDecision(
            request, 
            fingerprint, 
            complexity, 
            _contextNeeds, 
            _routingPolicy
        );
        
        console.log(`🧠 Boss Agent routing to ${decision.primaryModel} for: ${request.prompt.slice(0, 50)}...`);
        return decision;
    }
    
    /**
     * Execute the request using the selected model with fallback support
     */
    async executeWithFallbacks(request: LLMRequest, decision: RoutingDecision): Promise<LLMResponse> {
        const startTime = Date.now();
        let lastError: Error | null = null;
        
        // Try primary model first
        try {
            const response = await this.executeOnModel(decision.primaryModel, request);
            await this.recordSuccess(decision.primaryModel, request, response, Date.now() - startTime);
            return response;
        } catch (error) {
            console.warn(`❌ Primary model ${decision.primaryModel} failed:`, error);
            lastError = error as Error;
        }
        
        // Try fallback models
        for (const fallbackModel of decision.fallbackModels) {
            try {
                const response = await this.executeOnModel(fallbackModel, request);
                await this.recordFallbackSuccess(fallbackModel, decision.primaryModel, request, response);
                return response;
            } catch (error) {
                console.warn(`❌ Fallback model ${fallbackModel} failed:`, error);
                lastError = error as Error;
            }
        }
        
        throw new Error(`All models failed. Last error: ${lastError?.message}`);
    }
    
    /**
     * Generate a fingerprint of the request for caching and analysis
     */
    private async generateFingerprint(request: LLMRequest): Promise<RequestFingerprint> {
        const contentHash = this.hashContent(request.prompt);
        const tokenCount = this.estimateTokens(request.prompt);
        
        return {
            contentHash,
            complexity: this.calculateComplexityScore(request),
            estimatedTokens: tokenCount,
            requiresTools: !!(request.tools && request.tools.length > 0),
            hasVision: !!(request.images && request.images.length > 0),
            hasCode: this.detectCodeContent(request.prompt),
            taskType: await this.classifyTaskType(request.prompt),
            userContext: await this.getUserContext()
        };
    }
    
    /**
     * Analyze the complexity of the incoming request
     */
    private analyzeComplexity(_request: LLMRequest, fingerprint: RequestFingerprint): TaskComplexity {
        let complexityScore = 0;
        
        // Token count factor
        if (fingerprint.estimatedTokens > 8000) complexityScore += 3;
        else if (fingerprint.estimatedTokens > 2000) complexityScore += 2;
        else complexityScore += 1;
        
        // Task type factor
        const complexTasks = ['refactoring', 'architecture', 'debugging', 'analysis'];
        if (complexTasks.includes(fingerprint.taskType)) complexityScore += 2;
        
        // Tools and vision factor
        if (fingerprint.requiresTools) complexityScore += 1;
        if (fingerprint.hasVision) complexityScore += 1;
        
        // Code complexity factor
        if (fingerprint.hasCode) complexityScore += 1;
        
        if (complexityScore >= 6) return 'high';
        if (complexityScore >= 4) return 'medium';
        return 'low';
    }
    
    /**
     * Core routing decision logic based on learned patterns and policies
     */
    private async makeRoutingDecision(
        _request: LLMRequest,
        fingerprint: RequestFingerprint,
        complexity: TaskComplexity,
        _contextNeeds: any,
        _policy: any
    ): Promise<RoutingDecision> {
        
        const config = vscode.workspace.getConfiguration('gemini-assistant.bossAgent');
        const fallbackChain = config.get<ModelProvider[]>('fallbackChain', ['claude4', 'gpt4o', 'gemini25']);
        const dailyCostLimit = config.get<number>('dailyCostLimit', 100);
        const currentCost = this._context.globalState.get<number>('dailyCost', 0);

        // Check for cached similar responses first
        const cachedResponse = await this.checkSemanticCache(fingerprint);
        if (cachedResponse) {
            return {
                primaryModel: 'cache',
                fallbackModels: [],
                reasoning: 'Found semantically similar cached response',
                confidence: 0.95,
                estimatedCost: 0,
                cachedResponse
            };
        }
        
        // Vision tasks go to Gemini
        if (fingerprint.hasVision) {
            return {
                primaryModel: 'gemini25',
                fallbackModels: fallbackChain.filter(m => m !== 'gemini25'),
                reasoning: 'Visual content detected - Gemini excels at vision tasks',
                confidence: 0.9,
                estimatedCost: this.estimateCost('gemini25', fingerprint.estimatedTokens)
            };
        }
        
        // Tool calling tasks prefer GPT-4
        if (fingerprint.requiresTools) {
            return {
                primaryModel: 'gpt4o',
                fallbackModels: fallbackChain.filter(m => m !== 'gpt4o'),
                reasoning: 'Function calling required - GPT-4o has reliable tool execution',
                confidence: 0.85,
                estimatedCost: this.estimateCost('gpt4o', fingerprint.estimatedTokens)
            };
        }
        
        // High complexity reasoning goes to Claude
        if (complexity === 'high' || fingerprint.taskType === 'analysis') {
            return {
                primaryModel: 'claude4',
                fallbackModels: fallbackChain.filter(m => m !== 'claude4'),
                reasoning: 'Complex reasoning task - Claude 4 excels at deep analysis',
                confidence: 0.88,
                estimatedCost: this.estimateCost('claude4', fingerprint.estimatedTokens)
            };
        }
        
        // Cost optimization for simple tasks
        if (complexity === 'low' && currentCost > dailyCostLimit * 0.8) {
            return {
                primaryModel: 'gemini25',
                fallbackModels: fallbackChain.filter(m => m !== 'gemini25'),
                reasoning: 'Cost optimization - using efficient model for simple task',
                confidence: 0.75,
                estimatedCost: this.estimateCost('gemini25', fingerprint.estimatedTokens)
            };
        }
        
        // Default to Claude for balanced performance
        return {
            primaryModel: 'claude4',
            fallbackModels: fallbackChain.filter(m => m !== 'claude4'),
            reasoning: 'Default routing - Claude provides balanced performance',
            confidence: 0.8,
            estimatedCost: this.estimateCost('claude4', fingerprint.estimatedTokens)
        };
    }
    
    /**
     * Execute request on specific model (stub implementations)
     */
    private async executeOnModel(model: ModelProvider, request: LLMRequest): Promise<LLMResponse> {
        // This would connect to actual model APIs
        console.log(`🤖 Executing on ${model}: ${request.prompt.slice(0, 50)}...`);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        const estimatedTokens = this.estimateTokens(request.prompt);
        const cost = this.estimateCost(model, estimatedTokens);
        const currentCost = this._context.globalState.get<number>('dailyCost', 0);
        this._context.globalState.update('dailyCost', currentCost + cost);
        
        return {
            content: `Response from ${model}: ${request.prompt}`,
            model: model,
            tokens: estimatedTokens,
            cost: cost,
            latency: 1000,
            confidence: 0.85
        };
    }
    
    /**
     * Record successful execution for learning
     */
    private async recordSuccess(
        model: ModelProvider, 
        request: LLMRequest, 
        response: LLMResponse, 
        duration: number
    ): Promise<void> {
        const fingerprint = await this.generateFingerprint(request);
        const key = `${model}_${fingerprint.taskType}`;
        
        const existing = this.routingHistory.get(key) || {
            successCount: 0,
            totalAttempts: 0,
            avgLatency: 0,
            avgCost: 0,
            confidenceScore: 0
        };
        
        existing.successCount++;
        existing.totalAttempts++;
        existing.avgLatency = (existing.avgLatency + duration) / 2;
        existing.avgCost = (existing.avgCost + response.cost) / 2;
        existing.confidenceScore = existing.successCount / existing.totalAttempts;
        
        this.routingHistory.set(key, existing);
        this.savePerformanceHistory();
    }
    
    // Utility methods
    private hashContent(content: string): string {
        // Simple hash implementation
        return Buffer.from(content).toString('base64').slice(0, 16);
    }
    
    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4); // Rough estimate
    }
    
    private calculateComplexityScore(request: LLMRequest): number {
        return Math.min(request.prompt.length / 1000, 10);
    }
    
    private detectCodeContent(text: string): boolean {
        const codeIndicators = ['function', 'class', 'import', '```', 'def ', 'const ', 'let '];
        return codeIndicators.some(indicator => text.includes(indicator));
    }
    
    private async classifyTaskType(prompt: string): Promise<string> {
        const lowerPrompt = prompt.toLowerCase();
        
        if (lowerPrompt.includes('refactor')) return 'refactoring';
        if (lowerPrompt.includes('debug') || lowerPrompt.includes('error')) return 'debugging';
        if (lowerPrompt.includes('analyze') || lowerPrompt.includes('explain')) return 'analysis';
        if (lowerPrompt.includes('create') || lowerPrompt.includes('generate')) return 'generation';
        if (lowerPrompt.includes('test')) return 'testing';
        
        return 'general';
    }
    
    private async getUserContext(): Promise<any> {
        const activeEditor = vscode.window.activeTextEditor;
        return {
            activeFile: activeEditor?.document.fileName,
            language: activeEditor?.document.languageId,
            hasSelection: !!activeEditor?.selection && !activeEditor.selection.isEmpty
        };
    }
    
    private async analyzeContextNeeds(request: LLMRequest): Promise<any> {
        // Analyze what context the request needs
        return {
            needsProjectContext: request.prompt.includes('project') || request.prompt.includes('codebase'),
            needsFileContext: request.prompt.includes('file') || request.prompt.includes('this'),
            needsGitContext: request.prompt.includes('git') || request.prompt.includes('commit')
        };
    }
    
    private getRoutingPolicy(): any {
        // Load routing policy from configuration
        return {
            preferredModel: vscode.workspace.getConfiguration('gemini-assistant').get('preferredModel', 'claude4'),
            costLimit: vscode.workspace.getConfiguration('gemini-assistant.bossAgent').get('dailyCostLimit', 100),
            qualityThreshold: vscode.workspace.getConfiguration('gemini-assistant').get('qualityThreshold', 0.8)
        };
    }
    
    private async checkSemanticCache(_fingerprint: RequestFingerprint): Promise<LLMResponse | null> {
        // Check for semantically similar cached responses
        // This would use embeddings to find similar requests
        return null; // Placeholder
    }
    
    private estimateCost(model: ModelProvider, tokens: number): number {
        const rates: Record<ModelProvider, number> = {
            'claude4': 0.015,
            'gpt4o': 0.01,
            'gemini25': 0.005,
            'grok4': 0.02,
            'cache': 0
        };
        return (rates[model] || 0.01) * tokens / 1000;
    }
    
    private async recordFallbackSuccess(
        fallbackModel: ModelProvider, 
        primaryModel: ModelProvider, 
        _request: LLMRequest, 
        _response: LLMResponse
    ): Promise<void> {
        console.log(`📊 Fallback success: ${fallbackModel} succeeded where ${primaryModel} failed`);
        // Record this for learning to improve future routing decisions
    }
    
    private loadPerformanceHistory(): void {
        const stored = this._context.globalState.get('routingHistory', {});
        this.routingHistory = new Map(Object.entries(stored));
    }
    
    private savePerformanceHistory(): void {
        const obj = Object.fromEntries(this.routingHistory);
        this._context.globalState.update('routingHistory', obj);
    }
}
