// RPmod Guide content: short chapters to read, each with optional "Show me" actions that
// open and highlight the part of the UI being explained. Keep the text in sync with
// USER_GUIDE.md (same facts, shorter).
//
// Block types: { p: 'text' } paragraph, { list: ['…'] } bullet list,
//              { table: [['col', 'col'], …] } two-column table (first row = header),
//              { tip: 'text' } highlighted hint.
// show: [{ label, run(ctx) }] — ctx: { open(viewId), highlight(target, note), hostCall(fn), navLink(text) }

export const CHAPTERS = [
    {
        id: 'welcome', title: 'Welcome',
        blocks: [
            { p: 'RPmod turns Esolite into a solo tabletop roleplaying game: the AI is your game master, and RPmod keeps track of the world, your quests, dice and combat, so the story stays consistent.' },
            { p: 'Read the chapters in order the first time. Each chapter has "Show me" buttons that open and highlight the part of the screen being explained.' },
            { tip: 'You can come back to this guide at any time with the ? button in the Adventure panel.' },
        ],
        show: [{ label: 'Where is the RPmod button?', run: (c) => c.highlight('#rpm-navbtn', 'Shows and hides the RPmod panels') }],
    },
    {
        id: 'esolite', title: 'First steps in Esolite',
        blocks: [
            { p: 'RPmod runs inside Esolite, which does the talking to the AI. Three Esolite buttons get you started:' },
            { list: [
                'AI — choose where the AI runs. AI Horde (free, community-run) works without setup; your own KoboldCpp or an online provider is faster.',
                'Library — your characters, saves and lorebooks. Import character cards (PNG or JSON) here.',
                'Quick Start — pick a character, a player character, lorebooks and an RPmod world, then Confirm to begin.',
            ] },
            { tip: 'New and in a hurry? Open Quick Start, choose the RPmod example world "Eldoria" and press Confirm.' },
        ],
        show: [
            { label: 'AI', run: (c) => c.highlight(c.navLink('AI'), 'Choose where the AI runs') },
            { label: 'Library', run: (c) => c.highlight(c.navLink('Library'), 'Characters, saves and lorebooks') },
            { label: 'Open Quick Start', run: (c) => c.hostCall('showQuickStartPopup') },
        ],
    },
    {
        id: 'panels', title: 'The RPmod panels',
        blocks: [
            { list: [
                'Left, "Adventure": your party (your persona with HP and AC, place, time, combat status) and the quests you are on.',
                'Right: tabs World, Chars, Roles, Scenario and Tools.',
                'Bigger views such as the Quest log and Combat open as windows: drag them by the title bar, resize them at the bottom-right corner.',
            ] },
            { p: 'On small screens the panels slide over the chat, one at a time; use the tabs at the screen edges to bring them back.' },
        ],
        show: [
            { label: 'Adventure panel', run: (c) => { c.open('party'); c.highlight('#rpm-dock-left', 'Party and quests'); } },
            { label: 'Tools panel', run: (c) => { c.open('world'); c.highlight('#rpm-dock-right .rpm-tabs', 'World, Chars, Roles, Scenario, Tools'); } },
        ],
    },
    {
        id: 'worlds', title: 'Worlds',
        blocks: [
            { p: 'A world is a map of places, people, factions, objects, events and lore. Each turn RPmod tells the AI only what matters right now: where you are, who is there, what is happening. Distant places stay out of the prompt.' },
            { list: [
                'Pick or load a world in the World tab, then "Enable for this story".',
                'Set your current location and the time of day; RPmod tracks both as you play.',
                'State slots: "working" is the live game, "base" is the start. Reset returns to the start, Commit makes now the new start.',
            ] },
        ],
        show: [
            { label: 'World tab', run: (c) => { c.open('world'); c.highlight('#wm-panel', 'Your world and its live state'); } },
        ],
    },
    {
        id: 'quests', title: 'Quests',
        blocks: [
            { p: 'People in the world give quests, like in an MMO: a yellow ! marks someone with a quest for you, a ? someone you can hand a finished quest to.' },
            { list: [
                'The Quest log lists available, active and finished quests: accept, track, complete, turn in.',
                'The Quests section on the left shows what you are working on.',
                'Hidden quests read "???" until you discover them.',
            ] },
        ],
        show: [
            { label: 'Quest log', run: (c) => { c.open('questlog'); c.highlight('[data-window="questlog"]', 'Your quest log'); } },
            { label: 'Quest tracker', run: (c) => { c.open('quest-tracker'); c.highlight('[data-section="quest-tracker"]', 'Active quests'); } },
        ],
    },
    {
        id: 'combat', title: 'Dice & combat',
        blocks: [
            { p: 'RPmod does the maths, the AI tells the story. Combat follows the free d20 rules (SRD): initiative, attack against armour class, damage and hit points.' },
            { list: [
                'Open Combat, tick the combatants (or quick-add a monster) and start the encounter.',
                'Attack, roll dice and step through turns; the current round and hit points go to the AI each turn.',
                'People need a stat block to fight; add one in the world editor.',
            ] },
        ],
        show: [{ label: 'Combat window', run: (c) => { c.open('combat'); c.highlight('[data-window="combat"]', 'Encounters and dice'); } }],
    },
    {
        id: 'editor', title: 'Building worlds',
        blocks: [
            { p: 'The world editor is a node graph. Add places, people, factions, objects, events, quests and lore from the palette, then connect them with the Link tool; the connection type follows from what you link (a person linked to a place lives there).' },
            { list: [
                'Select a node to edit it in the inspector on the right.',
                'Events have triggers (entering a place, a time, a quest state…) and effects (flags, items, quests, moving people), and can chain.',
                'A person can reuse a character card from your library.',
            ] },
        ],
        show: [
            { label: 'Editor button', run: (c) => { c.open('world'); c.highlight('#wm-panel button[title="Build your world as a node graph"]', 'Opens the world editor'); } },
            { label: 'Editor window', run: (c) => { c.open('editor'); c.highlight('[data-window="editor"] [data-winbtn="max"]', 'Maximize for more room; drag the title bar to move it'); } },
        ],
    },
    {
        id: 'tags', title: 'Changing the world from chat',
        blocks: [
            { p: 'Small tags in the chat change the world. The AI can write them (ask for it in your World Rules) or you can type them yourself. They take effect on your next message.' },
            { table: [
                ['Tag', 'Effect'],
                ['<move>Forest Road</move>', 'you go somewhere'],
                ['<give>Torch x2</give> · <take>Torch</take>', 'inventory'],
                ['<quest>find_sword=active</quest>', 'quest state'],
                ['<flag>metRowan=true</flag>', 'story flag'],
                ['<time>evening</time> · <weather>rain</weather>', 'time and weather'],
                ['<roll>1d20+3</roll> · <attack>You->Goblin</attack>', 'dice and combat'],
                ['<hp>Goblin=-4</hp> · <check>You=dex 12</check>', 'hit points, checks'],
            ] },
            { tip: 'The full list is in the User Guide, chapter "In-chat commands".' },
        ],
        show: [{ label: 'Chat input', run: (c) => c.highlight('#input_text', 'Type tags here, like any message') }],
    },
    {
        id: 'ai-view', title: 'What the AI sees',
        blocks: [
            { p: 'Curious what the game master knows right now? "Preview what the AI sees" in the World tab shows the exact text RPmod adds to this turn: your persona and the AI\'s character (when enabled in Tools), location, people present, active events, quests and combat.' },
            { p: 'If the AI forgets something, check here first: whatever is not in the preview, the AI cannot know.' },
        ],
        show: [{ label: 'Preview button', run: (c) => { c.open('world'); c.highlight(() => [...document.querySelectorAll('#wm-panel button')].find(b => /Preview what the AI sees/.test(b.textContent)), 'Shows the AI\'s view of this turn'); } }],
    },
    {
        id: 'characters', title: 'Characters, roles & tools',
        blocks: [
            { list: [
                'Chars — import cards and jump into your character gallery (full screen: browse, search, play, edit).',
                'Roles — who plays whom: your persona and the AI\'s character(s), including group chats.',
                'Scenario — set up the scene for a story.',
                'Tools — context analysis, image generation, memory and more.',
            ] },
        ],
        show: [{ label: 'Chars tab', run: (c) => { c.open('chars'); c.highlight('#rpm-dock-right', 'Characters, roles, scenario and tools'); } }],
    },
    {
        id: 'sheet', title: 'Characters, sheets & dice',
        blocks: [
            { p: 'The Character gallery shows your whole Library full screen, with big portraits: open it with the grid button in the right panel\'s header. Filter by tag, search, sort, and switch between large, medium, small and list views. Click a character for the full card and to play as them, let the AI play them, open their sheet, edit, download or favorite them.' },
            { p: 'Every character in your Library can have a character sheet: abilities, saving throws, skills, armor class, hit points, attacks, inventory and coins. The sheet is stored inside the character card, so it travels with the card when you export it.' },
            { list: [
                'Open it with "Character sheet" in the Party section (it starts with your persona) and pick any character at the top.',
                'Click any bonus to roll a d20 with it; choose Advantage or Disadvantage above. Attacks roll to hit and damage.',
                'Every roll goes into the Dice log on the left, and the AI sees the rolls made since its last reply.',
                'Changes are a draft until you press Save (or turn on autosave in Settings → RPmod). Revert undoes them.',
            ] },
            { p: 'New characters: "New character" in the gallery (or "Build with the SRD rules" on an empty sheet) opens the character builder — class, background, species, ability scores, skills, equipment — for levels 1 to 3. "Level up" on the sheet takes a built character to the next level and keeps what they own.' },
            { tip: 'Your persona\'s sheet (level, class, HP, AC, skills, inventory) is part of what the AI knows about you.' },
        ],
        show: [
            { label: 'Character gallery', run: (c) => { c.highlight('[data-action="gallery"]', 'Opens your characters full screen'); } },
            { label: 'Character sheet', run: (c) => { c.open('sheet'); c.highlight('[data-window="sheet"]', 'Click a bonus to roll'); } },
        ],
    },
    {
        id: 'look', title: 'Look & colours',
        blocks: [
            { p: 'RPmod uses Esolite\'s theme. Change the theme in Esolite\'s settings and the panels follow.' },
            { p: 'In Esolite\'s theme colour editor you will also find RPmod\'s own colours: Rpmod quest, danger, success and info.' },
        ],
        show: [{ label: 'Settings', run: (c) => c.highlight('#btn_settings', 'Esolite settings and themes') }],
    },
];
