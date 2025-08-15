#!/bin/bash

# Unified Editor Deployment Script for Claude-Gemini Coding MOA
# This script builds and packages the extension for both VS Code and Cursor

set -e  # Exit on error

echo "==========================================="
echo "🎯 Deploying Claude-Gemini Assistant for VS Code & Cursor"
echo "==========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from the GoogleCloudRun directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "   Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ is required, found version $NODE_VERSION"
    echo "   Please upgrade Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo "✅ npm $(npm --version) detected"
echo ""

# Check for editor CLIs
VSCODE_CLI=false
CURSOR_CLI=false

if command -v code &> /dev/null; then
    VSCODE_CLI=true
    echo "✅ VS Code CLI detected"
else
    echo "⚠️  VS Code CLI not found (can still install manually)"
fi

if command -v cursor &> /dev/null; then
    CURSOR_CLI=true
    echo "✅ Cursor CLI detected"
else
    echo "⚠️  Cursor CLI not found (can still install manually)"
fi

echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests
echo "🧪 Running tests..."
npm test

# Build the extension
echo "🔨 Building extension..."
npm run compile

# Package the extension
echo "📦 Packaging extension..."
npm run package

# Check if package was created
if [ -f "claude-gemini-assistant-*.vsix" ]; then
    PACKAGE_FILE=$(ls claude-gemini-assistant-*.vsix | head -1)
    echo ""
    echo "==========================================="
    echo "✅ Extension Package Created Successfully!"
    echo "==========================================="
    echo ""
    echo "📦 Package: $PACKAGE_FILE"
    echo "📏 Size: $(du -h "$PACKAGE_FILE" | cut -f1)"
    echo ""
    
    # Install in VS Code if CLI available
    if [ "$VSCODE_CLI" = true ]; then
        echo "🔌 Installing in VS Code..."
        if code --install-extension "$PACKAGE_FILE"; then
            echo "✅ Successfully installed in VS Code"
        else
            echo "❌ Failed to install in VS Code"
        fi
        echo ""
    fi
    
    # Install in Cursor if CLI available
    if [ "$CURSOR_CLI" = true ]; then
        echo "🎯 Installing in Cursor..."
        if cursor --install-extension "$PACKAGE_FILE"; then
            echo "✅ Successfully installed in Cursor"
        else
            echo "❌ Failed to install in Cursor"
        fi
        echo ""
    fi
    
    echo "🚀 Manual Installation Options:"
    echo "-------------------------------"
    echo ""
    echo "📱 VS Code:"
    echo "   - Open VS Code"
    echo "   - Press Ctrl+Shift+P (Cmd+Shift+P on Mac)"
    echo "   - Type: 'Extensions: Install from VSIX...'"
    echo "   - Select: $PACKAGE_FILE"
    echo ""
    echo "🎯 Cursor:"
    echo "   - Open Cursor"
    echo "   - Press Cmd+Shift+P (or Ctrl+Shift+P)"
    echo "   - Type: 'Extensions: Install from VSIX...'"
    echo "   - Select: $PACKAGE_FILE"
    echo ""
    echo "💻 Command Line:"
    if [ "$VSCODE_CLI" = true ]; then
        echo "   code --install-extension $PACKAGE_FILE"
    fi
    if [ "$CURSOR_CLI" = true ]; then
        echo "   cursor --install-extension $PACKAGE_FILE"
    fi
    echo ""
    echo "🔧 After Installation:"
    echo "   - Configure your orchestrator URL in editor settings"
    echo "   - Set your API keys in the extension settings"
    echo "   - Start using AI-powered development!"
    echo ""
    echo "📚 For configuration help, see DEPLOYMENT_GUIDE.md"
    echo ""
    echo "💡 Note: Cursor is built on VS Code, so this extension is fully compatible!"
    echo "   You can use the same extension in both editors!"
    
else
    echo "❌ Error: Extension package was not created"
    exit 1
fi
