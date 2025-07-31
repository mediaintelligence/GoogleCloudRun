#!/bin/bash

echo "🧪 Testing Claude Gemini Assistant Extension"
echo "============================================"
echo ""

# Check if extension compiles successfully
echo "✅ Testing compilation..."
npm run compile
if [ $? -eq 0 ]; then
    echo "✅ Compilation successful!"
else
    echo "❌ Compilation failed!"
    exit 1
fi

echo ""

# Check if extension files exist
echo "✅ Checking extension files..."
if [ -f "out/extension.js" ]; then
    echo "✅ Main extension file exists"
else
    echo "❌ Main extension file missing!"
    exit 1
fi

if [ -d "out/core" ]; then
    echo "✅ Core modules compiled"
else
    echo "❌ Core modules missing!"
    exit 1
fi

echo ""

# Check package.json configuration
echo "✅ Checking package configuration..."
if grep -q '"name": "claude-gemini-assistant"' package.json; then
    echo "✅ Package name configured correctly"
else
    echo "❌ Package name configuration issue!"
    exit 1
fi

if grep -q '"main": "./out/extension.js"' package.json; then
    echo "✅ Main entry point configured correctly"
else
    echo "❌ Main entry point configuration issue!"
    exit 1
fi

echo ""

# Check for required commands
echo "✅ Checking command registration..."
if grep -q "claude-assistant.startGeminiWorkflow" package.json; then
    echo "✅ Gemini Workflow command registered"
else
    echo "❌ Gemini Workflow command missing!"
    exit 1
fi

if grep -q "claude-assistant.generateCode" package.json; then
    echo "✅ Generate Code command registered"
else
    echo "❌ Generate Code command missing!"
    exit 1
fi

echo ""

echo "🎉 All tests passed! Extension is ready to use."
echo ""
echo "To launch the extension:"
echo "1. Open VS Code"
echo "2. Press F5 to start Extension Development Host"
echo "3. Test commands in the new window"
echo ""
echo "Available commands:"
echo "- Claude Assistant: Start Gemini Workflow"
echo "- Claude Assistant: Generate Code with AI"
echo "- Claude Assistant: Refactor Code with AI"
echo "- Claude Assistant: Debug with AI"
echo "- Claude Assistant: Explain Code with AI"
echo "- Claude Assistant: Optimize Performance with AI"
echo "- Claude Assistant: Generate Tests with AI"