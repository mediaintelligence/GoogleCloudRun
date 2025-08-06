#!/bin/bash

echo "🧪 Claude Gemini Assistant - Comprehensive Test Suite"
echo "====================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${BLUE}🔍 Running: ${test_name}${NC}"
    eval "$test_command"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PASSED: ${test_name}${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌ FAILED: ${test_name}${NC}"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
    echo ""
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "📋 Test Suite Overview:"
echo "1. Compilation Tests"
echo "2. Package Configuration Tests"
echo "3. File Structure Tests"
echo "4. Jest Unit Tests"
echo "5. Integration Tests"
echo ""

# 1. COMPILATION TESTS
echo -e "${YELLOW}📦 1. COMPILATION TESTS${NC}"
echo "================================"

run_test "TypeScript Compilation" "npm run compile"
run_test "Webpack Build" "npm run compile"
run_test "Extension Bundle Size" "test -f out/extension.js && test $(stat -f%z out/extension.js) -gt 1000"

# 2. PACKAGE CONFIGURATION TESTS
echo -e "${YELLOW}📋 2. PACKAGE CONFIGURATION TESTS${NC}"
echo "=========================================="

run_test "Package.json Exists" "test -f package.json"
run_test "Package Name Correct" "grep -q '\"name\": \"claude-gemini-assistant\"' package.json"
run_test "Main Entry Point" "grep -q '\"main\": \"./out/extension.js\"' package.json"
run_test "VS Code Engine" "grep -q '\"vscode\"' package.json"
run_test "Publisher Correct" "grep -q '\"publisher\": \"mediaintelligence\"' package.json"

# 3. FILE STRUCTURE TESTS
echo -e "${YELLOW}📁 3. FILE STRUCTURE TESTS${NC}"
echo "================================"

run_test "Source Directory" "test -d src"
run_test "Core Directory" "test -d src/core"
run_test "Hooks Directory" "test -d src/hooks"
run_test "UI Directory" "test -d src/ui"
run_test "Types Directory" "test -d src/types"
run_test "Commands Directory" "test -d src/commands"

run_test "Main Extension File" "test -f src/extension.ts"
run_test "Session Manager" "test -f src/core/sessionManager.ts"
run_test "Collaborative Executor" "test -f src/core/collaborativeExecutor.ts"
run_test "History Tracker" "test -f src/core/historyTracker.ts"
run_test "Work Recovery" "test -f src/core/workRecovery.ts"
run_test "Memory System" "test -f src/core/memorySystem.ts"

# 4. COMMAND REGISTRATION TESTS
echo -e "${YELLOW}⚡ 4. COMMAND REGISTRATION TESTS${NC}"
echo "====================================="

required_commands=(
    "claude-assistant.startGeminiWorkflow"
    "claude-assistant.generateCode"
    "claude-assistant.refactorCode"
    "claude-assistant.debugWithAI"
    "claude-assistant.explainCode"
    "claude-assistant.optimizePerformance"
    "claude-assistant.generateTests"
    "claude-assistant.createSession"
    "claude-assistant.resumeSession"
    "claude-assistant.saveSession"
    "claude-assistant.viewSessionHistory"
    "claude-assistant.startCollaboration"
    "claude-assistant.collaborativeDebug"
    "claude-assistant.collaborativeRefactor"
    "claude-assistant.compareApproaches"
    "claude-assistant.createRecoveryPoint"
    "claude-assistant.restoreFromRecovery"
)

for cmd in "${required_commands[@]}"; do
    run_test "Command: $cmd" "grep -q '\"$cmd\"' package.json"
done

# 5. CONFIGURATION TESTS
echo -e "${YELLOW}⚙️  5. CONFIGURATION TESTS${NC}"
echo "================================"

run_test "TypeScript Config" "test -f tsconfig.json"
run_test "Webpack Config" "test -f webpack.config.js"
run_test "Jest Config" "test -f jest.config.js"
run_test "ESLint Config" "test -f .eslintrc.json"
run_test "Git Ignore" "test -f .gitignore"
run_test "VS Code Ignore" "test -f .vscodeignore"

# 6. DOCUMENTATION TESTS
echo -e "${YELLOW}📚 6. DOCUMENTATION TESTS${NC}"
echo "================================"

run_test "README.md" "test -f README.md"
run_test "USER_GUIDE.md" "test -f USER_GUIDE.md"
run_test "CHANGELOG.md" "test -f CHANGELOG.md"
run_test "LICENSE" "test -f LICENSE"

# 7. SCRIPT TESTS
echo -e "${YELLOW}📜 7. SCRIPT TESTS${NC}"
echo "========================"

run_test "Launch Script" "test -f launch.sh"
run_test "Launch Script Executable" "test -x launch.sh"
run_test "Launch Script Content" "grep -q 'F5' launch.sh"

# 8. JEST UNIT TESTS
echo -e "${YELLOW}🧪 8. JEST UNIT TESTS${NC}"
echo "========================"

if command_exists npm; then
    # Check if Jest is installed
    if npm list jest >/dev/null 2>&1; then
        run_test "Jest Installation" "npm list jest"
        run_test "Jest Test Execution" "npm test"
    else
        echo -e "${YELLOW}⚠️  Jest not installed, installing...${NC}"
        npm install --save-dev jest @types/jest ts-jest
        run_test "Jest Test Execution" "npm test"
    fi
else
    echo -e "${RED}❌ npm not found, skipping Jest tests${NC}"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
fi

# 9. INTEGRATION TESTS
echo -e "${YELLOW}🔗 9. INTEGRATION TESTS${NC}"
echo "================================"

run_test "Node Modules" "test -d node_modules"
run_test "Package Lock" "test -f package-lock.json"
run_test "Out Directory" "test -d out"
run_test "Extension JS" "test -f out/extension.js"

# 10. BUILD SYSTEM TESTS
echo -e "${YELLOW}🔨 10. BUILD SYSTEM TESTS${NC}"
echo "================================="

run_test "NPM Scripts" "npm run compile"
run_test "Watch Mode Available" "grep -q '\"watch\"' package.json"
run_test "Package Script Available" "grep -q '\"package\"' package.json"

# FINAL RESULTS
echo ""
echo -e "${YELLOW}📊 FINAL TEST RESULTS${NC}"
echo "========================"
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}✅ Extension is ready for use!${NC}"
    echo ""
    echo "🚀 To launch the extension:"
    echo "1. Open VS Code"
    echo "2. Press F5 to start Extension Development Host"
    echo "3. Test commands in the new window"
    echo ""
    echo "📋 Available commands:"
    echo "- Claude Assistant: Start Gemini Workflow"
    echo "- Claude Assistant: Generate Code with AI"
    echo "- Claude Assistant: Refactor Code with AI"
    echo "- Claude Assistant: Debug with AI"
    echo "- Claude Assistant: Explain Code with AI"
    echo "- Claude Assistant: Optimize Performance with AI"
    echo "- Claude Assistant: Generate Tests with AI"
    echo "- Claude Assistant: Create New Work Session"
    echo "- Claude Assistant: Start Claude-Gemini Collaboration"
    echo "- Claude Assistant: Create Recovery Point"
    exit 0
else
    echo ""
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo -e "${YELLOW}Please review the failed tests above and fix the issues.${NC}"
    exit 1
fi 