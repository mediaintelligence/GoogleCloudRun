# Gemini Assistant Icons

This directory contains all icon assets for the Gemini Assistant extension.

## Required Icons

### Extension Icon
- **File**: `gemini-icon.png`
- **Size**: 128x128px
- **Format**: PNG with transparency
- **Usage**: Main extension icon shown in marketplace and extension list

### Activity Bar Icon
- **File**: `gemini-sidebar.svg`
- **Size**: 24x24px viewBox
- **Format**: SVG (monochrome)
- **Usage**: Icon shown in VS Code activity bar

### Additional Sizes (Optional but Recommended)
- `gemini-icon@2x.png` - 256x256px for high DPI displays
- `gemini-icon-small.png` - 32x32px for smaller contexts

## Design Guidelines

### Colors
- Primary: `#1a73e8` (Google Blue)
- Secondary: `#34a853` (Google Green)
- Accent: `#fbbc04` (Google Yellow)
- Error: `#ea4335` (Google Red)

### Style
- Modern, clean design
- Consistent with VS Code's design language
- Should work well in both light and dark themes
- Avoid complex gradients or shadows

## Creating Icons

### Using SVG for Activity Bar
```xml
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2L2 7V12C2 16.5 4.5 20.7 12 22C19.5 20.7 22 16.5 22 12V7L12 2Z" 
        fill="currentColor"/>
</svg>
```

### Placeholder Icon Script
If you need to generate placeholder icons, use this script:

```bash
# Create placeholder PNG
convert -size 128x128 xc:transparent \
  -fill '#1a73e8' \
  -draw 'circle 64,64 64,10' \
  -fill white \
  -pointsize 60 \
  -gravity center \
  -annotate +0+0 'G' \
  gemini-icon.png

# Create placeholder SVG
echo '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" fill="currentColor"/>
  <text x="12" y="17" font-size="14" text-anchor="middle" fill="white">G</text>
</svg>' > gemini-sidebar.svg
```

## File Checklist
- [ ] gemini-icon.png (128x128)
- [ ] gemini-sidebar.svg (24x24)
- [ ] gemini-icon@2x.png (256x256) - optional
- [ ] marketplace-banner.png (1280x640) - for marketplace header