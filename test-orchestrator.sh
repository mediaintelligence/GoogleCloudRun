#!/bin/bash

# Test script for Claude-Gemini Orchestrator
# This script tests the deployed orchestrator service

set -e  # Exit on error

echo "==========================================="
echo "🧪 Testing Claude-Gemini Orchestrator"
echo "==========================================="

# Check if service URL is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide the service URL"
    echo "Usage: ./test-orchestrator.sh <SERVICE_URL>"
    echo ""
    echo "Example: ./test-orchestrator.sh https://claude-gemini-orchestrator-abc123-uc.a.run.app"
    exit 1
fi

SERVICE_URL=$1

echo "🌐 Testing service at: $SERVICE_URL"
echo ""

# Test 1: Health check
echo "🔍 Test 1: Health Check"
echo "------------------------"
if curl -f "$SERVICE_URL/health" 2>/dev/null; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi
echo ""

# Test 2: Service information
echo "🔍 Test 2: Service Information"
echo "-------------------------------"
if curl -f "$SERVICE_URL/" 2>/dev/null; then
    echo "✅ Service info endpoint working"
else
    echo "❌ Service info endpoint failed"
fi
echo ""

# Test 3: Model capabilities
echo "🔍 Test 3: Model Capabilities"
echo "------------------------------"
if curl -f "$SERVICE_URL/capabilities" 2>/dev/null; then
    echo "✅ Capabilities endpoint working"
else
    echo "❌ Capabilities endpoint failed"
fi
echo ""

# Test 4: Basic orchestration
echo "🔍 Test 4: Basic Orchestration"
echo "-------------------------------"
RESPONSE=$(curl -s -X POST "$SERVICE_URL/orchestrate" \
    -H "Content-Type: application/json" \
    -d '{
        "prompt": "Explain what is a binary search tree in simple terms",
        "task_type": "explanation",
        "collaboration_mode": "specialized",
        "max_tokens": 500
    }')

if [ $? -eq 0 ]; then
    echo "✅ Orchestration endpoint working"
    echo "Response preview: ${RESPONSE:0:200}..."
else
    echo "❌ Orchestration endpoint failed"
fi
echo ""

# Test 5: Workflow execution
echo "🔍 Test 5: Workflow Execution"
echo "------------------------------"
WORKFLOW_RESPONSE=$(curl -s -X POST "$SERVICE_URL/workflow" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "test-workflow",
        "steps": [
            {
                "name": "analysis",
                "task_type": "analysis",
                "prompt": "Analyze the concept of recursion"
            }
        ],
        "mode": "sequential"
    }')

if [ $? -eq 0 ]; then
    echo "✅ Workflow endpoint working"
    echo "Response preview: ${WORKFLOW_RESPONSE:0:200}..."
else
    echo "❌ Workflow endpoint failed"
fi
echo ""

# Test 6: Model comparison
echo "🔍 Test 6: Model Comparison"
echo "----------------------------"
COMPARE_RESPONSE=$(curl -s -X POST "$SERVICE_URL/compare" \
    -H "Content-Type: application/json" \
    -d '{
        "prompt": "What is the difference between a stack and a queue?",
        "task_type": "explanation",
        "max_tokens": 300
    }')

if [ $? -eq 0 ]; then
    echo "✅ Compare endpoint working"
    echo "Response preview: ${COMPARE_RESPONSE:0:200}..."
else
    echo "❌ Compare endpoint failed"
fi
echo ""

echo "==========================================="
echo "✅ All tests completed!"
echo "==========================================="
echo ""
echo "🎉 Your Claude-Gemini Orchestrator is working correctly!"
echo ""
echo "Next steps:"
echo "1. Update your VS Code settings with the orchestrator URL"
echo "2. Install the VS Code extension"
echo "3. Start using AI-powered development!"
echo ""
echo "For more information, see DEPLOYMENT_GUIDE.md"
