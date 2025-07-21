import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { 
    ProjectContext, 
    ProjectStructure, 
    FileInfo, 
    DirectoryInfo, 
    LanguageStats, 
    CodePattern, 
    FileChange,
    PatternOccurrence 
} from '../types/interfaces';

export class ProjectIntelligence {
    private projectStructure: ProjectStructure | null = null;
    private filePatterns: Map<string, CodePattern[]> = new Map();
    private languageMap: Map<string, string> = new Map([
        ['.ts', 'typescript'],
        ['.js', 'javascript'],
        ['.py', 'python'],
        ['.java', 'java'],
        ['.cpp', 'cpp'],
        ['.c', 'c'],
        ['.cs', 'csharp'],
        ['.go', 'go'],
        ['.rs', 'rust'],
        ['.rb', 'ruby'],
        ['.php', 'php'],
        ['.swift', 'swift'],
        ['.kt', 'kotlin'],
        ['.scala', 'scala'],
        ['.r', 'r'],
        ['.jsx', 'javascriptreact'],
        ['.tsx', 'typescriptreact'],
        ['.vue', 'vue'],
        ['.json', 'json'],
        ['.xml', 'xml'],
        ['.yaml', 'yaml'],
        ['.yml', 'yaml'],
        ['.md', 'markdown'],
        ['.html', 'html'],
        ['.css', 'css'],
        ['.scss', 'scss'],
        ['.less', 'less']
    ]);

    constructor(private context: vscode.ExtensionContext) {}

    async analyzeWorkspace(): Promise<void> {
        if (!vscode.workspace.workspaceFolders) {
            return;
        }

        for (const folder of vscode.workspace.workspaceFolders) {
            await this.analyzeFolder(folder.uri);
        }
    }

    async analyzeFolder(
        uri: vscode.Uri, 
        progress?: vscode.Progress<any>, 
        token?: vscode.CancellationToken
    ): Promise<void> {
        progress?.report({ message: 'Analyzing project structure...' });

        const structure: ProjectStructure = {
            root: uri.fsPath,
            files: [],
            directories: [],
            totalFiles: 0,
            totalSize: 0,
            languages: []
        };

        const languageStats = new Map<string, LanguageStats>();

        // Recursively analyze directory
        await this.analyzeDirectory(uri, structure, languageStats, progress, token);

        // Calculate language statistics
        structure.languages = Array.from(languageStats.values())
            .sort((a, b) => b.fileCount - a.fileCount);

        // Calculate percentages
        structure.languages.forEach(lang => {
            lang.percentage = (lang.fileCount / structure.totalFiles) * 100;
        });

        this.projectStructure = structure;

        // Analyze patterns
        progress?.report({ message: 'Detecting code patterns...' });
        await this.detectPatterns(structure);

        // Save to storage
        await this.saveAnalysis(structure);
    }

