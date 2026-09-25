// =============================================================================
// KLITE RPmod — Chars panel (KLITE_RPMod.panels.CHARS): import, backup, the gallery launcher, the character
// view over Esolite's Library (`KLITE_RPMod.characters`).
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================
import * as EsoLibrary from '../library/esoliteLibrary.js';

export function installCharsPanel(S) {
    const { t } = S;
    // CHARS PANEL
    KLITE_RPMod.panels.CHARS = {
        fileInput: null,
        currentFilter: '',
        currentSort: 'name-asc',
        currentView: 'grid',
        tagFilter: '',
        starFilter: '',
        detailObserverEnabled: false,
        _detailSaveTimer: null,

        // Basic HTML escaping helpers to prevent HTML/JS injection when rendering
        escapeHTML(str = '') {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },
        // Escape content specifically for placement inside <textarea> ... </textarea>
        escapeTextarea(str = '') {
            // Also break any closing tag sequence
            return this.escapeHTML(String(str)).replace(/<\/textarea/gi, '&lt;/textarea');
        },
        // Attempt to fix common UTF-8 mojibake (e.g., “ — ” becoming â / â)
        fixMojibake(str = '') {
            const s = String(str);
            // Heuristic: if it contains common mojibake markers (C1 controls/Latin-1 noise + sequences like Ã/Â/â), try latin1->utf8 roundtrip
            const looksMojibake = /[\u0080-\u00FF]/.test(s) && /(Ã|Â|â)/.test(s);
            if (looksMojibake) {
                try {
                    const bytes = new Uint8Array(Array.from(s, ch => ch.charCodeAt(0) & 0xFF));
                    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
                    return decoded.normalize('NFC');
                } catch (_) { /* fall through */ }
            }
            return s.normalize('NFC');
        },
        // Sanitize imported text fields: fix encoding, normalize, strip unsafe control chars
        sanitizeImportedString(str = '') {
            let out = this.fixMojibake(str);
            // Normalize line endings and remove non-text control chars except tab/newline
            out = out.replace(/\r\n?/g, '\n').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
            return out;
        },

        render() {
            return `
                ${t.section('Import Characters',
                `<div id="char-upload-zone">
                        <button class="btn btn-primary rpm-btn rpm-block klite-drop-btn">
                            Click or drag characters, saves, lorebooks, world info or PDFs here to add
                        </button>
                    </div>
                    <div class="rpm-fill rpm-mt">
                        ${t.button('Backup the Characters', 'secondary', 'export-chars')}
                    </div>`
            )}
                ${this.renderGalleryLauncher()}
            `;
        },

        // The full-screen gallery (src/characters/gallery.js) is the place to browse: the tab
        // keeps import/backup and lists the characters (favorites first) as shortcuts into it.
        renderGalleryLauncher() {
            // Esolite's Library list is the master (the RP core's own copy is rebuilt from it later)
            let all = [];
            try { all = window.KLITE_RPMod_Library?.characterList?.() || []; } catch (_) {}
            if (!all.length) all = (KLITE_RPMod.characters || []).filter(c => c && c.name);
            const favs = new Set(all.filter(m => m.favorite).map(m => m.name));
            const sorted = all.slice().sort((a, b) => (favs.has(b.name) - favs.has(a.name)) || String(a.name).localeCompare(String(b.name)));
            const shown = sorted.slice(0, 12);
            const rows = shown.map(c => `<button type="button" class="btn btn-primary rpm-btn rpm-block rpm-chars-link" data-action="open-gallery" data-char-name="${this.escapeHTML(c.name)}">${favs.has(c.name) ? '★ ' : ''}${this.escapeHTML(c.name)}</button>`).join('');
            const more = sorted.length > shown.length ? `<div class="rpm-muted">and ${sorted.length - shown.length} more in the gallery</div>` : '';
            return t.section('Character Gallery',
                `<div class="rpm-fill rpm-mb">
                        <button type="button" class="btn btn-primary rpm-btn rpm-lg" data-action="open-gallery">Open character gallery (${all.length})</button>
                    </div>
                    <div class="rpm-muted rpm-mb">Browse, search, play, edit and build characters in the full-screen gallery. Click a name to open its page.</div>
                    ${rows || '<div class="rpm-muted">No characters yet — import a card above.</div>'}
                    ${more}`);
        },


        init() {
            // Load persisted gallery preferences (view, sort, filters)
            try { this.loadGalleryPrefs?.(); } catch(_) {}
            // Use esolite data as primary; install adapter
            try { this.installEsoliteAdapter?.(); } catch(_) {}

            // Setup search functionality
            const searchInput = document.getElementById('char-search');
            if (searchInput) {
                searchInput.addEventListener('input', e => {
                    this.currentFilter = e.target.value;
                    this.refreshGallery();
                    try { this.saveGalleryPrefs?.(); } catch(_) {}
                });
            }

            // Setup filter handlers
            const tagFilter = document.getElementById('char-tag-filter');
            if (tagFilter) {
                tagFilter.addEventListener('change', e => {
                    this.tagFilter = e.target.value;
                    this.refreshGallery();
                    try { this.saveGalleryPrefs?.(); } catch(_) {}
                });
            }

            const starFilter = document.getElementById('char-star-filter');
            if (starFilter) {
                starFilter.addEventListener('change', e => {
                    this.starFilter = e.target.value;
                    this.refreshGallery();
                    try { this.saveGalleryPrefs?.(); } catch(_) {}
                });
            }

            // Setup sort and view change handlers
            const sortSelect = document.getElementById('char-sort');
            if (sortSelect) {
                sortSelect.addEventListener('change', e => {
                    this.currentSort = e.target.value;
                    this.refreshGallery();
                    try { this.saveGalleryPrefs?.(); } catch(_) {}
                });
            }

            const viewSelect = document.getElementById('char-view');
            if (viewSelect) {
                viewSelect.addEventListener('change', e => {
                    this.currentView = e.target.value;
                    this.refreshGallery();
                    try { this.saveGalleryPrefs?.(); } catch(_) {}
                });
            }

            // Setup drag and drop
            const uploadZone = document.getElementById('char-upload-zone');
            if (uploadZone) {
                uploadZone.addEventListener('dragover', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    uploadZone.classList.add('dragover');
                });

                uploadZone.addEventListener('dragleave', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    uploadZone.classList.remove('dragover');
                });

                uploadZone.addEventListener('drop', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    uploadZone.classList.remove('dragover');
                    try {
                        const files = e.dataTransfer?.files;
                        if (files && typeof window.fileInputToFiles === 'function') {
                            window.fileInputToFiles(Array.from(files), async (result) => {
                                try { await KLITE_RPMod.panels.CHARS.processEsoliteImportResult(result); } catch(_) {}
                            });
                        } else if (files && files.length > 0) {
                            // Fallback to RPmod handler
                            this.handleFiles(files);
                        }
                    } catch(_) {}
                });

                uploadZone.addEventListener('click', () => {
                    try {
                        if (typeof window.promptUserForLocalFile === 'function') {
                            window.promptUserForLocalFile(async (result) => {
                                try { await KLITE_RPMod.panels.CHARS.processEsoliteImportResult(result); } catch(_) {}
                            }, [".png", ".webp", ".json", ".txt", ".pdf"], true);
                        }
                    } catch(_) {}
                });
            }

            // Apply persisted prefs onto current gallery view
            try { this.refreshGallery?.(); } catch(_) {}

            // Wire up action handling for CHARS panel buttons
            try {
                const container = document.querySelector('div#content-right.klite-content');
                if (container) {
                    if (container._charsActionHandler) {
                        container.removeEventListener('click', container._charsActionHandler);
                    }
                    const actionHandler = (e) => {
                        const el = e.target.closest('[data-action]');
                        if (!el) return;
                        const action = el.dataset.action;
                        const fn = KLITE_RPMod.panels.CHARS.actions && KLITE_RPMod.panels.CHARS.actions[action];
                        if (typeof fn === 'function') {
                            e.preventDefault();
                            e.stopPropagation();
                            try { fn(e); } catch (err) { KLITE_RPMod.error('CHARS action failed:', err); }
                        }
                    };
                    container.addEventListener('click', actionHandler);
                    container._charsActionHandler = actionHandler;
                }
            } catch(_) {}
        },

        // Persist gallery preferences (view, sort, filters) using esolite IndexedDB helpers
        prefsKey: 'esolite_chars_panel_prefs',
        async loadGalleryPrefs() {
            try {
                const raw = await window.indexeddb_load?.(this.prefsKey, null);
                if (!raw) return;
                const prefs = JSON.parse(raw);
                if (typeof prefs.currentFilter === 'string') this.currentFilter = prefs.currentFilter;
                if (typeof prefs.currentSort === 'string') this.currentSort = prefs.currentSort;
                if (typeof prefs.currentView === 'string') this.currentView = prefs.currentView;
                if (typeof prefs.tagFilter === 'string') this.tagFilter = prefs.tagFilter;
                if (typeof prefs.starFilter === 'string') this.starFilter = prefs.starFilter;
            } catch(_) {}
        },
        async saveGalleryPrefs() {
            try {
                const prefs = {
                    currentFilter: this.currentFilter,
                    currentSort: this.currentSort,
                    currentView: this.currentView,
                    tagFilter: this.tagFilter,
                    starFilter: this.starFilter,
                };
                await window.indexeddb_save?.(this.prefsKey, JSON.stringify(prefs));
            } catch(_) {}
        },

        // Fallback import processor using Esolite’s global functions
        async processEsoliteImportResult(result) {
            try {
                const { fileName, ext, plaintext, dataArr } = result || {};
                const lowerExt = (ext || '').toLowerCase();

                if (lowerExt === '.png') {
                    const arr = new Uint8Array(dataArr);
                    const ok = window.convertTavernPng?.(arr, fileName);
                    if (ok === null) throw new Error(`${fileName}: PNG is not a valid Tavern card`);
                } else if (lowerExt === '.webp') {
                    const arr = new Uint8Array(dataArr);
                    const ok = window.getTavernExifJSON?.(arr, fileName);
                    if (ok === null) throw new Error(`${fileName}: WEBP is not a valid Tavern card`);
                } else if (lowerExt === '.txt') {
                    const arr = new Uint8Array(dataArr);
                    await window.saveDocumentToIndexDB?.(fileName, arr, 'text/plain');
                } else if (lowerExt === '.pdf') {
                    const arr = new Uint8Array(dataArr);
                    await window.saveDocumentToIndexDB?.(fileName, arr, 'application/pdf');
                } else {
                    let data = null;
                    try { data = JSON.parse(plaintext); } catch (_) {}
                    if (!data) throw new Error(`${fileName}: Unsupported or invalid file`);

                    if (typeof window.is_kai_json === 'function' && window.is_kai_json(data) && !data?.scenarioVersion) {
                        window.saveKLiteSaveToIndexDB?.(fileName, data);
                    } else {
                        const looksLikeChar = (data?.spec === 'chara_card_v2' || data?.spec === 'chara_card_v3') ||
                            (data?.name != null || data?.description != null || data?.personality != null);
                        if (looksLikeChar) {
                            window.saveCharacterDataToIndexDB?.(undefined, data, fileName);
                        } else {
                            let wiToAdd = data;
                            let wiName = fileName;
                            const hasTavWI = typeof window.has_tavern_wi_check === 'function' ? window.has_tavern_wi_check(wiToAdd) : false;
                            if (hasTavWI) {
                                if (wiToAdd?.name && wiToAdd.name.trim().length > 0) wiName = wiToAdd.name;
                                wiToAdd = window.load_tavern_wi?.(wiToAdd);
                                if (Array.isArray(wiToAdd) && wiToAdd.length > 0) wiToAdd.forEach(wi => wi.wigroup = fileName.replace("'", ""));
                            } else if (Array.isArray(wiToAdd)) {
                                try {
                                    const hasNoGeneralWI = wiToAdd.length === 0 || wiToAdd.find(wi => (wi?.wigroup === undefined || wi.wigroup == null || wi.wigroup.trim() === '' || wi.wigroup === 'General')) === undefined;
                                    if (hasNoGeneralWI) {
                                        const wiAllHaveSameGroup = wiToAdd.find((e, p, a) => a.find(c => c?.wigroup !== e.wigroup)) === undefined;
                                        if (wiAllHaveSameGroup && wiToAdd[0]?.wigroup) wiName = wiToAdd[0].wigroup;
                                    }
                                } catch(_) {}
                            }
                            if (Array.isArray(wiToAdd)) {
                                wiToAdd = wiToAdd.filter(wi => wi?.key !== undefined);
                                if (wiToAdd.length > 0) {
                                    window.saveLorebookToIndexDB?.(wiName, wiToAdd, data);
                                } else {
                                    throw new Error(`${fileName}: JSON does not contain WI or lorebook entries`);
                                }
                            } else {
                                throw new Error(`${fileName}: JSON not recognized as character or WI`);
                            }
                        }
                    }
                }

                // Sync with Esolite after save (flush debounced list update first)
                try { await window.updateCharacterListFromAll?.(); } catch(_) {}
                try { await this.rebuildFromEsolite?.(); } catch(_) {}
                this.refreshGallery?.();
            } catch (e) {
                KLITE_RPMod.error('Import error', e);
                try { alert(e?.message || String(e)); } catch(_) {}
            }
        },

        actions: {
            'import-chars': () => {
                try {
                    if (typeof window.promptUserForLocalFile === 'function') {
                        window.promptUserForLocalFile(async (result) => {
                            try { await KLITE_RPMod.panels.CHARS.processEsoliteImportResult(result); } catch(_) {}
                        }, [".png", ".webp", ".json", ".txt", ".pdf"], true);
                    }
                } catch(_) {}
            },
            'export-chars': () => KLITE_RPMod.panels.CHARS.exportCharactersAsZip?.(),
            'open-gallery': (e) => {
                const name = e?.target?.closest?.('[data-char-name]')?.dataset?.charName || '';
                window.KLITE_RPMod_Gallery?.open(name || undefined);
            },
            'server-saves': async () => {
                try {
                    if (typeof window.showServerSavesPopup === 'function') {
                        await window.showServerSavesPopup();
                    } else {
                        alert('Server Saves UI is not available in this build.');
                    }
                } catch (e) { KLITE_RPMod.error('Server saves popup failed', e); }
            },
            'server-control': async () => {
                try {
                    if (typeof window.controlRemoteDataStore === 'function') {
                        await window.controlRemoteDataStore();
                    } else {
                        alert('Server control UI is not available in this build.');
                    }
                } catch (e) { KLITE_RPMod.error('Server control failed', e); }
            },
            'server-overwrite': async () => {
                try {
                    if (typeof window.putAllCharacterManagerData === 'function') {
                        await window.putAllCharacterManagerData();
                        try { await KLITE_RPMod.panels.CHARS.rebuildFromEsolite?.(); } catch(_) {}
                    } else {
                        alert('Server overwrite is not available in this build.');
                    }
                } catch (e) { KLITE_RPMod.error('Server overwrite failed', e); }
            },
            'server-load': async () => {
                try {
                    if (typeof window.loadAllCharacterManagerData === 'function') {
                        await window.loadAllCharacterManagerData();
                        try { await KLITE_RPMod.panels.CHARS.rebuildFromEsolite?.(); } catch(_) {}
                    } else {
                        alert('Server load is not available in this build.');
                    }
                } catch (e) { KLITE_RPMod.error('Server load failed', e); }
            },
            'load-char': async (e) => {
                const charId = e.target.closest('[data-char-id]')?.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char?.name) await KLITE_RPMod.panels.CHARS.loadAsScenarioByName(char.name);
            },
            'view-char': async (e) => {
                const charId = e.target.closest('[data-char-id]')?.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char?.name) {
                    // Always refetch from Esolite to avoid stale cached data
                    await KLITE_RPMod.panels.CHARS.showCharacterFullscreenByName(char.name);
                }
            },
            'rate-char': (e) => {
                const charId = e.target.closest('[data-char-id]')?.dataset.charId;
                const rating = parseInt(e.target.dataset.rating);
                KLITE_RPMod.panels.CHARS.updateCharacterRating(charId, rating);
            },
            'delete-char': async (e) => {
                const el = e.target;
                const charId = el.closest('[data-char-id]')?.dataset.charId;
                const name = KLITE_RPMod.characters.find(c => c.id == charId)?.name;
                if (name && confirm(`Delete "${name}"? This cannot be undone.`)) {
                    try { await KLITE_RPMod.panels.CHARS.deleteCharacterByName(name); } catch(_) {}
                    try { KLITE_RPMod.panels.CHARS.refreshGallery?.(); } catch(_) {}
                }
            },
            // New modal actions
            'load-char-scenario': async (e) => {
                const charId = e.target.dataset.charId;
                const char = KLITE_RPMod.characters.find(c => c.id == charId);
                if (char?.name) await KLITE_RPMod.panels.CHARS.loadAsScenarioByName(char.name);
            },
            // 'add-char-worldinfo' removed (use WI panel and Esolite directly)
            'export-char-json': async (e) => {
                const el = e.target;
                const charId = el.dataset.charId || el.closest('[data-char-id]')?.dataset.charId;
                const charName = el.dataset.charName || el.closest('[data-char-name]')?.dataset.charName;
                const char = charId ? KLITE_RPMod.characters.find(c => c.id == charId) : null;
                const name = charName || char?.name;
                if (name) await KLITE_RPMod.panels.CHARS.exportCharacterJSONByName(name);
            },
            'export-char-png': async (e) => {
                const el = e.target;
                const charId = el.dataset.charId || el.closest('[data-char-id]')?.dataset.charId;
                const charName = el.dataset.charName || el.closest('[data-char-name]')?.dataset.charName;
                const char = charId ? KLITE_RPMod.characters.find(c => c.id == charId) : null;
                const name = charName || char?.name;
                if (name) await KLITE_RPMod.panels.CHARS.exportCharacterPNGByName(name);
            },
            'edit-character': async (e) => {
                const el = e.target;
                const charId = el.dataset.charId || el.closest('[data-char-id]')?.dataset.charId;
                const charName = el.dataset.charName || el.closest('[data-char-name]')?.dataset.charName;
                const char = charId ? KLITE_RPMod.characters.find(c => c.id == charId) : null;
                const name = charName || char?.name;
                if (name) {
                    const d = await window.getCharacterData?.(name);
                    if (d) {
                        const full = { id: (char?.id ?? Date.now()), name: d.data?.name || name, image: d.image || null, ...d.data, rawData: { data: d.data || {} } };
                        KLITE_RPMod.panels.CHARS.setEditMode('edit', full);
                    }
                }
            },
            'clone-character': async (e) => {
                const el = e.target;
                const charId = el.dataset.charId || el.closest('[data-char-id]')?.dataset.charId;
                const charName = el.dataset.charName || el.closest('[data-char-name]')?.dataset.charName;
                const name = charName || KLITE_RPMod.characters.find(c => c.id == charId)?.name;
                if (name) {
                    const d = await window.getCharacterData?.(name);
                    if (d) {
                        const full = { id: undefined, name: (d.data?.name || name) + ' (Clone)', image: d.image || null, ...d.data, rawData: { data: d.data || {} } };
                        KLITE_RPMod.panels.CHARS.setEditMode('clone', full);
                    }
                }
            },
            'delete-char-modal': async (e) => {
                const el = e.target;
                const charId = el.dataset.charId || el.closest('[data-char-id]')?.dataset.charId;
                const charName = el.dataset.charName || el.closest('[data-char-name]')?.dataset.charName;
                const name = charName || KLITE_RPMod.characters.find(c => c.id == charId)?.name;
                if (name && confirm(`Delete "${name}"? This cannot be undone.`)) {
                    try { await KLITE_RPMod.panels.CHARS.deleteCharacterByName(name); } catch(_) {}
                    try { KLITE_RPMod.panels.CHARS.hideCharacterFullscreen(); } catch(_) {}
                    try { KLITE_RPMod.panels.CHARS.refreshGallery?.(); } catch(_) {}
                }
            }
        },

        getFilteredCharacters() {
            let filtered = [...KLITE_RPMod.characters];

            // Apply search filter (safe guards for missing fields)
            if (this.currentFilter) {
                const filter = String(this.currentFilter || '').toLowerCase();
                filtered = filtered.filter(char => {
                    const name = String(char.name || '').toLowerCase();
                    const desc = String(char.description || '').toLowerCase();
                    const pers = String(char.personality || '').toLowerCase();
                    const creator = String(char.creator || '').toLowerCase();
                    const keywords = Array.isArray(char.keywords) ? char.keywords : [];
                    const kwMatch = keywords.some(k => String(k || '').toLowerCase().includes(filter));
                    return name.includes(filter) || desc.includes(filter) || pers.includes(filter) || creator.includes(filter) || kwMatch;
                });
            }

            // Apply tag filter
            if (this.tagFilter) {
                const tag = String(this.tagFilter);
                filtered = filtered.filter(char => Array.isArray(char.tags) && char.tags.includes(tag));
            }

            // Apply star filter
            if (this.starFilter) {
                if (this.starFilter === 'unrated') {
                    filtered = filtered.filter(char => !char.rating || char.rating === 0);
                } else {
                    const rating = parseInt(this.starFilter);
                    filtered = filtered.filter(char => char.rating === rating);
                }
            }

            // Apply sorting (safe defaults)
            filtered.sort((a, b) => {
                switch (this.currentSort) {
                    case 'name-asc':
                        return String(a.name||'').localeCompare(String(b.name||''));
                    case 'name-desc':
                        return String(b.name||'').localeCompare(String(a.name||''));
                    case 'created':
                        return (b.created ?? 0) - (a.created ?? 0);
                    case 'talkativeness':
                        return (b.talkativeness || 0) - (a.talkativeness || 0);
                    case 'rating':
                        return (b.rating || 0) - (a.rating || 0);
                    default:
                        return 0;
                }
            });

            return filtered;
        },

        getUniqueTags() {
            const allTags = new Set();
            KLITE_RPMod.characters.forEach(char => {
                if (char.tags && Array.isArray(char.tags)) {
                    char.tags.forEach(tag => {
                        if (tag && tag.trim()) {
                            allTags.add(tag.trim());
                        }
                    });
                }
            });
            return Array.from(allTags).sort();
        },

        // The character grid lives in the full-screen gallery (src/characters/gallery.js), which
        // redraws itself from the Library; the tab has no grid of its own any more. Kept because
        // the tag, rating and import code still calls it.
        refreshGallery() {},

        refreshTagDropdown() {
            const tagFilter = document.getElementById('char-tag-filter');
            if (tagFilter) {
                const currentValue = tagFilter.value;
                const uniqueTags = this.getUniqueTags();
                tagFilter.innerHTML = `
                    <option value="">All Tags</option>
                    ${uniqueTags.map(tag => {
                        const t = KLITE_RPMod.panels.CHARS.escapeHTML(String(tag));
                        const sel = (currentValue === tag) ? 'selected' : '';
                        return `<option value="${t}" ${sel}>${t}</option>`;
                    }).join('')}
                `;
            }
        },



        updateCharacterRating(charId, rating) {
            const char = KLITE_RPMod.characters.find(c => c.id == charId);
            if (char) {
                char.rating = parseInt(rating);
                this.refreshGallery();
                try { KLITE_RPMod.saveCharacters?.(); } catch(_) {}

                // Refresh fullscreen view if currently viewing this character
                const rightPanel = document.querySelector('div#content-right.klite-content');
                const backButton = rightPanel?.querySelector('button[onclick*="hideCharacterFullscreen"]');
                if (backButton) {
                    try { if (this._currentDetailChar && this._currentDetailChar.id == char.id) this._currentDetailChar.rating = char.rating; } catch(_) {}
                    this.showCharacterFullscreen(this._currentDetailChar && this._currentDetailChar.id == char.id ? this._currentDetailChar : char);
                }

                // Updated ${char.name} rating to ${rating} stars
            }
        },

        addTag(charId) {
            const char = KLITE_RPMod.characters.find(c => c.id == charId);
            if (char) {
                const tag = prompt('Enter new tag:');
                if (tag && tag.trim()) {
                    if (!char.tags) char.tags = [];
                    if (!char.tags.includes(tag.trim())) {
                        char.tags.push(tag.trim());
                        try { KLITE_RPMod.saveCharacters?.(); } catch(_) {}
                        // Refresh fullscreen view if currently viewing this character
                        const rightPanel = document.querySelector('div#content-right.klite-content');
                        const backButton = rightPanel?.querySelector('button[onclick*="hideCharacterFullscreen"]');
                        if (backButton) {
                            try { if (this._currentDetailChar && this._currentDetailChar.id == char.id) this._currentDetailChar.tags = char.tags.slice(); } catch(_) {}
                            this.showCharacterFullscreen(this._currentDetailChar && this._currentDetailChar.id == char.id ? this._currentDetailChar : char);
                        }
                        this.refreshTagDropdown();
                        // Added tag "${tag}" to ${char.name}
                    }
                }
            }
        },



        deleteCharacter(charId) {
            const index = KLITE_RPMod.characters.findIndex(c => c.id == charId);
            if (index !== -1) {
                const char = KLITE_RPMod.characters[index];
                KLITE_RPMod.characters.splice(index, 1);
                this.refreshGallery();
                try { KLITE_RPMod.saveCharacters?.(); } catch(_) {}
                // Deleted ${char.name}
            }
        },



        async handleFiles(files) {
            KLITE_RPMod.log('panels', `Processing ${files.length} character files`);

            for (const file of files) {
                try {
                    KLITE_RPMod.log('panels', `Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);

                    if (file.name.endsWith('.json')) {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        KLITE_RPMod.log('panels', `Parsed JSON character data:`, data);
                        await this.addCharacter(this.normalizeCharacterData(data));
                    } else if (file.name.endsWith('.png')) {
                        await this.loadPNGFile(file);
                    } else if (file.name.endsWith('.webp')) {
                        await this.loadWEBPFile(file);
                    }
                } catch (err) {
                    KLITE_RPMod.error(`Failed to load file: ${file.name}`, err);
                    // Failed to load ${file.name}: ${err.message}
                }
            }
            this.refresh();
        },

        async loadPNGFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target.result;
                        const uint8Array = new Uint8Array(arrayBuffer);

                        // Extract tEXt chunks from PNG
                        const textChunks = this.extractPNGTextChunks(uint8Array);
                        let characterData = null;

                        for (const chunk of textChunks) {
                            if (['chara', 'ccv2', 'ccv3', 'character'].includes(chunk.keyword.toLowerCase())) {
                                try {
                                    let jsonStr = chunk.text;
                                    // Try to decode from base64 first
                                    try {
                                        jsonStr = atob(chunk.text);
                                    } catch (e) {
                                        // Not base64, use as-is
                                    }

                                    const parsed = JSON.parse(jsonStr);
                                    characterData = this.normalizeCharacterData(parsed);
                                    KLITE_RPMod.log('panels', `Found character data in PNG chunk '${chunk.keyword}'`);
                                    break;
                                } catch (e) {
                                    KLITE_RPMod.log('panels', `Failed to parse chunk '${chunk.keyword}': ${e.message}`);
                                }
                            }
                        }

                        if (characterData) {
                            // Read image as base64
                            const blob = new Blob([uint8Array], { type: 'image/png' });
                            const base64Reader = new FileReader();
                            base64Reader.onloadend = async () => {
                                characterData.image = base64Reader.result;
                                characterData.originalFilename = file.name;
                                await this.addCharacter(characterData);
                                resolve();
                            };
                            base64Reader.readAsDataURL(blob);
                        } else {
                            reject(new Error('No character data found in PNG'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.readAsArrayBuffer(file);
            });
        },

        async loadWEBPFile(file) {
            // Similar to PNG but for WEBP EXIF data
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target.result;
                        const uint8Array = new Uint8Array(arrayBuffer);

                        // For WEBP, check for EXIF data in the RIFF chunks
                        const characterData = this.extractWEBPCharacterData(uint8Array);

                        if (characterData) {
                            const blob = new Blob([uint8Array], { type: 'image/webp' });
                            const base64Reader = new FileReader();
                            base64Reader.onloadend = async () => {
                                characterData.image = base64Reader.result;
                                characterData.originalFilename = file.name;
                                await this.addCharacter(characterData);
                                resolve();
                            };
                            base64Reader.readAsDataURL(blob);
                        } else {
                            // Try loading as simple image
                            const imageReader = new FileReader();
                            imageReader.onload = () => {
                                this.addCharacter({
                                    name: file.name.replace(/\.webp$/, ''),
                                    description: 'Imported character',
                                    creator: 'Unknown',
                                    image: imageReader.result,
                                    originalFilename: file.name
                                });
                                resolve();
                            };
                            imageReader.readAsDataURL(file);
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.readAsArrayBuffer(file);
            });
        },

        extractPNGTextChunks(uint8Array) {
            const chunks = [];
            let offset = 8; // Skip PNG signature

            while (offset < uint8Array.length - 8) {
                // Read chunk length
                const length = (uint8Array[offset] << 24) |
                    (uint8Array[offset + 1] << 16) |
                    (uint8Array[offset + 2] << 8) |
                    uint8Array[offset + 3];

                // Read chunk type
                const type = String.fromCharCode(
                    uint8Array[offset + 4],
                    uint8Array[offset + 5],
                    uint8Array[offset + 6],
                    uint8Array[offset + 7]
                );

                if (type === 'tEXt' && length > 0) {
                    const chunkData = uint8Array.slice(offset + 8, offset + 8 + length);
                    const nullIndex = chunkData.indexOf(0);

                    if (nullIndex !== -1) {
                        const keyword = String.fromCharCode(...chunkData.slice(0, nullIndex));
                        const text = String.fromCharCode(...chunkData.slice(nullIndex + 1));
                        chunks.push({ keyword, text });
                        KLITE_RPMod.log('panels', `Found PNG tEXt chunk: ${keyword} (${text.length} chars)`);
                    }
                }

                // End of PNG
                if (type === 'IEND') break;

                // Move to next chunk (length + type + data + CRC)
                offset += 8 + length + 4;
            }

            return chunks;
        },

        extractWEBPCharacterData(uint8Array) {
            // Basic WEBP RIFF header check
            const riff = String.fromCharCode(...uint8Array.slice(0, 4));
            const webp = String.fromCharCode(...uint8Array.slice(8, 12));

            if (riff !== 'RIFF' || webp !== 'WEBP') {
                return null;
            }

            // Look for EXIF chunk
            let offset = 12;
            while (offset < uint8Array.length - 8) {
                const chunkType = String.fromCharCode(...uint8Array.slice(offset, offset + 4));
                const chunkSize = (uint8Array[offset + 4]) |
                    (uint8Array[offset + 5] << 8) |
                    (uint8Array[offset + 6] << 16) |
                    (uint8Array[offset + 7] << 24);

                if (chunkType === 'EXIF') {
                    // Try to extract character data from EXIF
                    const exifData = uint8Array.slice(offset + 8, offset + 8 + chunkSize);
                    // This is a simplified approach - real EXIF parsing is more complex
                    try {
                        const exifString = String.fromCharCode(...exifData);
                        const jsonMatch = exifString.match(/{[^}]+}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            return this.normalizeCharacterData(parsed);
                        }
                    } catch (e) {
                        // Failed to parse EXIF
                    }
                }

                offset += 8 + chunkSize;
                if (chunkSize % 2 === 1) offset++; // Padding
            }

            return null;
        },

        normalizeCharacterData(data) {
            KLITE_RPMod.log('panels', `Normalizing character data, spec: ${data.spec || 'v1'}`);

            let characterData;
            if (data.spec === 'chara_card_v2' || data.spec === 'chara_card_v3') {
                KLITE_RPMod.log('panels', 'Character card v2/v3 detected, extracting nested data');
                characterData = data.data;
            } else {
                KLITE_RPMod.log('panels', 'Character card v1 or direct format detected');
                characterData = data;
            }

            // Enhanced behavioral extraction from old source
            const normalized = {
                ...characterData,
                // Preserve original data for V3 export
                _originalData: data,
                _spec: data.spec || 'v1',

                // Enhanced behavioral analysis
                talkativeness: this.extractTalkativeness(characterData),
                keywords: this.extractCharacterKeywords(characterData),
                responseStyle: this.analyzeResponseStyle(characterData)
            };

            // Sanitize/normalize common text fields to preserve emojis and smart quotes correctly
            ['name','description','personality','scenario','first_mes','mes_example','creator','system_prompt','post_history_instructions','creator_notes']
                .forEach(k => { if (k in normalized && typeof normalized[k] === 'string') normalized[k] = this.sanitizeImportedString(normalized[k]); });
            // Sanitize alternate greetings if present
            if (Array.isArray(normalized.alternate_greetings)) {
                normalized.alternate_greetings = normalized.alternate_greetings.map(g => this.sanitizeImportedString(g));
            }

            KLITE_RPMod.log('panels', `Enhanced character analysis - Talkativeness: ${normalized.talkativeness}, Keywords: ${normalized.keywords.length}, Style: ${JSON.stringify(normalized.responseStyle)}`);

            return normalized;
        },


        // Enhanced keyword extraction from old source (lines 541-581)
        extractCharacterKeywords(cardData) {
            const keywords = new Set();

            // Add name variations
            const name = cardData.name || '';
            keywords.add(name.toLowerCase());

            // Add nickname if present
            if (cardData.nickname) {
                keywords.add(cardData.nickname.toLowerCase());
            }

            // Extract from character book (V2/V3)
            if (cardData.character_book?.entries) {
                const entries = Array.isArray(cardData.character_book.entries) ?
                    cardData.character_book.entries : Object.values(cardData.character_book.entries);

                entries.forEach(entry => {
                    // Handle both array and string key formats
                    const keys = Array.isArray(entry.key) ? entry.key :
                        typeof entry.key === 'string' ? entry.key.split(',') :
                            entry.keys || [];

                    keys.forEach(key => {
                        if (key && typeof key === 'string') {
                            keywords.add(key.trim().toLowerCase());
                        }
                    });
                });
            }

            // Extract from personality (key traits)
            const personality = cardData.personality || '';
            const traits = personality.match(/\b\w{4,}\b/g) || [];
            traits.slice(0, 5).forEach(trait => {
                keywords.add(trait.toLowerCase());
            });

            return Array.from(keywords);
        },

        // Enhanced response style analysis from old source (lines 583-629)
        analyzeResponseStyle(cardData) {
            const personality = (cardData.personality || '').toLowerCase();
            const description = (cardData.description || '').toLowerCase();
            const examples = (cardData.mes_example || '').toLowerCase();
            const combined = personality + ' ' + description + ' ' + examples;

            const style = {
                formality: 'casual',
                verbosity: 'medium',
                emotional: 'balanced',
                initiative: 'reactive'
            };

            // Analyze formality
            if (combined.includes('proper') || combined.includes('formal') ||
                combined.includes('polite') || combined.includes('courteous')) {
                style.formality = 'formal';
            }

            // Analyze verbosity
            const avgExampleLength = (cardData.mes_example || '').length;
            if (avgExampleLength > 600) style.verbosity = 'verbose';
            else if (avgExampleLength < 200) style.verbosity = 'brief';

            // Analyze emotional expression
            const emotionalWords = ['emotional', 'expressive', 'passionate', 'dramatic'];
            const reservedWords = ['stoic', 'calm', 'controlled', 'composed'];

            if (emotionalWords.some(word => combined.includes(word))) {
                style.emotional = 'expressive';
            } else if (reservedWords.some(word => combined.includes(word))) {
                style.emotional = 'reserved';
            }

            // Analyze initiative
            const proactiveWords = ['leader', 'assertive', 'dominant', 'commanding'];
            const passiveWords = ['follower', 'submissive', 'passive', 'obedient'];

            if (proactiveWords.some(word => combined.includes(word))) {
                style.initiative = 'proactive';
            } else if (passiveWords.some(word => combined.includes(word))) {
                style.initiative = 'passive';
            }

            return style;
        },

        async addCharacter(data) {
            try {
                const name = (data?.name || '').trim();
                if (!name) throw new Error('Character must have a name.');
                const oldName = (data?.__oldName || '').trim();

                // Build inner Tavern v2 object from provided fields if not already present
                let inner = {};
                // Start from original raw data if present (preserves unknown fields/extensions), then override with edits
                if (data?.rawData?.data) {
                    try { inner = JSON.parse(JSON.stringify(data.rawData.data)); } catch(_) { inner = data.rawData.data; }
                }
                inner = {
                    ...inner,
                    name,
                    description: (data?.description ?? inner.description) || '',
                    personality: (data?.personality ?? inner.personality) || '',
                    scenario: (data?.scenario ?? inner.scenario) || '',
                    mes_example: (data?.mes_example ?? inner.mes_example) || '',
                    first_mes: (data?.first_mes ?? inner.first_mes) || '',
                    creator: (data?.creator ?? inner.creator) || '',
                    creator_notes: (data?.creator_notes ?? inner.creator_notes) || '',
                    system_prompt: (data?.system_prompt ?? inner.system_prompt) || '',
                    post_history_instructions: (data?.post_history_instructions ?? inner.post_history_instructions) || '',
                    alternate_greetings: Array.isArray(data?.alternate_greetings) ? data.alternate_greetings : (inner.alternate_greetings || []),
                    character_book: (data?.character_book ?? inner.character_book) || null,
                    tags: Array.isArray(data?.tags) ? data.tags : (inner.tags || []),
                    character_version: data?.character_version || inner.character_version || data?.version || '1.0.0'
                };

                // If we have a PNG data URL, embed JSON into PNG; else store JSON-only
                let stored = { name, data: inner };
                if (data?.image || data?.avatar) {
                    const dataUrl = String(data.image || data.avatar);
                    if (dataUrl.startsWith('data:image/png;base64,')) {
                        try {
                            const b64 = dataUrl.split(',')[1];
                            const pngBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
                            const out = window.tavernTool?.embedIntoPng?.(pngBytes, inner);
                            if (out && out.length) {
                                let text = '';
                                for (let i = 0; i < Math.ceil(out.length / 32768.0); i++) {
                                    text += String.fromCharCode.apply(null, out.slice(i * 32768, Math.min((i + 1) * 32768, out.length)));
                                }
                                stored.image = `data:image/png;base64,${btoa(text)}`;
                            } else {
                                stored.image = dataUrl; // fallback
                            }
                        } catch(_) { stored.image = dataUrl; }
                    } else {
                        // Non-PNG provided; store JSON-only for compatibility
                        stored.image = undefined;
                    }
                } else {
                    // Preserve existing image if not provided in editData
                    try {
                        let existing = await window.getCharacterData?.(name);
                        if (!existing && oldName && oldName !== name) {
                            // Try previous name (rename case)
                            existing = await window.getCharacterData?.(oldName);
                        }
                        if (existing?.image) {
                            // Try to re-embed updated JSON into the existing PNG, so exports stay in sync
                            const exImg = String(existing.image);
                            if (exImg.startsWith('data:image/png;base64,') && window.tavernTool?.embedIntoPng) {
                                try {
                                    const b64 = exImg.split(',')[1];
                                    const pngBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
                                    const out = window.tavernTool.embedIntoPng(pngBytes, inner);
                                    if (out && out.length) {
                                        let text = '';
                                        for (let i = 0; i < Math.ceil(out.length / 32768.0); i++) {
                                            text += String.fromCharCode.apply(null, out.slice(i * 32768, Math.min((i + 1) * 32768, out.length)));
                                        }
                                        stored.image = `data:image/png;base64,${btoa(text)}`;
                                    } else {
                                        stored.image = existing.image;
                                    }
                                } catch(_) {
                                    stored.image = existing.image;
                                }
                            } else {
                                stored.image = existing.image;
                            }
                        }
                    } catch(_) {}
                }

                // Write through Esolite's own Library functions (id-based since 1.35;
                // see src/library/esoliteLibrary.js). A rename keeps the Library id.
                await EsoLibrary.saveCharacter({ inner, image: stored.image, oldName: oldName || null });
                await this.rebuildFromEsolite?.();
            } catch(e) {
                console.error('[CHARS] addCharacter error', e);
            }
        },

        extractTalkativeness(data) {
            const text = ((data.personality || '') + ' ' + (data.description || '')).toLowerCase();
            let score = 50;

            const talkativeWords = ['talkative', 'chatty', 'outgoing', 'verbose', 'loquacious'];
            const quietWords = ['quiet', 'shy', 'reserved', 'taciturn', 'silent'];

            talkativeWords.forEach(word => {
                if (text.includes(word)) score += 15;
            });

            quietWords.forEach(word => {
                if (text.includes(word)) score -= 15;
            });

            return Math.max(10, Math.min(100, score));
        },






        loadCharacter(char) {
            const mode = document.getElementById('char-import-mode')?.value || 'scenario';
            KLITE_RPMod.log('panels', `Loading character "${char.name}" as ${mode}`);

            switch (mode) {
                case 'scenario':
                    if (confirm(`Load "${char.name}" as scenario?`)) {
                        KLITE_RPMod.log('panels', 'User confirmed scenario load');
                        window.restart_new_game?.(false);

                        // Build comprehensive character context
                        let context = `[Character: ${char.name}]\n`;
                        if (char.description) context += `Description: ${char.description}\n`;
                        if (char.personality) context += `Personality: ${char.personality}\n`;
                        if (char.scenario) context += `Scenario: ${char.scenario}\n`;

                        KLITE_RPMod.log('panels', `Built character context (${context.length} chars)`);
                        window.current_memory = context;

                        // Set up chat mode
                        if (window.localsettings) {
                            KLITE_RPMod.log('panels', `Setting chat mode with opponent: ${char.name}`);
                            localsettings.opmode = 3; // Chat mode
                            localsettings.chatopponent = char.name;
                        }

                        // Add greeting based on activeGreeting setting
                        const characterData = char.rawData?.data || char.rawData || {};
                        let selectedGreeting = null;

                        if (char.activeGreeting === null || char.activeGreeting === undefined) {
                            // Use default first_mes
                            selectedGreeting = char.first_mes || characterData.first_mes;
                        } else if (typeof char.activeGreeting === 'number') {
                            // Use alternate greeting
                            const alternateGreetings = characterData.alternate_greetings || [];
                            selectedGreeting = alternateGreetings[char.activeGreeting] || char.first_mes || characterData.first_mes;
                        }

                        if (selectedGreeting) {
                            const greetingType = char.activeGreeting === null || char.activeGreeting === undefined ? 'default' : `alternate ${char.activeGreeting + 1}`;
                            KLITE_RPMod.log('panels', `Adding ${greetingType} greeting (${selectedGreeting.length} chars)`);
                            window.gametext_arr = [selectedGreeting];
                            try { if (!KLITE_RPMod.panels.ROLES?.enabled) KLITE_RPMod._pendingSingleRole = 'ai'; } catch (_) {}
                        }

                        window.render_gametext?.();
                        // Loaded ${char.name}
                        KLITE_RPMod.switchTab('right', 'MEMORY');
                    }
                    break;

                case 'worldinfo':
                    KLITE_RPMod.log('panels', `Adding "${char.name}" to World Info`);
                    this.addCharacterToWI(char);
                    KLITE_RPMod.switchTab('right', 'WI');
                    break;

                case 'memory':
                    KLITE_RPMod.log('panels', `Adding "${char.name}" to Memory`);
                    this.addCharacterToMemory(char);
                    KLITE_RPMod.switchTab('right', 'MEMORY');
                    break;
            }

            // Mark character as used for statistics
            KLITE_RPMod.markCharacterAsUsed(char.id);
        },


        // Complete Scenario Loading Implementation
        async loadAsScenario(character) {
            try {
                KLITE_RPMod.log('chars', `Starting loadAsScenario for character: ${character.name}`);

                if (!confirm(`Load "${character.name}" as scenario? This will restart the session and overwrite your current data.`)) {
                    KLITE_RPMod.log('chars', 'User cancelled scenario loading');
                    return;
                }

                KLITE_RPMod.log('chars', 'User confirmed scenario loading, proceeding...');

                // Clear current game state
                if (typeof window.restart_new_game === 'function') {
                    window.restart_new_game(false);
                    KLITE_RPMod.log('chars', 'Game state restarted');
                } else {
                    KLITE_RPMod.log('chars', 'Warning: restart_new_game function not available');
                }

                const characterData = character.rawData?.data || character.rawData || {};
                KLITE_RPMod.log('chars', 'Character data extracted', characterData);

                // 1. Load the selected active first message into the chat
                KLITE_RPMod.log('chars', 'Selecting greeting...');
                const selectedGreeting = await this.selectGreeting(character);
                KLITE_RPMod.log('chars', 'Selected greeting:', selectedGreeting);

                if (window.gametext_arr) {
                    window.gametext_arr = [selectedGreeting];
                    KLITE_RPMod.log('chars', 'Greeting added to gametext_arr');
                }

                // 2. Add description, personality and scenario into MEMORY
                KLITE_RPMod.log('chars', 'Building memory...');
                const memory = this.buildV3Memory(character);
                if (typeof window.current_memory !== 'undefined') {
                    window.current_memory = memory;
                    KLITE_RPMod.log('chars', 'Memory set:', memory);
                }

                // 3. Add Author's Note and Character's Note into AUTHOR'S NOTE
                const authorNoteParts = [];
                if (characterData.creator_notes && characterData.creator_notes.trim()) {
                    authorNoteParts.push(characterData.creator_notes.trim());
                    KLITE_RPMod.log('chars', 'Added creator_notes to author note');
                }
                if (characterData.system_prompt && characterData.system_prompt.trim()) {
                    authorNoteParts.push(characterData.system_prompt.trim());
                    KLITE_RPMod.log('chars', 'Added system_prompt to author note');
                }

                if (authorNoteParts.length > 0) {
                    window.current_anote = authorNoteParts.join('\n\n');
                    KLITE_RPMod.log('chars', 'Author note set:', window.current_anote);
                }

                // 4. Check for World Info and ask user about import
                KLITE_RPMod.log('chars', 'Checking for World Info...');
                const worldInfoEntries = this.extractWorldInfoEntries(characterData);
                if (worldInfoEntries.length > 0) {
                    KLITE_RPMod.log('chars', `Found ${worldInfoEntries.length} World Info entries`);
                    const importWI = confirm(`This character has ${worldInfoEntries.length} World Info entries. Import them to your World Info?`);
                    if (importWI) {
                        KLITE_RPMod.log('chars', 'User chose to import World Info');
                        await this.importCharacterWorldInfo(worldInfoEntries);
                    }
                }

                // 5. Set RP mode with character name
                if (window.localsettings) {
                    window.localsettings.opmode = 4; // RP mode
                    window.localsettings.chatopponent = character.name;
                    KLITE_RPMod.log('chars', 'Set RP mode and character name');
                }

                // Sync the UI to RP mode
                KLITE_RPMod.setMode(4);
                KLITE_RPMod.log('chars', 'UI synced to RP mode');

                // 6. Load the character into TOOLS panel
                if (KLITE_RPMod.panels.TOOLS) {
                    KLITE_RPMod.panels.TOOLS.selectedCharacter = character;
                    KLITE_RPMod.panels.TOOLS.characterEnabled = true;
                    KLITE_RPMod.panels.TOOLS.applyCharacterData(character);
                    KLITE_RPMod.log('chars', 'Character applied to TOOLS panel');
                } else {
                    KLITE_RPMod.log('chars', 'Warning: TOOLS panel not available');
                }

                // Disable ROLES if active
                if (KLITE_RPMod.panels.ROLES && KLITE_RPMod.panels.ROLES.enabled) {
                    KLITE_RPMod.panels.ROLES.enabled = false;
                    KLITE_RPMod.panels.ROLES.updateKoboldSettings();
                    KLITE_RPMod.log('chars', 'Disabled ROLES chat');
                }

                // Refresh visible panel without switching
                const activePanel = KLITE_RPMod.state?.tabs?.right;
                if (activePanel) {
                    KLITE_RPMod.loadPanel('right', activePanel);
                }

                // Apply V3-specific settings
                if (characterData.extensions) {
                    this.applyV3Extensions(characterData.extensions);
                    KLITE_RPMod.log('chars', 'Applied V3 extensions');
                }

                // Refresh UI
                if (typeof window.render_gametext === 'function') {
                    window.render_gametext();
                    KLITE_RPMod.log('chars', 'UI refreshed');
                }

                KLITE_RPMod.log('chars', `✅ "${character.name}" loaded as scenario successfully!`);
                alert(`"${character.name}" loaded as scenario successfully!`);

                // Close modal/detail view if open
                const modal = document.getElementById('char-modal-' + character.id);
                if (modal) modal.remove();

                // Return to main CHARS view if in detail view
                this.hideCharacterFullscreen();

            } catch (error) {
                KLITE_RPMod.error('Error loading character as scenario:', error);
                alert(`Failed to load character as scenario: ${error.message}`);
            }
        },

        // Intelligent memory building for V3 cards
        buildV3Memory(character) {
            const parts = [];
            const characterData = character.rawData?.data || character.rawData || {};

            // Character header
            parts.push(`[Character: ${character.name}]`);

            // Creator notes (V3 feature)
            if (characterData.creator_notes) {
                parts.push(`[Creator Notes: ${characterData.creator_notes}]`);
            }

            // Character version (V3 feature)
            if (characterData.character_version) {
                parts.push(`[Version: ${characterData.character_version}]`);
            }

            // Core character data
            if (characterData.description) {
                parts.push(`\n### Description\n${characterData.description}`);
            }

            if (characterData.personality) {
                parts.push(`\n### Personality\n${characterData.personality}`);
            }

            if (characterData.scenario) {
                parts.push(`\n### Scenario\n${characterData.scenario}`);
            }

            // Post-history instructions (V3 feature)
            if (characterData.post_history_instructions) {
                parts.push(`\n### Instructions\n${characterData.post_history_instructions}`);
            }

            // System prompt override (V3 feature)
            if (characterData.system_prompt) {
                parts.push(`\n### System Context\n${characterData.system_prompt}`);
            }

            // Tags (V3 feature)
            if (Array.isArray(characterData.tags) && characterData.tags.length > 0) {
                parts.push(`\n[Tags: ${characterData.tags.join(', ')}]`);
            }

            return parts.join('\n');
        },

        // Handle alternate greetings (V3 feature)
        async selectGreeting(character) {
            KLITE_RPMod.log('chars', 'selectGreeting: Starting greeting selection');
            const characterData = character.rawData?.data || character.rawData || {};

            KLITE_RPMod.log('chars', `selectGreeting: Character activeGreeting: ${character.activeGreeting}`);
            KLITE_RPMod.log('chars', 'selectGreeting: Available greetings:', {
                first_mes: !!characterData.first_mes,
                alternate_greetings: characterData.alternate_greetings?.length || 0
            });

            // Use the active greeting that's already selected for this character
            // activeGreeting: null/-1 = default first_mes, 0+ = alternate greeting index
            const activeGreetingIndex = character.activeGreeting;

            if (activeGreetingIndex === null || activeGreetingIndex === -1) {
                // Use default first message
                if (characterData.first_mes) {
                    KLITE_RPMod.log('chars', 'selectGreeting: Using default first_mes (active greeting)');
                    return characterData.first_mes;
                } else {
                    KLITE_RPMod.log('chars', 'selectGreeting: No first_mes found, using fallback');
                    return `Hello! I'm ${character.name}.`;
                }
            } else {
                // Use specific alternate greeting
                if (characterData.alternate_greetings &&
                    Array.isArray(characterData.alternate_greetings) &&
                    activeGreetingIndex < characterData.alternate_greetings.length) {

                    const selectedGreeting = characterData.alternate_greetings[activeGreetingIndex];
                    KLITE_RPMod.log('chars', `selectGreeting: Using alternate greeting ${activeGreetingIndex} (active greeting)`);
                    return selectedGreeting;
                } else {
                    KLITE_RPMod.log('chars', `selectGreeting: Active greeting index ${activeGreetingIndex} not found, falling back to first_mes`);
                    return characterData.first_mes || `Hello! I'm ${character.name}.`;
                }
            }
        },


        // Apply V3-specific extensions
        applyV3Extensions(extensions) {
            KLITE_RPMod.log('panels', 'Applying V3 extensions:', extensions);

            // Handle depth/frequency penalties
            if (extensions.depth_prompt) {
                // Apply to generation settings if available
                if (window.localsettings) {
                    // Apply depth prompt settings
                }
            }

            // Handle world info overrides
            if (extensions.world_info_override) {
                // Apply WI settings
            }

            // Handle other V3 extensions as needed
        },










        addCharacterToMemory(char) {
            const content = this.buildCharacterContent(char);

            if (window.current_memory) {
                window.current_memory += '\n\n' + content;
            } else {
                window.current_memory = content;
            }

            const liteMemory = document.getElementById('memorytext');
            if (liteMemory) {
                liteMemory.value = window.current_memory;
                liteMemory.dispatchEvent(new Event('input'));
            }

            // Added ${char.name} to Memory
        },

        buildCharacterContent(char) {
            let content = `[Character: ${char.name}]\n`;

            if (char.description) content += `Description: ${char.description}\n`;
            if (char.personality) content += `Personality: ${char.personality}\n`;
            if (char.scenario) content += `Background: ${char.scenario}\n`;
            if (char.mes_example) content += `\nExample Dialogue:\n${char.mes_example}\n`;

            return content;
        },







        setActiveGreeting(charId, greetingIndex) {
            const character = KLITE_RPMod.characters.find(c => c.id === charId);
            if (!character) return;

            // Set active greeting (null = default first_mes, 0+ = alternate greeting index)
            character.activeGreeting = greetingIndex === -1 ? null : greetingIndex;
            KLITE_RPMod.saveCharacters();

            // Refresh the fullscreen view if currently viewing this character
            const rightPanel = document.querySelector('div#content-right.klite-content');
            const backButton = rightPanel?.querySelector('button[onclick*="hideCharacterFullscreen"]');
            if (backButton) {
                // We're in fullscreen character view, refresh it
                this.showCharacterFullscreen(character);
            }

            const greetingName = greetingIndex === -1 ? 'default' : `alternate ${greetingIndex + 1}`;
            KLITE_RPMod.log('chars', `Set active greeting to ${greetingName} for character ${character.name}`);
        },


        showCharacterFullscreen(char) {
            // Instead of using separate panel, replace CHARS panel content
            const rightPanel = document.querySelector('div#content-right.klite-content');
            if (!rightPanel) return;

            const characterData = char.rawData?.data || char.rawData || {};
            // Prefer hydrated tags from char; fallback to embedded data tags
            const effectiveTags = (Array.isArray(char.tags) && char.tags.length > 0)
                ? char.tags
                : (Array.isArray(characterData?.tags) ? characterData.tags : []);

            // Extract greetings data
            const greetings = [];
            if (characterData.first_mes) {
                greetings.push({ label: 'Default Greeting', content: characterData.first_mes, index: -1 });
            }
            if (characterData.alternate_greetings && Array.isArray(characterData.alternate_greetings)) {
                characterData.alternate_greetings.forEach((greeting, i) => {
                    greetings.push({ label: `Alternate Greeting ${i + 1}`, content: greeting, index: i });
                });
            }

            // Extract WorldInfo entries
            const worldInfo = [];
            if (characterData.character_book?.entries) {
                const entries = Array.isArray(characterData.character_book.entries) ?
                    characterData.character_book.entries :
                    Object.values(characterData.character_book.entries);
                worldInfo.push(...entries);
            }

            // Replace the CHARS panel content with character details using proper t.section structure
            rightPanel.innerHTML = `
                <div class="klite-detail-head">
                    <h2 class="rpm-heading">${KLITE_RPMod.escapeHtml(char.name)}</h2>
                    <button class="btn btn-primary rpm-btn" onclick="KLITE_RPMod.panels.CHARS.hideCharacterFullscreen()">← Back</button>
                </div>

               ${t.section('Character Profile',
                `<div class="klite-profile">
                        ${char.image ? KLITE_RPMod.safeImageHTML(char.image, char.name || '', 'width: 100%; max-width: 200px; border-radius: 8px; margin-bottom: 8px;') : '<div class="klite-profile-noimg">👤</div>'}
                        <div class="rpm-heading">${KLITE_RPMod.escapeHtml(char.name)}</div>
                        <div class="rpm-muted">by ${KLITE_RPMod.panels.CHARS.escapeHTML(characterData?.creator || 'Unknown')}</div>
                    </div>`
            )}
          
               ${t.section('Tags',
                `<div id="tags-container-${char.id}" class="rpm-wrap rpm-mb">
                        ${(effectiveTags || []).map(tag => {
                            const t = KLITE_RPMod.panels.CHARS.escapeHTML(String(tag || ''));
                            return `
                            <span class="rpm-chip klite-tag-pill" role="button" data-tag="${t}" onclick="KLITE_RPMod.panels.CHARS.toggleTagSelection(this)">${t}</span>`;
                        }).join(' ')}
                    </div>
                    <div class="rpm-row">
                        <button class="btn btn-primary rpm-btn" onclick="KLITE_RPMod.panels.CHARS.addTag(${char.id})">Add Tag</button>
                        <button class="btn btn-primary rpm-btn rpm-danger disabled" id="remove-tag-btn-${char.id}" onclick="KLITE_RPMod.panels.CHARS.removeSelectedTags(${char.id})" disabled>✕ Remove Selected</button>
                    </div>`
            )}
                
                ${t.section('Rating',
                `<select class="form-control rpm-input" onchange="KLITE_RPMod.panels.CHARS.updateCharacterRating(${char.id}, this.value)">
                        <option value="0" ${char.rating === 0 ? 'selected' : ''}>☆ Unrated</option>
                        <option value="1" ${char.rating === 1 ? 'selected' : ''}>★☆☆☆☆</option>
                        <option value="2" ${char.rating === 2 ? 'selected' : ''}>★★☆☆☆</option>
                        <option value="3" ${char.rating === 3 ? 'selected' : ''}>★★★☆☆</option>
                        <option value="4" ${char.rating === 4 ? 'selected' : ''}>★★★★☆</option>
                        <option value="5" ${char.rating === 5 ? 'selected' : ''}>★★★★★</option>
                    </select>`
            )}
                
                ${t.section('Actions',
                `<div class="rpm-stack">
                        <button class="btn btn-primary rpm-btn" data-action="export-char-json" data-char-name="${KLITE_RPMod.panels.CHARS.escapeHTML(char.name)}" data-char-id="${char.id}">Export as JSON</button>
                        <button class="btn btn-primary rpm-btn" data-action="export-char-png" data-char-name="${KLITE_RPMod.panels.CHARS.escapeHTML(char.name)}" data-char-id="${char.id}">Export as V2 PNG</button>
                        <button class="btn btn-primary rpm-btn" data-action="edit-character" data-char-id="${char.id}" data-char-name="${KLITE_RPMod.panels.CHARS.escapeHTML(char.name)}">✏️ Edit</button>
                        <button class="btn btn-primary rpm-btn" data-action="clone-character" data-char-id="${char.id}" data-char-name="${KLITE_RPMod.panels.CHARS.escapeHTML(char.name)}">📄 Clone</button>
                        <button class="btn btn-primary rpm-btn rpm-danger" data-action="delete-char-modal" data-char-id="${char.id}" data-char-name="${KLITE_RPMod.panels.CHARS.escapeHTML(char.name)}">Delete Character</button>
                    </div>`
            )}
                
                ${characterData.description ? t.section('Description', `<div class=\"klite-pre\">${KLITE_RPMod.escapeHtml(characterData.description)}</div>`) : ''}
                ${characterData.personality ? t.section('Personality', `<div class=\"klite-pre\">${KLITE_RPMod.escapeHtml(characterData.personality)}</div>`) : ''}
                ${characterData.scenario ? t.section('Scenario', `<div class=\"klite-pre\">${KLITE_RPMod.escapeHtml(characterData.scenario)}</div>`) : ''}
                ${characterData.creator_notes ? t.section('Creator Notes', `<div class=\"klite-pre\">${KLITE_RPMod.escapeHtml(characterData.creator_notes)}</div>`) : ''}
                ${characterData.post_history_instructions ? t.section('Post History Instructions', `<div class=\"klite-pre\">${KLITE_RPMod.escapeHtml(characterData.post_history_instructions)}</div>`) : ''}
                ${characterData.mes_example ? t.section('Example Messages', `<div class=\"klite-pre\">${KLITE_RPMod.escapeHtml(characterData.mes_example)}</div>`) : ''}
                ${characterData.system_prompt ? t.section('System Prompt', `<div class=\"klite-pre\">${KLITE_RPMod.escapeHtml(characterData.system_prompt)}</div>`) : ''}
                ${characterData.jailbreak ? t.section('Jailbreak', `<div class=\"klite-pre\">${KLITE_RPMod.escapeHtml(characterData.jailbreak)}</div>`) : ''}
                ${characterData.depth_prompt_prompt ? t.section('Depth Prompt', `<div class=\"klite-pre\">${KLITE_RPMod.escapeHtml(characterData.depth_prompt_prompt)}</div>`) : ''}
                
                ${greetings.length > 0 ? t.section(`First Messages (${greetings.length})`,
                greetings.map(greeting => `
                        <div class="klite-entry ${greeting.index === (char.activeGreeting ?? -1) ? 'klite-entry-active' : ''}">
                            <div class="klite-entry-head">
                                <strong>${greeting.label} ${greeting.index === (char.activeGreeting ?? -1) ? '(Active)' : ''}</strong>
                                ${greeting.index !== (char.activeGreeting ?? -1) ? `<button class="btn btn-primary rpm-btn" onclick="KLITE_RPMod.panels.CHARS.setActiveGreeting(${char.id}, ${greeting.index})">Set</button>` : ''}
                            </div>
                            <div class="klite-pre">${KLITE_RPMod.escapeHtml(greeting.content || '')}</div>
                        </div>
                    `).join('')
            ) : ''}
                
                ${worldInfo.length > 0 ? t.section(`World Info / Character Book (${worldInfo.length})`,
                worldInfo.map((entry, i) => `
                        <div class="klite-entry">
                            <div class="klite-entry-head">
                                <strong>Entry ${i + 1}</strong>
                                <button class="btn btn-primary rpm-btn" onclick="KLITE_RPMod.panels.CHARS.importWorldInfoEntry(${KLITE_RPMod.escapeHtml(JSON.stringify(entry))})">📥 Import to WI</button>
                            </div>
                            <div class="rpm-mb"><strong>Keys:</strong> ${(entry.keys || []).map(k => KLITE_RPMod.escapeHtml(String(k))).join(', ')}</div>
                            <div class="klite-pre">${KLITE_RPMod.escapeHtml(entry.content || '')}</div>
                        </div>
                    `).join('')
            ) : ''}
            `;

            // Set up event delegation for the detail view content
            this.setupDetailViewEventHandlers(rightPanel, char);

            // Character fullscreen view ready - all sections start expanded
            KLITE_RPMod.log('chars', 'Character fullscreen view ready with all sections expanded');

            // Keep a reference to the current detail character to preserve enriched fields (e.g., image, tags)
            try {
                this._currentDetailChar = char;
                // Enrich the list model with any newly loaded fields so future lookups keep image/rawData
                const listChar = KLITE_RPMod.characters.find(c => c.id == char.id);
                if (listChar) {
                    if (!listChar.image && char.image) listChar.image = char.image;
                    if (!listChar.thumbnail && char.thumbnail) listChar.thumbnail = char.thumbnail;
                    if (!listChar.rawData && char.rawData) listChar.rawData = char.rawData;
                    // Persist hydrated tags into list model and refresh tag filter dropdown
                    if ((!Array.isArray(listChar.tags) || listChar.tags.length === 0) && Array.isArray(effectiveTags) && effectiveTags.length > 0) {
                        listChar.tags = effectiveTags.slice();
                        try { KLITE_RPMod.saveCharacters?.(); } catch(_) {}
                        try { this.refreshTagDropdown?.(); } catch(_) {}
                    }
                }
            } catch(_) {}
        },

        // Consolidated: rely on the CHARS panel's generic action delegation
        setupDetailViewEventHandlers(rightPanel, char) {
            try {
                if (rightPanel && rightPanel._detailEventHandler) {
                    rightPanel.removeEventListener('click', rightPanel._detailEventHandler);
                    rightPanel._detailEventHandler = null;
                }
            } catch(_) {}
            KLITE_RPMod.log('chars', 'Using generic CHARS action handler for detail view');
        },

        hideCharacterFullscreen() {
            // Clean up detail view event handlers
            const rightPanel = document.querySelector('div#content-right.klite-content');
            if (rightPanel && rightPanel._detailEventHandler) {
                rightPanel.removeEventListener('click', rightPanel._detailEventHandler);
                rightPanel._detailEventHandler = null;
                KLITE_RPMod.log('chars', 'Detail view event handlers cleaned up');
            }

            // Clear current detail reference
            this._currentDetailChar = null;

            // Restore normal CHARS panel view
            KLITE_RPMod.loadPanel('right', 'CHARS');
        },

        // Extract World Info entries from character data
        extractWorldInfoEntries(characterData) {
            const entries = [];

            // V3 character book format
            if (characterData.character_book?.entries) {
                const bookEntries = Array.isArray(characterData.character_book.entries) ?
                    characterData.character_book.entries :
                    Object.values(characterData.character_book.entries);
                entries.push(...bookEntries);
            }

            // V2 world_info format (legacy)
            if (characterData.world_info && Array.isArray(characterData.world_info)) {
                entries.push(...characterData.world_info);
            }

            return entries.filter(entry => entry && (entry.content || entry.entry));
        },

        // Import character World Info entries to main WI system
        async importCharacterWorldInfo(worldInfoEntries) {
            let importedCount = 0;

            // Check if entries have explicit group names
            const firstEntry = worldInfoEntries[0];
            const hasExplicitGroup = firstEntry && (firstEntry.group || firstEntry.wigroup);

            let userGroupName = '';
            if (!hasExplicitGroup) {
                // Ask user for group name
                userGroupName = prompt('Enter a group name for the imported World Info entries (leave empty for General):') || '';
                KLITE_RPMod.log('chars', `User chose group name: "${userGroupName}"`);
            }

            for (const entry of worldInfoEntries) {
                // Convert to KoboldAI Lite's World Info format
                const keys = entry.keys || entry.key || [];
                const keyList = Array.isArray(keys) ? keys :
                    typeof keys === 'string' ? keys.split(',').map(k => k.trim()) : [];

                const secondary = entry.keysecondary || entry.secondary || [];
                const secondaryList = Array.isArray(secondary) ? secondary :
                    typeof secondary === 'string' ? secondary.split(',').map(k => k.trim()) : [];

                // Use explicit group from character data, or user-provided group name
                const groupName = entry.group || entry.wigroup || userGroupName;

                const normalizedEntry = {
                    key: keyList.join(', '),
                    keysecondary: secondaryList.join(', '),
                    keyanti: entry.keyanti || '',
                    content: entry.content || entry.entry || '',
                    wiposition: entry.position || entry.wiposition || 'after',
                    widisabled: entry.enabled === false || entry.disabled === true,
                    wicasesensitive: entry.case_sensitive || entry.wicasesensitive || false,
                    wiselective: entry.selective || entry.wiselective || false,
                    wipriority: entry.priority || entry.wipriority || 400,
                    wiorder: entry.order || entry.wiorder || 100,
                    wicomment: entry.comment || `Imported from character`,
                    wigroup: groupName,
                    constant: entry.constant || false
                };

                // Only import if has meaningful content
                if (normalizedEntry.content.trim() && normalizedEntry.key.trim()) {
                    // Add to KoboldAI Lite's native World Info system
                    if (!window.current_wi) {
                        window.current_wi = [];
                    }
                    window.current_wi.push(normalizedEntry);
                    importedCount++;

                    KLITE_RPMod.log('chars', `Added WI entry: ${normalizedEntry.key}`);
                }
            }

            if (importedCount > 0) {
                // Save to KoboldAI Lite / Esolite native storage system
                if (typeof window.save_wi === 'function') {
                    window.save_wi();
                    KLITE_RPMod.log('chars', 'Saved WI using KoboldAI Lite/Esolite native function');
                } else {
                    KLITE_RPMod.log('chars', 'Warning: save_wi function not available');
                }

        // Sync our WI panel's pending state to the updated WI data
                if (KLITE_RPMod.panels.WI) {
                    KLITE_RPMod.panels.WI.pendingWI = JSON.parse(JSON.stringify(window.current_wi || []));
                    if (KLITE_RPMod.state.tabs.right === 'WI') {
                        KLITE_RPMod.panels.WI.refresh();
                    }
                }

                // Also refresh native WI UI if it exists
                if (typeof window.wi_refresh === 'function') {
                    window.wi_refresh();
                }

                // Commit changes if host exposes helper (Esolite)
                try { if (typeof window.commit_wi_changes === 'function') window.commit_wi_changes(); } catch(_) {}

                // Commit WI changes if host exposes this helper (Esolite)
                try { if (typeof window.commit_wi_changes === 'function') window.commit_wi_changes(); } catch(_) {}

                KLITE_RPMod.log('chars', `✅ Imported ${importedCount} World Info entries to KoboldAI Lite WI system`);
            }

            return importedCount;
        },

        // Import a single WI entry (from details view button) using Esolite WI
        async importWorldInfoEntry(entry) {
            if (!entry) return 0;
            try {
                return await this.importCharacterWorldInfo([entry]);
            } catch (e) {
                KLITE_RPMod.error('Failed to import WI entry', e);
                return 0;
            }
        },

        toggleTagSelection(tagElement) {
            tagElement.classList.toggle('selected');
            const isSelected = tagElement.classList.contains('selected');

            tagElement.setAttribute('aria-pressed', String(isSelected));   // look: .klite-tag-pill.selected

            // Enable/disable remove button based on selections
            const container = tagElement.closest('[id^="tags-container-"]');
            const charId = container.id.replace('tags-container-', '');
            const removeBtn = document.getElementById(`remove-tag-btn-${charId}`);
            const hasSelected = container.querySelectorAll('.klite-tag-pill.selected').length > 0;

            if (removeBtn) {
                if (hasSelected) {
                    removeBtn.disabled = false;
                    removeBtn.classList.remove('disabled');
                } else {
                    removeBtn.disabled = true;
                    removeBtn.classList.add('disabled');
                }
            }
        },

        removeSelectedTags(charId) {
            const char = KLITE_RPMod.characters.find(c => c.id == charId);
            if (!char) return;

            const container = document.getElementById(`tags-container-${charId}`);
            const selectedTags = container.querySelectorAll('.klite-tag-pill.selected');

            if (selectedTags.length === 0) return;

            const tagsToRemove = Array.from(selectedTags).map(el => el.dataset.tag);

            if (confirm(`Remove ${tagsToRemove.length} selected tag(s)?`)) {
                tagsToRemove.forEach(tag => {
                    const tagIndex = char.tags.indexOf(tag);
                    if (tagIndex > -1) {
                        char.tags.splice(tagIndex, 1);
                    }
                });

                KLITE_RPMod.saveCharacters();
                // Refresh fullscreen view if currently viewing this character
                const rightPanel = document.querySelector('div#content-right.klite-content');
                const backButton = rightPanel?.querySelector('button[onclick*="hideCharacterFullscreen"]');
                if (backButton) {
                    try { if (this._currentDetailChar && this._currentDetailChar.id == char.id) this._currentDetailChar.tags = char.tags.slice(); } catch(_) {}
                    this.showCharacterFullscreen(this._currentDetailChar && this._currentDetailChar.id == char.id ? this._currentDetailChar : char);
                }
                // Removed ${tagsToRemove.length} tag(s) from ${char.name}
            }
        },

        // =============================================
        // MULTI-TIER IMAGE STORAGE OPTIMIZATION
        // =============================================






        // =============================================
        // AVATAR CACHING SYSTEM
        // =============================================

        avatarCache: null, // Will be initialized safely

        initAvatarCache() {
            if (!this.avatarCache) {
                try {
                    this.avatarCache = new Map();
                    KLITE_RPMod.log('chars', '🖼️ Avatar cache initialized');
                } catch (error) {
                    KLITE_RPMod.log('chars', 'Avatar cache initialization failed, using fallback');
                    this.avatarCache = {
                        get: () => null,
                        set: () => { },
                        delete: () => { },
                        clear: () => { },
                        size: 0
                    };
                }
            }
        },

        getOptimizedAvatar(characterId, type = 'avatar') {
            this.initAvatarCache();
            const cacheKey = `${characterId}_${type}`;
            return this.avatarCache.get(cacheKey);
        },



        refresh() {
            // Clean up any detail view event handlers before refreshing
            const rightPanel = document.querySelector('div#content-right.klite-content');
            if (rightPanel && rightPanel._detailEventHandler) {
                rightPanel.removeEventListener('click', rightPanel._detailEventHandler);
                rightPanel._detailEventHandler = null;
                KLITE_RPMod.log('chars', 'Cleaned up detail view event handlers on refresh');
            }

            KLITE_RPMod.loadPanel('right', 'CHARS');
        },

        // ==============================
        // Esolite adapter and sync layer
        // ==============================
        installEsoliteAdapter() {
            // Rebuild characters from esolite immediately, then hook updates
            this.rebuildFromEsolite?.();

            // Hook into Esolite's list updater if available
            try {
                const origUpd = window.updateCharacterListFromAll;
                if (typeof origUpd === 'function' && !origUpd.__klite_rpmod_wrapped) {
                    window.updateCharacterListFromAll = async function() {
                        try { await origUpd.apply(this, arguments); } catch(_) {}
                        try { KLITE_RPMod?.panels?.CHARS?.rebuildFromEsolite?.(); } catch(_) {}
                    };
                    window.updateCharacterListFromAll.__klite_rpmod_wrapped = true;
                }
            } catch(_) {}

            // Also listen for explicit esolite events so we sync on initial load and debounced saves
            try {
                const onSync = () => { try { KLITE_RPMod?.panels?.CHARS?.rebuildFromEsolite?.(); } catch(_) {} };
                document.removeEventListener('esolite:characterListUpdated', onSync);
                document.removeEventListener('esolite:characterListLoaded', onSync);
                document.addEventListener('esolite:characterListUpdated', onSync);
                document.addEventListener('esolite:characterListLoaded', onSync);
            } catch(_) {}

            // Periodic safety sync (in case external code bypasses wrapper)
            if (!this._esoliteSyncTimer) {
                this._esoliteSyncTimer = setInterval(() => {
                    try { this.rebuildFromEsolite?.(); } catch(_) {}
                }, 5000);
            }
        },

        getEsoliteCharacterList() {
            try {
                if (typeof allCharacterNames !== 'undefined' && Array.isArray(allCharacterNames)) {
                    return allCharacterNames;
                }
            } catch(_) {}
            try {
                if (Array.isArray(window.allCharacterNames)) {
                    return window.allCharacterNames;
                }
            } catch(_) {}
            return [];
        },

        // List available WI groups from Esolite UI or data
        getEsoliteWIGroups() {
            const out = new Set();
            try {
                // Prefer UI buttons container if present
                const btns = document.querySelectorAll('#wi_tab_container #wigroupsbuttons button');
                btns.forEach(b => { const t = (b.textContent||'').trim(); if (t) out.add(t); });
            } catch(_) {}
            try {
                // Fallback: derive from in-memory WI entries
                const wi = Array.isArray(window.current_wi) ? window.current_wi : [];
                wi.forEach(e => { const g = (e && (e.wigroup||e.group||'')); if (g && String(g).trim()) out.add(String(g).trim()); });
            } catch(_) {}
            const arr = Array.from(out);
            arr.sort((a,b)=>a.localeCompare(b));
            return arr;
        },

        // Check if a character name is already used (case-insensitive)
        isCharacterNameTaken(name) {
            try {
                if (!name) return false;
                const target = String(name).trim().toLowerCase();
                // Check current lightweight list
                if (Array.isArray(KLITE_RPMod.characters)) {
                    if (KLITE_RPMod.characters.some(c => String(c?.name || '').trim().toLowerCase() === target)) return true;
                }
                // Check Esolite list metas/strings
                const list = this.getEsoliteCharacterList();
                if (Array.isArray(list)) {
                    for (const m of list) {
                        const nm = typeof m === 'string' ? m : (m && m.name) ? m.name : '';
                        if (String(nm).trim().toLowerCase() === target) return true;
                    }
                }
            } catch(_) {}
            return false;
        },

        async fetchEsoliteCharacterList() {
            const list = this.getEsoliteCharacterList();
            if (Array.isArray(list) && list.length > 0) return list;
            try {
                const raw = await window.indexeddb_load?.('characterList', '[]');
                const arr = JSON.parse(raw || '[]');
                if (Array.isArray(arr)) return arr;
            } catch(_) {}
            return [];
        },


        async rebuildFromEsolite() {
            if (this._rebuilding) return;
            this._rebuilding = true;
            try {
                const list = await this.fetchEsoliteCharacterList();
                // Only consider actual Characters for the CHAR gallery
                const charMetas = list.filter(m => (m?.type || 'Character') === 'Character');

                // Fast no-op: if names unchanged and counts equal, skip heavy re-render
                const namesKey = charMetas.map(m => (m?.name || '')).join('\u0001');
                if (this._lastNamesKey === namesKey && this._esoliteLastCount === charMetas.length && Array.isArray(KLITE_RPMod.characters) && KLITE_RPMod.characters.length === charMetas.length) {
                    return;
                }

                this._esoliteLastCount = charMetas.length;
                this._lastNamesKey = namesKey;

                // Build lightweight view model only from metadata; defer heavy loads
                // Merge persisted fields (rating, tags, talkativeness, keywords) from existing list
                const built = [];
                let existingByName = new Map();
                try {
                    if (Array.isArray(KLITE_RPMod.characters)) {
                        existingByName = new Map(KLITE_RPMod.characters.map(c => [String(c?.name || ''), c]));
                    }
                } catch(_) {}
                for (let i = 0; i < charMetas.length; i++) {
                    const meta = charMetas[i];
                    if (!meta?.name) continue;
                    const prev = existingByName.get(String(meta.name)) || {};
                    built.push({
                        id: i + 1,
                        name: meta.name,
                        created: (typeof meta?.created === 'number' ? meta.created : (typeof prev?.created === 'number' ? prev.created : i)),
                        // Lightweight fields; details loaded on demand
                        // Leave empty initially so background hydration can fill real creator
                        creator: (typeof prev?.creator === 'string') ? prev.creator : '',
                        rating: typeof prev?.rating === 'number' ? prev.rating : 0,
                        talkativeness: typeof prev?.talkativeness === 'number' ? prev.talkativeness : 0,
                        tags: Array.isArray(prev?.tags) ? prev.tags.slice() : [],
                        keywords: Array.isArray(prev?.keywords) ? prev.keywords.slice() : [],
                        // Use small thumbnail only for gallery
                        thumbnail: meta?.thumbnail || prev?.thumbnail || null,
                        image: null,
                        rawData: null,
                    });
                }
                KLITE_RPMod.characters = built;
                this.refreshGallery?.();
                try { this.refreshTagDropdown?.(); } catch(_) {}
                // Avoid re-entrant loop: do not refresh ROLES while ROLES is initializing
                if (!KLITE_RPMod._inRolesInit) {
                    try { KLITE_RPMod.panels.ROLES?.refresh?.(); } catch(_) {}
                }

                // Background tag hydration: fetch tags from Esolite for entries missing tags
                // Runs non-blocking with throttling; persists and refreshes tag filter when updated
                if (!this._tagHydrationInFlight && typeof window.getCharacterData === 'function') {
                    this._tagHydrationInFlight = true;
                    setTimeout(() => {
                        (async () => {
                            try {
                                const candidates = (KLITE_RPMod.characters || []).filter(c => (!Array.isArray(c.tags) || c.tags.length === 0 || c.creator === 'Unknown' || !c.creator) && c?.name);
                                let updated = 0;
                                for (let i = 0; i < candidates.length; i++) {
                                    const c = candidates[i];
                                    try {
                                        const d = await window.getCharacterData(c.name);
                                        const tags = Array.isArray(d?.data?.tags) ? d.data.tags.filter(t => !!t && String(t).trim().length > 0) : [];
                                        const creator = d?.data?.creator;
                                        if (tags.length > 0 || (creator && (!c.creator || c.creator === 'Unknown'))) {
                                            // Update the live reference in KLITE_RPMod.characters
                                            const ref = KLITE_RPMod.characters.find(x => x.id == c.id) || c;
                                            if (tags.length > 0) ref.tags = tags.slice();
                                            if (creator && (!ref.creator || ref.creator === 'Unknown')) {
                                                ref.creator = creator;
                                                try {
                                                    const card = document.querySelector(`#char-gallery [data-char-id="${ref.id}"] .klite-char-creator`);
                                                    if (card) card.textContent = `by ${ref.creator || 'Unknown'}`;
                                                } catch(_) {}
                                            }
                                            updated++;
                                            // Debounced save
                                            if (!this._hydrateSaveTimer) {
                                                this._hydrateSaveTimer = setTimeout(() => { try { KLITE_RPMod.saveCharacters?.(); } finally { this._hydrateSaveTimer = null; } }, 750);
                                            }
                                            // Occasionally refresh tag dropdown so filters appear without waiting for end
                                            if (updated % 5 === 0) {
                                                try { this.refreshTagDropdown?.(); } catch(_) {}
                                            }
                                        }
                                    } catch (_) { /* skip on error */ }
                                    // Yield between items to keep UI responsive
                                    await new Promise(r => setTimeout(r, 60));
                                }
                                if (updated > 0) {
                                    try { KLITE_RPMod.saveCharacters?.(); } catch(_) {}
                                    try { this.refreshTagDropdown?.(); } catch(_) {}
                                }
                            } finally {
                                this._tagHydrationInFlight = false;
                            }
                        })();
                    }, 100);
                }
            } catch(e) {
                // ignore
            } finally {
                this._rebuilding = false;
            }
        },


        // Convert base64 data URL to Uint8Array
        _dataURLToUint8(dataURL) {
            try {
                const parts = String(dataURL).split(',');
                const b64 = parts[1] || '';
                const bin = atob(b64);
                const out = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
                return out;
            } catch (_) { return null; }
        },

        // Try to convert any image data URL to PNG Uint8Array; returns null on failure
        async _imageDataUrlToPngUint8(dataURL) {
            try {
                if (/^data:image\/png/i.test(String(dataURL))) {
                    return this._dataURLToUint8(dataURL);
                }
                // Render into canvas and export as PNG
                const img = new Image();
                // Ensure same-origin for data URLs
                img.crossOrigin = 'anonymous';
                const loaded = new Promise((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = (e) => reject(e);
                });
                img.src = dataURL;
                await loaded;
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width || 1;
                canvas.height = img.naturalHeight || img.height || 1;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const pngUrl = canvas.toDataURL('image/png');
                return this._dataURLToUint8(pngUrl);
            } catch (_) { return null; }
        },

        // CRC32 implementation for ZIP
        _crc32(bytes) {
            let crc = 0 ^ (-1);
            for (let i = 0; i < bytes.length; i++) {
                crc = (crc >>> 8) ^ this._crcTable[(crc ^ bytes[i]) & 0xFF];
            }
            return (crc ^ (-1)) >>> 0;
        },
        _makeCrcTable() {
            const table = new Uint32Array(256);
            for (let n = 0; n < 256; n++) {
                let c = n;
                for (let k = 0; k < 8; k++) {
                    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                }
                table[n] = c >>> 0;
            }
            return table;
        },
        _crcTable: null,
        _ensureCrc() { if (!this._crcTable) this._crcTable = this._makeCrcTable(); },

        _dosTimeDate(d = new Date()) {
            // Returns { time, date } packed DOS format
            const year = d.getFullYear();
            const dosDate = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
            const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | ((d.getSeconds() / 2) | 0);
            return { time: dosTime & 0xFFFF, date: dosDate & 0xFFFF };
        },

        _writeU16LE(buf, off, val) { buf[off] = val & 0xFF; buf[off + 1] = (val >>> 8) & 0xFF; },
        _writeU32LE(buf, off, val) {
            buf[off] = val & 0xFF;
            buf[off + 1] = (val >>> 8) & 0xFF;
            buf[off + 2] = (val >>> 16) & 0xFF;
            buf[off + 3] = (val >>> 24) & 0xFF;
        },

        _buildZip(files) {
            // files: [{ name: string, data: Uint8Array, date?: Date }]
            this._ensureCrc();
            const chunks = [];
            const central = [];
            let offset = 0;
            const now = new Date();

            files.forEach(({ name, data, date }) => {
                const utf8name = new TextEncoder().encode(name);
                const { time, date: dosDate } = this._dosTimeDate(date || now);
                const crc = this._crc32(data);
                const compMethod = 0; // store

                // Local File Header
                const lfHeader = new Uint8Array(30 + utf8name.length);
                this._writeU32LE(lfHeader, 0, 0x04034b50);
                this._writeU16LE(lfHeader, 4, 20);
                this._writeU16LE(lfHeader, 6, 0);
                this._writeU16LE(lfHeader, 8, compMethod);
                this._writeU16LE(lfHeader, 10, time);
                this._writeU16LE(lfHeader, 12, dosDate);
                this._writeU32LE(lfHeader, 14, crc);
                this._writeU32LE(lfHeader, 18, data.length);
                this._writeU32LE(lfHeader, 22, data.length);
                this._writeU16LE(lfHeader, 26, utf8name.length);
                this._writeU16LE(lfHeader, 28, 0);
                lfHeader.set(utf8name, 30);

                chunks.push(lfHeader);
                chunks.push(data);

                // Central Directory Header
                const cdHeader = new Uint8Array(46 + utf8name.length);
                this._writeU32LE(cdHeader, 0, 0x02014b50);
                this._writeU16LE(cdHeader, 4, 20);
                this._writeU16LE(cdHeader, 6, 20);
                this._writeU16LE(cdHeader, 8, 0);
                this._writeU16LE(cdHeader, 10, compMethod);
                this._writeU16LE(cdHeader, 12, time);
                this._writeU16LE(cdHeader, 14, dosDate);
                this._writeU32LE(cdHeader, 16, crc);
                this._writeU32LE(cdHeader, 20, data.length);
                this._writeU32LE(cdHeader, 24, data.length);
                this._writeU16LE(cdHeader, 28, utf8name.length);
                this._writeU16LE(cdHeader, 30, 0);
                this._writeU16LE(cdHeader, 32, 0);
                this._writeU16LE(cdHeader, 34, 0);
                this._writeU16LE(cdHeader, 36, 0);
                this._writeU32LE(cdHeader, 38, 0);
                this._writeU32LE(cdHeader, 42, offset);
                cdHeader.set(utf8name, 46);

                central.push(cdHeader);
                offset += lfHeader.length + data.length;
            });

            // Concatenate chunks and central directory
            let totalSize = 0;
            chunks.forEach(c => totalSize += c.length);
            const centralOffset = totalSize;
            central.forEach(c => totalSize += c.length);

            // End of central directory
            const end = new Uint8Array(22);
            this._writeU32LE(end, 0, 0x06054b50);
            this._writeU16LE(end, 4, 0);
            this._writeU16LE(end, 6, 0);
            this._writeU16LE(end, 8, files.length);
            this._writeU16LE(end, 10, files.length);
            let centralSize = 0; central.forEach(c => centralSize += c.length);
            this._writeU32LE(end, 12, centralSize);
            this._writeU32LE(end, 16, centralOffset);
            this._writeU16LE(end, 20, 0);

            totalSize += end.length;
            const out = new Uint8Array(totalSize);
            let pos = 0;
            chunks.forEach(c => { out.set(c, pos); pos += c.length; });
            central.forEach(c => { out.set(c, pos); pos += c.length; });
            out.set(end, pos);
            return out;
        },

        async exportCharactersAsZip(names = null) {
            try {
                let charNames = names;
                if (!Array.isArray(charNames)) {
                    const list = this.getEsoliteCharacterList();
                    charNames = list.map(m => typeof m === 'string' ? m : (m && m.name) ? m.name : null).filter(Boolean);
                }
                if (!charNames.length) { try { alert('No characters found to export.'); } catch(_) {} return; }

                const files = [];
                for (const name of charNames) {
                    try {
                        const d = await window.getCharacterData?.(name);
                        if (!d) continue;
                        const safe = String(name).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');

                        let data = null;
                        let filename = null;
                        if (d.image && /^data:image\//.test(String(d.image))) {
                            const pngBytes = await this._imageDataUrlToPngUint8(String(d.image));
                            if (pngBytes && pngBytes.length) {
                                data = pngBytes;
                                filename = `${safe}.png`;
                            }
                        }
                        if (!data) {
                            const json = JSON.stringify(d.data || {}, null, 2);
                            data = new TextEncoder().encode(json);
                            filename = `${safe}.json`;
                        }
                        files.push({ name: filename, data });
                    } catch (_) {}
                }

                if (!files.length) { try { alert('No exportable character data found.'); } catch(_) {} return; }
                const zipBytes = this._buildZip(files);
                const blob = new Blob([zipBytes], { type: 'application/zip' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'characters.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            } catch (e) {
                KLITE_RPMod.error('ZIP export failed', e);
                throw e;
            }
        },

        async deleteCharacterByName(name) {
            try {
                if (!name) return;
                // Esolite's Library functions (id-based storage key and list entry)
                await EsoLibrary.deleteCharacter(name);

                // As a fallback, rebuild our gallery model
                try { await this.rebuildFromEsolite?.(); } catch(_) {}
            } catch(_) {}
        },


        async exportCharacterJSONByName(name) {
            try {
                const d = await window.getCharacterData?.(name);
                if (!d) return;
                const text = JSON.stringify(d.data || {}, null, 2);
                const a = document.createElement('a');
                a.href = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(text)));
                a.download = `${name}.json`;
                a.click();
            } catch(_) {}
        },

        async exportCharacterPNGByName(name) {
            try {
                const d = await window.getCharacterData?.(name);
                if (!d) return;
                if (d.image) {
                    const a = document.createElement('a');
                    a.href = d.image;
                    a.download = `${name}.png`;
                    a.click();
                } else {
                    // Fallback: JSON if no image present
                    await this.exportCharacterJSONByName(name);
                }
            } catch(_) {}
        },

        async loadAsScenarioByName(name) {
            try {
                const d = await window.getCharacterData?.(name);
                if (d?.data) window.load_tavern_obj?.(d.data);
            } catch(_) {}
        },

        async showCharacterFullscreenByName(name) {
            try {
                const d = await window.getCharacterData?.(name);
                if (!d) return;
                const inner = d.data || {};

                // Try to find the existing stored character to preserve stable id/state
                const stored = KLITE_RPMod.characters.find(c => (c?.name || '').trim() === (inner?.name || name || '').trim());

                const char = {
                    // Preserve the persistent id so actions (like Set greeting) can update storage
                    id: stored?.id ?? Date.now(),
                    name: inner?.name || name,
                    // Prefer freshly loaded image, but keep stored image as fallback
                    image: d.image || stored?.image || null,
                    // Preserve stateful fields from stored character so UI reflects current state
                    activeGreeting: (stored && 'activeGreeting' in stored) ? stored.activeGreeting : null,
                    rating: stored?.rating ?? 0,
                    tags: Array.isArray(stored?.tags) ? stored.tags.slice() : (Array.isArray(inner?.tags) ? inner.tags.slice() : []),
                    rawData: { data: inner }
                };
                this.showCharacterFullscreen(char);
            } catch(_) {}
        },
    };
}
