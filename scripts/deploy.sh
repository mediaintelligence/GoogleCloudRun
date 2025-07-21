#!/bin/bash

# Gemini Assistant Deployment Script
# This script automates the deployment process for the VS Code extension

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EXTENSION_NAME="gemini-assistant"
CURRENT_VERSION=$(node -p "require('./package.json').version")

echo -e "${BLUE}🚀 Gemini Assistant Deployment Script${NC}"
echo -e "${BLUE}Current Version: ${CURRENT_VERSION}${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Pre-flight checks
echo -e "${YELLOW}📋 Running pre-flight checks...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

if ! command_exists vsce; then
    echo -e "${YELLOW}⚠️  vsce not found. Installing...${NC}"
    npm install -g @vscode/vsce
fi

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf dist/
rm -f *.vsix

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm test || {
    echo -e "${RED}❌ Tests failed. Fix issues before deploying.${NC}"
    exit 1
}

# Run linting
echo -e "${YELLOW}🔍 Running linter...${NC}"
npm run lint || {
    echo -e "${RED}❌ Linting failed. Fix issues before deploying.${NC}"
    exit 1
}

# Check for API keys or sensitive data
echo -e "${YELLOW}🔒 Checking for sensitive data...${NC}"
if grep -r "AIza" src/ --exclude-dir=node_modules 2>/dev/null; then
    echo -e "${RED}❌ Found potential API keys in source code!${NC}"
    exit 1
fi

if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file found - ensure it's in .gitignore${NC}"
fi

# Build the extension
echo -e "${YELLOW}🔨 Building extension...${NC}"
npm run package

# Package the extension
echo -e "${YELLOW}📦 Creating VSIX package...${NC}"
vsce package

# Get the generated VSIX filename
VSIX_FILE="${EXTENSION_NAME}-${CURRENT_VERSION}.vsix"

if [ ! -f "$VSIX_FILE" ]; then
    echo -e "${RED}❌ VSIX file not found: ${VSIX_FILE}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Successfully created ${VSIX_FILE}${NC}"

# Ask if user wants to publish
echo ""
echo -e "${YELLOW}Would you like to:${NC}"
echo "1) Publish to VS Code Marketplace"
echo "2) Create GitHub release"
echo "3) Both"
echo "4) Just package (done)"
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo -e "${YELLOW}📤 Publishing to VS Code Marketplace...${NC}"
        vsce publish || {
            echo -e "${RED}❌ Publishing failed${NC}"
            exit 1
        }
        echo -e "${GREEN}✅ Published successfully!${NC}"
        ;;
    2)
        ./scripts/github-release.sh "$CURRENT_VERSION" "$VSIX_FILE"
        ;;
    3)
        echo -e "${YELLOW}📤 Publishing to VS Code Marketplace...${NC}"
        vsce publish || {
            echo -e "${RED}❌ Publishing failed${NC}"
            exit 1
        }
        echo -e "${GREEN}✅ Published successfully!${NC}"
        ./scripts/github-release.sh "$CURRENT_VERSION" "$VSIX_FILE"
        ;;
    4)
        echo -e "${GREEN}✅ Package created successfully!${NC}"
        ;;
    *)
        echo -e "${YELLOW}No action taken.${NC}"
        ;;
esac

# Create distribution folder
echo -e "${YELLOW}📁 Creating distribution folder...${NC}"
mkdir -p "dist/gemini-assistant-v${CURRENT_VERSION}"
cp "$VSIX_FILE" "dist/gemini-assistant-v${CURRENT_VERSION}/"
cp README.md "dist/gemini-assistant-v${CURRENT_VERSION}/"
cp CHANGELOG.md "dist/gemini-assistant-v${CURRENT_VERSION}/"

# Create installation scripts
cat > "dist/gemini-assistant-v${CURRENT_VERSION}/install.sh" << 'EOF'
#!/bin/bash
echo "Installing Gemini Assistant..."
code --install-extension gemini-assistant-*.vsix
echo "Installation complete! Please restart VS Code."
EOF

cat > "dist/gemini-assistant-v${CURRENT_VERSION}/install.bat" << 'EOF'
@echo off
echo Installing Gemini Assistant...
code --install-extension gemini-assistant-*.vsix
echo Installation complete! Please restart VS Code.
pause
EOF

chmod +x "dist/gemini-assistant-v${CURRENT_VERSION}/install.sh"

# Create archive
echo -e "${YELLOW}📦 Creating distribution archive...${NC}"
cd dist
zip -r "gemini-assistant-v${CURRENT_VERSION}.zip" "gemini-assistant-v${CURRENT_VERSION}/"
cd ..

echo ""
echo -e "${GREEN}🎉 Deployment preparation complete!${NC}"
echo -e "${BLUE}Distribution files available in: dist/${NC}"
echo -e "${BLUE}VSIX file: ${VSIX_FILE}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "- Share dist/gemini-assistant-v${CURRENT_VERSION}.zip for manual installation"
echo "- Check VS Code Marketplace for published extension"
echo "- Create announcement for users"