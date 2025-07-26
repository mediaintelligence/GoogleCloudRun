import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { ClaudeExecutionResult, ProjectContext, ExecutionMemory, LearnedPattern } from '../types/interfaces';
import { MemorySystem } from '../core/memorySystem';

export class ClaudeCodeInterface {
    private claudePath: string;
    private outputChannel: vscode.OutputChannel;
    private activeProcess: ChildProcess | null = null;

    constructor(
        private context: vscode.ExtensionContext,
        private memorySystem?: MemorySystem
    ) {
        const config = vscode.workspace.getConfiguration('claude-assistant');
        this.claudePath = config.get('claudeCodePath') || 'claude';
        this.outputChannel = vscode.window.createOutputChannel('Claude Code');
    }

    setMemorySystem(memorySystem: MemorySystem): void {
        this.memorySystem = memorySystem;
    }

    async executeCommand(command: string, args: string[] = []): Promise<string> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let output = '';
            let errorOutput = '';

            // Log command execution
            this.outputChannel.appendLine(`Executing: ${this.claudePath} ${command} ${args.join(' ')}`);
            this.outputChannel.appendLine('-'.repeat(50));

            // Spawn the Claude Code process
            this.activeProcess = spawn(this.claudePath, [command, ...args], {
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                env: { ...process.env }
            });

            // Handle stdout
            this.activeProcess.stdout?.on('data', (data) => {
                const text = data.toString();
                output += text;
                this.outputChannel.append(text);
            });

