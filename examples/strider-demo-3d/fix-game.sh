#!/bin/bash
# Fix the Shadow Ninja 3D game

echo "🔧 Fixing Shadow Ninja 3D Platformer..."
echo ""

# Navigate to game directory
cd "$(dirname "$0")"

# Backup old code
if [ -f "code.js" ]; then
    echo "📦 Backing up old code.js to code-old.js..."
    cp code.js code-old.js
fi

# Replace with fixed version
if [ -f "code-fixed.js" ]; then
    echo "✅ Installing fixed version..."
    cp code-fixed.js code.js
    echo "   ✓ Game code updated!"
else
    echo "❌ Error: code-fixed.js not found!"
    exit 1
fi

# Create models directory
echo ""
echo "📁 Setting up models directory..."
mkdir -p ../../../public/models
echo "   ✓ Created /public/models/"

echo ""
echo "🎮 Game fixed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Refresh your browser"
echo "   2. Test the game - it should work properly now!"
echo "   3. (Optional) Download GLB models from:"
echo "      - https://poly.pizza"
echo "      - https://kenney.nl/assets"
echo "      - http://quaternius.com/assets.html"
echo "   4. Place models in public/models/ folder"
echo "   5. Enable USE_GLB_MODELS in code.js"
echo ""
echo "🎯 The game now has:"
echo "   ✓ Proper collision detection"
echo "   ✓ Coyote time (150ms grace period)"
echo "   ✓ Jump buffering (100ms window)"
echo "   ✓ Progressive level design"
echo "   ✓ Clear visual feedback"
echo "   ✓ Smooth camera following"
echo ""
echo "Happy gaming! 🎮"
