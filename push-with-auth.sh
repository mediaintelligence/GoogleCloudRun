#!/bin/bash

echo "GitHub Private Repository Push"
echo "=============================="
echo ""
echo "Your repository: mediaintelligence-GoogleCloudRun (Private)"
echo ""
echo "Since this is a private repository, you'll need to authenticate."
echo ""
echo "Options:"
echo ""
echo "1. Personal Access Token (Recommended):"
echo "   - Go to: https://github.com/settings/tokens/new"
echo "   - Name: 'Claude Gemini Assistant Push'"
echo "   - Select scopes: 'repo' (all repo permissions)"
echo "   - Generate token and COPY it"
echo "   - When git asks for password, paste the TOKEN (not your password)"
echo ""
echo "2. GitHub CLI Authentication:"
echo "   Run: gh auth login"
echo "   Then: gh repo create (if needed)"
echo ""
echo "3. SSH Key Setup:"
echo "   - Check if you have SSH key: ls ~/.ssh/id_rsa.pub"
echo "   - If not, generate: ssh-keygen -t rsa -b 4096 -C 'ceo@mediaintelligence.ai'"
echo "   - Add to GitHub: https://github.com/settings/keys"
echo ""
echo "Ready to push? Press Enter to continue..."
read

echo ""
echo "Attempting to push to private repository..."
echo "Username: When prompted, enter your GitHub username"
echo "Password: Enter your Personal Access Token (NOT your password)"
echo ""

cd "/Users/bm/Library/CloudStorage/GoogleDrive-ceo@mediaintelligence.ai/My Drive/MIZ/claude-gemini-assistant"

# First, let's check if the repo exists
echo "Checking if repository exists..."
if git ls-remote https://github.com/mediaintelligence-GoogleCloudRun/claude-gemini-assistant.git HEAD &>/dev/null; then
    echo "✅ Repository exists! Pushing code..."
    git push -u origin main
else
    echo "❌ Repository not found. Please create it first:"
    echo "   1. Go to: https://github.com/organizations/mediaintelligence-GoogleCloudRun/repositories/new"
    echo "      OR: https://github.com/new (if it's a personal account)"
    echo "   2. Name: claude-gemini-assistant"
    echo "   3. Set as Private (or Public)"
    echo "   4. DON'T initialize with any files"
    echo "   5. Run this script again"
fi