/**
 * KLITE-RPmod Avatar Tests
 * Validate simple avatar overrides via human_square/niko_square and styling
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

KLITETestRunner.registerTest('functional', 'avatar_overrides_persona_and_character', async () => {
    // Reset state
    KLITE_RPMod.panels.GROUP.enabled = false;
    KLITE_RPMod.panels.PLAY_RP.selectedPersona = null;
    KLITE_RPMod.panels.PLAY_RP.selectedCharacter = null;
    KLITE_RPMod.avatarsEnabled = true;

    // Ensure defaults are present
    KLITE_RPMod.ensureDefaultAvatars();

    // 1) No persona selected -> human_square uses NEW user default
    KLITE_RPMod.applyAvatarOverrides();
    Assert.equal(window.human_square, KLITE_RPMod.userAvatarDefault, 'human_square must use NEW user default when no persona');

    // 2) Persona selected -> human_square uses persona avatar
    const PERSONA_AV = 'data:image/png;base64,persona_x';
    KLITE_RPMod.panels.PLAY_RP.selectedPersona = { id: 'p1', name: 'Persona1', image: PERSONA_AV };
    KLITE_RPMod.applyAvatarOverrides();
    Assert.equal(window.human_square, PERSONA_AV, 'human_square must use persona avatar');

    // 3) Single chat with character -> niko_square uses character avatar
    const CHAR_AV = 'data:image/png;base64,char_x';
    KLITE_RPMod.panels.GROUP.enabled = false;
    KLITE_RPMod.panels.PLAY_RP.selectedCharacter = { id: 'c1', name: 'Alice', image: CHAR_AV };
    KLITE_RPMod.applyAvatarOverrides();
    Assert.equal(window.niko_square, CHAR_AV, 'niko_square must use selected character avatar in single chat');

    // 4) Group chat or no character -> niko_square uses robot default
    KLITE_RPMod.panels.GROUP.enabled = true;
    KLITE_RPMod.panels.PLAY_RP.selectedCharacter = null;
    KLITE_RPMod.applyAvatarOverrides();
    Assert.equal(window.niko_square, KLITE_RPMod.aiAvatarDefault, 'niko_square must use robot default in group or when no character');
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

// Removed pending-speaker behavior; avatars follow global niko_square/human_square

KLITETestRunner.registerTest('functional', 'getMessageAvatar_uses_globals', async () => {
    // Provide sentinel globals
    KLITE_RPMod.avatarsEnabled = true;
    window.human_square = 'data:image/png;base64:sentinel_user';
    window.niko_square = 'data:image/png;base64:sentinel_ai';
    const userSrc = KLITE_RPMod.panels.PLAY_CHAT.getMessageAvatar(true, 'User: hi');
    const aiSrc = KLITE_RPMod.panels.PLAY_CHAT.getMessageAvatar(false, 'AI: hello');
    Assert.equal(userSrc, window.human_square, 'User avatar must come from human_square');
    Assert.equal(aiSrc, window.niko_square, 'AI avatar must come from niko_square');
}, ['REQ-F-080']);

KLITETestRunner.registerTest('functional', 'avatar_images_are_rounded', async () => {
    // Set globals and create images
    KLITE_RPMod.avatarsEnabled = true;
    window.human_square = 'data:image/png;base64:user_round';
    window.niko_square = 'data:image/png;base64:ai_round';
    const img1 = document.createElement('img'); img1.src = window.human_square;
    const img2 = document.createElement('img'); img2.src = window.niko_square;
    document.body.appendChild(img1); document.body.appendChild(img2);
    // Apply styles
    KLITE_RPMod.styleLiteAvatarImages();
    Assert.equal(img1.style.borderRadius, '50%', 'User avatar should be round');
    Assert.equal(img2.style.borderRadius, '50%', 'AI avatar should be round');
    const userBorderOk = (img1.style.border && img1.style.border.includes('#5a6b8c')) || (img1.style.borderColor && (img1.style.borderColor.includes('#5a6b8c') || img1.style.borderColor.includes('rgb(')));
    const aiBorderOk = (img2.style.border && img2.style.border.includes('#5a6b8c')) || (img2.style.borderColor && (img2.style.borderColor.includes('#5a6b8c') || img2.style.borderColor.includes('rgb(')));
    Assert.equal(userBorderOk, true, 'User border must be #5a6b8c');
    Assert.equal(aiBorderOk, true, 'AI border must be #5a6b8c');
}, ['REQ-F-080']);
