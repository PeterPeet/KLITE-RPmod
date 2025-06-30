// =============================================
// KLITE RP mod - KoboldAI Lite conversion
// Creator Peter Hauer
// under GPL-3.0 license
// see https://github.com/PeterPeet/
// =============================================

// =============================================
// KLITE RP Mod - HELP Panel Implementation
// Help and resources panel with local search
// =============================================

window.KLITE_RPMod_Panels = window.KLITE_RPMod_Panels || {};

window.KLITE_RPMod_Panels.HELP = {
    dndIndex: null,
    kbaseIndex: null,
    searchTimeout: null,
    
    load(container, panel) {
        // Create the HELP panel content with proper scrollable structure
        container.innerHTML = `
        <!-- HELP Panel -->
        <div class="klite-rpmod-panel-wrapper">
            <div class="klite-rpmod-panel-content klite-rpmod-scrollable">
                <div class="klite-rpmod-section-header">
                    <span>RPMod Role-Playing Features</span>
                </div>
                <div class="klite-rpmod-section-content">
                    <div style="font-size: 12px; line-height: 1.6; color: #ccc;">
                        <p style="margin-bottom: 8px;">• <strong style="color: #4a90e2;">Character Cards:</strong> Import character PNG cards with embedded metadata. Supports personality, scenario, and example dialogues for immersive roleplay.</p>
                        <p style="margin-bottom: 8px;">• <strong style="color: #4a90e2;">Group Chat:</strong> Run multiple characters simultaneously. Perfect for party dynamics, NPC interactions, or complex scenarios.</p>
                        <p style="margin-bottom: 8px;">• <strong style="color: #4a90e2;">Memory System:</strong> Persistent character memory and notes that auto-save. Build long-term campaigns with evolving narratives.</p>
                        <p style="margin-bottom: 8px;">• <strong style="color: #4a90e2;">World Info:</strong> Create detailed worlds with locations, lore, and rules. Characters can reference world entries for consistent storytelling.</p>
                        <p style="margin-bottom: 8px;">• <strong style="color: #4a90e2;">Dice Rolling:</strong> Integrated dice notation support (e.g., 1d20+5) for tabletop RPG mechanics.</p>
                        <p style="margin-bottom: 8px;">• <strong style="color: #4a90e2;">AI Behaviors:</strong> Quick preset buttons to switch between narrative styles, from verbose storytelling to concise actions.</p>
                    </div>
                </div>
                
                <div class="klite-rpmod-horizontal-divider"></div>

                <div class="klite-rpmod-section-header">
                    <span>Quick Reference Icons</span>
                </div>
                <div class="klite-rpmod-section-content">
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Game Modes -->
                        <div style="padding: 12px; background: #1a1a1a; border-radius: 6px; border: 1px solid #333;">
                            <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Game Modes</div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">✏️</span>
                                    <span>Edit Mode</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">💬</span>
                                    <span>RP Mode (Instruct)</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">⚔️</span>
                                    <span>Adventure Mode</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">📖</span>
                                    <span>Storywriter Mode</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Tools & Features -->
                        <div style="padding: 12px; background: #1a1a1a; border-radius: 6px; border: 1px solid #333;">
                            <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Tools & Features</div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">🖼️</span>
                                    <span>Toggle Fullscreen</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">🎨</span>
                                    <span>Image Menu</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">🧠</span>
                                    <span>Smart Memory Writer</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">📊</span>
                                    <span>Context Analysis</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Status Indicators -->
                        <div style="padding: 12px; background: #1a1a1a; border-radius: 6px; border: 1px solid #333;">
                            <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Status Indicators</div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">✍️</span>
                                    <span>Prompt tokens</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">🗒️</span>
                                    <span>Chat/story tokens</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">🔌</span>
                                    <span>API connection</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">💤</span>
                                    <span>Queue position</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; color: #e0e0e0; font-size: 13px;">
                                    <span style="width: 24px; text-align: center; font-size: 16px;">⏱️</span>
                                    <span>Estimated wait time</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="klite-rpmod-horizontal-divider"></div>
            
                <div class="klite-rpmod-section-header">
                    <span>D&D 5e SRD Reference</span>
                </div>
                <div class="klite-rpmod-section-content">
                    <input type="text" id="dnd-search-input" placeholder="Search spells, monsters, rules, items..." style="width: 100%; margin-bottom: 10px;">
                    <div id="dnd-search-results" style="display: none; max-height: 200px; overflow-y: auto; background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 4px; padding: 10px;">
                        <!-- D&D search results appear here -->
                    </div>
                    <div style="font-size: 11px; color: #888; margin-top: 10px; font-style: italic;">
                        Searches offline D&D 5e System Reference Document
                    </div>
                </div>
                
                <div class="klite-rpmod-horizontal-divider"></div>
            
                <div class="klite-rpmod-section-header">
                    <span>Knowledge Base Search</span>
                </div>
                <div class="klite-rpmod-section-content">
                    <input type="text" id="kbase-search-input" placeholder="Search KoboldCpp & Lite documentation..." style="width: 100%; margin-bottom: 10px;">
                    <div id="kbase-search-results" style="display: none; max-height: 200px; overflow-y: auto; background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 4px; padding: 10px;">
                        <!-- Knowledge base search results appear here -->
                    </div>
                    <div style="font-size: 11px; color: #888; margin-top: 10px; font-style: italic;">
                        Comprehensive offline guide for KoboldCpp and Lite
                    </div>
                </div>
                
                <div class="klite-rpmod-horizontal-divider"></div>
            
                <div class="klite-rpmod-section-header">
                    <span>Quick References</span>
                </div>
                <div class="klite-rpmod-section-content">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <a href="https://github.com/LostRuins/koboldcpp/wiki" target="_blank" style="color: #4a90e2; text-decoration: none; font-weight: bold;">→ KoboldCpp Wiki</a>
                        <a href="https://www.dndbeyond.com/sources/basic-rules" target="_blank" style="color: #4a90e2; text-decoration: none;">→ D&D Basic Rules</a>
                        <a href="https://github.com/LostRuins/koboldcpp/releases" target="_blank" style="color: #4a90e2; text-decoration: none;">→ Latest Releases</a>
                        <a href="https://discord.gg/koboldai" target="_blank" style="color: #4a90e2; text-decoration: none;">→ KoboldAI Discord</a>
                        <a href="https://www.reddit.com/r/KoboldAI/" target="_blank" style="color: #4a90e2; text-decoration: none;">→ KoboldAI Reddit</a>
                    </div>
                </div>
                
                <div class="klite-rpmod-horizontal-divider"></div>
            
                <div class="klite-rpmod-section-header">
                    <span>Keyboard Shortcuts</span>
                </div>
                <div class="klite-rpmod-section-content">
                    <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Enter</kbd>
                            <span style="color: #999; margin-left: 8px;">Submit</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">R</kbd>
                            <span style="color: #999; margin-left: 8px;">Retry</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Z</kbd>
                            <span style="color: #999; margin-left: 8px;">Undo/Back</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Y</kbd>
                            <span style="color: #999; margin-left: 8px;">Redo</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">A</kbd>
                            <span style="color: #999; margin-left: 8px;">Abort</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">E</kbd>
                            <span style="color: #999; margin-left: 8px;">Toggle Edit</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">M</kbd>
                            <span style="color: #999; margin-left: 8px;">Memory Panel</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">C</kbd>
                            <span style="color: #999; margin-left: 8px;">Character Panel</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Ctrl</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Shift</kbd> + 
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">U</kbd>
                            <span style="color: #999; margin-left: 8px;">Toggle UI Mode</span>
                        </div>
                        <div>
                            <kbd style="background: #333; border: 1px solid #555; border-radius: 3px; padding: 2px 6px; font-family: monospace;">Tab</kbd>
                            <span style="color: #999; margin-left: 8px;">Switch Input Focus</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

        // Initialize indices and search
        this.initializeIndices();
        this.initializeSearch();
        
        // Add hover effects
        this.addLinkHoverEffects();
    },
    
    initializeIndices() {
        // Initialize D&D 5e SRD Index
        this.dndIndex = {
            entries: [
                // Core Rules
                {
                    title: "Ability Scores",
                    category: "Core Rules",
                    content: "The six ability scores are Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma. Modifiers range from -5 (score 1) to +10 (score 30). Standard array: 15, 14, 13, 12, 10, 8.",
                    keywords: ["ability", "scores", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "modifiers"]
                },
                {
                    title: "Advantage and Disadvantage",
                    category: "Core Rules",
                    content: "Roll 2d20 and take the higher (advantage) or lower (disadvantage) result. Multiple instances don't stack. If you have both, they cancel out.",
                    keywords: ["advantage", "disadvantage", "roll", "2d20", "mechanics"]
                },
                {
                    title: "Proficiency Bonus",
                    category: "Core Rules",
                    content: "Starts at +2 at level 1. Increases: +3 (level 5), +4 (level 9), +5 (level 13), +6 (level 17). Applied to attack rolls, ability checks, and saving throws you're proficient in.",
                    keywords: ["proficiency", "bonus", "level", "progression"]
                },
                {
                    title: "Actions in Combat",
                    category: "Combat",
                    content: "Attack, Cast a Spell, Dash (double movement), Dodge (attacks have disadvantage), Help (give ally advantage), Hide, Ready (prepare action), Search, Use an Object.",
                    keywords: ["actions", "combat", "attack", "dash", "dodge", "help", "hide", "ready", "search"]
                },
                {
                    title: "Conditions",
                    category: "Core Rules",
                    content: "Blinded, Charmed, Deafened, Exhaustion (6 levels), Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious.",
                    keywords: ["conditions", "status", "effects", "blinded", "charmed", "frightened", "paralyzed", "stunned"]
                },
                
                // Common Spells
                {
                    title: "Fireball",
                    category: "Spell",
                    content: "3rd level evocation. Range: 150 feet. 20-foot radius sphere. 8d6 fire damage, Dexterity save for half. Damage increases by 1d6 per slot above 3rd.",
                    keywords: ["fireball", "spell", "evocation", "3rd", "level", "fire", "damage", "area", "aoe"]
                },
                {
                    title: "Cure Wounds",
                    category: "Spell",
                    content: "1st level evocation. Touch range. Restore 1d8 + spellcasting modifier hit points. No effect on undead or constructs. +1d8 per slot above 1st.",
                    keywords: ["cure", "wounds", "healing", "spell", "evocation", "1st", "level", "touch"]
                },
                {
                    title: "Mage Armor",
                    category: "Spell",
                    content: "1st level abjuration. Touch range. 8 hours duration. AC becomes 13 + Dex modifier if not wearing armor. Ends if target dons armor.",
                    keywords: ["mage", "armor", "spell", "abjuration", "1st", "level", "ac", "defense"]
                },
                {
                    title: "Shield",
                    category: "Spell",
                    content: "1st level abjuration. Reaction spell. +5 bonus to AC until start of next turn, including against triggering attack. No damage from magic missile.",
                    keywords: ["shield", "spell", "abjuration", "1st", "level", "reaction", "ac", "defense"]
                },
                {
                    title: "Counterspell",
                    category: "Spell",
                    content: "3rd level abjuration. Reaction when creature within 60 feet casts a spell. Automatically stops spells 3rd level or lower. Higher requires ability check DC 10 + spell level.",
                    keywords: ["counterspell", "spell", "abjuration", "3rd", "level", "reaction", "counter"]
                },
                
                // Common Monsters
                {
                    title: "Goblin",
                    category: "Monster",
                    content: "Small humanoid. AC 15, HP 7 (2d6). Speed 30 ft. Nimble Escape: Disengage or Hide as bonus action. Scimitar +4 (1d6+2). Shortbow +4 (1d6+2).",
                    keywords: ["goblin", "monster", "humanoid", "small", "cr", "nimble", "escape"]
                },
                {
                    title: "Orc",
                    category: "Monster",
                    content: "Medium humanoid. AC 13, HP 15 (2d8+6). Speed 30 ft. Aggressive: Bonus action move toward hostile. Greataxe +5 (1d12+3). Javelin +5 (1d6+3).",
                    keywords: ["orc", "monster", "humanoid", "medium", "aggressive", "cr"]
                },
                {
                    title: "Dragon (Young Red)",
                    category: "Monster",
                    content: "Large dragon. AC 18, HP 178 (17d10+85). Fire breath (DC 17, 16d6). Bite +10 (2d10+6 plus 1d6 fire). Frightful Presence DC 16.",
                    keywords: ["dragon", "red", "young", "monster", "large", "fire", "breath", "legendary"]
                },
                {
                    title: "Zombie",
                    category: "Monster",
                    content: "Medium undead. AC 8, HP 22 (3d8+9). Speed 20 ft. Undead Fortitude: Con save to drop to 1 HP instead of 0. Slam +3 (1d6+1).",
                    keywords: ["zombie", "undead", "monster", "medium", "fortitude", "cr"]
                },
                {
                    title: "Skeleton",
                    category: "Monster",
                    content: "Medium undead. AC 13, HP 13 (2d8+4). Vulnerable to bludgeoning. Immune to poison. Shortsword +4 (1d6+2). Shortbow +4 (1d6+2).",
                    keywords: ["skeleton", "undead", "monster", "medium", "vulnerable", "immune", "cr"]
                },
                
                // Magic Items
                {
                    title: "Healing Potion",
                    category: "Magic Item",
                    content: "Potion of Healing restores 2d4+2 hit points. Greater: 4d4+4. Superior: 8d4+8. Supreme: 10d4+20. Action to drink, bonus action to administer.",
                    keywords: ["healing", "potion", "magic", "item", "restore", "hp", "consumable"]
                },
                {
                    title: "Bag of Holding",
                    category: "Magic Item",
                    content: "Holds 500 pounds, up to 64 cubic feet. Weighs 15 pounds. Ruptures if pierced or overloaded. Extradimensional space. Breathing creature suffocates in 10 minutes.",
                    keywords: ["bag", "holding", "magic", "item", "storage", "extradimensional", "space"]
                },
                {
                    title: "+1 Weapon",
                    category: "Magic Item",
                    content: "Uncommon magic weapon. +1 bonus to attack and damage rolls. Overcomes resistance to nonmagical attacks. Can be any weapon type.",
                    keywords: ["+1", "weapon", "magic", "item", "bonus", "attack", "damage", "enchantment"]
                },
                
                // Character Creation
                {
                    title: "Races Overview",
                    category: "Character Creation",
                    content: "Human (+1 all), Elf (+2 Dex), Dwarf (+2 Con), Halfling (+2 Dex), Dragonborn (+2 Str, +1 Cha), Gnome (+2 Int), Half-Elf (+2 Cha, +1 two others), Half-Orc (+2 Str, +1 Con), Tiefling (+2 Cha, +1 Int).",
                    keywords: ["races", "human", "elf", "dwarf", "halfling", "dragonborn", "gnome", "tiefling", "creation"]
                },
                {
                    title: "Classes Overview",
                    category: "Character Creation",
                    content: "Barbarian (d12 HP), Bard (d8), Cleric (d8), Druid (d8), Fighter (d10), Monk (d8), Paladin (d10), Ranger (d10), Rogue (d8), Sorcerer (d6), Warlock (d8), Wizard (d6).",
                    keywords: ["classes", "barbarian", "bard", "cleric", "druid", "fighter", "monk", "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard"]
                },
                {
                    title: "Ability Score Generation",
                    category: "Character Creation",
                    content: "Standard Array: 15, 14, 13, 12, 10, 8. Point Buy: 27 points, all scores start at 8. Rolling: 4d6 drop lowest, six times. Assign as desired.",
                    keywords: ["ability", "score", "generation", "array", "point", "buy", "rolling", "creation"]
                }
            ]
        };
        
        // Initialize KoboldCpp/Lite Knowledge Base Index
        this.kbaseIndex = {
            entries: [
                // KoboldCpp Basics
                {
                    title: "Starting KoboldCpp",
                    category: "Getting Started",
                    content: "Run koboldcpp.exe or use command line. Basic usage: koboldcpp --model [modelfile.gguf] --contextsize 4096 --gpulayers 20. Use --help for all options.",
                    keywords: ["start", "koboldcpp", "run", "launch", "command", "line", "basic"]
                },
                {
                    title: "Model Loading",
                    category: "Models",
                    content: "Supports GGUF format (recommended), legacy GGML. Use --model flag. GPU acceleration with --gpulayers. Split large models with --tensor_split. Quantization affects quality/speed.",
                    keywords: ["model", "loading", "gguf", "ggml", "gpu", "layers", "quantization", "tensor", "split"]
                },
                {
                    title: "Context Size",
                    category: "Settings",
                    content: "Set with --contextsize or -c. Default 2048. Higher = more memory usage but longer conversations. Common values: 2048, 4096, 8192, 16384. Match model training.",
                    keywords: ["context", "size", "memory", "contextsize", "length", "conversation"]
                },
                {
                    title: "GPU Acceleration",
                    category: "Performance",
                    content: "--gpulayers N offloads N layers to GPU. Use --usecublas for NVIDIA, --useclblast for AMD/Intel. Check VRAM usage. Partial offloading supported.",
                    keywords: ["gpu", "acceleration", "gpulayers", "cublas", "clblast", "vram", "nvidia", "amd"]
                },
                
                // Sampling Parameters
                {
                    title: "Temperature",
                    category: "Sampling",
                    content: "Controls randomness. 0.1 = very deterministic, 2.0 = very random. Default 0.7. For RP: 0.8-1.2. For coherent: 0.3-0.7. Affects creativity vs consistency.",
                    keywords: ["temperature", "sampling", "randomness", "creativity", "deterministic", "parameter"]
                },
                {
                    title: "Top-P (Nucleus Sampling)",
                    category: "Sampling", 
                    content: "Cumulative probability cutoff. 0.9 = top 90% probable tokens. Lower = more focused. Works with temperature. Common: 0.9-0.95. Set to 1.0 to disable.",
                    keywords: ["top-p", "top_p", "nucleus", "sampling", "probability", "cutoff", "parameter"]
                },
                {
                    title: "Top-K",
                    category: "Sampling",
                    content: "Limits token choices to K most likely. 40 = consider top 40 tokens. Lower = more predictable. 0 = disabled. Often combined with Top-P.",
                    keywords: ["top-k", "top_k", "sampling", "tokens", "choices", "limit", "parameter"]
                },
                {
                    title: "Repetition Penalty",
                    category: "Sampling",
                    content: "Reduces repetition. 1.0 = no penalty. 1.1-1.3 common. Too high causes incoherence. Repetition penalty range sets how far back to check.",
                    keywords: ["repetition", "penalty", "repeat", "sampling", "range", "parameter"]
                },
                {
                    title: "Mirostat",
                    category: "Sampling",
                    content: "Alternative sampling for consistent quality. Mirostat 2 recommended. Set tau (target entropy). Replaces temperature/top-k/top-p when enabled.",
                    keywords: ["mirostat", "sampling", "tau", "entropy", "alternative", "parameter"]
                },
                
                // Lite Interface
                {
                    title: "Lite UI Overview",
                    category: "Interface",
                    content: "Minimal web interface. Access via browser at localhost:5001. Mobile friendly. Features: chat, settings, model info. Use lite.html for classic version.",
                    keywords: ["lite", "ui", "interface", "web", "browser", "localhost", "mobile"]
                },
                {
                    title: "Memory and Author's Note",
                    category: "Features",
                    content: "Memory: Persistent info at context start. Author's Note: Injected at specified depth. Use for character traits, world state, style guidance. Token budget aware.",
                    keywords: ["memory", "author", "note", "authors", "persistent", "injection", "depth"]
                },
                {
                    title: "World Info",
                    category: "Features",
                    content: "Triggered by keywords. Each entry has keys, content, and settings. Scan depth determines how far to search. Selective activation saves tokens. Import/export JSON.",
                    keywords: ["world", "info", "wi", "entries", "keywords", "triggers", "selective", "scan"]
                },
                {
                    title: "Instruct Mode",
                    category: "Features",
                    content: "For instruction-tuned models. Configure template, system prompt, sequences. Common formats: Alpaca, Vicuna, ChatML. Enable for better instruction following.",
                    keywords: ["instruct", "mode", "instruction", "template", "system", "prompt", "format"]
                },
                {
                    title: "Adventure Mode",
                    category: "Features",
                    content: "Second-person narration for text adventures. You do/say format. Automatic formatting. Good for dungeon crawls, interactive fiction. Toggle in settings.",
                    keywords: ["adventure", "mode", "second", "person", "narration", "text", "interactive"]
                },
                
                // Advanced Features
                {
                    title: "Smart Context",
                    category: "Advanced",
                    content: "Automatically manages context to fit limits. Trims oldest messages while preserving recent context, memory, world info. Configure retention settings.",
                    keywords: ["smart", "context", "management", "trim", "retention", "automatic"]
                },
                {
                    title: "Token Streaming",
                    category: "Advanced",
                    content: "See tokens as generated. Enable with --stream. Reduces perceived latency. May affect performance slightly. Works with all frontends.",
                    keywords: ["token", "streaming", "stream", "real-time", "generation", "latency"]
                },
                {
                    title: "API Endpoints",
                    category: "API",
                    content: "/api/v1/generate - Main generation. /api/v1/model - Model info. /api/extra/tokencount - Count tokens. Compatible with various frontends.",
                    keywords: ["api", "endpoints", "generate", "model", "tokencount", "rest", "http"]
                },
                {
                    title: "Multi-user Mode",
                    category: "Advanced",
                    content: "Enable with --multiuser. Separate sessions per user. Good for shared instances. Each user has own context. Password protection available.",
                    keywords: ["multiuser", "multi-user", "shared", "sessions", "password", "instance"]
                },
                
                // Troubleshooting
                {
                    title: "Out of Memory",
                    category: "Troubleshooting",
                    content: "Reduce context size, lower GPU layers, use smaller model, enable 8-bit cache. Check VRAM with nvidia-smi or GPU-Z. Consider quantized models.",
                    keywords: ["memory", "oom", "vram", "error", "troubleshoot", "gpu", "ram"]
                },
                {
                    title: "Slow Generation",
                    category: "Troubleshooting",
                    content: "Increase GPU layers, reduce context size, disable smart context, use faster sampler settings. Check CPU/GPU usage. Consider smaller model.",
                    keywords: ["slow", "performance", "speed", "generation", "optimize", "troubleshoot"]
                },
                {
                    title: "Connection Issues",
                    category: "Troubleshooting",
                    content: "Check firewall, use --host 0.0.0.0 for network access, verify port not in use. Default port 5001. Use --port to change. Check localhost vs IP.",
                    keywords: ["connection", "network", "firewall", "port", "host", "access", "troubleshoot"]
                },
                
                // RPMod Specific
                {
                    title: "RPMod Overview",
                    category: "RPMod",
                    content: "Enhanced Lite UI for roleplay. Features: character cards, group chat, dice rolling, persistent memory, world info integration. Optimized for narrative gameplay.",
                    keywords: ["rpmod", "roleplay", "mod", "enhanced", "features", "overview"]
                },
                {
                    title: "Character Cards",
                    category: "RPMod",
                    content: "Import PNG cards with embedded JSON. Supports name, description, personality, scenario, examples. Drag & drop or use import button. Compatible with various formats.",
                    keywords: ["character", "cards", "png", "import", "json", "embedded", "rpmod"]
                },
                {
                    title: "Group Chat",
                    category: "RPMod",
                    content: "Multiple characters in one conversation. Set active character, manage turn order. Each character maintains personality. Good for party dynamics.",
                    keywords: ["group", "chat", "multiple", "characters", "party", "rpmod"]
                },
                {
                    title: "Dice Integration",
                    category: "RPMod",
                    content: "Type dice notation in chat. Supports complex rolls: 1d20+5, 3d6, 2d10+1d4. Results shown inline. Can trigger on keywords for automatic rolls.",
                    keywords: ["dice", "rolling", "d20", "notation", "tabletop", "rpg", "rpmod"]
                }
            ]
        };
    },

    initializeSearch() {
        // D&D Search
        const dndInput = document.getElementById('dnd-search-input');
        const dndResults = document.getElementById('dnd-search-results');
        
        if (dndInput) {
            dndInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                if (e.target.value.length > 2) {
                    this.searchTimeout = setTimeout(() => {
                        this.performSearch(e.target.value, 'dnd', dndResults);
                    }, 300);
                } else {
                    dndResults.style.display = 'none';
                }
            });
            
            dndInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value, 'dnd', dndResults);
                }
            });
        }
        
        // Knowledge Base Search
        const kbaseInput = document.getElementById('kbase-search-input');
        const kbaseResults = document.getElementById('kbase-search-results');
        
        if (kbaseInput) {
            kbaseInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                if (e.target.value.length > 2) {
                    this.searchTimeout = setTimeout(() => {
                        this.performSearch(e.target.value, 'kbase', kbaseResults);
                    }, 300);
                } else {
                    kbaseResults.style.display = 'none';
                }
            });
            
            kbaseInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value, 'kbase', kbaseResults);
                }
            });
        }
    },

    showEntryModal(title, content, category) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('klite-rpmod-help-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'klite-rpmod-help-modal';
            modal.className = 'klite-rpmod-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            `;
            
            modal.innerHTML = `
                <div class="klite-rpmod-modal-content" style="
                    background: #2a2a2a;
                    border: 1px solid #555;
                    border-radius: 8px;
                    padding: 20px;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    margin: 20px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div>
                            <h3 id="klite-rpmod-help-modal-title" style="margin: 0; color: #fff; font-size: 18px;"></h3>
                            <div id="klite-rpmod-help-modal-category" style="color: #4a90e2; font-size: 12px; margin-top: 4px;"></div>
                        </div>
                        <button class="klite-rpmod-button" onclick="this.closest('.klite-rpmod-modal').style.opacity='0'; this.closest('.klite-rpmod-modal').style.visibility='hidden';" style="
                            background: #666;
                            border: none;
                            color: #fff;
                            width: 30px;
                            height: 30px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 16px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-left: 15px;
                        ">×</button>
                    </div>
                    <div id="klite-rpmod-help-modal-content" style="color: #e0e0e0; line-height: 1.6; font-size: 14px;"></div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.opacity = '0';
                    modal.style.visibility = 'hidden';
                }
            });
            
            // Close modal with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.style.visibility === 'visible') {
                    modal.style.opacity = '0';
                    modal.style.visibility = 'hidden';
                }
            });
        }
        
        // Update content
        document.getElementById('klite-rpmod-help-modal-title').textContent = title;
        document.getElementById('klite-rpmod-help-modal-category').textContent = category;
        document.getElementById('klite-rpmod-help-modal-content').innerHTML = content;
        
        // Show modal
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
    },

    performSearch(query, indexType, resultsContainer) {
        if (!query.trim()) return;
        
        const index = indexType === 'dnd' ? this.dndIndex : this.kbaseIndex;
        const results = this.searchIndex(query.toLowerCase(), index);
        this.displayResults(results, query, resultsContainer);
    },

    searchIndex(query, index) {
        const results = [];
        const queryWords = query.split(/\s+/);

        index.entries.forEach(entry => {
            let score = 0;
            
            // Title match (highest priority)
            if (entry.title.toLowerCase().includes(query)) {
                score += 10;
            }
            
            // Category match
            if (entry.category.toLowerCase().includes(query)) {
                score += 5;
            }
            
            // Content match
            if (entry.content.toLowerCase().includes(query)) {
                score += 3;
            }
            
            // Keyword matches
            queryWords.forEach(word => {
                if (entry.keywords.some(keyword => keyword.includes(word))) {
                    score += 2;
                }
            });

            if (score > 0) {
                results.push({ ...entry, score });
            }
        });

        // Sort by score and limit results
        return results.sort((a, b) => b.score - a.score).slice(0, 15);
    },

    displayResults(results, query, container) {
        if (!container) return;
        
        if (results.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; opacity: 0.7;">
                    No results found for "${this.escapeHtml(query)}"
                </div>
            `;
        } else {
            // Group results by category
            const grouped = {};
            results.forEach(result => {
                if (!grouped[result.category]) {
                    grouped[result.category] = [];
                }
                grouped[result.category].push(result);
            });
            
            let html = '';
            Object.entries(grouped).forEach(([category, items]) => {
                html += `<div style="margin-bottom: 15px;">
                    <div style="color: #4a90e2; font-size: 11px; text-transform: uppercase; margin-bottom: 5px;">${category}</div>`;
                
                items.forEach((result, idx) => {
                    html += `
                        <div class="search-result-item" data-title="${this.escapeHtml(result.title)}" data-content="${this.escapeHtml(result.content)}" data-category="${this.escapeHtml(result.category)}" style="margin-bottom: 10px; padding: 8px; background: #1a1a1a; border-radius: 4px; cursor: pointer; transition: background 0.2s;" 
                             onmouseover="this.style.background='#252525'" 
                             onmouseout="this.style.background='#1a1a1a'">
                            <h4 style="margin: 0 0 5px 0; color: #fff; font-size: 13px;">
                                ${this.highlightQuery(this.escapeHtml(result.title), query)}
                            </h4>
                            <p style="margin: 0; color: #ccc; font-size: 12px; line-height: 1.4;">
                                ${this.highlightQuery(this.truncateContent(this.escapeHtml(result.content)), query)}
                            </p>
                        </div>
                    `;
                });
                
                html += '</div>';
            });
            
            container.innerHTML = html;
            
            // Add click handlers to search results
            const resultItems = container.querySelectorAll('.search-result-item');
            resultItems.forEach(item => {
                item.addEventListener('click', () => {
                    const title = item.getAttribute('data-title');
                    const content = item.getAttribute('data-content');
                    const category = item.getAttribute('data-category');
                    this.showEntryModal(title, content, category);
                });
            });
        }
        
        container.style.display = 'block';
    },

    highlightQuery(text, query) {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return text.replace(regex, '<mark style="background: #4a90e2; color: #fff; padding: 0 2px; border-radius: 2px;">$1</mark>');
    },

    truncateContent(content, maxLength = 120) {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    addLinkHoverEffects() {
        const links = document.querySelectorAll('.klite-rpmod-panel-content a');
        links.forEach(link => {
            link.addEventListener('mouseenter', () => {
                link.style.textDecoration = 'underline';
            });
            link.addEventListener('mouseleave', () => {
                link.style.textDecoration = 'none';
            });
        });
    }
};