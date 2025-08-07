/**
 * Cloud Run Bridge Service
 * Connects VS Code extension with Cloud Run orchestration services
 */

import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

export interface CloudRunConfig {
    orchestratorUrl?: string;
    geminiServiceUrl?: string;
    claudeServiceUrl?: string;
    apiKey?: string;
    useLocalServices?: boolean;
    timeout?: number;
}

export interface OrchestrationRequest {
    prompt: string;
    task_type: 'analysis' | 'generation' | 'code' | 'vision' | 'reasoning' | 'creative' | 'translation' | 'summarization' | 'collaborative';
    collaboration_mode?: 'parallel' | 'sequential' | 'debate' | 'consensus' | 'specialized';
    preferred_model?: string;
    context?: Record<string, any>;
    max_tokens?: number;
    temperature?: number;
    require_consensus?: boolean;
}

export interface OrchestrationResponse {
    primary_response: string;
    supporting_response?: string;
    model_used: string;
    supporting_model?: string;
    collaboration_mode: string;
    confidence_score: number;
    consensus_achieved?: boolean;
    metadata: Record<string, any>;
}

export class CloudRunBridge {
    private static instance: CloudRunBridge;
    private orchestratorClient: AxiosInstance;
    private config: CloudRunConfig;
    private outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Claude-Gemini Cloud Run');
        this.config = this.loadConfiguration();
        this.orchestratorClient = this.createClient();
    }

    public static getInstance(): CloudRunBridge {
        if (!CloudRunBridge.instance) {
            CloudRunBridge.instance = new CloudRunBridge();
        }
        return CloudRunBridge.instance;
    }

    private loadConfiguration(): CloudRunConfig {
        const config = vscode.workspace.getConfiguration('claudeGeminiAssistant');
        
        // Default URLs - can be localhost for development or Cloud Run URLs for production
        const defaultOrchestrator = config.get<boolean>('useLocalServices', true) 
            ? 'http://localhost:8080'
            : config.get<string>('orchestratorUrl', 'https://claude-gemini-orchestrator-xxxxx.run.app');

        return {
            orchestratorUrl: config.get<string>('orchestratorUrl', defaultOrchestrator),
            geminiServiceUrl: config.get<string>('geminiServiceUrl'),
            claudeServiceUrl: config.get<string>('claudeServiceUrl'),
            apiKey: config.get<string>('cloudRunApiKey'),
            useLocalServices: config.get<boolean>('useLocalServices', true),
            timeout: config.get<number>('requestTimeout', 30000)
        };
    }

    private createClient(): AxiosInstance {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        return axios.create({
            baseURL: this.config.orchestratorUrl,
            timeout: this.config.timeout,
            headers
        });
    }

    public async healthCheck(): Promise<boolean> {
        try {
            const response = await this.orchestratorClient.get('/health');
            this.outputChannel.appendLine(`Health check successful: ${JSON.stringify(response.data)}`);
            return response.data.status === 'healthy';
        } catch (error) {
            this.outputChannel.appendLine(`Health check failed: ${error}`);
            return false;
        }
    }

    public async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResponse> {
        try {
            this.outputChannel.appendLine(`Orchestrating request: ${request.task_type}`);
            
            const response = await this.orchestratorClient.post('/orchestrate', request);
            
            this.outputChannel.appendLine(`Orchestration successful: Model used: ${response.data.model_used}`);
            return response.data;
        } catch (error: any) {
            this.outputChannel.appendLine(`Orchestration failed: ${error.message}`);
            
            // Fallback to local processing if Cloud Run fails
            if (this.config.useLocalServices) {
                return this.fallbackToLocal(request);
            }
            
            throw new Error(`Orchestration failed: ${error.message}`);
        }
    }

    public async executeWorkflow(workflow: {
        name: string;
        steps: Array<Record<string, any>>;
        mode?: string;
        context?: Record<string, any>;
    }): Promise<any> {
        try {
            this.outputChannel.appendLine(`Executing workflow: ${workflow.name}`);
            
            const response = await this.orchestratorClient.post('/workflow', workflow);
            
            this.outputChannel.appendLine(`Workflow completed: ${workflow.name}`);
            return response.data;
        } catch (error: any) {
            this.outputChannel.appendLine(`Workflow failed: ${error.message}`);
            throw new Error(`Workflow execution failed: ${error.message}`);
        }
    }

    public async compareModels(request: OrchestrationRequest): Promise<any> {
        try {
            const response = await this.orchestratorClient.post('/compare', request);
            return response.data;
        } catch (error: any) {
            this.outputChannel.appendLine(`Model comparison failed: ${error.message}`);
            throw error;
        }
    }

    public async smartRoute(prompt: string, context?: Record<string, any>): Promise<any> {
        try {
            const response = await this.orchestratorClient.post('/smart-route', {
                prompt,
                context
            });
            return response.data;
        } catch (error: any) {
            this.outputChannel.appendLine(`Smart routing failed: ${error.message}`);
            throw error;
        }
    }

    private async fallbackToLocal(request: OrchestrationRequest): Promise<OrchestrationResponse> {
        // Fallback implementation using local models or mock data
        this.outputChannel.appendLine('Falling back to local processing...');
        
        return {
            primary_response: `[Local Mode] Processing: ${request.prompt.substring(0, 100)}...`,
            model_used: 'local-fallback',
            collaboration_mode: request.collaboration_mode || 'specialized',
            confidence_score: 0.5,
            metadata: {
                fallback: true,
                timestamp: new Date().toISOString()
            }
        };
    }

    public async testConnection(): Promise<void> {
        const isHealthy = await this.healthCheck();
        
        if (isHealthy) {
            vscode.window.showInformationMessage('✅ Cloud Run services are connected and healthy!');
        } else {
            const useLocal = await vscode.window.showWarningMessage(
                'Cloud Run services are not available. Use local mode?',
                'Yes', 'No'
            );
            
            if (useLocal === 'Yes') {
                await vscode.workspace.getConfiguration('claudeGeminiAssistant').update(
                    'useLocalServices',
                    true,
                    vscode.ConfigurationTarget.Global
                );
                this.config = this.loadConfiguration();
                this.orchestratorClient = this.createClient();
            }
        }
    }

    public updateConfiguration(): void {
        this.config = this.loadConfiguration();
        this.orchestratorClient = this.createClient();
        this.outputChannel.appendLine('Configuration updated');
    }

    public getOutputChannel(): vscode.OutputChannel {
        return this.outputChannel;
    }
}