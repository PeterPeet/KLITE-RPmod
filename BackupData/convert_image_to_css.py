#!/usr/bin/env python3
"""
Image to CSS Base64 Converter
Converts an image file to a CSS variable with base64 data URL
"""

import base64
import sys
import os

def image_to_css_variable(image_path, var_name="img_theme_4"):
    """
    Convert an image to a CSS variable with base64 data URL

    Args:
        image_path: Path to the image file
        var_name: Name of the CSS variable (default: img_theme_4)

    Returns:
        CSS variable string
    """
    # Check if file exists
    if not os.path.exists(image_path):
        print(f"Error: File not found: {image_path}")
        sys.exit(1)

    # Determine MIME type based on extension
    ext = os.path.splitext(image_path)[1].lower()
    mime_types = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
    }

    mime_type = mime_types.get(ext, 'image/png')

    # Read and encode the file
    print(f"Reading {image_path}...")
    with open(image_path, 'rb') as image_file:
        encoded = base64.b64encode(image_file.read()).decode('utf-8')

    # Get file size info
    original_size = os.path.getsize(image_path)
    base64_size = len(encoded)

    print(f"Original size: {original_size:,} bytes ({original_size/1024:.1f} KB)")
    print(f"Base64 size: {base64_size:,} bytes ({base64_size/1024:.1f} KB)")

    # Create CSS variable
    css_var = f"            --{var_name}:url('data:{mime_type};base64,{encoded}');"

    return css_var

def main():
    if len(sys.argv) < 2:
        print("Usage: python convert_image_to_css.py <image_path> [css_var_name]")
        print("Example: python convert_image_to_css.py RolePlayThumbnail.png img_theme_4")
        sys.exit(1)

    image_path = sys.argv[1]
    var_name = sys.argv[2] if len(sys.argv) > 2 else "img_theme_4"

    # Convert image
    css_var = image_to_css_variable(image_path, var_name)

    # Save to file
    output_file = f"{os.path.splitext(image_path)[0]}_css_variable.txt"
    with open(output_file, 'w') as f:
        f.write(css_var)

    print(f"\n✅ CSS variable saved to: {output_file}")
    print(f"\nTo use in your CSS:")
    print(f"Add this line inside the :root {{ ... }} section:")
    print(f"\n{css_var[:100]}...")
    print(f"\nThen reference it as: background-image: var(--{var_name});")

if __name__ == "__main__":
    main()
