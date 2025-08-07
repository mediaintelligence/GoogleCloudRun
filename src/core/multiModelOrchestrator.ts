// src/core/multiModelOrchestrator.ts

import * as vscode from 'vscode';
import { BossAgentRouter } from './bossAgentRouter';
import { MemorySystem } from './memorySystem';
import { ProjectIntelligenceSystem } from './projectIntelligenceSystem';
import { ClaudeAdapter } from './adapters/claudeAdapter';
import { 
    LLMRequest, 
    LLMResponse, 
    ModelProvider,
    RoutingDecision 
} from '../types/bossAgentTypes';
import { LLMAdapter } from './adapters/llmAdapter';
import { CloudRunBridge, OrchestrationRequest, OrchestrationResponse } from '../services/cloudRunBridge';

class OrchestratorError extends Error {
    constructor(message: string, public readonly originalError?: any) {
        super(message);
        this.name = 'OrchestratorError';
    }
}

/**
 * Multi-Model Orchestrator - The Evolution of Your VS Code Extension
 * * This class bridges your existing Gemini Assistant extension with the new
 * Boss Agent Router architecture, transforming it into a sophisticated
 * multi-model AI orchestration platform while preserving all existing functionality.
 * * Key Features:
 * - Seamless integration with existing extension components
 * - Intelligent model routing based on task analysis
 * - Backwards compatibility with current workflows
 * - Enhanced performance through multi-model optimization
 * - Progressive enhancement path for future capabilities
 */
export class MultiModelOrchestrator {
    private bossAgent: BossAgentRouter;
    private adapters: Map<ModelProvider, LLMAdapter> = new Map();
    private isInitialized: boolean = false;
    private cloudRunBridge: CloudRunBridge;
    private useCloudRun: boolean = false;
    
    constructor(
        private _memorySystem: MemorySystem,
        private _projectIntelligence: ProjectIntelligenceSystem
    ) {
        this.bossAgent = new BossAgentRouter();
        this.cloudRunBridge = CloudRunBridge.getInstance();
        this.checkCloudRunAvailability();
    }
    
    /**
     * Initialize the orchestrator with available model adapters
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;
        
        try {
            console.log('🚀 Initializing Multi-Model Orchestrator...');
            
            // Initialize model adapters
            await this.initializeAdapters();
            
            // Health check all models
            await this.performHealthChecks();
            
            // Setup monitoring and metrics
            this.setupMonitoring();
            
            this.isInitialized = true;
            console.log('✅ Multi-Model Orchestrator ready');
            
            // Show success notification
            vscode.window.showInformationMessage(
                '🎯 Boss Agent Router activated! Your extension now uses intelligent multi-model orchestration.'
            );
            
        } catch (error) {
            console.error('❌ Failed to initialize Multi-Model Orchestrator:', error);
            throw new OrchestratorError('Initialization failed', error);
        }
    }
    
    /**
     * Check if Cloud Run services are available
     */
    private async checkCloudRunAvailability(): Promise<void> {
        try {
            const isHealthy = await this.cloudRunBridge.healthCheck();
            this.useCloudRun = isHealthy;
            if (isHealthy) {
                console.log('✅ Cloud Run orchestration services available');
            }
        } catch (error) {
            console.log('⚠️ Cloud Run services not available, using local processing');
            this.useCloudRun = false;
        }
    }

    /**
     * Main entry point for AI requests - replaces direct model calls
     */
    async processRequest(
        prompt: string,
        context?: any,
        options?: RequestOptions
    ): Promise<EnhancedResponse> {
        if (!this.isInitialized) {
            throw new OrchestratorError('Orchestrator not initialized');
        }
        
        const startTime = Date.now();

        // Try Cloud Run orchestration first if available
        if (this.useCloudRun) {
            try {
                const orchRequest: OrchestrationRequest = {
                    prompt,
                    task_type: this.inferTaskType(prompt, context),
                    collaboration_mode: options?.collaborationMode || 'specialized',
                    context: context,
                    max_tokens: options?.maxTokens || 2048,
                    temperature: options?.temperature || 0.7
                };

                const cloudResponse = await this.cloudRunBridge.orchestrate(orchRequest);
                
                return {
                    content: cloudResponse.primary_response,
                    model: cloudResponse.model_used,
                    confidence: cloudResponse.confidence_score,
                    metadata: {
                        ...cloudResponse.metadata,
                        supporting_response: cloudResponse.supporting_response,
                        collaboration_mode: cloudResponse.collaboration_mode,
                        processing_time: Date.now() - startTime,
                        cloud_run: true
                    }
                } as EnhancedResponse;
            } catch (error) {
                console.log('⚠️ Cloud Run failed, falling back to local processing');
            }
        }

        // Fallback to local processing
        let request: LLMRequest;
        let routingDecision: RoutingDecision;

        try {
            // Build comprehensive request
            request = await this.buildRequest(prompt, context, options);
            
            // Let Boss Agent choose the optimal model
            routingDecision = await this.bossAgent.route(request);
            console.log(`🎯 Boss Agent Decision: ${routingDecision.reasoning}`);
            
        } catch (error) {
            console.error('❌ Request building or routing failed:', error);
            throw new OrchestratorError('Failed to prepare the request', error);
        }

        try {
            // Execute with fallback support
            const response = await this.bossAgent.executeWithFallbacks(request, routingDecision);
            
            // Enhance response with additional metadata
            const enhancedResponse = await this.enhanceResponse(response, routingDecision, startTime);
            
            // Learn from this interaction
            await this.recordInteraction(request, response, routingDecision);
            
            return enhancedResponse;
            
        } catch (error) {
            console.error('❌ Request execution failed across all models:', error);
            throw new OrchestratorError('All models failed to process the request', error);
        }
    }

