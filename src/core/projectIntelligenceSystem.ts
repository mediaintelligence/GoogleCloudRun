// src/core/projectIntelligenceSystem.ts

import * as vscode from 'vscode';
import { ProjectIntelligence } from './projectIntelligence';
import { ProjectIntelligence as IProjectIntelligence } from '../types/interfaces';

/**
 * Wrapper class that adapts the ProjectIntelligence class to the expected interface
 */
export class ProjectIntelligenceSystem {
    private projectIntelligence: ProjectIntelligence;
    private cachedIntelligence: IProjectIntelligence | null = null;
    
    constructor(private context: vscode.ExtensionContext) {
        this.projectIntelligence = new ProjectIntelligence(context);
    }
    
    async getProjectIntelligence(forceRefresh: boolean = false): Promise<IProjectIntelligence | null> {
        if (!forceRefresh && this.cachedIntelligence) {
            return this.cachedIntelligence;
        }
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return null;
        }
        
        const rootPath = workspaceFolders[0].uri.fsPath;
        
        // Analyze the workspace
        await this.projectIntelligence.analyzeWorkspace();
        
        // Get project structure
        const structure = this.projectIntelligence.getProjectStructure();
        const patterns = this.projectIntelligence.findPatterns();
        
        // Build the intelligence object
        this.cachedIntelligence = {
            projectId: rootPath,
            rootPath: rootPath,
            name: workspaceFolders[0].name,
            description: 'VS Code workspace project',
            projectType: this.detectProjectType(structure),
            fileCount: structure?.totalFiles || 0,
            architecture: {
                primaryPattern: this.detectArchitecturePattern(patterns),
                layers: [],
                keyComponents: []
            },
            technologies: {
                primaryLanguage: this.detectPrimaryLanguage(structure),
                frameworks: [],
                libraries: [],
                tools: []
            },
            codeQuality: {
                codeComplexity: 0.7,  // Placeholder
                testCoverage: 0,
                technicalDebt: 0
            },
            teamContext: {
                conventions: [],
                workflowPreferences: []
            },
            dependencies: [],
            recentActivity: []
        };
        
        return this.cachedIntelligence;
    }
    
    private detectProjectType(structure: any): string {
        if (!structure) return 'unknown';
        
        // Simple project type detection based on files
        const files = structure.files || [];
        if (files.some((f: any) => f.name === 'package.json')) {
            return 'nodejs';
        } else if (files.some((f: any) => f.name === 'requirements.txt')) {
            return 'python';
        } else if (files.some((f: any) => f.name === 'pom.xml')) {
            return 'java-maven';
        }
        
        return 'general';
    }
    
    private detectPrimaryLanguage(structure: any): string {
        if (!structure || !structure.languages) return 'unknown';
        
        // Find the language with the most files
        let maxCount = 0;
        let primaryLang = 'unknown';
        
        for (const lang of structure.languages) {
            if (lang.fileCount > maxCount) {
                maxCount = lang.fileCount;
                primaryLang = lang.language;
            }
        }
        
        return primaryLang;
    }
    
    private detectArchitecturePattern(patterns: any[]): string {
        if (!patterns || patterns.length === 0) return 'monolithic';
        
        // Simple pattern detection
        const architecturePatterns = patterns.filter(p => p.type === 'architecture');
        if (architecturePatterns.length > 0) {
            return architecturePatterns[0].name;
        }
        
        return 'monolithic';
    }
    
    dispose(): void {
        // Cleanup if needed
        this.cachedIntelligence = null;
    }
}