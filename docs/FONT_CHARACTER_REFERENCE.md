# Nova64 Bitmap Font - Character Reference

## Complete Character Set (95+ Characters)

### Uppercase Letters (A-Z)

```
ABCDEFGHIJKLMNOPQRSTUVWXYZ
```

### Lowercase Letters (a-z)

```
abcdefghijklmnopqrstuvwxyz
```

### Numbers (0-9)

```
0123456789
```

### Basic Punctuation

```
! ? . , : ; ' " - _ /
```

### Brackets & Parentheses

```
( ) [ ] { } < >
```

### Mathematical & Logic Symbols

```
= + - * / % ^ ~
```

### Special Symbols

```
& $ # @ ` | \
```

### Arrow Characters (Unicode → ASCII Art)

```
← → ↑ ↓ ↔ ↕
```

### Whitespace

```
(space character)
(newline \n)
```

## Emoji Handling

### Automatically Replaced Emojis

These emojis are automatically converted when rendering:

| Emoji | Replacement | Description        |
| ----- | ----------- | ------------------ |
| 🎮    | (removed)   | Game controller    |
| 🚀    | (removed)   | Rocket             |
| 🏁    | (removed)   | Checkered flag     |
| 🏛️    | (removed)   | Classical building |
| 🏰    | (removed)   | Castle             |
| 🌃    | (removed)   | Night cityscape    |
| 🛡️    | (removed)   | Shield             |
| 🖱️    | (removed)   | Mouse              |
| 🖥️    | (removed)   | Desktop            |
| 🔮    | \*          | Crystal ball       |
| ⚡    | \*          | Lightning          |
| ✨    | \*          | Sparkles           |
| ✅    | +           | Check mark         |
| 🔘    | o           | Radio button       |
| 🎯    | o           | Target             |
| ⚙️    | \*          | Gear               |

### Unsupported Characters

Any character not in the font will be:

- Silently skipped (not rendered)
- Never shows as "?"

## Usage Examples

### Print Text

```javascript
// Basic text
print('Hello World!', 100, 100, rgba8(255, 255, 255, 255));

// Uppercase
print('GAME OVER', 200, 150, rgba8(255, 0, 0, 255));

// Lowercase
print('score: 1234', 50, 50, rgba8(255, 255, 0, 255));

// Mixed case
print('Press Space to Start', 150, 200, rgba8(200, 200, 200, 255));
```

### With Arrows

```javascript
// Control instructions
print('↑↓ Move  ←→ Strafe', 20, 340, rgba8(255, 255, 255, 255));

// Menu navigation
print('← Back  Select →', 200, 300, rgba8(200, 200, 200, 255));
```

### With Special Symbols

```javascript
// Game stats
print('Health: [##########] 100%', 20, 20, rgba8(0, 255, 0, 255));
print('Score: 1,234,567 pts', 20, 40, rgba8(255, 255, 0, 255));
print('Ammo: 45/100 rounds', 20, 60, rgba8(255, 150, 0, 255));

// Math expressions
print('Speed: 50% (+10% bonus)', 20, 80, rgba8(100, 200, 255, 255));
```

### With Emojis (Auto-cleaned)

```javascript
// These work automatically - emojis are stripped/replaced
print('🚀 STAR FOX', 100, 50, rgba8(255, 255, 255, 255));
// Renders as: "STAR FOX"

print('⚡ BOOST ACTIVE', 100, 70, rgba8(255, 255, 0, 255));
// Renders as: "* BOOST ACTIVE"

print('🎮 Ready Player One', 100, 90, rgba8(0, 255, 0, 255));
// Renders as: "Ready Player One"
```

## Font Specifications

- **Font Type**: Monospace Bitmap Font
- **Character Size**: 5×7 pixels per character
- **Spacing**: 1 pixel between characters
- **Format**: ASCII art patterns stored as string arrays
- **Color**: Supports any RGBA color via rgba8()
- **Scaling**: Supports integer scaling (1x, 2x, 3x, etc.)

## Technical Details

### Character Rendering

1. Text is cleaned via `cleanText()` function
2. Unknown emojis are replaced or removed
3. Each character is looked up in GLYPHS map
4. Unknown ASCII chars fall back to "?" glyph
5. Pixels are drawn using framebuffer pset()

### Performance

- O(n) text cleaning where n = string length
- O(n×w×h) rendering where n = chars, w×h = 5×7
- Extremely fast for typical game text
- No memory allocation during rendering

## Font Limitations

### Not Supported

- ❌ Accented characters (é, ñ, ü, etc.)
- ❌ Non-Latin scripts (Arabic, Chinese, Cyrillic, etc.)
- ❌ Proportional spacing
- ❌ Kerning
- ❌ Ligatures
- ❌ Most Unicode symbols beyond what's listed

### Workarounds

- Use ASCII equivalents when possible
- Remove unsupported chars (automatic)
- Use ALL CAPS for emphasis instead of bold
- Use symbols creatively: \* for stars, + for health, etc.

## Best Practices

### Do ✅

```javascript
print('SCORE: 12345', x, y, color); // Clear and readable
print('Health: [####------] 40%', x, y, color); // Creative use of chars
print('Press X to Fire!', x, y, color); // Uppercase for keys
print('← Back    Continue →', x, y, color); // Arrow navigation
```

### Avoid ❌

```javascript
print('Pokémon', x, y, color); // Accented chars not supported
print('日本語', x, y, color); // Non-Latin scripts not supported
print('   ', x, y, color); // Won't render properly
```

## Summary

The Nova64 bitmap font provides **95+ characters** covering:

- Complete English alphabet (upper & lower case)
- All numbers and common punctuation
- Mathematical operators and special symbols
- Unicode arrows for game controls
- Smart emoji handling to prevent rendering issues

**Result**: No more "?" characters in your games! 🎮
