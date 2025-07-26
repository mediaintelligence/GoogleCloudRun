#!/bin/bash

echo "🔍 Testing Extension Setup"
echo "========================="
echo ""

# Check Node
echo "✓ Node version: $(node --version)"

# Check npm
echo "✓ npm version: $(npm --version)"

# Check if compiled
if [ -d "out" ]; then
    echo "✓ Extension compiled (out/ directory exists)"
    echo "  Files: $(find out -name "*.js" | wc -l) JavaScript files"
else
    echo "✗ Not compiled - running npm compile..."
    npm run compile
fi

# Check VS Code
if command -v code &> /dev/null; then
    echo "✓ VS Code CLI available"
else
    echo "⚠️  VS Code CLI not in PATH"
fi

echo ""
echo "📋 Quick Launch Checklist:"
echo "1. ✓ Open VS Code"
echo "2. ✓ Project folder: claude-gemini-assistant"
echo "3. → Click 'Run' menu → 'Start Debugging'"
echo "   OR"
echo "   → Press Cmd+Shift+D → Click green play button"
echo ""
echo "🎯 The new window that opens will have your extension!"