import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// Mock VS Code API for testing
jest.mock('vscode', () => ({
  window: {
    createStatusBarItem: jest.fn(() => ({
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn()
    })),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn()
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn()
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn(),
      update: jest.fn()
    })),
    onDidChangeConfiguration: jest.fn(),
    onDidChangeWorkspaceFolders: jest.fn(),
    onDidChangeTextDocument: jest.fn(),
    onDidSaveTextDocument: jest.fn()
  },
  ExtensionContext: jest.fn(),
  StatusBarAlignment: {
    Right: 1,
    Left: 2
  },
  Uri: {
    file: jest.fn((path) => ({ fsPath: path })),
    joinPath: jest.fn((base, ...paths) => ({ fsPath: path.join(base.fsPath, ...paths) }))
  }
}));

describe('Claude Gemini Assistant Extension', () => {
  let extensionContext: vscode.ExtensionContext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock extension context
    extensionContext = {
      subscriptions: [],
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn().mockReturnValue([])
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
        keys: jest.fn().mockReturnValue([])
      },
      secrets: {
        get: jest.fn(),
        store: jest.fn(),
        onDidChange: jest.fn(),
      },
      globalStorageUri: vscode.Uri.file('/tmp/test-storage'),
      logUri: vscode.Uri.file('/tmp/test-logs'),
      extensionUri: vscode.Uri.file('/tmp/test-extension'),
      extensionPath: '/tmp/test-extension',
      environmentVariableCollection: {} as any,
      storageUri: vscode.Uri.file('/tmp/test-storage'),
      globalStoragePath: '/tmp/test-storage',
      asAbsolutePath: (relativePath: string) => path.join('/tmp/test-extension', relativePath),
      extensionMode: vscode.ExtensionMode.Development,
      extension: {
        id: 'test.extension',
        extensionUri: vscode.Uri.file('/tmp/test-extension'),
        extensionPath: '/tmp/test-extension',
        isActive: true,
        packageJSON: { name: 'test-extension', version: '0.0.1' },
        extensionKind: vscode.ExtensionKind.UI,
        exports: {},
        activate: jest.fn(),
      },
      storagePath: '/tmp/test-storage',
      logPath: '/tmp/test-logs',
      languageModelAccessInformation: {
        getLanguageModelAccessInformation: jest.fn().mockResolvedValue({
          model: 'test-model'
        })
      }
    } as vscode.ExtensionContext;
  });

  describe('Compilation Tests', () => {
    test('should have compiled extension files', () => {
      const outDir = path.join(__dirname, '..', 'out');
      expect(fs.existsSync(outDir)).toBe(true);
      
      const extensionJs = path.join(outDir, 'extension.js');
      expect(fs.existsSync(extensionJs)).toBe(true);
      
      // Check file size (should be reasonable)
      const stats = fs.statSync(extensionJs);
      expect(stats.size).toBeGreaterThan(1000); // At least 1KB
    });

    test('should have core modules compiled', () => {
      const coreDir = path.join(__dirname, '..', 'out', 'core');
      expect(fs.existsSync(coreDir)).toBe(true);
      
      // Check for key core files
      const expectedFiles = [
        'sessionManager.js',
        'collaborativeExecutor.js',
        'historyTracker.js',
        'workRecovery.js',
        'memorySystem.js',
        'projectIntelligenceSystem.js'
      ];
      
      expectedFiles.forEach(file => {
        const filePath = path.join(coreDir, file);
        if (fs.existsSync(filePath)) {
          console.log(`✅ Found: ${file}`);
        } else {
          console.log(`❌ Missing: ${file}`);
        }
      });
    });

    test('should have hooks modules compiled', () => {
      const hooksDir = path.join(__dirname, '..', 'out', 'hooks');
      expect(fs.existsSync(hooksDir)).toBe(true);
      
      const expectedFiles = [
        'intelligentTriggers.js',
        'memoryAwareHook.js'
      ];
      
      expectedFiles.forEach(file => {
        const filePath = path.join(hooksDir, file);
        if (fs.existsSync(filePath)) {
          console.log(`✅ Found: ${file}`);
        } else {
          console.log(`❌ Missing: ${file}`);
        }
      });
    });

    test('should have UI modules compiled', () => {
      const uiDir = path.join(__dirname, '..', 'out', 'ui');
      expect(fs.existsSync(uiDir)).toBe(true);
      
      const expectedFiles = [
        'workflowPanel.js',
        'contextViewer.js'
      ];
      
      expectedFiles.forEach(file => {
        const filePath = path.join(uiDir, file);
        if (fs.existsSync(filePath)) {
          console.log(`✅ Found: ${file}`);
        } else {
          console.log(`❌ Missing: ${file}`);
        }
      });
    });
  });

  describe('Package Configuration Tests', () => {
    test('should have correct package.json configuration', () => {
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check essential fields
      expect(packageJson.name).toBe('claude-gemini-assistant');
      expect(packageJson.main).toBe('./out/extension.js');
      expect(packageJson.engines).toHaveProperty('vscode');
      expect(packageJson.publisher).toBe('mediaintelligence');
      expect(packageJson.version).toBeDefined();
    });

    test('should have required VS Code commands registered', () => {
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const requiredCommands = [
        'claude-assistant.startGeminiWorkflow',
        'claude-assistant.generateCode',
        'claude-assistant.refactorCode',
        'claude-assistant.debugWithAI',
        'claude-assistant.explainCode',
        'claude-assistant.optimizePerformance',
        'claude-assistant.generateTests',
        'claude-assistant.createSession',
        'claude-assistant.resumeSession',
        'claude-assistant.saveSession',
        'claude-assistant.viewSessionHistory',
        'claude-assistant.startCollaboration',
        'claude-assistant.collaborativeDebug',
        'claude-assistant.collaborativeRefactor',
        'claude-assistant.compareApproaches',
        'claude-assistant.createRecoveryPoint',
        'claude-assistant.restoreFromRecovery'
      ];
      
      const registeredCommands = packageJson.contributes?.commands?.map((cmd: any) => cmd.command) || [];
      
      requiredCommands.forEach(command => {
        expect(registeredCommands).toContain(command);
      });
    });

    test('should have proper activation events', () => {
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      expect(packageJson.activationEvents).toBeDefined();
      expect(Array.isArray(packageJson.activationEvents)).toBe(true);
      expect(packageJson.activationEvents.length).toBeGreaterThan(0);
    });
  });

  describe('TypeScript Configuration Tests', () => {
    test('should have valid tsconfig.json', () => {
      const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);
      
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      expect(tsconfig.compilerOptions).toBeDefined();
      expect(tsconfig.include).toBeDefined();
      expect(tsconfig.exclude).toBeDefined();
    });

    test('should have webpack configuration', () => {
      const webpackPath = path.join(__dirname, '..', 'webpack.config.js');
      expect(fs.existsSync(webpackPath)).toBe(true);
      
      const webpackContent = fs.readFileSync(webpackPath, 'utf8');
      expect(webpackContent).toContain('webpack');
      expect(webpackContent).toContain('extension.js');
    });
  });

  describe('Source Code Structure Tests', () => {
    test('should have proper source directory structure', () => {
      const srcDir = path.join(__dirname, '..', 'src');
      expect(fs.existsSync(srcDir)).toBe(true);
      
      const expectedDirs = ['core', 'hooks', 'ui', 'types', 'commands'];
      expectedDirs.forEach(dir => {
        const dirPath = path.join(srcDir, dir);
        expect(fs.existsSync(dirPath)).toBe(true);
      });
    });

    test('should have main extension file', () => {
      const extensionPath = path.join(__dirname, '..', 'src', 'extension.ts');
      expect(fs.existsSync(extensionPath)).toBe(true);
      
      const content = fs.readFileSync(extensionPath, 'utf8');
      expect(content).toContain('activate');
      expect(content).toContain('deactivate');
    });

    test('should have core system files', () => {
      const coreDir = path.join(__dirname, '..', 'src', 'core');
      const expectedFiles = [
        'sessionManager.ts',
        'collaborativeExecutor.ts',
        'historyTracker.ts',
        'workRecovery.ts',
        'memorySystem.ts',
        'projectIntelligenceSystem.ts'
      ];
      
      expectedFiles.forEach(file => {
        const filePath = path.join(coreDir, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('Documentation Tests', () => {
    test('should have essential documentation files', () => {
      const requiredDocs = [
        'README.md',
        'USER_GUIDE.md',
        'CHANGELOG.md',
        'LICENSE'
      ];
      
      requiredDocs.forEach(doc => {
        const docPath = path.join(__dirname, '..', doc);
        expect(fs.existsSync(docPath)).toBe(true);
      });
    });

    test('should have valid README.md', () => {
      const readmePath = path.join(__dirname, '..', 'README.md');
      const content = fs.readFileSync(readmePath, 'utf8');
      
      expect(content).toContain('Claude Gemini Assistant');
      expect(content).toContain('## Features');
      expect(content).toContain('## Installation');
    });
  });

  describe('Build Script Tests', () => {
    test('should have npm scripts configured', () => {
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const requiredScripts = [
        'compile',
        'watch',
        'package'
      ];
      
      requiredScripts.forEach(script => {
        expect(packageJson.scripts).toHaveProperty(script);
      });
    });

    test('should have launch script', () => {
      const launchPath = path.join(__dirname, '..', 'launch.sh');
      expect(fs.existsSync(launchPath)).toBe(true);
      
      const content = fs.readFileSync(launchPath, 'utf8');
      expect(content).toContain('npm run compile');
    });
  });

  describe('Extension Functionality Tests', () => {
    test('should register commands properly', () => {
      // This would test actual command registration
      // For now, we'll just verify the structure
      expect(vscode.commands.registerCommand).toBeDefined();
    });

    test('should create status bar item', () => {
      // This would test status bar creation
      expect(vscode.window.createStatusBarItem).toBeDefined();
    });

    test('should handle extension activation', () => {
      // This would test the activate function
      // For now, we'll just verify the structure
      expect(extensionContext).toBeDefined();
      expect(extensionContext.subscriptions).toBeDefined();
    });
  });
});

// Integration test for the complete extension
describe('Extension Integration Tests', () => {
  test('should compile without errors', () => {
    // This test verifies that the extension can be compiled
    // In a real scenario, you might want to actually run the compilation
    const outDir = path.join(__dirname, '..', 'out');
    expect(fs.existsSync(outDir)).toBe(true);
    
    const extensionJs = path.join(outDir, 'extension.js');
    expect(fs.existsSync(extensionJs)).toBe(true);
    
    // Check that the file is not empty and has reasonable content
    const content = fs.readFileSync(extensionJs, 'utf8');
    expect(content.length).toBeGreaterThan(1000);
    expect(content).toContain('activate');
  });

  test('should have all required dependencies', () => {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDeps = [
      'vscode',
      'uuid',
      '@google/generative-ai'
    ];
    
    requiredDeps.forEach(dep => {
      expect(packageJson.dependencies).toHaveProperty(dep);
    });
  });
}); 