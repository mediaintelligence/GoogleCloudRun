#!/bin/bash

# VS Code Deployment Script for Claude-Gemini Coding MOA
# This script builds and packages the VS Code extension

set -e  # Exit on error

echo "==========================================="
echo "🔌 Deploying Claude-Gemini Assistant for VS Code"
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
    echo "✅ VS Code Extension Package Created!"
    echo "==========================================="
    echo ""
    echo "📦 Package: $PACKAGE_FILE"
    echo "📏 Size: $(du -h "$PACKAGE_FILE" | cut -f1)"
    echo ""
    echo "🚀 Installation Options:"
    echo "------------------------"
    echo "1. Install in VS Code:"
    echo "   - Open VS Code"
    echo "   - Press Ctrl+Shift+P (Cmd+Shift+P on Mac)"
    echo "   - Type: 'Extensions: Install from VSIX...'"
    echo "   - Select: $PACKAGE_FILE"
    echo ""
    echo "2. Install from command line:"
    echo "   code --install-extension $PACKAGE_FILE"
    echo ""
    echo "3. Install in Cursor:"
    echo "   cursor --install-extension $PACKAGE_FILE"
    echo ""
    echo "🔧 After Installation:"
    echo "   - Configure your orchestrator URL in VS Code settings"
    echo "   - Set your API keys in the extension settings"
    echo "   - Start using AI-powered development!"
    echo ""
    echo "📚 For configuration help, see DEPLOYMENT_GUIDE.md"
else
    echo "❌ Error: Extension package was not created"
    exit 1
fi
