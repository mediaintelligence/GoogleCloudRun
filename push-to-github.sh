#!/bin/bash

echo "GitHub Push Script for Claude-Gemini Assistant"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Not in the claude-gemini-assistant directory"
    exit 1
fi

# Check if git remote exists
if git remote | grep -q "origin"; then
    echo "Remote 'origin' already exists. Current remotes:"
    git remote -v
    echo ""
    echo "Do you want to push to the existing remote? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        echo "Aborted."
        exit 0
    fi
else
    echo "No remote repository configured."
    echo ""
    echo "Please enter your GitHub repository URL:"
    echo "Format: https://github.com/USERNAME/REPOSITORY.git"
    echo "Or: git@github.com:USERNAME/REPOSITORY.git"
    read -r repo_url
    
    if [ -z "$repo_url" ]; then
        echo "No URL provided. Aborted."
        exit 1
    fi
    
    echo "Adding remote origin..."
    git remote add origin "$repo_url"
fi

echo ""
echo "Current git status:"
git status --short

echo ""
echo "Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "Your repository is now available at:"
    git remote get-url origin | sed 's/\.git$//' | sed 's/git@github.com:/https:\/\/github.com\//'
else
    echo ""
    echo "❌ Push failed. Common issues:"
    echo "1. Authentication: You may need to set up a personal access token"
    echo "2. Repository doesn't exist: Create it on GitHub first"
    echo "3. Permission denied: Check repository permissions"
    echo ""
    echo "To create a repository on GitHub:"
    echo "1. Go to https://github.com/new"
    echo "2. Name it 'claude-gemini-assistant'"
    echo "3. Don't initialize with README"
    echo "4. Run this script again"
fi