    /**
     * Infer task type from prompt and context
     */
    private inferTaskType(prompt: string, context?: any): OrchestrationRequest['task_type'] {
        const lowerPrompt = prompt.toLowerCase();
        
        if (lowerPrompt.includes('code') || lowerPrompt.includes('function') || lowerPrompt.includes('implement')) {
            return 'code';
        }
        if (lowerPrompt.includes('analyze') || lowerPrompt.includes('review')) {
            return 'analysis';
        }
        if (lowerPrompt.includes('create') || lowerPrompt.includes('write')) {
            return 'creative';
        }
        if (lowerPrompt.includes('translate')) {
            return 'translation';
        }
        if (lowerPrompt.includes('summarize')) {
            return 'summarization';
        }
        if (lowerPrompt.includes('why') || lowerPrompt.includes('explain')) {
            return 'reasoning';
        }
        
        return 'generation';
    }
    
    /**
     * Streaming version for real-time responses
     */
    async processRequestStream(
        prompt: string,
        onChunk: (chunk: string, metadata?: any) => void,
        context?: any,
        options?: RequestOptions
    ): Promise<EnhancedResponse> {
        const request = await this.buildRequest(prompt, context, options);
        const routingDecision = await this.bossAgent.route(request);
        
        const adapter = this.adapters.get(routingDecision.primaryModel);
        if (!adapter) {
            throw new OrchestratorError(`Adapter not found for ${routingDecision.primaryModel}`);
        }
        
        const response = await adapter.generateStream(request, onChunk);
        return this.enhanceResponse(response, routingDecision, Date.now());
    }
    
    /**
     * Get routing insights for debugging and optimization
     */
    async getRoutingInsights(): Promise<RoutingInsights> {
        // Analyze recent routing decisions and performance
        return {
            recentDecisions: [], // Implement routing history analysis
            modelPerformance: {}, // Implement performance metrics
            costAnalysis: {}, // Implement cost tracking
            recommendations: [] // Implement optimization suggestions
        };
    }
    
    /**
     * Legacy compatibility method - maps old Gemini calls to orchestrator
     */
    async processGeminiRequest(prompt: string, context?: any): Promise<any> {
        console.log('🔄 Legacy Gemini request routed through Boss Agent');
        const response = await this.processRequest(prompt, context);
        
        // Return in old format for backwards compatibility
        return {
            content: response.content,
            usage: {
                tokens: response.tokens,
                cost: response.cost
            }
        };
    }
    
    /**
     * Legacy compatibility method - maps old Claude calls to orchestrator
     */
    async processClaudeRequest(instruction: string, context?: any): Promise<any> {
        console.log('🔄 Legacy Claude request routed through Boss Agent');
        const response = await this.processRequest(instruction, context);
        
        // Return in old format for backwards compatibility
        return {
            output: response.content,
            success: true,
            duration: response.latency,
            filesModified: [],
            testsRun: 0,
            testsPassed: 0
        };
    }
    
    private async initializeAdapters(): Promise<void> {
        const config = vscode.workspace.getConfiguration('gemini-assistant');
        
        // Initialize Claude adapter
        if (config.get('claude.apiKey')) {
            const claudeAdapter = new ClaudeAdapter({
                apiKey: config.get('claude.apiKey', ''),
                timeout: 30000
            });
            this.adapters.set('claude4', claudeAdapter);
            console.log('✅ Claude adapter initialized');
        }
        
        // TODO: Initialize other adapters (GPT-4, Gemini, Grok)
        // Similar pattern for each model provider
        
        if (this.adapters.size === 0) {
            throw new Error('No model adapters configured. Please set up at least one API key.');
        }
    }
    
