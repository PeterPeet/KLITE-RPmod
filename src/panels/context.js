// =============================================================================
// KLITE RPmod — Context panel (KLITE_RPMod.panels.CONTEXT): context analyzer, memory tools, auto-regenerate.
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================

export function installContextPanel(S) {
    const { t, LiteAPI } = S;
    // CONTEXT PANEL (formerly TOOLS)
KLITE_RPMod.panels.CONTEXT = {
        // State
        analysisWindow: null,
        contextCache: null,
        lastRoll: null,
        saveTimer: null,
        autoRegenerateInterval: null,
        autoRegenerateState: {
            enabled: false,
            retryCount: 0,
            maxRetries: 3,
            lastMessageHash: '',
            keywords: [],
            keywordThreshold: 2,
            keywordCaseSensitive: false
        },

        render() {
            return `              
                
                <!-- Smart Memory Writer -->
                ${t.section('🧠 Smart Memory Writer',
                `<div class="rpm-note rpm-mb">
                        <strong>Warning:</strong> does not work if Agent Mode in Esolite is active.
                    </div>
                    <div class="rpm-row">
                        ${t.select('tools-memory-context', [
                    { value: 'entire', text: 'Entire Story' },
                    { value: 'last50', text: 'Last 50 Messages' },
                    { value: 'recent', text: 'Recent Messages (10)', selected: true },
                    { value: 'last3', text: 'Most Recent (3)' }
                ])}
                    </div>
                    <div class="rpm-row rpm-mt">
                        ${t.select('tools-memory-type', [
                    { value: 'summary', text: 'Summary', selected: true },
                    { value: 'keywords', text: 'Keywords' },
                    { value: 'outline', text: 'Outline' }
                ])}
                    </div>
                    <div class="rpm-center rpm-mt rpm-mb">
                        ${t.button('🧠 Generate Memory', '', 'generate-memory')}
                    </div>
                    ${t.textarea('tools-memory-output', 'Generated memory will appear here.')}
                    <div class="rpm-muted rpm-mt">
                        The quality of the generated output depends highly on the model and it's capability to understand OOC instructions.
                    </div>
                    <div class="rpm-fill rpm-mt">
                        ${t.button('✓ Apply', '', 'apply-memory')}
                        ${t.button('➕ Append', '', 'append-memory')}
                    </div>`
            )}
                <!-- Export Tools -->
                ${t.section('📤 Export Context History',
                `<div class="rpm-fill">
                        ${t.button('📝 Markdown', '', 'export-markdown')}
                        ${t.button('📊 JSON', '', 'export-json')}
                        ${t.button('🌐 HTML', '', 'export-html')}
                    </div>`
            )}
            `;
        },

        cleanup() {
            try {
                if (this.memoryGenerationState?.active) {
                    this.abortMemoryGeneration('panel_cleanup');
                }
            } catch(_) {}
        },

        init() {
            this.initializeAutoRegenerate();
        },

        actions: {
            'generate-memory': () => { KLITE_RPMod.panels.CONTEXT.generateMemory(); },
            'apply-memory': () => KLITE_RPMod.panels.CONTEXT.applyMemory(false),
            'append-memory': () => KLITE_RPMod.panels.CONTEXT.applyMemory(true),
            'export-markdown': () => KLITE_RPMod.panels.CONTEXT.exportAs('markdown'),
            'export-json': () => KLITE_RPMod.panels.CONTEXT.exportAs('json'),
            'export-html': () => KLITE_RPMod.panels.CONTEXT.exportAs('html'),
            'calculate-context': () => KLITE_RPMod.panels.CONTEXT.analyzeContext(),
        },

        analyzeContext() {
            KLITE_RPMod.log('panels', 'Analyzing context');

            const maxContext = window.localsettings?.max_context_length || 8192;
            const contextParts = this.buildContextParts();

            // Update token bar segments
            const total = contextParts.total;
            const freeTokens = Math.max(0, maxContext - total);
            const freePercent = Math.round((freeTokens / maxContext) * 100);

            const memoryBar = document.getElementById('tools-memory-bar');
            const wiBar = document.getElementById('tools-wi-bar');
            const storyBar = document.getElementById('tools-story-bar');
            const anoteBar = document.getElementById('tools-anote-bar');
            const freeBar = document.getElementById('tools-free-bar');

            if (memoryBar) memoryBar.style.width = `${(contextParts.memory.tokens / maxContext) * 100}%`;
            if (wiBar) wiBar.style.width = `${(contextParts.worldInfo.tokens / maxContext) * 100}%`;
            if (storyBar) storyBar.style.width = `${(contextParts.story.tokens / maxContext) * 100}%`;
            if (anoteBar) anoteBar.style.width = `${(contextParts.authorNote.tokens / maxContext) * 100}%`;
            if (freeBar) freeBar.style.width = `${(freeTokens / maxContext) * 100}%`;

            // Update legend values
            document.getElementById('tools-memory-tokens').textContent = contextParts.memory.tokens;
            document.getElementById('tools-wi-tokens').textContent = contextParts.worldInfo.tokens;
            document.getElementById('tools-story-tokens').textContent = contextParts.story.tokens;
            document.getElementById('tools-anote-tokens').textContent = contextParts.authorNote.tokens;

            // Update totals and free space
            document.getElementById('tools-total-context').textContent = total;
            document.getElementById('tools-max-context').textContent = maxContext;
            document.getElementById('tools-free-tokens').textContent = freeTokens;
            document.getElementById('tools-free-percent').textContent = freePercent;

            this.contextCache = contextParts;
        },

        buildContextParts() {
            const parts = {
                memory: { text: window.current_memory || '', tokens: 0 },
                worldInfo: { text: '', tokens: 0 },
                story: { text: '', tokens: 0 },
                authorNote: { text: window.current_anote || '', tokens: 0 },
                total: 0
            };

            // Calculate tokens using Lite's function if available, but exclude images
            const countTokens = window.count_tokens || (text => Math.ceil(text.length / 4));

            // Helper function to filter out image data from text before counting tokens
            const filterImages = (text) => {
                if (!text) return '';
                // Remove base64 image data (data:image/...)
                return text.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+\/=]+/g, '[IMAGE]');
            };

            parts.memory.tokens = countTokens(filterImages(parts.memory.text));
            parts.authorNote.tokens = countTokens(filterImages(parts.authorNote.text));

            // Minimum WI - only count constant (always-active) WI entries and filter out images
            if (window.current_wi) {
                const constantWI = current_wi.filter(wi => wi.content && !wi.widisabled && wi.constant);
                parts.worldInfo.text = constantWI.map(wi => wi.content).join('\n');
                parts.worldInfo.tokens = countTokens(filterImages(parts.worldInfo.text));
            }

            // Story - filter out images from story content
            if (window.gametext_arr) {
                const recentMessages = gametext_arr.slice(-50).filter(msg => msg);
                parts.story.text = recentMessages.join('\n');
                parts.story.tokens = countTokens(filterImages(parts.story.text));
            }

            parts.total = parts.memory.tokens + parts.worldInfo.tokens +
                parts.story.tokens + parts.authorNote.tokens;

            return parts;
        },

        generateMemory() {
            const contextSize = document.getElementById('tools-memory-context')?.value || 'recent';
            const outputType = document.getElementById('tools-memory-type')?.value || 'summary';
            const outputArea = document.getElementById('tools-memory-output');

            KLITE_RPMod.log('panels', `Generating memory: ${outputType} from ${contextSize}`);

            if (!outputArea || !window.gametext_arr) return;

            // Prevent multiple simultaneous generations
            if (this.memoryGenerationState?.active) {
                alert('Memory generation already in progress');
                return;
            }

            // Get context
            const messages = gametext_arr.filter(msg => msg && msg.trim());
            const numMessages = {
                'entire': messages.length,
                'last50': 50,
                'recent': 10,
                'last3': 3
            }[contextSize] || 10;

            const selectedMessages = messages.slice(-numMessages);
            const contextText = selectedMessages.join('\n\n');

            if (!contextText) {
                outputArea.value = 'No story content to analyze.';
                return;
            }

            // Build prompt based on type
            const prompts = {
                'summary': `[SYSTEM: Summarize the following story content into a concise memory. Include key characters, events, and important details. Format as a brief paragraph.]

Story content:
${contextText}

Memory summary:`,
                'keywords': `[SYSTEM: Extract the most important keywords, names, places, and concepts from the following story. List them in categories.]

Story content:
${contextText}

Keywords:`,
                'outline': `[SYSTEM: Create a bullet-point outline of the main events and key information from the following story.]

Story content:
${contextText}

Outline:`
            };

            // Save current state for restoration
            const currentState = {
                inputValue: document.getElementById('input_text')?.value || '',
                gameTextLength: window.gametext_arr?.length || 0,
                generating: KLITE_RPMod.state.generating
            };

            // Initialize memory generation state
            this.memoryGenerationState = {
                active: true,
                prompt: prompts[outputType],
                outputArea: outputArea,
                originalState: currentState,
                timeout: null,
                startTime: Date.now()
            };

            // Set up the smart memory generation with timeout
            this.startSmartMemoryGeneration();
        },

        startSmartMemoryGeneration() {
            const state = this.memoryGenerationState;
            if (!state || !state.active) return;

            // Show initial countdown
            state.outputArea.value = 'Aborting Memory Generation in 120s';
            // Smart memory generation started

            // Set up 120-second timeout
            state.timeout = setTimeout(() => {
                this.abortMemoryGeneration('timeout');
            }, 120000);

            // Set up countdown indicator
            state.progressInterval = setInterval(() => {
                if (!state.active) return;

                const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
                const remaining = Math.max(0, 120 - elapsed);
                state.outputArea.value = `Aborting Memory Generation in ${remaining}s`;
            }, 1000);

            // Hook into handle_incoming_text to intercept response before it reaches chat
            state.originalHandleIncoming = window.handle_incoming_text;
            window.handle_incoming_text = (text, worker, model) => {
                // If memory generation is active, intercept the response
                if (state.active) {
                    this.captureMemoryGeneration(text);
                    return; // Don't pass to original handler - prevents adding to chat
                }

                // Normal processing for non-memory generations
                if (state.originalHandleIncoming) {
                    return state.originalHandleIncoming(text, worker, model);
                }
            };

            // Hook error handling
            this.setupMemoryGenerationErrorHandling();

            // Submit the memory generation prompt
            const input = document.getElementById('input_text');
            if (input) {
                input.value = state.prompt;
                KLITE_RPMod.log('panels', 'Submitting memory generation prompt');

                if (window.submit_generation_button) {
                    window.submit_generation_button();
                }
            }
        },

        captureMemoryGeneration(responseText) {
            const state = this.memoryGenerationState;
            if (!state || !state.active) return;

            KLITE_RPMod.log('panels', 'Capturing memory generation response');

            if (responseText && responseText.trim()) {
                // Clean up the response - remove system prompts and format nicely
                let memoryContent = responseText.trim();

                // Remove common system/prompt artifacts
                memoryContent = memoryContent
                    .replace(/^\[SYSTEM:.*?\]/i, '')
                    .replace(/^(Memory summary:|Keywords:|Outline:)/i, '')
                    .replace(/^\*\*(Memory summary|Keywords|Outline):\*\*/i, '')
                    .trim();

                state.outputArea.value = memoryContent || responseText.trim();
                // Memory generation completed
            } else {
                state.outputArea.value = 'Memory generation failed - no response received';
                // Memory generation failed - no response received
            }

            // Clean up and restore state
            this.cleanupMemoryGeneration(true);
        },

        setupMemoryGenerationErrorHandling() {
            const state = this.memoryGenerationState;
            if (!state) return;

            // Monitor for common error conditions
            const checkForErrors = () => {
                if (!state.active) return;

                // Check for connection errors, API errors, etc.
                const connectStatus = document.getElementById('connectstatus');
                if (connectStatus && connectStatus.classList.contains('error')) {
                    state.lastError = 'Connection error';
                    this.abortMemoryGeneration('error');
                    return;
                }

                // Check for actual error messages (not just elements with error classes)
                const errorElements = document.querySelectorAll('.error:not(.klite-btn), .danger:not(.klite-btn)');
                if (errorElements.length > 0) {
                    const errorText = Array.from(errorElements)
                        .map(el => el.textContent?.trim())
                        .filter(text => text && text.length > 0 && !text.includes('Clear') && !text.includes('Delete'))
                        .join('; ');

                    if (errorText) {
                        state.lastError = errorText;
                        this.abortMemoryGeneration('error');
                        return;
                    }
                }
            };

            // Check for errors every 2 seconds
            state.errorCheckInterval = setInterval(checkForErrors, 2000);
        },

        abortMemoryGeneration(reason = 'manual') {
            const state = this.memoryGenerationState;
            if (!state || !state.active) return;

            KLITE_RPMod.log('panels', `Aborting memory generation: ${reason}`);

            // Abort any ongoing generation
            if (window.abort_generation) {
                window.abort_generation();
            }

            // Update output area
            if (reason === 'timeout') {
                state.outputArea.value = "Smart Memory couldn't be generated in 120s.";
                // Memory generation timed out
            } else if (reason === 'error') {
                state.outputArea.value = `Smart Memory Writer got the Error: ${state.lastError || 'Unknown error'}`;
                // Memory generation failed due to error
            } else if (reason === 'user_abort') {
                state.outputArea.value = 'Generation aborted by user.';
                // Memory generation aborted by user
            } else {
                state.outputArea.value = 'Memory generation cancelled';
                // Memory generation cancelled
            }

            // Clean up and restore state
            this.cleanupMemoryGeneration(false);
        },

        cleanupMemoryGeneration(success) {
            const state = this.memoryGenerationState;
            if (!state) return;

            // Clear timers
            if (state.timeout) {
                clearTimeout(state.timeout);
            }
            if (state.progressInterval) {
                clearInterval(state.progressInterval);
            }
            if (state.errorCheckInterval) {
                clearInterval(state.errorCheckInterval);
            }

            // Restore original hooks
            if (state.originalHandleIncoming) {
                window.handle_incoming_text = state.originalHandleIncoming;
            }
            if (state.originalRender) {
                window.render_gametext = state.originalRender;
            }

            // Remove memory generation from chat history if present
            const currentLength = window.gametext_arr?.length || 0;
            if (currentLength > state.originalState.gameTextLength) {
                // Remove the memory generation messages
                const toRemove = currentLength - state.originalState.gameTextLength;
                for (let i = 0; i < toRemove; i++) {
                    window.gametext_arr.pop();
                }

                // Re-render the gametext to reflect the removal
                if (state.originalRender) {
                    state.originalRender();
                }
            }

            // Restore input value
            const input = document.getElementById('input_text');
            if (input) {
                input.value = state.originalState.inputValue;
            }

            // Reset generation state
            this.memoryGenerationState = null;

            KLITE_RPMod.log('panels', `Memory generation cleanup completed (success: ${success})`);
        },

        applyMemory(append) {
            const outputArea = document.getElementById('tools-memory-output');
            const memory = outputArea?.value;

            if (!memory || !memory.trim() || memory.includes('Aborting Memory Generation') || memory.includes('Smart Memory couldn\'t be generated') || memory.includes('Smart Memory Writer got the Error')) {
                // No memory to apply
                return;
            }

            // If applying (not appending), ask for confirmation to overwrite existing memory
            if (!append && window.current_memory && window.current_memory.trim()) {
                const confirmed = confirm('Are you sure you want to overwrite MEMORY completely and remove everything that is already stored?');
                if (!confirmed) {
                    return;
                }
            }

            KLITE_RPMod.log('panels', `Applying memory (append: ${append})`);

            // Update memory textarea in Esolite and confirm
            const liteMemory = document.getElementById('memorytext');
            if (liteMemory) {
                const base = append ? (liteMemory.value || '') : '';
                liteMemory.value = append ? (base ? base + '\n\n' + memory : memory) : memory;
                try { liteMemory.dispatchEvent(new Event('input')); } catch(_) {}
                try { window.confirm_memory?.(); } catch(_) {}
            } else {
                // Fallback to LiteAPI memory if textarea not found
                if (append) {
                    const currentMemory = LiteAPI.memory;
                    LiteAPI.memory = currentMemory + (currentMemory.length > 0 ? '\n\n' : '') + memory;
                } else {
                    LiteAPI.memory = memory;
                }
                window.autosave?.();
                window.save_settings?.();
            }

            // Switch to memory panel to show result (optional UX)
            KLITE_RPMod.switchTab('right', 'MEMORY');
            // Memory ${append ? 'appended to existing memory' : 'applied (replaced existing memory)'}

            // Clear the output area after successful application
            outputArea.value = '';
        },

        rollDice(diceString) {
            const resultDiv = document.getElementById('tools-dice-result');
            if (!resultDiv) return;

            KLITE_RPMod.log('panels', `Rolling dice: ${diceString}`);

            try {
                const result = this.parseDiceRoll(diceString);

                resultDiv.innerHTML = `
                    <div class="klite-dice-total">${result.total}</div>
                    <div class="rpm-muted">${KLITE_RPMod.escapeHtml(`${result.formula} = ${result.breakdown}`)}</div>
                `;

                this.lastRoll = result;

                // Add to chat with proper formatting
                if (window.gametext_arr) {
                    const rollText = `\n🎲 Dice Roll: ${result.formula}\nResult: ${result.total} (${result.breakdown})\n`;
                    gametext_arr.push(rollText);
                    window.render_gametext?.();
                }

            } catch (error) {
                resultDiv.innerHTML = `<div class="rpm-text-danger">Error: ${KLITE_RPMod.escapeHtml(error.message)}</div>`;
                KLITE_RPMod.error('Dice roll error:', error);
            }
        },

        parseDiceRoll(diceString) {
            const match = diceString.match(/^(\d*)d(\d+)(([+-])(\d+))?$/i);

            if (!match) {
                throw new Error('Invalid dice format. Use format like: d20, 2d6, 3d8+5');
            }

            const count = parseInt(match[1] || '1');
            const sides = parseInt(match[2]);
            const modifier = match[3] ? parseInt(match[4] + match[5]) : 0;

            if (count > 100) throw new Error('Too many dice (max 100)');
            if (sides > 1000) throw new Error('Too many sides (max 1000)');

            const rolls = [];
            for (let i = 0; i < count; i++) {
                rolls.push(Math.floor(Math.random() * sides) + 1);
            }

            const sum = rolls.reduce((a, b) => a + b, 0);
            const total = sum + modifier;

            let breakdown = rolls.join(' + ');
            if (modifier !== 0) {
                breakdown += ` ${modifier >= 0 ? '+' : ''} ${modifier}`;
            }

            return { formula: diceString, rolls, modifier, sum, total, breakdown };
        },

        exportAs(format) {
            KLITE_RPMod.log('panels', `Exporting as ${format}`);

            if (!window.gametext_arr) {
                // No story content to export
                return;
            }

            const data = {
                title: 'KLITE RPMod Story Export',
                date: new Date().toISOString(),
                messages: gametext_arr.filter(msg => msg && msg.trim()),
                memory: window.current_memory || '',
                authorNote: window.current_anote || '',
                worldInfo: window.current_wi || [],
                settings: {
                    mode: KLITE_RPMod.getMode(),
                    temperature: window.localsettings?.temperature || 0.7,
                    rep_pen: window.localsettings?.rep_pen || 1.1,
                    top_p: window.localsettings?.top_p || 0.9
                },
                stats: {
                    totalMessages: gametext_arr.length,
                    totalWords: gametext_arr.join(' ').split(/\s+/).filter(w => w).length,
                    totalTokens: window.count_tokens ?
                        window.count_tokens(gametext_arr.join('')) :
                        Math.ceil(gametext_arr.join('').length / 4)
                }
            };

            let content, filename, mimeType;

            switch (format) {
                case 'markdown':
                    content = this.exportAsMarkdown(data);
                    filename = 'klite-rpmod-export.md';
                    mimeType = 'text/markdown';
                    break;
                case 'json':
                    content = JSON.stringify(data, null, 2);
                    filename = 'klite-rpmod-export.json';
                    mimeType = 'application/json';
                    break;
                case 'html':
                    content = this.exportAsHTML(data);
                    filename = 'klite-rpmod-export.html';
                    mimeType = 'text/html';
                    break;
            }

            // Download file
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            // Exported as ${filename}
        },

        exportAsMarkdown(data) {
            let md = `# ${data.title}\n\n`;
            md += `*Exported on ${new Date(data.date).toLocaleString()}*\n`;

            md += `## Statistics\n\n`;
            md += `- **Total Messages:** ${data.stats.totalMessages}\n`;
            md += `- **Total Words:** ${data.stats.totalWords.toLocaleString()}\n`;
            md += `- **Total Tokens:** ${data.stats.totalTokens.toLocaleString()}\n\n`;

            if (data.memory) {
                md += `## Memory\n\n${data.memory}\n\n`;
            }

            if (data.authorNote) {
                md += `## Author's Note\n\n${data.authorNote}\n\n`;
            }

            if (data.worldInfo.length > 0) {
                md += `## World Info\n\n`;
                data.worldInfo.forEach(wi => {
                    if (!wi.widisabled && wi.content) {
                        md += `### ${wi.key || 'Untitled'}\n\n${wi.content}\n\n`;
                    }
                });
            }

            md += `## Story\n\n`;
            data.messages.forEach((msg, i) => {
                md += msg.trim() + '\n\n---\n\n';
            });

            return md;
        },

        exportAsHTML(data) {
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title}</title>
    <style>
        body { 
            font-family: Georgia, serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 40px 20px;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        h1, h2 { color: #2c3e50; }
        .metadata { 
            color: #666; 
            font-style: italic; 
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
        }
        .stats {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .memory, .author-note, .world-info {
            background: #e8f4f8;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #3498db;
        }
        .message { 
            margin-bottom: 30px; 
            padding: 20px; 
            background: white; 
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .message:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        hr { 
            border: none; 
            border-top: 1px solid #ddd; 
            margin: 30px 0; 
        }
    </style>
</head>
<body>
    <h1>${data.title}</h1>
    <div class="metadata">
        <p>Exported on ${new Date(data.date).toLocaleString()}</p>
    </div>
    
    <div class="stats">
        <h2>Statistics</h2>
        <ul>
            <li><strong>Total Messages:</strong> ${data.stats.totalMessages}</li>
            <li><strong>Total Words:</strong> ${data.stats.totalWords.toLocaleString()}</li>
            <li><strong>Total Tokens:</strong> ${data.stats.totalTokens.toLocaleString()}</li>
            <li><strong>Mode:</strong> ${data.settings.mode}</li>
        </ul>
    </div>
    
    ${data.memory ? `<div class="memory"><h2>Memory</h2><p>${KLITE_RPMod.escapeHtml(data.memory).replace(/\n/g, '<br>')}</p></div>` : ''}
    ${data.authorNote ? `<div class="author-note"><h2>Author's Note</h2><p>${KLITE_RPMod.escapeHtml(data.authorNote).replace(/\n/g, '<br>')}</p></div>` : ''}
    
    ${data.worldInfo.length > 0 ? `
        <div class="world-info">
            <h2>World Info</h2>
            ${data.worldInfo.filter(wi => !wi.widisabled && wi.content).map(wi => `
                <h3>${KLITE_RPMod.escapeHtml(wi.key || 'Untitled')}</h3>
                <p>${KLITE_RPMod.escapeHtml(wi.content).replace(/\n/g, '<br>')}</p>
            `).join('')}
        </div>
    ` : ''}
    
    <h2>Story</h2>
    ${data.messages.map(msg => `<div class="message">${KLITE_RPMod.escapeHtml(msg).replace(/\n/g, '<br>')}</div>`).join('')}
</body>
</html>`;
        },

        // ==================== AUTO-REGENERATE ====================
        initializeAutoRegenerate() {
            const toggle = document.getElementById('tools-auto-regen-toggle');
            const delayInput = document.getElementById('tools-auto-regen-delay');
            const maxInput = document.getElementById('tools-auto-regen-max');
            const status = document.getElementById('tools-auto-regen-status');

            toggle?.addEventListener('change', (e) => {
                this.autoRegenerateState.enabled = e.target.checked;

                if (this.autoRegenerateState.enabled) {
                    this.startAutoRegenerate();
                    status.textContent = '✓ Auto-regenerate is active';
                    status.className = 'rpm-text-success';
                } else {
                    this.stopAutoRegenerate();
                    status.textContent = 'Auto-regenerate is disabled';
                    status.className = 'rpm-text-muted';
                }
            });

            delayInput?.addEventListener('change', () => {
                if (this.autoRegenerateState.enabled) {
                    this.stopAutoRegenerate();
                    this.startAutoRegenerate();
                }
            });

            maxInput?.addEventListener('change', (e) => {
                this.autoRegenerateState.maxRetries = parseInt(e.target.value);
            });

            // Keyword input handler
            const keywordTextarea = document.getElementById('tools-regen-keywords');
            keywordTextarea?.addEventListener('input', (e) => {
                const keywords = e.target.value
                    .split('\n')
                    .map(k => k.trim())
                    .filter(k => k.length > 0);
                this.autoRegenerateState.keywords = keywords;

                KLITE_RPMod.log('tools', `Auto-regen keywords updated: ${keywords.length} keywords set`);
            });

            // Threshold handler
            const thresholdInput = document.getElementById('tools-keyword-threshold');
            thresholdInput?.addEventListener('change', (e) => {
                this.autoRegenerateState.keywordThreshold = parseInt(e.target.value) || 1;
            });

            // Case sensitivity handler
            const caseCheckbox = document.getElementById('tools-keyword-case');
            caseCheckbox?.addEventListener('change', (e) => {
                this.autoRegenerateState.keywordCaseSensitive = e.target.checked;
            });

            // Cleanup on page unload
            window.addEventListener('beforeunload', () => {
                this.stopAutoRegenerate();
            });
        },

        startAutoRegenerate() {
            const delayInput = document.getElementById('tools-auto-regen-delay');
            const delay = parseInt(delayInput?.value || '3000');

            KLITE_RPMod.log('tools', `Auto-regenerate started with ${delay}ms delay`);

            // Clear any existing interval
            this.stopAutoRegenerate();

            // Reset retry count
            this.autoRegenerateState.retryCount = 0;

            this.autoRegenerateInterval = setInterval(() => {
                this.checkAndRegenerate();
            }, delay);
        },

        stopAutoRegenerate() {
            if (this.autoRegenerateInterval) {
                clearInterval(this.autoRegenerateInterval);
                this.autoRegenerateInterval = null;
            }
        },

        checkAndRegenerate() {
            // Check if we should regenerate
            if (!this.shouldRegenerate()) {
                return;
            }

            // Check retry limit
            if (this.autoRegenerateState.retryCount >= this.autoRegenerateState.maxRetries) {
                KLITE_RPMod.log('tools', 'Auto-regenerate max retries reached, stopping');
                this.stopAutoRegenerate();

                const status = document.getElementById('tools-auto-regen-status');
                if (status) {
                    status.textContent = '⚠️ Max retries reached';
                    status.className = 'rpm-text-quest';
                }
                return;
            }

            KLITE_RPMod.log('tools', `Auto-regenerating (attempt ${this.autoRegenerateState.retryCount + 1}/${this.autoRegenerateState.maxRetries})`);

            // Increment retry count
            this.autoRegenerateState.retryCount++;

            // Update status
            const status = document.getElementById('tools-auto-regen-status');
            if (status) {
                status.textContent = `🔄 Regenerating... (${this.autoRegenerateState.retryCount}/${this.autoRegenerateState.maxRetries})`;
                status.className = 'rpm-text-info';
            }

            // Call Lite's retry function
            if (typeof btn_retry === 'function') {
                btn_retry();
            }
        },

        shouldRegenerate() {
            // Check if not currently generating
            const isGenerating = document.getElementById('input_text')?.disabled === true;
            if (isGenerating) return false;

            // Get the last message
            const messages = document.querySelectorAll('.message');
            if (!messages.length) return false;

            const lastMessage = messages[messages.length - 1];
            const messageText = lastMessage?.textContent || '';

            // Check if it's a new message
            const messageHash = this.hashString(messageText);
            if (messageHash === this.autoRegenerateState.lastMessageHash) {
                return false;
            }
            this.autoRegenerateState.lastMessageHash = messageHash;

            // Check if it's an AI message
            const isAIMessage = lastMessage?.classList.contains('ai');
            if (!isAIMessage) return false;

            // Check trigger conditions
            const shortCheck = document.getElementById('tools-regen-short')?.checked;
            const incompleteCheck = document.getElementById('tools-regen-incomplete')?.checked;
            const errorCheck = document.getElementById('tools-regen-error')?.checked;

            // Check short messages
            if (shortCheck && messageText.length < 50) {
                KLITE_RPMod.log('tools', 'Auto-regen trigger: Short message');
                return true;
            }

            // Check incomplete sentences
            if (incompleteCheck) {
                const lastChar = messageText.trim().slice(-1);
                if (!['.', '!', '?', '"', '\'', '"'].includes(lastChar)) {
                    console.log('🔄 Triggering regenerate: Incomplete sentence');
                    return true;
                }
            }

            // Check error responses
            if (errorCheck && (messageText.includes('Error:') || messageText.includes('error'))) {
                console.log('🔄 Triggering regenerate: Error detected');
                return true;
            }

            // Check keyword triggers
            if (this.autoRegenerateState.keywords.length > 0) {
                const keywordMatches = this.checkKeywordTriggers(messageText);
                if (keywordMatches >= this.autoRegenerateState.keywordThreshold) {
                    console.log(`🔄 Triggering regenerate: ${keywordMatches} keywords matched (threshold: ${this.autoRegenerateState.keywordThreshold})`);
                    return true;
                }
            }

            return false;
        },

        checkKeywordTriggers(text) {
            const keywords = this.autoRegenerateState.keywords;
            const caseSensitive = this.autoRegenerateState.keywordCaseSensitive;

            let matchCount = 0;
            const checkText = caseSensitive ? text : text.toLowerCase();

            for (const keyword of keywords) {
                const checkKeyword = caseSensitive ? keyword : keyword.toLowerCase();
                if (checkText.includes(checkKeyword)) {
                    matchCount++;
                }
            }

            return matchCount;
        },

        hashString(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash;
        }
    };

}
