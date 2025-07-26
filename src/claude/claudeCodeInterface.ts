import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { ClaudeExecutionResult, ProjectContext } from '../types/interfaces';

export class ClaudeCodeInterface {
    private claudePath: string;
    private outputChannel: vscode.OutputChannel;
    private activeProcess: ChildProcess | null = null;

    constructor(private context: vscode.ExtensionContext) {
        const config = vscode.workspace.getConfiguration('claude-assistant');
        this.claudePath = config.get('claudeCodePath') || 'claude';
        this.outputChannel = vscode.window.createOutputChannel('Claude Code');
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
        // Prepare context information
        const contextPrompt = this.buildContextPrompt(context);
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

    private buildContextPrompt(context: ProjectContext): string {
        const sections: string[] = [];

        // Project information
        sections.push('## Project Context');
        sections.push(`Project Root: ${context.projectRoot}`);
        sections.push(`Current File: ${context.currentFile}`);
        sections.push(`Project Type: ${context.projectType}`);
        
        if (context.frameworks.length > 0) {
            sections.push(`Frameworks: ${context.frameworks.join(', ')}`);
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