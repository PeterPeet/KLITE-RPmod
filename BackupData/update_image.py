#!/usr/bin/env python3
"""
Update the --img_theme_4 CSS variable in Guided_RPmod_esolite.js
"""

import re

# Read the new CSS variable
with open('RolePlayThumbnail_css_variable.txt', 'r') as f:
    new_css_var = f.read().strip()

# Read the JavaScript file
with open('Guided_RPmod_esolite.js', 'r') as f:
    content = f.read()

# Find and replace the --img_theme_4 line
# Pattern to match the entire --img_theme_4 line
pattern = r"            --img_theme_4:url\('data:image/png;base64,[^']+'\);"

# Replace with new CSS variable
updated_content = re.sub(pattern, new_css_var, content)

# Check if replacement was successful
if updated_content == content:
    print("❌ Warning: No replacement made. Pattern not found.")
else:
    # Write the updated content
    with open('Guided_RPmod_esolite.js', 'w') as f:
        f.write(updated_content)

    print("✅ Successfully updated --img_theme_4 variable")

    # Show file sizes
    import os
    new_size = os.path.getsize('Guided_RPmod_esolite.js')
    print(f"Updated file size: {new_size:,} bytes ({new_size/1024/1024:.1f} MB)")
