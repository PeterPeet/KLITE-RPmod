// =============================================================================
// KLITE RPmod — The character card editor (new/edit character), added to the Chars panel.
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================

export function installCardEditor(S) {
    const { t } = S;
    // === Character Editor Extension for CHARS Panel ===
    KLITE_RPMod.panels.CHARS.editMode = 'none';
    KLITE_RPMod.panels.CHARS.editData = null;

    KLITE_RPMod.panels.CHARS.abortEdit = function () {
        this.editMode = 'none';
        this.editData = null;
        this.currentChar = null;
        this.showGroupSelector = false;
        this.hideCharacterFullscreen();
        KLITE_RPMod.loadPanel('right', 'CHARS');
        try { document.getElementById('content-right')?.scrollTo?.(0,0); } catch(_) {}
    };

    KLITE_RPMod.panels.CHARS.saveCharacter = function () {
        const data = this.editData;
        if (!data.name?.trim()) {
            alert('Character must have a name.');
            return;
        }

        // Map tags into the metadata if needed
        if (!data.tags || !Array.isArray(data.tags)) {
            data.tags = [];
        }

        // Fallback spec
        data.spec = 'chara_card_v2';

        this.addCharacter(data);
        this.abortEdit();
    };

    KLITE_RPMod.panels.CHARS.uploadImage = function (event) {
        const file = event?.target?.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const imgData = e.target.result;

            // ✅ Mutate a local reference (in case CHARS panel re-renders)
            const panel = KLITE_RPMod.panels.CHARS;
            if (!panel.editData) panel.editData = {};

            panel.editData.avatar = imgData;
            panel.editData.image = imgData; // ensure compatibility

            // 🔄 Trigger rerender *after* data is safely assigned
            KLITE_RPMod.loadPanel('right', 'CHARS');
        };
        reader.readAsDataURL(file);
    };


    KLITE_RPMod.panels.CHARS.renderEditor = function (charData = null) {
        // Initialize editData once per session or when switching target
        if (!this.editData) {
            this.editData = {};
        }
        if (charData) {
            // If entering edit/clone with provided data, seed missing fields only
            const d = this.editData;
            this.editData = {
                // Preserve any already-typed fields in current session
                id: d.id ?? (charData?.id || null),
                name: d.name ?? (charData?.name || ''),
                description: d.description ?? (charData?.description || ''),
                personality: d.personality ?? (charData?.personality || ''),
                scenario: d.scenario ?? (charData?.scenario || ''),
                first_mes: d.first_mes ?? (charData?.first_mes || ''),
                mes_example: d.mes_example ?? (charData?.mes_example || ''),

                tags: Array.isArray(d.tags) ? d.tags : (Array.isArray(charData?.tags) ? charData.tags : []),
                creator: d.creator ?? (charData?.creator || ''),
                character_version: d.character_version ?? (charData?.character_version || charData?.version || ''),
                creator_notes: d.creator_notes ?? (charData?.creator_notes || charData?.userNotes || ''),
                system_prompt: d.system_prompt ?? (charData?.system_prompt || (charData?.extensions?.depth_prompt?.prompt || '')),
                post_history_instructions: d.post_history_instructions ?? (charData?.post_history_instructions || ''),

                alternate_greetings: Array.isArray(d.alternate_greetings)
                    ? d.alternate_greetings
                    : (Array.isArray(charData?.alternate_greetings)
                        ? charData.alternate_greetings
                        : (Array.isArray(charData?.alternateGreetings) ? charData.alternateGreetings : [])),
                avatar: d.avatar || charData?.avatar || charData?.image || charData?.images?.avatar || '',
                wi_group: d.wi_group ?? (charData?.wi_group || charData?.category || 'General'),

                importSource: d.importSource ?? (charData?.importSource || ''),
                importDate: d.importDate ?? (charData?.importDate || Date.now()),
                originalFilename: d.originalFilename ?? (charData?.originalFilename || ''),
                isFavorite: d.isFavorite ?? !!charData?.isFavorite,
                isArchived: d.isArchived ?? !!charData?.isArchived,

                extensions: d.extensions || (charData?.extensions
                    ? JSON.parse(JSON.stringify(charData.extensions))
                    : {}),

                keywords: Array.isArray(d.keywords) ? [...d.keywords] : (Array.isArray(charData?.keywords) ? [...charData.keywords] : []),
                relationships: Array.isArray(d.relationships) ? [...d.relationships] : (Array.isArray(charData?.relationships) ? [...charData.relationships] : []),
                preferences: d.preferences ? { ...d.preferences } : (charData?.preferences ? { ...charData.preferences } : {}),
                traits: Array.isArray(d.traits) ? [...d.traits] : (Array.isArray(charData?.traits) ? [...charData.traits] : []),
                rating: d.rating ? { ...d.rating } : (charData?.rating ? { ...charData.rating } : {}),
                stats: d.stats ? { ...d.stats } : (charData?.stats ? { ...charData.stats } : {}),
                worldInfo: d.worldInfo ? { ...d.worldInfo } : (charData?.worldInfo ? { ...charData.worldInfo } : {}),
            };
        }

        const d = this.editData;
        if (KLITE_RPMod.panels.WI && typeof KLITE_RPMod.panels.WI.init === 'function') {
            KLITE_RPMod.panels.WI.init();
        }


        return `
    <div class="klite-char-editor">
        <h3>${d.id ? 'Edit Character' : charData ? 'Clone Character' : 'Create New Character'}</h3>

        <label>Name:</label>
        <input class="klite-input" value="${KLITE_RPMod.panels.CHARS.escapeHTML(d.name)}" oninput="KLITE_RPMod.panels.CHARS.editData.name=this.value"><br>

        <label>Description:</label>
        <textarea class="klite-input" oninput="KLITE_RPMod.panels.CHARS.editData.description=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.description)}</textarea><br>

        <label>Personality:</label>
        <textarea class="klite-input" oninput="KLITE_RPMod.panels.CHARS.editData.personality=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.personality)}</textarea><br>

        <label>Scenario:</label>
        <textarea class="klite-input" oninput="KLITE_RPMod.panels.CHARS.editData.scenario=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.scenario)}</textarea><br>

        <label>Greeting (first message):</label>
        <textarea class="klite-input" oninput="KLITE_RPMod.panels.CHARS.editData.first_mes=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.first_mes)}</textarea><br>

        <label>Example Dialogue:</label>
        <textarea class="klite-input" oninput="KLITE_RPMod.panels.CHARS.editData.mes_example=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.mes_example)}</textarea><br>

        <label>Tags (comma-separated):</label>
        <input class="klite-input" value="${KLITE_RPMod.panels.CHARS.escapeHTML((Array.isArray(d.tags) ? d.tags : []).join(', '))}" oninput="KLITE_RPMod.panels.CHARS.editData.tags=this.value.split(',').map(t=>t.trim()).filter(Boolean)"><br>

        <label>Creator:</label>
        <input class="klite-input" value="${KLITE_RPMod.panels.CHARS.escapeHTML(d.creator)}" oninput="KLITE_RPMod.panels.CHARS.editData.creator=this.value"><br>

        <label>Character Version:</label>
        <input class="klite-input" value="${KLITE_RPMod.panels.CHARS.escapeHTML(d.character_version)}" oninput="KLITE_RPMod.panels.CHARS.editData.character_version=this.value"><br>

        <label>Creator Notes (not shown to AI):</label>
        <textarea class="klite-input" rows="3" oninput="KLITE_RPMod.panels.CHARS.editData.creator_notes=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.creator_notes)}</textarea><br>

        <label>System Prompt Override:</label>
        <textarea class="klite-input" rows="3" oninput="KLITE_RPMod.panels.CHARS.editData.system_prompt=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.system_prompt)}</textarea><br>

        <label>Post-History Instructions:</label>
        <textarea class="klite-input" rows="3" oninput="KLITE_RPMod.panels.CHARS.editData.post_history_instructions=this.value">${KLITE_RPMod.panels.CHARS.escapeTextarea(d.post_history_instructions)}</textarea><br>

        <label>Alternate Greetings (one per line):</label>
        <textarea class="klite-input" rows="3"
            oninput="KLITE_RPMod.panels.CHARS.editData.alternate_greetings = this.value.split('\\n').map(l => l.trim()).filter(Boolean)">${KLITE_RPMod.panels.CHARS.escapeTextarea((d.alternate_greetings || []).join('\\n'))}</textarea><br>

        <label>Upload Avatar:</label>
        <input type="file" accept="image/png" onchange="KLITE_RPMod.panels.CHARS.uploadImage(event)">
        <div>${KLITE_RPMod.safeImageHTML(d.avatar || '', 'Avatar preview', 'max-height:120px;margin-top:8px;')}</div>

        ${this.renderGroupSelector()}

        <div class="klite-buttons-fill klite-mt">
            <button class="klite-btn primary" onclick="KLITE_RPMod.panels.CHARS.saveCharacterwithWI()">💾 Save</button>
            <button class="klite-btn primary" onclick="KLITE_RPMod.panels.CHARS.abortEdit()">↩️ Back</button>
            <button class="klite-btn primary" onclick="KLITE_RPMod.panels.CHARS.toggleGroupSelector()">🔗 Connect WI Group</button>
        </div>
    </div>`;
    };

    // Extend render() to show New Character button and swap view regarding mode
    const originalRender = KLITE_RPMod.panels.CHARS.render;
    KLITE_RPMod.panels.CHARS.render = function () {
        if (this.editMode === 'new') return this.renderEditor();
        if (this.editMode === 'edit') return this.renderEditor(this.currentChar);
        if (this.editMode === 'clone') return this.renderEditor(this.currentChar);

        const base = originalRender.call(this);
        const newBtn = '<div class="klite-buttons-fill klite-mb">' +
            '<button class="klite-btn primary" onclick="KLITE_RPMod.panels.CHARS.setEditMode(\'new\')">➕ New Character</button>' +
            '</div>';
        return newBtn + base;
    };

    // Helper setter methode to set mode and re-render
    KLITE_RPMod.panels.CHARS.setEditMode = function (mode, char = null) {
        this.editMode = mode;
        this.currentChar = char;
        // Reset editData when switching modes/targets to avoid stale merges
        this.editData = null;
        KLITE_RPMod.loadPanel('right', 'CHARS');
    };

    KLITE_RPMod.panels.CHARS.showGroupSelector = false;

    KLITE_RPMod.panels.CHARS.toggleGroupSelector = function () {
        this.showGroupSelector = !this.showGroupSelector;
        KLITE_RPMod.loadPanel('right', 'CHARS');
    };

    KLITE_RPMod.panels.CHARS.renderGroupSelector = function () {
        if (!this.showGroupSelector) return '';

        // Read WI groups from Esolite's WI tab (UI/data)
        const groups = this.getEsoliteWIGroups ? this.getEsoliteWIGroups() : [];

        if (!groups.length) return '<div class="klite-muted">No WorldInfo groups available.</div>';

        const selected = this.editData.character_book || '';
        const options = groups.map(g =>
            `<option value="${g}" ${selected === g ? 'selected' : ''}>${g || '[Unassigned]'}</option>`
        ).join('');

        return `
        <label>WorldInfo Group:</label>
        <select class="klite-select" onchange="KLITE_RPMod.panels.CHARS.selectGroup(this.value)">
            <option value="">— Select Group —</option>
            ${options}
        </select>
    `;
    };

    KLITE_RPMod.panels.CHARS.selectGroup = function (groupName) {
        this.editData.character_book = groupName || null;
        KLITE_RPMod.loadPanel('right', 'CHARS');
    };

    if (!KLITE_RPMod.panels.CHARS.saveCharacterwithWI) {
        KLITE_RPMod.panels.CHARS.saveCharacterwithWI = async function () {
            const data = this.editData;
            if (!data.name?.trim()) {
                alert('Character must have a name.');
                return;
            }
            // Image is optional; if absent, we will save JSON-only.

            data.spec = 'chara_card_v2';
            data.spec_version = '2.0';
            data.character_book = null;

            // Validate unique name for new
            if (this.editMode === 'new') {
                const newName = String(data.name).trim();
                if (this.isCharacterNameTaken(newName)) {
                    alert('Please choose an unique name for the character.');
                    return;
                }
            }
            // Validate unique name for clones
            if (this.editMode === 'clone') {
                const newName = String(data.name).trim();
                if (this.isCharacterNameTaken(newName)) {
                    alert('Please choose an unique name for the cloned character.');
                    return;
                }
            }

            try {
                if (KLITE_RPMod.panels?.CHARS?.addCharacter) {
                    // Pass old name for rename-aware image preservation and cleanup
                    if (this.editMode === 'edit' && this.currentChar?.name) {
                        data.__oldName = this.currentChar.name;
                    }
                    // a rename keeps the Library entry (same id), so nothing to remove
                    await KLITE_RPMod.panels.CHARS.addCharacter(data);
                } else {
                    throw new Error('CHARS panel not available. Character import requires proper panel initialization.');
                }
            } catch (err) {
                console.error('[KLITE RPMod][ERROR] Character save failed:', err);
                alert('Failed to save character: ' + err.message);
                return;
            }

            try { await this.rebuildFromEsolite?.(); } catch(_) {}
            this.abortEdit?.();
        };
    }


}
