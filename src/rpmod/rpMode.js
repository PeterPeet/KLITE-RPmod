// =============================================================================
// KLITE RPmod — RP mode formatting and chat helpers added to KLITE_RPMod (onRPModeEnter/Exit, formatRPContent, avatars).
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================

export function installRpMode(S) {

    // =============================================
    // RP MODE FORMATTING SYSTEM
    // =============================================

    KLITE_RPMod.onRPModeEnter = function () {
        this.log('rp', 'Entering RP mode - applying roleplay formatting');
        this.updateRPStyle();
        setTimeout(() => {
            this.formatRPContent();
        }, 200);
    };

    KLITE_RPMod.onRPModeExit = function () {
        this.log('rp', 'Exiting RP mode - removing roleplay formatting');

        // Remove RP formatting
        const gametext = document.getElementById('gametext');
        if (!gametext) return;

        // Remove all RP classes and containers
        const chunks = Array.from(gametext.children);
        chunks.forEach(chunk => {
            if (chunk.classList.contains('rp-message-container')) {
                // Extract original content from container and restore it
                const messageElement = chunk.querySelector('.rp-message-content');
                if (messageElement) {
                    messageElement.classList.remove('rp-message-content', 'rp-user-message', 'rp-ai-message');
                    messageElement.style.animation = '';
                    // Replace container with original message element
                    chunk.parentNode.insertBefore(messageElement, chunk);
                }
                chunk.remove();
            } else {
                // Old format cleanup
                chunk.classList.remove('rp-message-container', 'rp-message-content', 'rp-user-message', 'rp-ai-message');
                chunk.style.animation = '';
            }
        });

        // Remove RP CSS
        const rpStyle = document.getElementById('rp-style-css');
        if (rpStyle) rpStyle.remove();
    };

    KLITE_RPMod.updateRPStyle = function () {
        // Add RP styles to the page
        const existingStyle = document.getElementById('rp-style-css');
        if (existingStyle) existingStyle.remove();

        const rpStyles = `
            <style id="rp-style-css">
                /* RP Mode Styling - Discord/Forum Style */
                
                /* RP Message Container */
                .rp-message-container {
                    display: flex;
                    align-items: flex-start;
                    margin-bottom: 12px;
                    padding: 12px;
                    border-radius: 8px;
                    background: var(--theme_color_bg_popups, #263040);
                    border: 1px solid var(--theme_color_border, #415577);
                    gap: 12px;
                    transition: background-color 0.2s ease;
                }
                
                .rp-message-container:hover {
                    background: var(--theme_color_bg_muted, #484d56);
                }
                
                /* RP Avatar */
                .rp-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 2px solid var(--theme_color_border, #415577);
                    object-fit: cover;
                    flex-shrink: 0;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                
                .rp-avatar.user-avatar {
                    border-color: var(--theme_color_accent_bg_highlight, #596985);
                }
                
                .rp-avatar.ai-avatar {
                    border-color: var(--theme_color_rpmod_success, #5cb85c);
                }
                
                /* RP Message Content Area */
                .rp-message-content-area {
                    flex: 1;
                    min-width: 0;
                }
                
                /* RP Message Header */
                .rp-message-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 6px;
                }
                
                .rp-speaker-name {
                    font-weight: bold;
                    font-size: 14px;
                    color: var(--theme_color_fg, #d1d1d1);
                }
                
                .rp-speaker-name.user-speaker {
                    color: var(--theme_color_accent_bg_highlight, #596985);
                }
                
                .rp-speaker-name.ai-speaker {
                    color: var(--theme_color_rpmod_success, #5cb85c);
                }
                
                .rp-message-timestamp {
                    font-size: 11px;
                    color: var(--theme_color_fg_muted, #9b9b9b);
                    margin-left: auto;
                }
                
                .rp-character-badge {
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 12px;
                    background: var(--theme_color_bg_muted, #484d56);
                    color: var(--theme_color_fg_muted, #9b9b9b);
                    border: 1px solid var(--theme_color_border, #415577);
                }
                
                /* RP Message Content */
                .rp-message-content {
                    font-size: 14px;
                    line-height: 1.5;
                    color: var(--theme_color_fg, #d1d1d1);
                    word-wrap: break-word;
                    margin: 0;
                    padding: 0;
                }
                
                .rp-message-content.rp-user-message {
                    font-style: italic;
                }
                
                /* Special styling for actions (text in asterisks) */
                .rp-message-content em,
                .rp-message-content i {
                    color: var(--theme_color_fg_muted, #9b9b9b);
                    font-style: italic;
                }
                
                /* Animation for new messages */
                @keyframes rpMessageSlideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                .rp-message-container {
                    animation: rpMessageSlideIn 0.3s ease-out;
                }
                
                /* Dark mode adjustments */
                .klite-active .rp-message-container {
                    background: var(--theme_color_bg_popups, #263040);
                    border-color: var(--theme_color_border, #415577);
                }
                
                .klite-active .rp-message-container:hover {
                    background: var(--theme_color_bg_muted, #484d56);
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', rpStyles);
    };

    KLITE_RPMod.formatRPContent = function () {
        // Only format content when in RP mode (mode 4)
        if (window.localsettings?.opmode !== 4) return;

        const gametext = document.getElementById('gametext');
        if (!gametext) return;

        // Get all text chunks in the game text
        const chunks = Array.from(gametext.children);

        chunks.forEach(chunk => {
            // Skip if already formatted (has container or is a container)
            if (chunk.classList.contains('rp-message-container') ||
                chunk.classList.contains('rp-message-content') ||
                chunk.closest('.rp-message-container')) return;

            const content = chunk.textContent.trim();
            if (!content) return;

            // Enhanced user message detection for RP mode
            const isUserMessage =
                // KoboldAI Lite native detection
                chunk.classList.contains('usermessage') ||
                chunk.id === 'usermessage' ||
                chunk.getAttribute('data-source') === 'user' ||

                // RP mode patterns
                content.startsWith('You ') ||
                content.startsWith('You:') ||
                content.match(/^[A-Z][a-z]+\s*:/) ||
                content.match(/^\*[A-Z][a-z]+/) ||
                content.match(/^".*"$/) ||

                // User input detection
                content.match(/^\[[Yy]ou\]/) ||
                content.match(/^\[[Uu]ser\]/) ||
                content.match(/^\[[Pp]layer\]/) ||

                // Input field detection
                (chunk.style && chunk.style.textAlign === 'right') ||
                chunk.classList.contains('user-input');

            // Get appropriate avatar and character info
            const avatarInfo = this.getRPMessageInfo(isUserMessage, content);

            // Create container div
            const container = document.createElement('div');
            container.className = 'rp-message-container';

            // Create avatar element
            const avatar = document.createElement('img');
            avatar.className = `rp-avatar ${isUserMessage ? 'user-avatar' : 'ai-avatar'}`;
            avatar.src = avatarInfo.avatar;
            avatar.alt = avatarInfo.name;
            avatar.title = avatarInfo.name;

            // Create content area
            const contentArea = document.createElement('div');
            contentArea.className = 'rp-message-content-area';

            // Create message header
            const header = document.createElement('div');
            header.className = 'rp-message-header';

            const speakerName = document.createElement('span');
            speakerName.className = `rp-speaker-name ${isUserMessage ? 'user-speaker' : 'ai-speaker'}`;
            speakerName.textContent = avatarInfo.name;
            header.appendChild(speakerName);

            // Add character badge if it's a character (not default)
            if (avatarInfo.isCharacter) {
                const badge = document.createElement('span');
                badge.className = 'rp-character-badge';
                badge.textContent = 'Character';
                header.appendChild(badge);
            }

            // Add timestamp
            const timestamp = document.createElement('span');
            timestamp.className = 'rp-message-timestamp';
            timestamp.textContent = new Date().toLocaleTimeString();
            header.appendChild(timestamp);

            contentArea.appendChild(header);

            // Clone the original chunk to preserve its content and styling
            const messageElement = chunk.cloneNode(true);

            // Remove any existing formatting from the cloned element
            messageElement.classList.remove('rp-message-container', 'rp-message-content', 'rp-user-message', 'rp-ai-message');

            // Add new formatting to the message element
            messageElement.className = 'rp-message-content';
            if (isUserMessage) {
                messageElement.classList.add('rp-user-message');
            } else {
                messageElement.classList.add('rp-ai-message');
            }

            contentArea.appendChild(messageElement);

            // Assemble the container
            container.appendChild(avatar);
            container.appendChild(contentArea);

            // Replace original chunk with container
            chunk.parentNode.insertBefore(container, chunk);
            chunk.remove();

            // Debug log
            this.log('rp', `Formatted RP message: ${isUserMessage ? 'USER' : 'AI'} (${avatarInfo.name}) - "${content.substring(0, 50)}..."`);
        });
    };

    KLITE_RPMod.getRPMessageInfo = function (isUserMessage, content) {
        if (isUserMessage) {
            // User message - get persona info or use default
            const personaName = this.panels.TOOLS?.selectedPersona?.name || 'You';
            const personaAvatar = this.userAvatarCurrent || this.userAvatarDefault;
            const isCharacter = this.panels.TOOLS?.selectedPersona ? true : false;

            return {
                name: personaName,
                avatar: personaAvatar,
                isCharacter: isCharacter
            };
        } else {
            // AI message - resolve speaker without parsing text
            const isGroupChatActive = this.panels.ROLES?.enabled || false;

            if (isGroupChatActive && this.panels.ROLES?.activeChars) {
                // Prefer explicit pending speaker set when triggering generation
                // Fallback to current speaker tracked by ROLES panel
                const currentSpeaker = this.panels.ROLES.getCurrentSpeaker?.();
                if (currentSpeaker) {
                    return {
                        name: currentSpeaker.name,
                        avatar: currentSpeaker.avatar || currentSpeaker.image || this.aiAvatarCurrent || this.aiAvatarDefault,
                        isCharacter: true
                    };
                }
            }

            // Single-chat or unknown: use selected character if available, else default AI
            const characterName = this.panels.TOOLS?.selectedCharacter?.name || 'AI Assistant';
            const characterAvatar =
                this.panels.TOOLS?.selectedCharacter?.avatar ||
                this.panels.TOOLS?.selectedCharacter?.image ||
                this.aiAvatarCurrent || this.aiAvatarDefault;
            const isCharacter = !!this.panels.TOOLS?.selectedCharacter;

            return { name: characterName, avatar: characterAvatar, isCharacter };
        }
    };

    // Unified submit helper: trigger host chat submission
    KLITE_RPMod.submit = function() {
        try {
            if (typeof window.chat_submit_generation === 'function') return window.chat_submit_generation();
            if (typeof window.submit_generation_button === 'function') return window.submit_generation_button(true);
        } catch(_) {}
        // Fallback: try clicking send button
        try { document.getElementById('chat_msg_send_btn')?.click(); } catch(_) {}
    };

    // Return the primary scroll container for chat/story content in Esolite
    KLITE_RPMod.getChatScrollContainer = function() {
        try {
            const gamescreen = document.getElementById('gamescreen');
            if (gamescreen) return gamescreen;
            const content = document.getElementById('gametext');
            let el = content ? content.parentElement : null;
            while (el && el !== document.body) {
                const style = window.getComputedStyle(el);
                const oy = style.overflowY;
                if (oy === 'auto' || oy === 'scroll') return el;
                el = el.parentElement;
            }
        } catch(_) {}
        return null;
    };

    // Ensure KLITE_RPMod.characters is in sync with Esolite before opening selection UIs
    KLITE_RPMod.ensureCharactersLoaded = async function() {
        try {
            if (KLITE_RPMod.panels?.CHARS?.rebuildFromEsolite) {
                await KLITE_RPMod.panels.CHARS.rebuildFromEsolite();
            }
        } catch(_) {}
        return Array.isArray(KLITE_RPMod.characters) ? KLITE_RPMod.characters.length : 0;
    };

    // Choose the best available avatar/thumbnail for a character
    KLITE_RPMod.getBestCharacterAvatar = function(character) {
        try {
            if (!character) return null;
            // Prefer cached optimized avatars if available
            if (character.id && KLITE_RPMod.panels?.CHARS?.getOptimizedAvatar) {
                const av = KLITE_RPMod.panels.CHARS.getOptimizedAvatar(character.id, 'avatar');
                if (av) return av;
                const thumb = KLITE_RPMod.panels.CHARS.getOptimizedAvatar(character.id, 'thumbnail');
                if (thumb) return thumb;
            }
            // Fallback: find by name in current character list for thumbnail
            try {
                if (KLITE_RPMod.characters && character.name) {
                    const found = KLITE_RPMod.characters.find(c => (c.name||'') === character.name);
                    if (found) return found.thumbnail || found.image || null;
                }
            } catch(_) {}
            // Fallbacks from character object
            return character.thumbnail || character.avatar || character.image || null;
        } catch(_) { return null; }
    };

    // Update AI avatar in Esolite aesthetic settings
    KLITE_RPMod.updateAIAvatar = function(urlOrNull) {
        try {
            window.aestheticInstructUISettings = window.aestheticInstructUISettings || {};
            if (urlOrNull) {
                window.aestheticInstructUISettings.AI_portrait = urlOrNull;
            } else {
                window.aestheticInstructUISettings.AI_portrait = 'default';
            }
            try { if (typeof window.updateUIFromData === 'function') window.updateUIFromData(); } catch(_) {}
        } catch(_) {}
    };

}
