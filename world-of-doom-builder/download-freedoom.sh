#!/bin/bash

# Download Freedoom - 100% Legal and Open Source
# Alternative to DOOM.WAD

echo "╔═══════════════════════════════════════════════════════╗"
echo "║         Downloading Freedoom (Legal & Free)          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Create wads directory
mkdir -p wads
cd wads

# Download Freedoom
echo "📥 Downloading Freedoom v0.12.1..."
wget https://github.com/freedoom/freedoom/releases/download/v0.12.1/freedoom-0.12.1.zip

echo "📦 Extracting..."
unzip -q freedoom-0.12.1.zip

# Move WAD files to root
mv freedoom-0.12.1/*.wad .

# Cleanup
rm -rf freedoom-0.12.1 freedoom-0.12.1.zip

echo ""
echo "✅ Freedoom installed successfully!"
echo ""
echo "Available WAD files:"
ls -lh *.wad
echo ""
echo "You now have:"
echo "  - freedoom1.wad (DOOM 1 replacement)"
echo "  - freedoom2.wad (DOOM 2 replacement)"
echo ""
echo "These are 100% legal and free to use commercially!"
echo ""
echo "Next step: npm run studio"
