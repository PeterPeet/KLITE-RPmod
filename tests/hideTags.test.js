'use strict';
// R6 step 3 (known issue 2): hiding RPmod's control tags in the displayed chat.
const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const path = require('path');
const { createHost, sleep, ROOT } = require('./helpers/host');

function requireSrc(rel) {
    const out = esbuild.buildSync({ entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'cjs', platform: 'neutral', write: false, logLevel: 'error' });
    const m = { exports: {} }; new Function('module', 'exports', out.outputFiles[0].text)(m, m.exports);
    return m.exports;
}
const CR = requireSrc('src/chat/chat-rules.js');

test('strip control tags: escaped and raw, pairs, self-closing, every engine tag; other markup stays', () => {
    const s = CR.stripControlTags;
    assert.equal(s('You walk on. &lt;move&gt;Forest Road&lt;/move&gt; The trees close in.'), 'You walk on. The trees close in.');
    assert.equal(s('Bram nods.<give>Torch x2</give><take>Rope</take>'), 'Bram nods.');
    assert.equal(s('Dust. &lt;search/&gt; &lt;advance&gt; &lt;SEARCH&gt;&lt;/search&gt;'), 'Dust.');
    assert.equal(s('&lt;Room&gt;Bone Pit, west: bones\nmore&lt;/room&gt;Done'), 'Done', 'case and new lines inside');
    assert.equal(s('<span class="x">Hi</span> <b>bold</b> &lt;em&gt;'), '<span class="x">Hi</span> <b>bold</b> &lt;em&gt;', 'Esolite markup and unknown tags stay');
    assert.equal(s('&lt;move&gt;unclosed'), '&lt;move&gt;unclosed', 'an unclosed tag stays visible');
    // every tag the engine parses is in the list (the Guide's tag table and ARCHITECTURE §3.4)
    for (const t of ['move', 'npcmove', 'mood', 'flag', 'unflag', 'give', 'take', 'rep', 'accept', 'turnin', 'buy', 'sell', 'talk',
        'encounter', 'quest', 'time', 'weather', 'action', 'roll', 'attack', 'hp', 'check', 'go', 'open', 'close', 'unlock', 'room', 'door', 'light'])
        assert.equal(s(`a &lt;${t}&gt;x=1&lt;/${t}&gt; b`), 'a b', t);
});

test('hide control tags: a Display setting wraps apply_display_only_regex; the engine still reads the tags', async (t) => {
    const h = createHost(); t.after(h.close);
    const w = h.window;
    let renders = 0;
    w.apply_display_only_regex = (txt) => txt;          // Esolite without display-only regex rules
    w.render_gametext = () => { renders++; };
    h.installFakeLibrary(); h.installFakeSettingsDialog();
    h.load('bundle'); await h.ready({ ui: true });
    const Chat = w.KLITE_RPMod_Chat, S = w.KLITE_RPMod_Settings, W = h.api();
    for (let i = 0; i < 40 && !Chat.displayHooked(); i++) await sleep(25);
    assert.equal(Chat.displayHooked(), true);
    const shown = 'The door creaks. &lt;move&gt;Forest Road&lt;/move&gt;';
    assert.equal(w.apply_display_only_regex(shown), shown, 'off by default: tags stay visible');
    S.set('hide_control_tags', true);
    assert.equal(renders, 1, 'the chat is redrawn when the setting changes');
    assert.equal(w.apply_display_only_regex(shown), 'The door creaks.');

    // the story text keeps the tag and the engine reads it when the reply arrives
    await W.loadExample(); W.moveTo('Millbrook Village');
    w.gametext_arr.push('We leave the village. <move>Forest Road</move>');
    W.applyTags(w.gametext_arr[w.gametext_arr.length - 1]);
    assert.equal(W.runtime.playerLocationId, 'loc_forest');
    assert.match(w.gametext_arr[w.gametext_arr.length - 1], /<move>Forest Road<\/move>/);
    S.set('hide_control_tags', false);
    assert.equal(w.apply_display_only_regex(shown), shown);
});
