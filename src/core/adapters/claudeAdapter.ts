// src/core/adapters/claudeAdapter.ts

import { BaseLLMAdapter, GenerationOptions, ModelPricing, AdapterConfig } from './llmAdapter';
import { LLMRequest, LLMResponse, ModelProvider } from '../../types/bossAgentTypes';

/**
 * Claude Adapter - Anthropic's Claude AI Integration
 * 
 * Implements the unified LLMAdapter interface for Claude models,
 * providing intelligent routing and execution capabilities.
 */
export class ClaudeAdapter extends BaseLLMAdapter {
    readonly provider: ModelProvider = 'claude4';
    readonly name: string = 'Claude 4 Sonnet';
    readonly version: string = 'claude-3-5-sonnet-20241022';
    
    private readonly _baseUrl = 'https://api.anthropic.com/v1/messages';
    
    constructor(config: AdapterConfig) {
        super(config);
    }
    
    async generate(request: LLMRequest, _options?: GenerationOptions): Promise<LLMResponse> {
        const startTime = Date.now();
        
        try {
            const anthropicRequest = this.formatRequest(request);
            
            // Simulate API call (replace with actual Anthropic API call)
            const response = await this.callAnthropicAPI(anthropicRequest);
            
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            return {
                content: response.content[0].text,
                model: this.provider,
                tokens: response.usage.input_tokens + response.usage.output_tokens,
                cost: this.calculateCost(response.usage.input_tokens, response.usage.output_tokens),
                latency,
                confidence: 0.9, // Claude generally has high confidence
                metadata: {
                    stopReason: response.stop_reason,
                    model: response.model,
                    usage: response.usage
                }
            };
        } catch (error) {
            throw this.handleError(error, 'generate');
        }
    }
    
    async generateStream(
        request: LLMRequest,
        onChunk: (chunk: string) => void,
        options?: GenerationOptions
    ): Promise<LLMResponse> {
        // For true streaming, you would implement Anthropic's streaming API
        // For now, fall back to the base implementation
        return super.generateStream(request, onChunk, options);
    }
    
    async getPricing(): Promise<ModelPricing> {
        return {
            inputTokenCost: 0.003, // $3 per 1M input tokens for Claude 3.5 Sonnet
            outputTokenCost: 0.015, // $15 per 1M output tokens
            currency: 'USD',
            rateLimits: {
                requestsPerMinute: 1000,
                tokensPerMinute: 80000
            }
        };
    }
    
    protected getMaxTokens(): number {
        return 200000; // Claude 3.5 Sonnet context window
    }
    
    private formatRequest(request: LLMRequest): any {
        const messages: Array<{role: string; content: string | any[]}> = [
            {
                role: 'user',
                content: request.prompt
            }
        ];
        
        // Add context if provided
        if (request.context && request.context.length > 0) {
            const contextMessage = {
                role: 'user',
                content: `Context:\n${request.context.join('\n\n')}\n\nRequest: ${request.prompt}`
            };
            messages[0] = contextMessage;
        }
        
        // Handle images if provided (Claude 3.5 supports vision)
        if (request.images && request.images.length > 0) {
            messages[0].content = [
                { type: 'text', text: request.prompt },
                ...request.images.map(img => ({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: 'image/jpeg',
                        data: img
                    }
                }))
            ];
        }
        
        return {
            model: this.version,
            max_tokens: request.maxTokens || 4096,
            temperature: request.temperature || 0.7,
            messages,
            tools: request.tools ? this.formatTools(request.tools) : undefined
        };
    }
    
    private formatTools(tools: any[]): any[] {
        return tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: {
                type: 'object',
                properties: tool.parameters,
                required: Object.keys(tool.parameters)
            }
        }));
    }
    
    private async callAnthropicAPI(request: any): Promise<any> {
        // Simulate API response (replace with actual fetch call)
        await this.delay(800 + Math.random() * 400); // Simulate network latency
        
        return {
            id: `msg_${Date.now()}`,
            type: 'message',
            role: 'assistant',
            model: this.version,
            content: [
                {
                    type: 'text',
                    text: `Claude response to: ${request.messages[0].content}. This is a simulated response showing intelligent analysis and reasoning capabilities.`
                }
            ],
            stop_reason: 'end_turn',
            stop_sequence: null,
            usage: {
                input_tokens: this.estimateTokens(JSON.stringify(request.messages)),
                output_tokens: 150
            }
        };
    }
    
    private calculateCost(inputTokens: number, outputTokens: number): number {
        const inputCost = (inputTokens / 1000000) * 3; // $3 per 1M tokens
        const outputCost = (outputTokens / 1000000) * 15; // $15 per 1M tokens
        return inputCost + outputCost;
    }
}