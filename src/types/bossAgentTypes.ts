// src/types/bossAgentTypes.ts

/**
 * Type definitions for the Boss Agent Router - Multi-Model AI Orchestration System
 */

export type ModelProvider = 'claude4' | 'gpt4o' | 'gemini25' | 'grok4' | 'cache';

export type TaskComplexity = 'low' | 'medium' | 'high';

export interface LLMRequest {
    prompt: string;
    context?: string[];
    tools?: ToolDefinition[];
    images?: string[];
    temperature?: number;
    maxTokens?: number;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
}

export interface LLMResponse {
    content: string;
    model: ModelProvider;
    tokens: number;
    cost: number;
    latency: number;
    confidence: number;
    metadata?: Record<string, any>;
}

export interface RoutingDecision {
    primaryModel: ModelProvider;
    fallbackModels: ModelProvider[];
    reasoning: string;
    confidence: number;
    estimatedCost: number;
    cachedResponse?: LLMResponse;
}

export interface RequestFingerprint {
    contentHash: string;
    complexity: number;
    estimatedTokens: number;
    requiresTools: boolean;
    hasVision: boolean;
    hasCode: boolean;
    taskType: string;
    userContext: any;
}

export interface PerformanceMetrics {
    successCount: number;
    totalAttempts: number;
    avgLatency: number;
    avgCost: number;
    confidenceScore: number;
}

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, any>;
}

export interface RoutingPolicy {
    rules: RoutingRule[];
    fallbackChain: ModelProvider[];
    costLimits: {
        daily: number;
        perRequest: number;
    };
    qualityThresholds: {
        minimum: number;
        preferred: number;
    };
}

export interface RoutingRule {
    condition: string;
    targetModel: ModelProvider;
    priority: number;
    description: string;
}

export interface ModelCapabilities {
    maxTokens: number;
    supportsVision: boolean;
    supportsTools: boolean;
    costPerToken: number;
    strengths: string[];
    weaknesses: string[];
}

export interface SemanticCacheEntry {
    fingerprint: RequestFingerprint;
    response: LLMResponse;
    createdAt: Date;
    hitCount: number;
    lastUsed: Date;
}

export interface CostOptimization {
    currentSpend: number;
    dailyBudget: number;
    projectedSpend: number;
    recommendations: string[];
}

export interface QualityMetrics {
    userSatisfaction: number;
    taskSuccessRate: number;
    averageResponseTime: number;
    errorRate: number;
}

export interface AdaptiveLearning {
    taskPatterns: Map<string, ModelProvider>;
    userPreferences: Map<string, number>;
    performanceHistory: Map<string, PerformanceMetrics>;
    improvementSuggestions: string[];
}