    async getContextForFile(uri: vscode.Uri): Promise<ProjectContext> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            throw new Error('File is not in a workspace');
        }

        // Ensure we have analyzed the project
        if (!this.projectStructure || this.projectStructure.root !== workspaceFolder.uri.fsPath) {
            await this.analyzeFolder(workspaceFolder.uri);
        }

        const context: ProjectContext = {
            projectRoot: workspaceFolder.uri.fsPath,
            currentFile: uri.fsPath,
            relatedFiles: await this.findRelatedFiles(uri),
            dependencies: await this.findDependencies(uri),
            recentChanges: await this.getRecentChanges(workspaceFolder.uri),
            projectType: await this.detectProjectType(workspaceFolder.uri),
            frameworks: await this.detectFrameworks(workspaceFolder.uri),
            patterns: this.filePatterns.get(uri.fsPath) || []
        };

        return context;
    }

    getProjectStructure(): ProjectStructure {
        if (!this.projectStructure) {
            throw new Error('Project has not been analyzed yet');
        }
        return this.projectStructure;
    }

    findPatterns(): CodePattern[] {
        const allPatterns: CodePattern[] = [];
        this.filePatterns.forEach(patterns => {
            allPatterns.push(...patterns);
        });
        
        // Deduplicate patterns by name
        const uniquePatterns = new Map<string, CodePattern>();
        allPatterns.forEach(pattern => {
            const existing = uniquePatterns.get(pattern.name);
            if (!existing || existing.confidence < pattern.confidence) {
                uniquePatterns.set(pattern.name, pattern);
            }
        });

        return Array.from(uniquePatterns.values());
    }

    private async analyzeDirectory(
        uri: vscode.Uri,
        structure: ProjectStructure,
        languageStats: Map<string, LanguageStats>,
        progress?: vscode.Progress<any>,
        token?: vscode.CancellationToken,
        depth: number = 0
    ): Promise<void> {
        if (token?.isCancellationRequested) {
            return;
        }

        try {
            const entries = await vscode.workspace.fs.readDirectory(uri);
            
            for (const [name, type] of entries) {
                if (this.shouldIgnore(name)) {
                    continue;
                }

                const entryUri = vscode.Uri.joinPath(uri, name);

                if (type === vscode.FileType.File) {
                    const stat = await vscode.workspace.fs.stat(entryUri);
                    const extension = path.extname(name);
                    const language = this.languageMap.get(extension) || 'unknown';

                    const fileInfo: FileInfo = {
                        path: entryUri.fsPath,
                        name: name,
                        size: stat.size,
                        language: language,
                        lastModified: new Date(stat.mtime)
                    };

                    structure.files.push(fileInfo);
                    structure.totalFiles++;
                    structure.totalSize += stat.size;

                    // Update language statistics
                    if (!languageStats.has(language)) {
                        languageStats.set(language, {
                            language: language,
                            fileCount: 0,
                            totalLines: 0,
                            percentage: 0
                        });
                    }
                    const langStat = languageStats.get(language)!;
                    langStat.fileCount++;

                    progress?.report({ 
                        message: `Analyzing: ${name}`,
                        increment: 1 
                    });

                } else if (type === vscode.FileType.Directory && depth < 10) {
                    const subEntries = await vscode.workspace.fs.readDirectory(entryUri);
                    const fileCount = subEntries.filter(([_, t]) => t === vscode.FileType.File).length;
                    const subdirectories = subEntries
                        .filter(([n, t]) => t === vscode.FileType.Directory && !this.shouldIgnore(n))
                        .map(([n]) => path.join(entryUri.fsPath, n));

                    const dirInfo: DirectoryInfo = {
                        path: entryUri.fsPath,
                        name: name,
                        fileCount: fileCount,
                        subdirectories: subdirectories
                    };

                    structure.directories.push(dirInfo);

                    // Recursively analyze subdirectory
                    await this.analyzeDirectory(entryUri, structure, languageStats, progress, token, depth + 1);
                }
            }
        } catch (error) {
            console.error(`Error analyzing directory ${uri.fsPath}:`, error);
        }
    }

    private shouldIgnore(name: string): boolean {
        const ignorePatterns = [
            'node_modules',
            '.git',
            '.vscode',
            'dist',
            'out',
            'build',
            'target',
            '.cache',
            '.tmp',
            '__pycache__',
            '.pytest_cache',
            'coverage',
            '.nyc_output',
            '.next',
            '.nuxt',
            'vendor',
            'packages',
            '.idea',
            '.vs',
            '*.log',
            '.DS_Store',
            'Thumbs.db'
        ];

        return ignorePatterns.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp(pattern.replace('*', '.*'));
                return regex.test(name);
            }
            return name === pattern;
        });
    }

    private async detectPatterns(structure: ProjectStructure): Promise<void> {
        const patterns: CodePattern[] = [];

        // Detect MVC pattern
        if (this.hasMVCStructure(structure)) {
            patterns.push({
                name: 'MVC Architecture',
                type: 'architecture',
                description: 'Model-View-Controller pattern detected',
                occurrences: this.findMVCOccurrences(structure),
                confidence: 0.9
            });
        }

        // Detect microservices
        if (this.hasMicroservicesStructure(structure)) {
            patterns.push({
                name: 'Microservices Architecture',
                type: 'architecture',
                description: 'Microservices pattern detected',
                occurrences: this.findMicroservicesOccurrences(structure),
                confidence: 0.85
            });
        }

        // Detect test patterns
        if (this.hasTestingPatterns(structure)) {
            patterns.push({
                name: 'Test-Driven Development',
                type: 'design',
                description: 'TDD patterns detected',
                occurrences: this.findTestOccurrences(structure),
                confidence: 0.8
            });
        }

        // Store patterns globally
        this.filePatterns.clear();
        patterns.forEach(pattern => {
            pattern.occurrences.forEach(occurrence => {
                if (!this.filePatterns.has(occurrence.file)) {
                    this.filePatterns.set(occurrence.file, []);
                }
                this.filePatterns.get(occurrence.file)!.push(pattern);
            });
        });
    }

    private hasMVCStructure(structure: ProjectStructure): boolean {
        const hasModels = structure.directories.some(d => 
            d.name === 'models' || d.name === 'model'
        );
        const hasViews = structure.directories.some(d => 
            d.name === 'views' || d.name === 'view' || d.name === 'templates'
        );
        const hasControllers = structure.directories.some(d => 
            d.name === 'controllers' || d.name === 'controller' || d.name === 'routes'
        );

        return hasModels && hasViews && hasControllers;
    }

    private hasMicroservicesStructure(structure: ProjectStructure): boolean {
        const hasServices = structure.directories.some(d => 
            d.name === 'services' || d.name === 'microservices'
        );
        const hasMultiplePackageJsons = structure.files.filter(f => 
            f.name === 'package.json'
        ).length > 1;
        const hasDockerfiles = structure.files.some(f => 
            f.name === 'Dockerfile' || f.name.startsWith('docker-compose')
        );

        return hasServices && (hasMultiplePackageJsons || hasDockerfiles);
    }

    private hasTestingPatterns(structure: ProjectStructure): boolean {
        const hasTestDir = structure.directories.some(d => 
            d.name === 'test' || d.name === 'tests' || d.name === '__tests__' || d.name === 'spec'
        );
        const hasTestFiles = structure.files.some(f => 
            f.name.includes('.test.') || f.name.includes('.spec.') || 
            f.name.includes('_test.') || f.name.includes('test_')
        );

        return hasTestDir || hasTestFiles;
    }

    private findMVCOccurrences(structure: ProjectStructure): PatternOccurrence[] {
        const occurrences: PatternOccurrence[] = [];
        
        ['models', 'views', 'controllers'].forEach(component => {
            const dir = structure.directories.find(d => 
                d.name === component || d.name === component.slice(0, -1)
            );
            if (dir) {
                occurrences.push({
                    file: dir.path,
                    line: 0,
                    snippet: `${component} directory`
                });
            }
        });

        return occurrences;
    }

    private findMicroservicesOccurrences(structure: ProjectStructure): PatternOccurrence[] {
        const occurrences: PatternOccurrence[] = [];
        
        const servicesDir = structure.directories.find(d => 
            d.name === 'services' || d.name === 'microservices'
        );
        if (servicesDir) {
            occurrences.push({
                file: servicesDir.path,
                line: 0,
                snippet: 'Services directory structure'
            });
        }

        structure.files
            .filter(f => f.name === 'docker-compose.yml' || f.name === 'docker-compose.yaml')
            .forEach(f => {
                occurrences.push({
                    file: f.path,
                    line: 0,
                    snippet: 'Docker Compose configuration'
                });
            });

        return occurrences;
    }

    private findTestOccurrences(structure: ProjectStructure): PatternOccurrence[] {
        const occurrences: PatternOccurrence[] = [];
        
        structure.files
            .filter(f => 
                f.name.includes('.test.') || f.name.includes('.spec.') ||
                f.name.includes('_test.') || f.name.includes('test_')
            )
            .forEach(f => {
                occurrences.push({
                    file: f.path,
                    line: 0,
                    snippet: 'Test file'
                });
            });

        return occurrences;
    }

    private async findRelatedFiles(uri: vscode.Uri): Promise<string[]> {
        const related: string[] = [];
        const fileName = path.basename(uri.fsPath);
        const fileNameWithoutExt = path.parse(fileName).name;
        const directory = path.dirname(uri.fsPath);

        if (!this.projectStructure) {
            return related;
        }

        // Find files with similar names
        this.projectStructure.files.forEach(file => {
            const otherFileName = path.parse(file.name).name;
            if (file.path !== uri.fsPath && 
                (otherFileName.includes(fileNameWithoutExt) || 
                 fileNameWithoutExt.includes(otherFileName))) {
                related.push(file.path);
            }
        });

        // Find test files
        if (!fileName.includes('test') && !fileName.includes('spec')) {
            const possibleTestNames = [
                `${fileNameWithoutExt}.test`,
                `${fileNameWithoutExt}.spec`,
                `${fileNameWithoutExt}_test`,
                `test_${fileNameWithoutExt}`
            ];

            this.projectStructure.files.forEach(file => {
                const otherFileNameWithoutExt = path.parse(file.name).name;
                if (possibleTestNames.includes(otherFileNameWithoutExt)) {
                    related.push(file.path);
                }
            });
        }

        return related.slice(0, 10); // Limit to 10 related files
    }

    private async findDependencies(uri: vscode.Uri): Promise<string[]> {
        const dependencies: string[] = [];
        
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const text = document.getText();
            const language = document.languageId;

            // Extract imports based on language
            let importRegex: RegExp | null = null;
            
            switch (language) {
                case 'typescript':
                case 'javascript':
                case 'javascriptreact':
                case 'typescriptreact':
                    importRegex = /import\s+.*\s+from\s+['"](.+)['"]/g;
                    break;
                case 'python':
                    importRegex = /(?:from\s+(\S+)\s+import|import\s+(\S+))/g;
                    break;
                case 'java':
                    importRegex = /import\s+([\w.]+);/g;
                    break;
                case 'csharp':
                    importRegex = /using\s+([\w.]+);/g;
                    break;
                case 'go':
                    importRegex = /import\s+(?:\(\s*)?["']([^"']+)["']/g;
                    break;
            }

            if (importRegex) {
                let match;
                while ((match = importRegex.exec(text)) !== null) {
                    const dep = match[1] || match[2];
                    if (dep && !dep.startsWith('.')) {
                        dependencies.push(dep);
                    }
                }
            }
        } catch (error) {
            console.error('Error finding dependencies:', error);
        }

        return [...new Set(dependencies)]; // Remove duplicates
    }

    private async getRecentChanges(workspaceUri: vscode.Uri): Promise<FileChange[]> {
        const changes: FileChange[] = [];
        
        // This would ideally integrate with git, but for now we'll use file modification times
        if (this.projectStructure) {
            const recentFiles = this.projectStructure.files
                .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
                .slice(0, 10);

            recentFiles.forEach(file => {
                changes.push({
                    file: file.path,
                    changeType: 'modified',
                    timestamp: file.lastModified
                });
            });
        }

        return changes;
    }

    private async detectProjectType(workspaceUri: vscode.Uri): Promise<string> {
        if (!this.projectStructure) {
            return 'unknown';
        }

        const files = this.projectStructure.files;
        
        // Check for various project types based on config files
        if (files.some(f => f.name === 'package.json')) {
            const hasAngular = files.some(f => f.name === 'angular.json');
            const hasReact = files.some(f => f.name === 'next.config.js' || files.some(f => f.path.includes('react')));
            const hasVue = files.some(f => f.name === 'vue.config.js');
            
            if (hasAngular) return 'angular';
            if (hasReact) return 'react';
            if (hasVue) return 'vue';
            return 'node';
        }

        if (files.some(f => f.name === 'requirements.txt' || f.name === 'setup.py')) {
            return 'python';
        }

        if (files.some(f => f.name === 'pom.xml')) {
            return 'maven';
        }

        if (files.some(f => f.name === 'build.gradle' || f.name === 'build.gradle.kts')) {
            return 'gradle';
        }

        if (files.some(f => f.name === 'Cargo.toml')) {
            return 'rust';
        }

        if (files.some(f => f.name === 'go.mod')) {
            return 'go';
        }

        if (files.some(f => f.name.endsWith('.csproj') || f.name.endsWith('.sln'))) {
            return 'dotnet';
        }

        return 'generic';
    }

    private async detectFrameworks(workspaceUri: vscode.Uri): Promise<string[]> {
        const frameworks: string[] = [];
        
        if (!this.projectStructure) {
            return frameworks;
        }

        const files = this.projectStructure.files;
        const fileNames = files.map(f => f.name);
        const filePaths = files.map(f => f.path);

        // Node.js frameworks
        if (fileNames.includes('package.json')) {
            try {
                const packageJsonPath = files.find(f => f.name === 'package.json')?.path;
                if (packageJsonPath) {
                    const content = await fs.promises.readFile(packageJsonPath, 'utf8');
                    const packageJson = JSON.parse(content);
                    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                    
                    if (deps['express']) frameworks.push('Express');
                    if (deps['@nestjs/core']) frameworks.push('NestJS');
                    if (deps['react']) frameworks.push('React');
                    if (deps['vue']) frameworks.push('Vue');
                    if (deps['@angular/core']) frameworks.push('Angular');
                    if (deps['next']) frameworks.push('Next.js');
                    if (deps['nuxt']) frameworks.push('Nuxt.js');
                    if (deps['gatsby']) frameworks.push('Gatsby');
                    if (deps['electron']) frameworks.push('Electron');
                }
            } catch (error) {
                console.error('Error reading package.json:', error);
            }
        }

        // Python frameworks
        if (fileNames.includes('requirements.txt')) {
            try {
                const reqPath = files.find(f => f.name === 'requirements.txt')?.path;
                if (reqPath) {
                    const content = await fs.promises.readFile(reqPath, 'utf8');
                    const lines = content.toLowerCase().split('\n');
                    
                    if (lines.some(l => l.includes('django'))) frameworks.push('Django');
                    if (lines.some(l => l.includes('flask'))) frameworks.push('Flask');
                    if (lines.some(l => l.includes('fastapi'))) frameworks.push('FastAPI');
                    if (lines.some(l => l.includes('tensorflow'))) frameworks.push('TensorFlow');
                    if (lines.some(l => l.includes('pytorch') || l.includes('torch'))) frameworks.push('PyTorch');
                }
            } catch (error) {
                console.error('Error reading requirements.txt:', error);
            }
        }

        // Java frameworks
        if (fileNames.includes('pom.xml')) {
            try {
                const pomPath = files.find(f => f.name === 'pom.xml')?.path;
                if (pomPath) {
                    const content = await fs.promises.readFile(pomPath, 'utf8');
                    if (content.includes('spring-boot')) frameworks.push('Spring Boot');
                    if (content.includes('spring-framework')) frameworks.push('Spring');
                }
            } catch (error) {
                console.error('Error reading pom.xml:', error);
            }
        }

        // Other indicators
        if (filePaths.some(p => p.includes('rails') || p.includes('config/routes.rb'))) {
            frameworks.push('Ruby on Rails');
        }

        if (fileNames.some(n => n.includes('.vue'))) {
            if (!frameworks.includes('Vue')) frameworks.push('Vue');
        }

        return frameworks;
    }

    private async saveAnalysis(structure: ProjectStructure): Promise<void> {
        const storageUri = vscode.Uri.joinPath(
            this.context.globalStorageUri,
            'project-analysis',
            `${path.basename(structure.root)}.json`
        );

        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(this.context.globalStorageUri, 'project-analysis'));
        await vscode.workspace.fs.writeFile(
            storageUri,
            Buffer.from(JSON.stringify(structure, null, 2), 'utf8')
        );
    }
}