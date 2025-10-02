# -*- coding: utf-8 -*-
import re

# Read file
with open('src/components/GraphView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix broken emojis
replacements = {
    'â¸': '⏸',
    'â–¶': '▶',
    'ðŸ"„': '🔄',
    'ðŸŽ¯': '🎯',
    'ðŸ–±ï¸': '🖱️',
    'ðŸ"': '🔍',
    'â€¢': '•',
    # Additional broken patterns
    'Ã¼': 'ü',
    'Ã¤': 'ä',
}

for old, new in replacements.items():
    content = content.replace(old, new)

# Write back
with open('src/components/GraphView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Emojis fixed!")
