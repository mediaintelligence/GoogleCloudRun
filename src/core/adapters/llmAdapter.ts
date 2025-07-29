// src/core/adapters/llmAdapter.ts

import { LLMRequest, LLMResponse, ModelProvider } from '../../types/bossAgentTypes';

/**
 * Unified LLM Adapter Protocol
 * 
 * This protocol defines a consistent interface for all AI model providers,
 * enabling seamless swapping between Claude, GPT-4, Gemini, Grok, etc.
 * without changing business logic.
 */
export interface LLMAdapter {
    readonly provider: ModelProvider;
    readonly name: string;
    readonly version: string;
    
    /**
     * Generate a response using this model
     */
    generate(
        request: LLMRequest,
        options?: GenerationOptions
    ): Promise<LLMResponse>;
    
    /**
     * Stream a response for real-time display
     */
    generateStream(
        request: LLMRequest,
        onChunk: (chunk: string) => void,
        options?: GenerationOptions
    ): Promise<LLMResponse>;
    
    /**
     * Check if the model is available and healthy
     */
    healthCheck(): Promise<boolean>;
    
    /**
     * Get current pricing and limits
     */
    getPricing(): Promise<ModelPricing>;
    
    /**
     * Validate that a request is compatible with this model
     */
    validateRequest(request: LLMRequest): ValidationResult;
}

export interface GenerationOptions {
    timeout?: number;
    retries?: number;
    priority?: 'low' | 'normal' | 'high';
    metadata?: Record<string, any>;
}

export interface ModelPricing {
    inputTokenCost: number;
    outputTokenCost: number;
    currency: string;
    rateLimits: {
        requestsPerMinute: number;
        tokensPerMinute: number;
    };
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Base adapter implementation with common functionality
 */
export abstract class BaseLLMAdapter implements LLMAdapter {
    abstract readonly provider: ModelProvider;
    abstract readonly name: string;
    abstract readonly version: string;
    
    constructor(
        protected config: AdapterConfig
    ) {}
    
    abstract generate(request: LLMRequest, options?: GenerationOptions): Promise<LLMResponse>;
    
    async getPricing(): Promise<ModelPricing> {
        // Default pricing implementation - override in specific adapters
        return {
            inputTokenCost: 0.01,
            outputTokenCost: 0.02,
            currency: 'USD',
            rateLimits: {
                requestsPerMinute: 100,
                tokensPerMinute: 100000
            }
        };
    }
    
    async generateStream(
        request: LLMRequest,
        onChunk: (chunk: string) => void,
        options?: GenerationOptions
    ): Promise<LLMResponse> {
        // Default implementation - override for true streaming
        const response = await this.generate(request, options);
        
        // Simulate streaming by chunking the response
        const chunks = this.chunkResponse(response.content);
        for (const chunk of chunks) {
            onChunk(chunk);
            await this.delay(50); // Simulate streaming delay
        }
        
        return response;
    }
    
    async healthCheck(): Promise<boolean> {
        try {
            const testRequest: LLMRequest = {
                prompt: "Say 'OK' if you can respond.",
                maxTokens: 10
            };
            
            const response = await this.generate(testRequest, { timeout: 5000 });
            return response.content.includes('OK');
        } catch (error) {
            console.warn(`Health check failed for ${this.provider}:`, error);
            return false;
        }
    }
    
    validateRequest(request: LLMRequest): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        if (!request.prompt || request.prompt.trim().length === 0) {
            errors.push('Prompt cannot be empty');
        }
        
        if (request.maxTokens && request.maxTokens > this.getMaxTokens()) {
            errors.push(`Max tokens (${request.maxTokens}) exceeds model limit (${this.getMaxTokens()})`);
        }
        
        if (request.temperature && (request.temperature < 0 || request.temperature > 2)) {
            warnings.push('Temperature should be between 0 and 2');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    protected abstract getMaxTokens(): number;
    
    protected chunkResponse(content: string, chunkSize: number = 20): string[] {
        const words = content.split(' ');
        const chunks: string[] = [];
        
        for (let i = 0; i < words.length; i += chunkSize) {
            chunks.push(words.slice(i, i + chunkSize).join(' '));
        }
        
        return chunks;
    }
    
    protected delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    protected estimateTokens(text: string): number {
        // Rough estimation - should be replaced with proper tokenization
        return Math.ceil(text.length / 4);
    }
    
    protected handleError(error: any, context: string): Error {
        const message = `${this.provider} error in ${context}: ${error.message || error}`;
        console.error(message, error);
        return new Error(message);
    }
}

export interface AdapterConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;
    customHeaders?: Record<string, string>;
}