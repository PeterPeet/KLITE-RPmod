/**
 * KLITE-RPmod Edit Mode Tests
 * Deep unit tests for edit mode sync and UI toggling
 * Requirements: REQ-F-081
 */

function ensureEditDom() {
    // allowediting checkbox
    let checkbox = document.getElementById('allowediting');
    if (!checkbox) {
        checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'allowediting';
        document.body.appendChild(checkbox);
    }
    // gametext area
    let gametext = document.getElementById('gametext');
    if (!gametext) {
        gametext = document.createElement('div');
        gametext.id = 'gametext';
        document.body.appendChild(gametext);
    }
    // chat-display area
    let chatDisplay = document.getElementById('chat-display');
    if (!chatDisplay) {
        chatDisplay = document.createElement('div');
        chatDisplay.id = 'chat-display';
        document.body.appendChild(chatDisplay);
    }
}

KLITETestRunner.registerTest('functional', 'edit_mode_toggle_and_save', async () => {
    ensureEditDom();

    // Stub Lite hooks
    const origToggleEditable = window.toggle_editable;
    window.toggle_editable = () => {};
    const origMerge = window.merge_edit_field;
    let mergeCalled = 0;
    window.merge_edit_field = () => { mergeCalled++; };

    try {
        // Enter edit mode
        const checkbox = document.getElementById('allowediting');
        checkbox.checked = false;
        KLITE_RPMod.toggleEdit();

        const chatDisplay = document.getElementById('chat-display');
        const gametext = document.getElementById('gametext');
        Assert.equal(chatDisplay.contentEditable, 'false', 'chat-display should be read-only in edit mode');
        Assert.equal(gametext.contentEditable, 'true', 'gametext should be editable in edit mode');

        // Make an edit in native gametext and save
        gametext.innerHTML = '<p>Edited content</p>';
        KLITE_RPMod.saveEditChanges();
        Assert.equal(mergeCalled, 1, 'saveEditChanges should call merge_edit_field');
        Assert.equal(mergeCalled, 1, 'saveEditChanges should call merge_edit_field');

        // Exit edit mode
        checkbox.checked = true;
        KLITE_RPMod.toggleEdit();
        Assert.equal(document.getElementById('allowediting').checked, false, 'toggleEdit should flip checkbox');
    } finally {
        window.toggle_editable = origToggleEditable;
        window.merge_edit_field = origMerge;
    }
}, ['REQ-F-081']);

// Note: UI switch sync test removed; RPmod uses native #gametext for edits, and chat-display
// remains a read-only mirror. No direct chat-display -> gametext sync is performed on UI toggles.
