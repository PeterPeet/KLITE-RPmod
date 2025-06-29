#!/bin/sh

# =============================================
# KLITE RP mod generator script
# Copyrights Peter Hauer
# under GPL-3.0 license
# see https://github.com/PeterPeet/
# =============================================

# Find the highest existing version number
max_version=0
for file in KLITE-RPmod_v*.js; do
    if [ -f "$file" ]; then
        # Extract version number from filename
        version=$(echo "$file" | sed 's/KLITE-RPmod_v\([0-9]*\)\.js/\1/')
        # Remove leading zeros and convert to integer
        version=$(echo "$version" | sed 's/^0*//')
        if [ -z "$version" ]; then
            version=0
        fi
        if [ "$version" -gt "$max_version" ]; then
            max_version=$version
        fi
    fi
done

# Increment version number
next_version=$((max_version + 1))

# Format with leading zeros (3 digits)
formatted_version=$(printf "%03d" $next_version)

# Set output filename with version
output_file="KLITE-RPmod_v${formatted_version}.js"

echo "Generating $output_file..."

echo "    // =============================================" >> "$output_file"
echo "    // KLITE RP mod - KoboldAI Lite conversion" >> "$output_file"
echo "    // Copyrights Peter Hauer" >> "$output_file"
echo "    // under GPL-3.0 license" >> "$output_file"
echo "    // see https://github.com/PeterPeet/" >> "$output_file"
echo "    // =============================================" >> "$output_file"

# Core scripts
cat sources/klite-rpmod-core.js >> "$output_file"
cat sources/klite-rpmod-ui.js >> "$output_file"
cat sources/klite-rpmod-helpers.js >> "$output_file"

# Style modules (always add these before the panels)
cat sources/klite-rpmod-core-styles.js >> "$output_file"
cat sources/klite-rpmod-panel-system-styles.js >> "$output_file"
cat sources/klite-rpmod-ui-styles.js >> "$output_file"
cat sources/klite-rpmod-animations.js >> "$output_file"
cat sources/klite-rpmod-char-panel-css.js >> "$output_file"

# Panel switcher system
cat sources/klite-rpmod-panel-switcher.js >> "$output_file"

# Base panel system
cat sources/klite-rpmod-panels.js >> "$output_file"

# Character manager (multi-part) - must load before PLAY panels
cat sources/klite-rpmod-char-panel-part1.js >> "$output_file"
cat sources/klite-rpmod-char-panel-part2.js >> "$output_file"
cat sources/klite-rpmod-char-panel-part3.js >> "$output_file"

# Mode-specific PLAY panels
cat sources/klite-rpmod-play-panel-rp.js >> "$output_file"
cat sources/klite-rpmod-play-panel-adv.js >> "$output_file"
cat sources/klite-rpmod-play-panel-story.js >> "$output_file"

# Universal panels
cat sources/klite-rpmod-tools-panel.js >> "$output_file"
cat sources/klite-rpmod-scene-panel.js >> "$output_file"
cat sources/klite-rpmod-group-panel.js >> "$output_file"
cat sources/klite-rpmod-help-panel.js >> "$output_file"

# Right-side panels
cat sources/klite-rpmod-memory-panel.js >> "$output_file"
cat sources/klite-rpmod-notes-panel.js >> "$output_file"
cat sources/klite-rpmod-wi-panel.js >> "$output_file"
cat sources/klite-rpmod-textdb-panel.js >> "$output_file"

# Standalone tools
# Stable UI
# cat sources/klite-rpmod-stable-ui-embedded.js >> "$output_file"
# Character creator
# at sources/klite-rpmod-chargen-embedded.js >> "$output_file"
# World creator
# cat sources/klite-rpmod-worldgen-embedded.js >> "$output_file"

# Synchronisation interface between Lite and RPmod
cat sources/klite-rpmod-state-manager.js >> "$output_file"
cat sources/klite-rpmod-event-integration.js >> "$output_file"
cat sources/klite-rpmod-hotswap.js >> "$output_file"

echo "Successfully generated $output_file"