            // Handle stderr
            this.activeProcess.stderr?.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                this.outputChannel.append(`[ERROR] ${text}`);
            });

            // Handle process completion
            this.activeProcess.on('close', (code) => {
                const duration = Date.now() - startTime;
                this.outputChannel.appendLine('-'.repeat(50));
                this.outputChannel.appendLine(`Process exited with code ${code} (${duration}ms)`);
                
                this.activeProcess = null;

                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Claude Code exited with code ${code}: ${errorOutput || output}`));
                }
            });

            // Handle errors
            this.activeProcess.on('error', (error) => {
                this.activeProcess = null;
                reject(new Error(`Failed to start Claude Code: ${error.message}`));
            });
        });
    }

    async executeWithContext(code: string, context: ProjectContext): Promise<string> {
        // 🔥 NEW: Pre-execution memory lookup
        const relevantMemories = await this.findRelevantMemories(code, context);
        const relevantPatterns = await this.findRelevantPatterns(code, context);
        
        // Build enhanced context with memories
        const contextPrompt = this.buildContextPrompt(context, relevantMemories, relevantPatterns);
        const fullPrompt = `${contextPrompt}\n\n${code}`;

        // Create a temporary file with the full context
        const tempDir = path.join(this.context.globalStorageUri.fsPath, 'temp');
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(tempDir));
        
        const tempFile = path.join(tempDir, `claude-context-${Date.now()}.md`);
        const tempUri = vscode.Uri.file(tempFile);
        
        try {
            // Write context to temporary file
            await vscode.workspace.fs.writeFile(
                tempUri,
                Buffer.from(fullPrompt, 'utf8')
            );

            // Execute Claude Code with the context file
            const result = await this.executeCommand('run', ['--file', tempFile]);

            // Clean up temporary file
            await vscode.workspace.fs.delete(tempUri);

            return result;
        } catch (error) {
            // Ensure cleanup even on error
            try {
                await vscode.workspace.fs.delete(tempUri);
            } catch { }
            throw error;
        }
    }

    private async findRelevantMemories(code: string, context: ProjectContext): Promise<ExecutionMemory[]> {
        if (!this.memorySystem) {
            return [];
        }

        // Extract keywords from the code for memory search
        const keywords = this.extractKeywords(code);
        let relevantMemories: ExecutionMemory[] = [];

        // Search for memories using keywords
        for (const keyword of keywords) {
            const memories = await this.memorySystem.searchMemories(keyword);
            relevantMemories = relevantMemories.concat(memories);
        }

        // Remove duplicates and sort by relevance (most recent first)
        const uniqueMemories = Array.from(new Map(
            relevantMemories.map(m => [m.id, m])
        ).values());

        return uniqueMemories
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5); // Top 5 most relevant memories
    }

    private async findRelevantPatterns(code: string, context: ProjectContext): Promise<LearnedPattern[]> {
        if (!this.memorySystem) {
            return [];
        }

        const patterns = await this.memorySystem.getLearnedPatterns();
        const keywords = this.extractKeywords(code);
        
        return patterns.filter(pattern => {
            // Check if pattern is relevant to current code
            const patternLower = pattern.pattern.toLowerCase();
            const codeLower = code.toLowerCase();
            
            // Direct pattern match
            if (codeLower.includes(patternLower.split(':')[0]?.trim() || '')) {
                return true;
            }
            
            // Keyword overlap
            return keywords.some(keyword => 
                patternLower.includes(keyword.toLowerCase()) ||
                pattern.examples.some(example => 
                    example.toLowerCase().includes(keyword.toLowerCase())
                )
            );
        }).slice(0, 3); // Top 3 most relevant patterns
    }

    private extractKeywords(text: string): string[] {
        // Extract meaningful keywords from text
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3)
            .filter(word => !this.isStopWord(word));

        // Remove duplicates and return top keywords
        return Array.from(new Set(words)).slice(0, 10);
    }

    private isStopWord(word: string): boolean {
        const stopWords = [
            'this', 'that', 'with', 'have', 'will', 'from', 'they', 'been',
            'their', 'said', 'each', 'which', 'would', 'there', 'could',
            'other', 'after', 'first', 'well', 'also', 'where', 'much',
            'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like',
            'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them',
            'want', 'ways'
        ];
        return stopWords.includes(word);
    }

    async isAvailable(): Promise<boolean> {
        try {
            const result = await this.executeCommand('--version');
            return result.includes('claude-code') || result.includes('Claude Code');
        } catch {
            return false;
        }
    }

    updatePath(path: string): void {
        this.claudePath = path;
    }

    private buildContextPrompt(
        context: ProjectContext, 
        memories?: ExecutionMemory[], 
        patterns?: LearnedPattern[]
    ): string {
        const sections: string[] = [];

        // Project information
        sections.push('## Project Context');
        sections.push(`Project Root: ${context.projectRoot}`);
        sections.push(`Current File: ${context.currentFile}`);
        sections.push(`Project Type: ${context.projectType}`);
        
        if (context.frameworks.length > 0) {
            sections.push(`Frameworks: ${context.frameworks.join(', ')}`);
        }

        // 🔥 NEW: Memory section
        if (memories && memories.length > 0) {
            sections.push(this.buildMemorySection(memories));
        }

        // 🔥 NEW: Pattern section
        if (patterns && patterns.length > 0) {
            sections.push(this.buildPatternSection(patterns));
        }

        // Related files
        if (context.relatedFiles.length > 0) {
            sections.push('\n## Related Files');
            context.relatedFiles.forEach(file => {
                sections.push(`- ${file}`);
            });
        }

        // Dependencies
        if (context.dependencies.length > 0) {
            sections.push('\n## Dependencies');
            context.dependencies.forEach(dep => {
                sections.push(`- ${dep}`);
            });
        }

        // Recent changes
        if (context.recentChanges.length > 0) {
            sections.push('\n## Recent Changes');
            context.recentChanges.forEach(change => {
                sections.push(`- ${change.changeType}: ${change.file} (${this.formatDate(change.timestamp)})`);
            });
        }

        // Patterns
        if (context.patterns.length > 0) {
            sections.push('\n## Detected Patterns');
            context.patterns.forEach(pattern => {
                sections.push(`- ${pattern.name} (${pattern.type}): ${pattern.description}`);
            });
        }

        sections.push('\n## Task');
        sections.push('Please analyze and execute the following code with the above context in mind:');
        sections.push('');

        return sections.join('\n');
    }

    private buildMemorySection(memories: ExecutionMemory[]): string {
        return `\n## Relevant Past Experiences
${memories.map(m => `- ${new Date(m.timestamp).toLocaleDateString()}: ${m.input.substring(0, 100)}${m.input.length > 100 ? '...' : ''}
  Result: ${m.result.substring(0, 150)}${m.result.length > 150 ? '...' : ''}
  ${m.tags ? `Tags: ${m.tags.join(', ')}` : ''}`).join('\n')}`;
    }

    private buildPatternSection(patterns: LearnedPattern[]): string {
        return `\n## Learned Patterns
${patterns.map(p => `- ${p.pattern} (${p.type}, used ${p.frequency} times)
  Last seen: ${p.lastSeen.toLocaleDateString()}
  ${p.metadata?.solution ? `Solution: ${p.metadata.solution}` : ''}
  Examples: ${p.examples.slice(0, 2).join('; ')}${p.examples.length > 2 ? '; ...' : ''}`).join('\n')}`;
    }

    private formatDate(date: Date): string {
        return date.toLocaleString();
    }

    dispose(): void {
        if (this.activeProcess) {
            this.activeProcess.kill();
            this.activeProcess = null;
        }
        this.outputChannel.dispose();
    }
}