    private async performHealthChecks(): Promise<void> {
        const results = new Map<ModelProvider, boolean>();
        
        for (const [provider, adapter] of this.adapters) {
            try {
                const isHealthy = await adapter.healthCheck();
                results.set(provider, isHealthy);
                console.log(`${isHealthy ? '✅' : '❌'} ${provider} health check: ${isHealthy ? 'OK' : 'FAILED'}`);
            } catch (error) {
                results.set(provider, false);
                console.warn(`❌ ${provider} health check failed:`, error);
            }
        }
        
        const healthyCount = Array.from(results.values()).filter(Boolean).length;
        if (healthyCount === 0) {
            throw new Error('No healthy model adapters found');
        }
        
        console.log(`🏥 Health check complete: ${healthyCount}/${results.size} models healthy`);
    }
    
    private async buildRequest(
        prompt: string,
        context?: any,
        options?: RequestOptions
    ): Promise<LLMRequest> {
        const request: LLMRequest = {
            prompt,
            maxTokens: options?.maxTokens || 4096,
            temperature: options?.temperature || 0.7,
            metadata: {
                timestamp: new Date(),
                source: 'vscode-extension',
                ...options?.metadata
            }
        };
        
        // Add project context if available
        if (context?.includeProjectContext) {
            const projectContext = await this._projectIntelligence.getProjectContext();
            request.context = [JSON.stringify(projectContext)];
        }
        
        // Add relevant memories
        if (this._memorySystem) {
            const relevantMemories = await this._memorySystem.getRelevantMemories(prompt, this._projectIntelligence as any, 5);
            if (relevantMemories.length > 0) {
                request.context = request.context || [];
                request.context.push(`Relevant past experiences:\n${relevantMemories.map((m: any) => m.content).join('\n')}`);
            }
        }
        
        return request;
    }
    
    private async enhanceResponse(
        response: LLMResponse,
        decision: RoutingDecision,
        startTime: number
    ): Promise<EnhancedResponse> {
        return {
            ...response,
            routing: {
                selectedModel: decision.primaryModel,
                reasoning: decision.reasoning,
                confidence: decision.confidence,
                alternativesConsidered: decision.fallbackModels
            },
            performance: {
                totalLatency: Date.now() - startTime,
                modelLatency: response.latency,
                routingLatency: startTime - Date.now() + response.latency
            },
            suggestions: await this.generateSuggestions(response)
        };
    }
    
    private async generateSuggestions(response: LLMResponse): Promise<string[]> {
        // Generate contextual suggestions based on the response
        const suggestions: string[] = [];
        
        if (response.confidence < 0.7) {
            suggestions.push('Consider providing more context for better results');
        }
        
        if (response.cost > 0.05) {
            suggestions.push('This was a high-cost request. Consider breaking it into smaller parts');
        }
        
        return suggestions;
    }
    
    private async recordInteraction(
        _request: LLMRequest,
        _response: LLMResponse,
        _decision: RoutingDecision
    ): Promise<void> {
        // Record this interaction for learning and improvement
        if (this._memorySystem) {
            await this._memorySystem.recordExecution({
                input: _request.prompt.slice(0, 200),
                result: _response.content.slice(0, 200),
                context: await this._projectIntelligence.getProjectContext() as any,
                timestamp: new Date()
            });
        }
    }
    
    private setupMonitoring(): void {
        // Setup periodic health checks and performance monitoring
        setInterval(async () => {
            await this.performHealthChecks();
        }, 5 * 60 * 1000); // Every 5 minutes
    }
}

interface RequestOptions {
    maxTokens?: number;
    temperature?: number;
    includeProjectContext?: boolean;
    priority?: 'low' | 'normal' | 'high';
    metadata?: Record<string, any>;
}

interface EnhancedResponse extends LLMResponse {
    routing: {
        selectedModel: ModelProvider;
        reasoning: string;
        confidence: number;
        alternativesConsidered: ModelProvider[];
    };
    performance: {
        totalLatency: number;
        modelLatency: number;
        routingLatency: number;
    };
    suggestions: string[];
}

interface RoutingInsights {
    recentDecisions: any[];
    modelPerformance: Record<string, any>;
    costAnalysis: Record<string, any>;
    recommendations: string[];
}
