// RPmod Guide content: short chapters to read, each with optional "Show me" actions that
// open and highlight the part of the UI being explained. Keep the text in sync with
// USER_GUIDE.md (same facts, shorter).
//
// Block types: { p: 'text' } paragraph, { list: ['…'] } bullet list,
//              { table: [['col', 'col'], …] } two-column table (first row = header),
//              { tip: 'text' } highlighted hint.
// show: [{ label, run(ctx) }] — ctx: { open(viewId), highlight(target, note), hostCall(fn), navLink(text), zoneGuide(), show(viewId) = open a window (Esolite's Guide closes first) }

import { SRD } from '../data/srd52.js';

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
                'Left, "Adventure": everything you need to play — your party (persona with HP and AC, place, time, combat status), inventory, map, quests, reputation and dice. The book button next to the ? opens the Compendium.',
                'Right, for creators and the RP tools, in three rows: RP (Chars, Roles, Tools) · Adventure (World Management, World Creation, D&D Compendium) · Quick Links (Guide, Gallery, Compendium, Editor, Quest editor), which open their window directly. You can build a world with only the right panel open, for example on an iPad.',
                'Bigger views such as the Quest log and Combat open as windows: drag them by the title bar, resize them at the bottom-right corner.',
            ] },
            { p: 'On small screens the panels slide over the chat, one at a time; use the tabs at the screen edges to bring them back.' },
        ],
        show: [
            { label: 'Adventure panel', run: (c) => { c.open('party'); c.highlight('#rpm-dock-left', 'Party and quests'); } },
            { label: 'Right panel', run: (c) => { c.open('world'); c.highlight('#rpm-dock-right .rpm-tabrows', 'RP tabs, Adventure tabs, Quick Links'); } },
        ],
    },
    {
        id: 'worlds', title: 'Worlds',
        blocks: [
            { p: 'A world is a map of places, people, factions, objects, events and lore. Each turn RPmod tells the AI only what matters right now: where you are, who is there, what is happening. Distant places stay out of the prompt.' },
            { list: [
                'Pick, create or import a world in World Management (right panel), then "Enable for this story". Premade worlds: the built-in adventure and a small example world.',
                'World Creation holds the creator\'s tools: the Creator / Player view, the editor, the quest editor, and the State editor for place, time and flags. RPmod tracks place and time as you play.',
                'The Map section on the left shows where you are: the places you know as points, or the rooms of a dungeon or town. Walk, search and open doors with the quick replies\' "Here" row, so the AI narrates it. Tick Quick travel to move by clicking the map instead — if something happens on the way, the journey stops there.',
                'Game state: RPmod keeps the live game and a start state you can go back to (next chapter).',
            ] },
        ],
        show: [
            { label: 'World Management', run: (c) => { c.open('world'); c.highlight('#wm-panel', 'Your worlds and the game state'); } },
            { label: 'World Creation', run: (c) => { c.open('worldcreate'); c.highlight('#wm-create', 'Creator tools and the State editor'); } },
        ],
    },
    {
        id: 'game-state', title: 'Game state: start and live game',
        blocks: [
            { p: 'For every story, RPmod keeps two copies of the world\'s state: the live game you are playing, and a start state you can return to. The example world brings its opening as the start state; in a world of your own, set up the opening (place, time) and press "Save as start".' },
            { p: 'The state is where you are, the time and weather, quests and their objectives, flags, reputation, rooms you explored, doors, companions and the story inventory. Both copies are saved with your story and its export. The buttons are in World Management.' },
            { table: [
                ['Button', 'What it does'],
                ['Back to start', 'The world returns to the start state, for example to replay an adventure or undo a wrong turn.'],
                ['Save as start', 'The world as it is now becomes the new start state. A good checkpoint before a dangerous dungeon.'],
                ['Edit start state', 'Creator view only. Changes now go to the start state instead of the live game, for example to move where a new game begins. "Back to the live game" switches back.'],
            ] },
            { p: 'What the start state does not reset:' },
            { list: [
                'The chat. The AI still reads the story so far. After "Back to start", start a new session or tell the AI in a message that the story begins again.',
                'Your character sheet. HP, XP, gold and items live on your character card and travel with it into other stories.',
                'The world itself. Places, people and quests you changed in the editor stay changed; only the state of play goes back.',
            ] },
            { tip: 'Tags in chat messages that RPmod already applied are not applied again after "Back to start". Only new replies change the world.' },
        ],
        show: [
            { label: 'Game state', run: (c) => { c.open('world'); c.highlight('[data-ui="game-state"]', 'Live game and start state'); } },
        ],
    },
    {
        id: 'quests', title: 'Quests',
        blocks: [
            { p: 'People in the world give quests, like in an MMO: a yellow ! marks someone with a quest for you, a yellow ? someone you can hand a finished quest to. Grey marks mean "later" (level too low) or "in progress".' },
            { list: [
                'The Quest log (the Quests section on the left) lists the quests you accepted — track, turn in, abandon — with objectives like "Defeat 3 Wolf (1/3)" that count by themselves. Quests offered by the people where you are show there too, to accept.',
                'Rewards (XP, gold, items, reputation) go to your persona\'s character sheet when you turn a quest in; some let you choose one item.',
                'Your standing with each faction you have met (Hated … Exalted) is in the Reputation section on the left. Creators find every quest and faction in World Creation (Creator view) and the Quest editor.',
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
            { p: 'RPmod does the maths, the AI tells the story. Combat follows the free SRD 5.2.1 rules: initiative, attacks against armour class, damage, conditions, death saving throws.' },
            { list: [
                'Open Combat, add SRD monsters (search by name or challenge rating) and watch the difficulty meter: Low, Moderate or High for your level.',
                'Fights take place in zones of the room you are in: melee in the same zone, ranged by weapon range, moving one zone per turn, cover and hiding. The Guide\'s "Zone combat" tab explains it.',
                'On your turn move, take cover or hide, pick weapon and target and press Attack, then End turn: the enemies act automatically until it is your turn again.',
                'Then write in the chat what you do — the AI narrates the rolls from the combat log.',
                'After a victory your HP and the XP earned are saved to your persona\'s sheet. The XP is divided evenly among everyone who fought on your side; companions with a character sheet get their share too.',
                'If everyone in the party dies, it is game over: the story ends, and RPmod offers to restart from the start or to begin again with a new hero.',
                'The AI can start a fight too: it writes <encounter>2 Wolf</encounter>.',
            ] },
        ],
        show: [
            { label: 'Combat window', run: (c) => { c.open('combat'); c.highlight('[data-window="combat"]', 'Encounters and dice'); } },
            { label: 'How zone combat works', run: (c) => c.zoneGuide && c.zoneGuide() },
        ],
    },
    {
        id: 'editor', title: 'Building worlds',
        blocks: [
            { p: 'The world editor is a node graph. Add places, people, factions, objects, events, quests and lore from the palette, then connect them with the Link tool; the connection type follows from what you link (a person linked to a place lives there).' },
            { list: [
                'Select a node to edit it in the inspector on the right.',
                'Events have triggers (entering a place, a time, a quest state…) and effects (flags, items, quests, moving people), and can chain.',
                'A person can reuse a character card from your library.',
                'A dungeon or town is one node; double-click it (or "Open dungeon editor") to build its rooms and places on a grid, connect them with doors, and add features, inhabitants and encounters. Secret doors stay hidden from the AI until found.',
                'Or press Generate: a seeded dungeon (size, theme, encounters) or a town from the places you tick. Connect the dungeon to a place in the world first, so it gets a way out.',
            ] },
        ],
        show: [
            { label: 'Editor button', run: (c) => { c.open('worldcreate'); c.highlight('#wm-create button[title="Build your world as a node graph"]', 'Opens the world editor (also a Quick Link)'); } },
            { label: 'Editor window', run: (c) => { c.open('editor'); c.highlight('[data-window="editor"] [data-winbtn="max"]', 'Maximize for more room; drag the title bar to move it'); } },
        ],
    },
    {
        id: 'tags', title: 'Changing the world from chat',
        blocks: [
            { p: 'Small tags in the chat change the world. The AI can write them (ask for it in your World Rules) or you can type them yourself. The AI\'s tags take effect as soon as its reply arrives, yours when you send.' },
            { table: [
                ['Tag', 'Effect'],
                ['<move>Forest Road</move>', 'you go somewhere'],
                ['<open>north</open> · <unlock>north</unlock> · <search/>', 'doors and searching in a dungeon (RPmod rolls)'],
                ['<room>Bone Pit, west: old bones</room> · <door>west = locked</door>', 'the AI adds a room or locks a door'],
                ['<give>Torch x2</give> · <take>Torch</take>', 'inventory'],
                ['<accept>Bandit Bounty</accept> · <turnin>Bandit Bounty</turnin>', 'take or hand in a quest (RPmod checks and pays)'],
                ['<buy>Torch x2</buy> · <sell>Rope</sell>', 'trade with a vendor here (price, stock, purse checked)'],
                ['<quest>find_sword=active</quest>', 'quest state'],
                ['<flag>metRowan=true</flag>', 'story flag'],
                ['<time>evening</time> · <weather>rain</weather>', 'time and weather'],
                ['<roll>1d20+3</roll> · <attack>You->Goblin</attack>', 'dice and combat'],
                ['<hp>Goblin=-4</hp> · <check>You=dex 12</check>', 'hit points, checks'],
            ] },
            { tip: 'The full list is in the User Guide, chapter "In-chat commands". To keep the chat clean, turn on Settings → RPmod → "Hide control tags in the chat": RPmod still reads them, the game log says what they did.' },
        ],
        show: [{ label: 'Chat input', run: (c) => c.highlight('#input_text', 'Type tags here, like any message') }],
    },
    {
        id: 'commands', title: 'Slash commands',
        blocks: [
            { p: 'The quick way to act yourself: type a command in the chat box, like Esolite\'s own custom tools. It changes the game at once and sends nothing; the result goes to the game log, which the AI reads next turn. Press Send with an empty box (or write what you do) and the AI narrates it.' },
            { table: [
                ['Command', 'Does'],
                ['/go Forest Road · /look · /search · /open north', 'move, look around, search, doors'],
                ['/talk Bram · /accept Bandit Bounty · /turnin …', 'people and quests'],
                ['/join Oona · /leave Oona', 'companions travel with you'],
                ['/buy Torch x2 · /sell Rope · /inv · /shop', 'trade and inventory'],
                ['/roll 1d20+3 · /check perception 12', 'dice; checks with your persona\'s sheet'],
                ['/encounter 2 Wolf · /attack Wolf · /endturn · /rest', 'fights'],
                ['/lookup Fireball · /map · /quests · /summary', 'windows; Esolite\'s AutoGenerate Memory'],
            ] },
            { p: 'No quotes needed: the rest of the line is the argument. Several at once: /go Forest Road | I set off before dawn. — commands first, then the text is sent as your message.' },
            { tip: 'Type /help for every command. If one of your own Esolite custom tools has the same name, yours wins.' },
            { p: 'Quick replies (top of the left panel) are one-click commands and messages. The Here row below them follows the world: ways out, people to talk to, quests to accept or turn in, the shop. The pencil edits your own replies.' },
        ],
        show: [
            { label: 'Chat input', run: (c) => c.highlight('#input_text', 'Type /help here') },
            { label: 'Quick replies', run: (c) => { c.open('quick-replies'); c.highlight('[data-qr-row="mine"]', 'One click: commands run, the message is sent'); } },
        ],
    },
    {
        id: 'ai-view', title: 'What the AI sees',
        blocks: [
            { p: 'Curious what the game master knows right now? "Preview what the AI sees" in World Creation shows the exact text RPmod adds to this turn: your persona and the AI\'s character (when enabled in Tools), location, people present, active events, quests and combat.' },
            { p: 'If the AI forgets something, check here first: whatever is not in the preview, the AI cannot know.' },
        ],
        show: [{ label: 'Preview button', run: (c) => { c.open('worldcreate'); c.highlight(() => [...document.querySelectorAll('#wm-create button')].find(b => /Preview what the AI sees/.test(b.textContent)), 'Shows the AI\'s view of this turn'); } }],
    },
    {
        id: 'characters', title: 'Characters, roles & tools',
        blocks: [
            { list: [
                'Chars — import cards and jump into your character gallery (full screen: browse, search, play, edit).',
                'Roles — who plays whom: your persona and the AI\'s character(s), including group chats.',
                'Setting up a scene (scenario, example dialogue, first message) is the "RPmod role play" section of Esolite\'s Quick Start.',
                'Tools — context analysis, image generation, memory and more.',
            ] },
        ],
        show: [{ label: 'Chars tab', run: (c) => { c.open('chars'); c.highlight('#rpm-dock-right', 'Characters, roles and tools'); } }],
    },
    {
        id: 'sheet', title: 'Characters, sheets & dice',
        blocks: [
            { p: 'The Character gallery shows your whole Library full screen, with big portraits: open it with "Gallery" in the right panel\'s Quick Links. Filter by tag, search, sort, and switch between large, medium, small and list views. Click a character for the full card and to play as them, let the AI play them, open their sheet, edit, download or favorite them.' },
            { p: 'Every character in your Library can have a character sheet: abilities, saving throws, skills, armor class, hit points, attacks, inventory and coins. The sheet is stored inside the character card, so it travels with the card when you export it.' },
            { p: 'The sheet has tabs: Overview, Combat, Spells, Inventory, Features and Notes. Typing an attack or an item suggests the SRD names; a weapon fills in its damage. Items are in hand or in the backpack — "(<-BP)" takes one out, "(->BP)" puts it away; weapons in hand are green, attacks with a stowed weapon dimmed (in a fight you draw a weapon as part of the attack). Features lists your SRD features automatically. Notes: Character notes stay with the character, Adventure notes only with this play of the world.' },
            { list: [
                'Open it with "Character sheet" in the Party section (it starts with your persona) and pick any character at the top.',
                'Click any bonus to roll a d20 with it; choose Advantage or Disadvantage above. Attacks roll to hit and damage.',
                'Every roll goes into the Dice log on the left, and the AI sees the rolls made since its last reply.',
                'Changes are a draft until you press Save (or turn on autosave in Settings → RPmod). Revert undoes them.',
            ] },
            { p: 'New characters: "New character" in the gallery (or "Build with the SRD rules" on an empty sheet) opens the character builder — class, background, species, ability scores, skills, spells, equipment — for levels 1 to 20, with feats at the Ability Score Improvement levels. "Level up" on the sheet takes a built character to the next level and keeps what they own.' },
            { p: 'Spells: choose cantrips and prepared spells from the SRD 5.2.1 lists in the builder or later with "Change spells" on the sheet. On the sheet, Cast uses a spell slot and tells the AI; Hit, Dmg and Heal roll into the dice log.' },
            { tip: 'Your persona\'s sheet (level, class, HP, AC, skills, inventory) is part of what the AI knows about you.' },
        ],
        show: [
            { label: 'Character gallery', run: (c) => { c.highlight('[data-link="gallery"]', 'Opens your characters full screen'); } },
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
    {
        id: 'credits', title: 'Credits',
        blocks: [
            { p: SRD.attribution },
            { p: 'Zone combat: the idea of zones instead of a grid comes from the zone combat house rules of Ultimate Dungeon Terrain (Dungeon Craft); RPmod implements its own rules, nothing is copied.' },
            { p: 'Icons: Lucide (ISC license; some icons derived from Feather, MIT license).' },
        ],
    },
];
