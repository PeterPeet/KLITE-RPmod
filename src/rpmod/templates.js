// =============================================================================
// KLITE RPmod — HTML template helpers (`t.section`, `t.button`, …) used by the panels.
// -----------------------------------------------------------------------------
// Part of the RP core and its panels (the former single file "KLITE-RPmod_ALPHA.js", split
// 2026-09-25 without rewriting). Started in order by src/rpmod/index.js; the parts share the
// global window.KLITE_RPMod and a few helpers passed in `S`.
// Creator: Peter Hauer | GPL-3.0 License
// =============================================================================

export function installTemplates(S) {
    // old button variants → shell classes ('' = the plain Esolite button)
    const BTN_VARIANTS = { primary: '', secondary: '', danger: 'rpm-danger', success: 'rpm-success', warning: 'rpm-warning' };
    const t = {
        // Collapsible section with a header and content
        section: (title, content, collapsed = false) => `
            <div class="klite-section ${collapsed ? 'collapsed' : ''}">
                <div class="klite-section-header" data-section="${title}">
                    <span>${title}</span>
                    <span>${collapsed ? '▶' : '▼'}</span>
                </div>
                <div class="klite-section-content">${content}</div>
            </div>
        `,

        // Shell button (btn btn-primary rpm-btn); older variant names map onto the shell's
        button: (text, className = '', action = '') => `
            <button class="${t.btnClass(className)}" ${action ? `data-action="${action}"` : ''}>${text}</button>
        `,
        btnClass: (className = '') => ['btn btn-primary rpm-btn', ...String(className).split(/\s+/).filter(Boolean).map(c => BTN_VARIANTS[c] ?? c)].filter(Boolean).join(' '),

        textarea: (id, placeholder = '', value = '') => `
            <textarea id="${id}" class="form-control rpm-input" placeholder="${placeholder}">${value}</textarea>
        `,

        input: (id, placeholder = '', type = 'text', value = '') => `
            <input type="${type}" id="${id}" class="form-control rpm-input" placeholder="${placeholder}" value="${value}">
        `,

        select: (id, options) => `
            <select id="${id}" class="form-control rpm-input">
                ${options.map(o => `<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.text}</option>`).join('')}
            </select>
        `,

        checkbox: (id, label, checked = false) => `
            <label class="rpm-check">
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
                <span>${label}</span>
            </label>
        `,

        row: (content) => `<div class="rpm-row">${content}</div>`,
        muted: (text) => `<div class="rpm-muted">${text}</div>`,

        slider: (id, min, max, value, label = '') => `
            <div>
                ${label ? `<label for="${id}" class="rpm-label">${label}</label>` : ''}
                <input type="range" id="${id}" class="klite-slider" min="${min}" max="${max}" value="${value}">
            </div>
        `
    };

    // Delegated handler for opt-in loading of external images
    try {
        document.addEventListener('click', (ev) => {
            const btn = ev.target && ev.target.closest ? ev.target.closest('[data-action="rpmod-load-image"]') : null;
            if (!btn) return;
            ev.preventDefault();
            try {
                const url = btn.getAttribute('data-url') || '';
                const alt = btn.getAttribute('data-alt') || '';
                const style = btn.getAttribute('data-style') || '';
                const wrap = btn.closest('.klite-safe-image') || btn.parentElement;
                if (!url || !wrap) return;
                const img = document.createElement('img');
                img.loading = 'lazy';
                try { img.referrerPolicy = 'no-referrer'; } catch(_){}
                img.alt = alt;
                if (style) img.setAttribute('style', style);
                img.src = url;
                const blocked = wrap.querySelector('.klite-image-blocked');
                if (blocked) blocked.replaceWith(img); else wrap.insertBefore(img, btn);
                btn.remove();
            } catch(_){}
        });
    } catch(_){}

    // =============================================
    // 3. KOBOLDAI LITE INTEGRATION VERIFICATION
    // =============================================

    S.t = t;
}
