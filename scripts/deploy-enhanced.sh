#!/bin/bash

# Enhanced Gemini Assistant Deployment Script
# This script provides comprehensive deployment with security checks,
# quality assurance, and automated publishing

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
EXTENSION_NAME="gemini-assistant"
CURRENT_VERSION=$(node -p "require('./package.json').version")
MIN_NODE_VERSION="16.0.0"
MIN_VSCODE_VERSION="1.85.0"

echo -e "${PURPLE}🚀 Gemini Assistant Enhanced Deployment Script${NC}"
echo -e "${PURPLE}Current Version: ${CURRENT_VERSION}${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to compare versions
version_compare() {
    if [[ $1 == $2 ]]; then
        return 0
    fi
    local IFS=.
    local i ver1=($1) ver2=($2)
    for ((i=${#ver1[@]}; i<${#ver2[@]}; i++)); do
        ver1[i]=0
    done
    for ((i=0; i<${#ver1[@]}; i++)); do
        if [[ -z ${ver2[i]} ]]; then
            ver2[i]=0
        fi
        if ((10#${ver1[i]} > 10#${ver2[i]})); then
            return 1
        fi
        if ((10#${ver1[i]} < 10#${ver2[i]})); then
            return 2
        fi
    done
    return 0
}

# Pre-flight checks
echo -e "${YELLOW}📋 Running comprehensive pre-flight checks...${NC}"

# Check Node.js version
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
version_compare $NODE_VERSION $MIN_NODE_VERSION
if [ $? -eq 2 ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION is too old. Required: $MIN_NODE_VERSION+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js version $NODE_VERSION${NC}"

# Check npm
if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

# Install vsce if needed
if ! command_exists vsce; then
    echo -e "${YELLOW}⚠️  vsce not found. Installing...${NC}"
    npm install -g @vscode/vsce
fi
echo -e "${GREEN}✓ vsce installed${NC}"

# Check for webpack
if ! npm list webpack >/dev/null 2>&1; then
    echo -e "${RED}❌ webpack not found. Run 'npm install' first${NC}"
    exit 1
fi
echo -e "${GREEN}✓ webpack available${NC}"

# Security checks
echo ""
echo -e "${YELLOW}🔒 Running security checks...${NC}"

# Check for API keys in source
echo -e "  Checking for exposed API keys..."
if grep -r "AIza" src/ --exclude-dir=node_modules 2>/dev/null; then
    echo -e "${RED}❌ Found potential Google API keys in source code!${NC}"
    exit 1
fi

if grep -r "sk-[a-zA-Z0-9]{32}" src/ --exclude-dir=node_modules 2>/dev/null; then
    echo -e "${RED}❌ Found potential API keys in source code!${NC}"
    exit 1
fi

# Check for sensitive files
if [ -f .env ] && ! grep -q "^\.env$" .gitignore; then
    echo -e "${RED}❌ .env file exists but not in .gitignore!${NC}"
    exit 1
fi

# Check for console.log in production code
CONSOLE_COUNT=$(grep -r "console\.\(log\|error\|warn\)" src/ --include="*.ts" | grep -v "// " | wc -l)
if [ $CONSOLE_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $CONSOLE_COUNT console statements. Consider removing for production.${NC}"
fi

echo -e "${GREEN}✓ Security checks passed${NC}"

# Clean previous builds
echo ""
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf dist/ out/ *.vsix
npm run clean 2>/dev/null || true

# Install dependencies
echo ""
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --no-audit

# Run quality checks
echo ""
echo -e "${YELLOW}🔍 Running quality checks...${NC}"

# TypeScript compilation check
echo -e "  Checking TypeScript compilation..."
npx tsc --noEmit || {
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ TypeScript compilation successful${NC}"

# Run linting
echo -e "  Running linter..."
npm run lint || {
    echo -e "${RED}❌ Linting failed. Fix issues before deploying.${NC}"
    exit 1
}
echo -e "${GREEN}✓ Linting passed${NC}"

# Run tests if available
if [ -f "src/test/suite/index.ts" ] || [ -d "tests" ]; then
    echo -e "  Running tests..."
    npm test || {
        echo -e "${RED}❌ Tests failed. Fix issues before deploying.${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  No tests found${NC}"
fi

# Check package.json validity
echo -e "  Validating package.json..."
node -e "JSON.parse(require('fs').readFileSync('package.json'))" || {
    echo -e "${RED}❌ package.json is invalid${NC}"
    exit 1
}

# Check required marketplace fields
MISSING_FIELDS=""
[ -z "$(node -p "require('./package.json').publisher")" ] && MISSING_FIELDS="publisher "
[ -z "$(node -p "require('./package.json').repository")" ] && MISSING_FIELDS="${MISSING_FIELDS}repository "
[ -z "$(node -p "require('./package.json').icon")" ] && MISSING_FIELDS="${MISSING_FIELDS}icon "

if [ -n "$MISSING_FIELDS" ]; then
    echo -e "${YELLOW}⚠️  Missing recommended fields: ${MISSING_FIELDS}${NC}"
fi

echo -e "${GREEN}✓ package.json valid${NC}"

# Build the extension
echo ""
echo -e "${YELLOW}🔨 Building extension...${NC}"
npm run compile || npm run package || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Build successful${NC}"

# Check build output
if [ ! -f "out/extension.js" ] && [ ! -f "dist/extension.js" ]; then
    echo -e "${RED}❌ Build output not found${NC}"
    exit 1
fi

# Package the extension
echo ""
echo -e "${YELLOW}📦 Creating VSIX package...${NC}"
vsce package --no-yarn || {
    echo -e "${RED}❌ Packaging failed${NC}"
    exit 1
}

# Get the generated VSIX filename
VSIX_FILE="${EXTENSION_NAME}-${CURRENT_VERSION}.vsix"

if [ ! -f "$VSIX_FILE" ]; then
    echo -e "${RED}❌ VSIX file not found: ${VSIX_FILE}${NC}"
    exit 1
fi

# Analyze package size
VSIX_SIZE=$(du -h "$VSIX_FILE" | cut -f1)
echo -e "${GREEN}✅ Successfully created ${VSIX_FILE} (${VSIX_SIZE})${NC}"

# Validate VSIX contents
echo ""
echo -e "${YELLOW}🔍 Validating VSIX package...${NC}"
unzip -l "$VSIX_FILE" > /dev/null || {
    echo -e "${RED}❌ VSIX file is corrupted${NC}"
    exit 1
}

# Check for required files in VSIX
REQUIRED_FILES=("extension/package.json" "extension/README.md")
for file in "${REQUIRED_FILES[@]}"; do
    if ! unzip -l "$VSIX_FILE" | grep -q "$file"; then
        echo -e "${RED}❌ Missing required file in VSIX: $file${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ VSIX validation passed${NC}"

# Create deployment summary
echo ""
echo -e "${BLUE}📊 Deployment Summary${NC}"
echo -e "${BLUE}═══════════════════${NC}"
echo -e "Extension: ${EXTENSION_NAME}"
echo -e "Version: ${CURRENT_VERSION}"
echo -e "Package: ${VSIX_FILE} (${VSIX_SIZE})"
echo -e "Publisher: $(node -p "require('./package.json').publisher || 'Not set'")"
echo -e "VS Code: $(node -p "require('./package.json').engines.vscode")"
echo ""

# Deployment options
echo -e "${YELLOW}Select deployment option:${NC}"
echo "1) Test locally (install VSIX)"
echo "2) Publish to VS Code Marketplace"
echo "3) Create GitHub release"
echo "4) Full deployment (Marketplace + GitHub)"
echo "5) Package only (done)"
read -p "Enter choice (1-5): " choice

case $choice in
    1)
        echo -e "${YELLOW}📥 Installing locally...${NC}"
        code --install-extension "$VSIX_FILE" || {
            echo -e "${RED}❌ Local installation failed${NC}"
            exit 1
        }
        echo -e "${GREEN}✅ Installed successfully! Restart VS Code to activate.${NC}"
        ;;
    2)
        echo -e "${YELLOW}📤 Publishing to VS Code Marketplace...${NC}"
        
        # Check if logged in
        vsce ls-publishers 2>/dev/null || {
            echo -e "${YELLOW}Please log in to vsce first:${NC}"
            echo -e "${BLUE}vsce login <publisher-name>${NC}"
            exit 1
        }
        
        # Publish with confirmation
        echo -e "${YELLOW}This will publish version ${CURRENT_VERSION} to the marketplace.${NC}"
        read -p "Continue? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            vsce publish || {
                echo -e "${RED}❌ Publishing failed${NC}"
                exit 1
            }
            echo -e "${GREEN}✅ Published successfully!${NC}"
            echo -e "${BLUE}View at: https://marketplace.visualstudio.com/items?itemName=$(node -p "require('./package.json').publisher").${EXTENSION_NAME}${NC}"
        fi
        ;;
    3)
        if [ -f "scripts/github-release.sh" ]; then
            ./scripts/github-release.sh "$CURRENT_VERSION" "$VSIX_FILE"
        else
            echo -e "${YELLOW}Creating GitHub release manually...${NC}"
            echo -e "Upload ${VSIX_FILE} to your GitHub releases"
        fi
        ;;
    4)
        # Full deployment
        echo -e "${YELLOW}📤 Starting full deployment...${NC}"
        
        # Marketplace
        vsce publish || {
            echo -e "${RED}❌ Marketplace publishing failed${NC}"
            exit 1
        }
        echo -e "${GREEN}✅ Published to marketplace${NC}"
        
        # GitHub
        if [ -f "scripts/github-release.sh" ]; then
            ./scripts/github-release.sh "$CURRENT_VERSION" "$VSIX_FILE"
        fi
        
        echo -e "${GREEN}✅ Full deployment complete!${NC}"
        ;;
    5)
        echo -e "${GREEN}✅ Package created successfully!${NC}"
        ;;
    *)
        echo -e "${YELLOW}No action taken.${NC}"
        ;;
esac

# Create distribution folder
echo ""
echo -e "${YELLOW}📁 Creating distribution folder...${NC}"
DIST_DIR="dist/gemini-assistant-v${CURRENT_VERSION}"
mkdir -p "$DIST_DIR"

# Copy files
cp "$VSIX_FILE" "$DIST_DIR/"
cp README.md "$DIST_DIR/"
cp CHANGELOG.md "$DIST_DIR/"
[ -f LICENSE ] && cp LICENSE "$DIST_DIR/"

# Create installation guide
cat > "$DIST_DIR/INSTALL.md" << EOF
# Gemini Assistant Installation Guide

## Quick Install

### Option 1: Command Line
\`\`\`bash
code --install-extension gemini-assistant-${CURRENT_VERSION}.vsix
\`\`\`

### Option 2: VS Code UI
1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X)
3. Click ... menu → Install from VSIX
4. Select gemini-assistant-${CURRENT_VERSION}.vsix

## Configuration

1. Get your Gemini API key from https://makersuite.google.com/app/apikey
2. Open VS Code Settings (Ctrl+,)
3. Search for "Gemini Assistant"
4. Enter your API key

## First Steps

1. Open any project folder
2. Use Ctrl+Shift+G to start a Gemini workflow
3. Use Ctrl+Shift+A to ask Gemini questions
4. Check the Gemini Assistant panel in the sidebar

Enjoy coding with AI assistance! 🚀
EOF

# Create scripts
cat > "$DIST_DIR/install.sh" << 'EOF'
#!/bin/bash
echo "Installing Gemini Assistant..."
code --install-extension gemini-assistant-*.vsix
echo "Installation complete! Please restart VS Code."
echo "Don't forget to configure your Gemini API key in settings."
EOF

cat > "$DIST_DIR/install.bat" << 'EOF'
@echo off
echo Installing Gemini Assistant...
code --install-extension gemini-assistant-*.vsix
echo.
echo Installation complete! Please restart VS Code.
echo Don't forget to configure your Gemini API key in settings.
pause
EOF

chmod +x "$DIST_DIR/install.sh"

# Create archive
echo -e "${YELLOW}📦 Creating distribution archive...${NC}"
cd dist
zip -r "gemini-assistant-v${CURRENT_VERSION}.zip" "gemini-assistant-v${CURRENT_VERSION}/" >/dev/null
cd ..

echo ""
echo -e "${GREEN}🎉 Deployment preparation complete!${NC}"
echo -e "${BLUE}═══════════════════════════════${NC}"
echo -e "📁 Distribution: dist/gemini-assistant-v${CURRENT_VERSION}/"
echo -e "📦 Archive: dist/gemini-assistant-v${CURRENT_VERSION}.zip"
echo -e "🔌 VSIX: ${VSIX_FILE}"
echo ""
echo -e "${YELLOW}Share the distribution archive for easy installation!${NC}"