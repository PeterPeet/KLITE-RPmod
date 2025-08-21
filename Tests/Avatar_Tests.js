/**
 * KLITE-RPmod Avatar Tests
 * Validate runtime avatar updates and group per-speaker avatar mapping
 * Requirements: REQ-F-080
 */

function ensureChatDom() {
    let el = document.getElementById('chat-display');
    if (!el) {
        el = document.createElement('div');
        el.id = 'chat-display';
        document.body.appendChild(el);
    }
    return el;
}

// Base64 constants must match implementation
const USER_AVATAR_ORIGINAL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAAAXNSR0IB2cksfwAAAAlwSFlzAAACTwAAAk8B95E4kAAAAB5QTFRFFIqj/v//V6u9ksnUFIqjx+PpcbjHFIqjFIqjAAAAcfUgXwAAAAp0Uk5T/////9z//5IQAKod7AcAAACKSURBVHicY5hRwoAE3DsZWhhQgAdDAaoAO4MDqgALA/lAOQmVzyooaIAiYCgoKIYiICgoKIouIIhfBYYZGLYwKBuh8oHcVAUkfqKgaKCgMILPJggGCFMUIQIIewIhAnCXMAlCgQKqEQhDmGECAegCBmiGws1gYFICA2SnIgEHVC4LZlRiRDZ6cgAAfnASgWRzByEAAAAASUVORK5CYII=';
const AI_AVATAR_ORIGINAL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAADxQTFRFS2Si+X5+pmBfHyApLjZSS2SjP057Vzw5EA4Sf1ZT+9Sv1WpqnYx/7qaYw7vUAAAAS2Sj9PPzgnrLS2SjAzrF9gAAABR0Uk5T///////w////////////AKj//yMlHqVpAAAD3klEQVR4nKWXi7KjIAyGFSgxEjhV3/9d90+8onZPd810prWSDwi50fyoTNP7/X79g2D4NJlqo+rvV/Mf8npPM2B6/4+6ihKaB/pGaH4e6IPw00y3+48xhBC3J32Id+NeUzN9UPfer4RoD/eIqbnuwLS7zncLAfqdPvvDmvY9XAE6vuuImEAw8fNT1/kr4Qqw+YhdIocfJl0glxyTvyG8m7MNY1B9diAkmgGUODnH7Km7AF53AGEjUJtWYdUPzn0LyC6AQO0qCUCi1PKXAM5tCwXeAC0ROf36AqA2VACmbQ8yP9DVimeA6lPKkLaW3EPylXAARBXV701OhOVPI6hcAXH1mTyP7e8AMyEc4mQDzP7XrfOfl5D7ndAdfXID6NwMyXACEpEbgPTCLJn1hEGoAep/OKheQiCEEhj1HgBQX1ZxQMPLlyVsABwejkp8EGEQAkxRA4RgIRYhTxme1fkKoBZwAHjLA+b/cgLQ8gZ4gZ+tVtgAnboaa+Lg0IwRhBqAmX0cI0WFqHN3FUAXAOPpzIWhPzZYQgUAu4ljiaKTaKwtZtwAIdv8XkocR9+UYM5/BMTRxzJKsWEu+RPAAsBxKSWWgTHS18cofiwhlCJD4cApUb0CNWKA/5dhwAqKD2UIXAEoFgUMkIJTCCcjzkGE890BQhXA685WQNqD6ujKWDRhhI7EdKUCtKSGxd8ASEr+6sqNApKPeD/iFEpT6nAUcAMgMmBzqwVPgJCd80X3AIlDDcjSzH8PJbD7AGiT020WjfcCN0jI5WwJGk5axP4eikeyvQd4HE5i7I4xEpWANKg0m2p0OUIcQKJnd7uCaABMRebOSOoB1WUVYACzaGSs012NaI5gAC0GcPWD9iLI6/qVdGeXY7R6xu1M0FAhG7s865ctw97Zoz85kuXi5T2EbaZatLileQA+VifrYGrT7ruL+lbZ0orYcXQJpry/tl+26l1s8sOy+BxMqKjr23nf7mhFnktbOgJOGQmnVG0ZVve06VvDUFmEztGIhHAy2YHA+qsCuFNS1T0Edf41AOZ1b7uwH1tYYFA4p3U1owiOOu+AsyxrQ3AIXwrLXtryL4BPpW0rrvMaPgHSx+K6l3cj3Oin1lH6S3nfd+KDa51lAjJhE6ddz7XRu29xUH51O95SgNOahDTB3PPvLc7cZPWYEVlVlp5AkGtJK/63XZoq0jBsvUrPeNDvr/tE1SnD3qxIEVuNfAsY0J9w4Ux2ZKizHPLHFdw127r7HIS2ZpvFTHHbbN+3+2Qm29p9NvXv2v3twkHHCwd9vnA8vvI8vnQ9vvY9v3g+vvo+v3w/u/7/AZoAPJwrbZ1IAAAAAElFTkSuQmCC';

KLITETestRunner.registerTest('functional', 'avatar_updates_state_changes', async () => {
    // Verify runtime avatar update state
    const NEW_USER = 'data:image/png;base64,user_new';
    const NEW_AI = 'data:image/png;base64,ai_new';
    KLITE_RPMod.updateUserAvatar(NEW_USER);
    KLITE_RPMod.updateAIAvatar(NEW_AI);
    Assert.equal(KLITE_RPMod.userAvatarCurrent, NEW_USER, 'User avatar state must update');
    Assert.equal(KLITE_RPMod.aiAvatarCurrent, NEW_AI, 'AI avatar state must update');
}, ['REQ-F-080']);

