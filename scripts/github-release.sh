#!/bin/bash

# GitHub Release Creation Script
# Creates a new release on GitHub with the VSIX file

set -e

# Check arguments
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <version> <vsix-file>"
    echo "Example: $0 1.0.0 gemini-assistant-1.0.0.vsix"
    exit 1
fi

VERSION=$1
VSIX_FILE=$2
REPO_OWNER="your-username"  # Update this
REPO_NAME="gemini-assistant"  # Update this

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}📦 Creating GitHub release for v${VERSION}...${NC}"

# Check if gh CLI is installed
if ! command -v gh >/dev/null 2>&1; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo "Install from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status >/dev/null 2>&1; then
    echo -e "${YELLOW}🔐 Not authenticated with GitHub. Running 'gh auth login'...${NC}"
    gh auth login
fi

# Generate release notes from CHANGELOG
echo -e "${YELLOW}📝 Extracting release notes...${NC}"
RELEASE_NOTES=$(awk "/## \[${VERSION}\]/{flag=1; next} /## \[/{flag=0} flag" CHANGELOG.md)

if [ -z "$RELEASE_NOTES" ]; then
    echo -e "${YELLOW}⚠️  No release notes found for version ${VERSION}${NC}"
    RELEASE_NOTES="Release of Gemini Assistant v${VERSION}

See [CHANGELOG.md](https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/CHANGELOG.md) for details."
fi

# Create release
echo -e "${YELLOW}🚀 Creating release...${NC}"
gh release create "v${VERSION}" \
    --repo "${REPO_OWNER}/${REPO_NAME}" \
    --title "Gemini Assistant v${VERSION}" \
    --notes "${RELEASE_NOTES}" \
    --draft \
    "${VSIX_FILE}"

echo -e "${GREEN}✅ Draft release created successfully!${NC}"
echo -e "${YELLOW}📎 Visit https://github.com/${REPO_OWNER}/${REPO_NAME}/releases to publish the release${NC}"