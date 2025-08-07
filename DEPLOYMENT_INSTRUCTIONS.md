# Claude-Gemini Assistant Extension Deployment

## 🎉 Extension Successfully Built!

The extension has been packaged as: `claude-gemini-assistant-1.2.0.vsix` (65.66 KB)

## Deployment Options

### Option 1: Install Locally in VS Code
```bash
# Install the extension directly in VS Code
code --install-extension claude-gemini-assistant-1.2.0.vsix
```

Or manually:
1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
3. Click the "..." menu at the top of Extensions view
4. Choose "Install from VSIX..."
5. Select the `claude-gemini-assistant-1.2.0.vsix` file

### Option 2: Publish to VS Code Marketplace

#### Prerequisites
1. Create a publisher account at https://marketplace.visualstudio.com/manage
2. Generate a Personal Access Token (PAT) from Azure DevOps

#### Publish Steps
```bash
# Login with your publisher account
npx vsce login mediaintelligence

# Publish to marketplace
npx vsce publish

# Or publish with PAT directly
npx vsce publish -p YOUR_PERSONAL_ACCESS_TOKEN
```

### Option 3: Distribute via GitHub Release

1. Go to https://github.com/mediaintelligence/GoogleCloudRun/releases
2. Click "Create a new release"
3. Tag version: `v1.2.0`
4. Release title: `Claude-Gemini Assistant v1.2.0`
5. Upload the `claude-gemini-assistant-1.2.0.vsix` file
6. Publish release

Users can then download and install the .vsix file directly.

## Share Installation Link

Once published to the marketplace, share this link:
```
https://marketplace.visualstudio.com/items?itemName=mediaintelligence.claude-gemini-assistant
```

## Files Created

- **Extension Package**: `claude-gemini-assistant-1.2.0.vsix`
- **Size**: 65.66 KB
- **Files Included**: 17 files
- **Main Script**: `out/extension.js` (157.14 KB minified)

## Testing the Deployed Extension

After installation:
1. Open VS Code
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Claude Assistant" to see all available commands
4. Or use the shortcuts:
   - `Cmd+Shift+G`: Start Gemini Workflow
   - `Cmd+Shift+C`: Execute Claude Code with Context

## GitHub Repository

The source code is available at:
https://github.com/mediaintelligence/GoogleCloudRun/tree/claude-gemini-assistant

## Support

For issues or questions, please visit:
https://github.com/mediaintelligence/GoogleCloudRun/issues