KLITETestRunner.registerTest('functional', 'group_avatar_mapping_updates', async () => {
    // Verify group avatar mapping is updated from active chars
    const gp = KLITE_RPMod.panels.GROUP;
    gp.enabled = true;
    gp.activeChars = [
        { id: 'n', name: 'Niko', avatar: 'data:image/png;base64,char_avatar' },
        { id: 'm', name: 'Mika', image: 'data:image/png;base64,char2' }
    ];
    KLITE_RPMod.updateGroupAvatars();
    Assert.isTrue(KLITE_RPMod.groupAvatars.get('n') === 'data:image/png;base64,char_avatar', 'Group avatar must map to avatar field');
    Assert.isTrue(KLITE_RPMod.groupAvatars.get('m') === 'data:image/png;base64,char2', 'Group avatar must map to image field');
}, ['REQ-F-080']);

KLITETestRunner.registerTest('functional', 'pending_speaker_applies_to_new_images', async () => {
    // Setup DOM and group state using real gametext (not mocked)
    let game = document.getElementById('gametext');
    if (!game) {
        game = document.createElement('div');
        game.id = 'gametext';
        document.body.appendChild(game);
    }
    game.innerHTML = '';
    const gp = KLITE_RPMod.panels.GROUP;
    gp.enabled = true;
    gp.activeChars = [
        { id: 'n', name: 'Niko', avatar: 'data:image/png;base64:char_avatar' }
    ];

    // Simulate triggering Niko as speaker
    gp.currentSpeaker = 0;
    // Manually set pending meta as triggerCurrentSpeaker would
    KLITE_RPMod._pendingAvatarMeta = { name: 'Niko', chatImgCount: 0, gameImgCount: game.querySelectorAll('img').length };
    KLITE_RPMod._pendingSpeakerName = 'Niko';

    // Append a new image as if Lite added a response icon
    const img = document.createElement('img');
    img.src = AI_AVATAR_ORIGINAL; // default AI icon
    game.appendChild(img);

    // Apply pending assignment and assert
    KLITE_RPMod.applyPendingGroupAvatarToNewMessages();
    const lastImg = game.querySelectorAll('img')[game.querySelectorAll('img').length - 1];
    Assert.equal(lastImg.src.includes('char_avatar'), true, 'New AI images should adopt pending speaker avatar');
}, ['REQ-F-080']);

KLITETestRunner.registerTest('functional', 'rp_message_info_uses_ui_state', async () => {
    // User message uses persona avatar/name
    KLITE_RPMod.userAvatarCurrent = 'data:image/png;base64:user_current';
    KLITE_RPMod.panels.PLAY_RP.selectedPersona = { name: 'PlayerOne', avatar: 'data:image/png;base64:user_persona' };
    const u = KLITE_RPMod.getRPMessageInfo(true, 'You say hello');
    Assert.equal(u.name, 'PlayerOne', 'Persona name should be used for user');
    Assert.equal(!!u.avatar, true, 'Persona/user avatar should be resolved');

    // Single chat AI uses selected character avatar/name
    KLITE_RPMod.aiAvatarCurrent = 'data:image/png;base64:ai_current';
    KLITE_RPMod.panels.GROUP.enabled = false;
    KLITE_RPMod.panels.PLAY_RP.selectedCharacter = { name: 'Alice', avatar: 'data:image/png;base64:alice' };
    const a = KLITE_RPMod.getRPMessageInfo(false, 'Hello');
    Assert.equal(a.name, 'Alice', 'Selected character should be used in single chat');
    Assert.equal(a.avatar, 'data:image/png;base64:alice', 'Character avatar should be preferred');

    // Group chat AI uses pending speaker without parsing content
    KLITE_RPMod.panels.GROUP.enabled = true;
    KLITE_RPMod.panels.GROUP.activeChars = [{ id: 'm', name: 'Mika', image: 'data:image/png;base64:mika' }];
    KLITE_RPMod._pendingSpeakerName = 'Mika';
    const g = KLITE_RPMod.getRPMessageInfo(false, 'Some content without name:');
    Assert.equal(g.name, 'Mika', 'Pending speaker should drive avatar resolution');
    Assert.equal(g.avatar, 'data:image/png;base64:mika', 'Pending speaker image should be used');
}, ['REQ-F-080']);

KLITETestRunner.registerTest('functional', 'no_regex_crash_on_parentheses_names', async () => {
    // Ensure updateAllChatAvatars does not throw for names with parentheses
    // Setup gametext container with a message prefixed by the character name
    let game = document.getElementById('gametext');
    if (!game) {
        game = document.createElement('div');
        game.id = 'gametext';
        document.body.appendChild(game);
    }
    const p = document.createElement('p');
    p.textContent = 'Alice (V2): Hello there.';
    game.appendChild(p);

    // Seed characters and call updater
    KLITE_RPMod.characters = [{ id: 'alicev2', name: 'Alice (V2)', image: 'data:image/png;base64,alice' }];
    Assert.doesNotThrow(() => KLITE_RPMod.updateAllChatAvatars(), 'Should not throw for names with parentheses');
}, ['REQ-F-080']);
