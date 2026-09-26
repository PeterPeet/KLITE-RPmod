// =============================================================================
// KLITE RPmod — Starter adventure "The Drowned Lantern" (R8). Original content; SRD 5.2.1 rules
// and monsters only (the attribution is in `credits`). Design: docs/design/R8-starter-adventure.md.
// -----------------------------------------------------------------------------
// Built layer by layer (R8 steps 3–7). Layer 1 (step 3): Brindlewick, the Forest Road, the Hollow
// Oak goblin den, the River Ford; quests A1–A3 and the mill; the four pregenerated characters.
// Layer 2 (step 4): the mountain route (Gravel Road, Windgap Pass, the Watchtower ruin) and the
// valley route (Meadow Road, Owlbear Hollow, the Traveler's Outpost), the shepherds' trail between
// them, Lanternport as a place (its streets come with step 5); the Outpost quests and the
// Doppelganger in the stables.
// Layer 3 (step 5): Lanternport (town, 10 places) and questline B, the Lantern Fair — sign-up, daily
// contests (check objectives RPmod rolls), the cook-off, the champion, the whispers on the docks
// and the last night; the fair runs three in-game days (flags fair_day 1–3, advanced by events at
// night and the next morning); a hook quest from Brindlewick to the mayor.
// Fights started by events have no place of their own (`locationId`), so the AI is not hinted at
// them before they happen ("waiting here").
// Raise VERSION whenever the content changes: a player's Library then gets the new world beside
// the old one (never overwritten), while their pregens keep their sheets.
// The pregens are built with the character builder when the bundle loads, so their sheets always
// follow the builder's rules.
// =============================================================================
import { SRD } from '../../data/srd52.js';
import { buildSheet } from '../../characters/builder-rules.js';
import { writeSheet } from '../../characters/sheet.js';

export const ID = 'drowned-lantern';
export const VERSION = 4;   // 2: layer 2 (routes, Outpost, Watchtower, Owlbear Hollow); 3: each connection stored once (links only where no room exit leads out); 4: layer 3 (Lanternport, the Lantern Fair)

// ---- small helpers for the data below ----
const place = (id, name, description, extra = {}) => Object.assign({ id, name, description }, extra);
const room = (id, name, parentId, [x, y], description, extra = {}) => Object.assign({ id, name, parentId, map: { x, y, w: 4, h: 3 }, description }, extra);
const exit = (id, to, dir, type = 'open', extra = {}) => Object.assign({ id, to, dir, type }, extra);
const flagIs = (key) => ({ type: 'flag', key });
const questIs = (questId, state) => ({ type: 'quest', questId, state });

// ---- the pregenerated characters ---------------------------------------------------------
// Each: builder choices (validated by tests/adventureContent.test.js), a line for the picker,
// pronouns, the card text (how the AI should play them) and sheet notes.
const PREGENS = [
    {
        id: 'oona', pronouns: 'she/her', line: 'Orc Fighter, Soldier · steady veteran with a prosthetic leg',
        choices: { name: 'Oona Greycairn', class: 'fighter', level: 1, background: 'soldier', species: 'orc', method: 'standard',
            scores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 }, bgBonus: { plus2: 'str', plus1: 'con' },
            classSkills: ['perception', 'survival'], fightingStyle: 'Great Weapon Fighting', classEquipment: 'A', backgroundEquipment: 'A', alignment: 'Lawful Good' },
        description: 'Oona Greycairn (she/her) is an orc woman in her mid-forties, broad and weathered, with grey braids and a greatsword she carries like a walking staff. Her left leg ends below the knee in a prosthetic of carved oak and iron that she built and keeps repaired herself; she walks, runs and fights on it as she always has, and it creaks on cold mornings. For twenty years she guarded caravans between Brindlewick and the lake. Six years ago her crew was ambushed on the Forest Road and she was the only one to come home. She has worked odd jobs in the village since, and the vanishing carts have woken something in her.',
        personality: 'Steady, protective, dry humour; slow to speak and quick to act. Treats younger companions like recruits she has decided to keep alive. Hates waste and bragging. Softens around children and animals.',
        notes: 'Prosthetic left leg (oak and iron): part of who Oona is, not a weakness — no rules penalty. Bond: her old caravan crew was lost on the Forest Road.',
    },
    {
        id: 'tove', pronouns: 'they/them', line: 'Dwarf Cleric, Acolyte · warm, loud, very short-sighted',
        choices: { name: 'Tove Emberfall', class: 'cleric', level: 1, background: 'acolyte', species: 'dwarf', method: 'standard',
            scores: { str: 13, dex: 10, con: 14, int: 8, wis: 15, cha: 12 }, bgBonus: { plus2: 'wis', plus1: 'cha' },
            classSkills: ['medicine', 'persuasion'], divineOrder: 'protector', classEquipment: 'A', backgroundEquipment: 'A', alignment: 'Neutral Good',
            spells: { cantrips: ['guidance', 'sacred-flame', 'thaumaturgy'], prepared: ['bless', 'cure-wounds', 'healing-word', 'shield-of-faith'] },
            magicInitiate: { background: { cantrips: ['spare-the-dying', 'light'], spell: 'sanctuary' } } },
        description: 'Tove Emberfall (they/them) is a dwarf cleric of the Still Water, an old order that tends shrines along rivers and lakes. Tove is very short-sighted and refuses to wear glasses ("my eyes are fine — the world is blurry"). They see their surroundings as soft shapes and colours, cannot tell faces apart beyond a few steps and recognise people by their voices, their footsteps and their smell of bread or smoke. Up close they notice everything. Their order once kept a chapel in a village that drowned when the old dam was built; Tove carries a copy of its prayer book and has always wanted to know what became of it.',
        personality: 'Warm, loud, curious and stubborn; laughs easily, hugs without asking first, greets strangers by the wrong name and does not mind being corrected. Deeply kind to the hurt and the frightened. Never admits the glasses would help.',
        notes: 'Very short-sighted, refuses glasses: sees the world as a blur beyond a few steps, knows people by voice. Story flavour only — no rules penalty. Bond: their order kept the chapel of the drowned village.',
    },
    {
        id: 'kasimir', pronouns: 'he/him', line: 'Human Wizard, Sage · curious scholar of the drowned village',
        choices: { name: 'Kasimir Adeyemi', class: 'wizard', level: 1, background: 'sage', species: 'human', method: 'standard',
            scores: { str: 8, dex: 13, con: 14, int: 15, wis: 12, cha: 10 }, bgBonus: { plus2: 'int', plus1: 'con' },
            classSkills: ['investigation', 'nature'], speciesSkills: ['perception'], originFeat: 'Alert', classEquipment: 'A', backgroundEquipment: 'A', alignment: 'Chaotic Good',
            spells: { cantrips: ['fire-bolt', 'mage-hand', 'minor-illusion'], spellbook: ['magic-missile', 'shield', 'sleep', 'burning-hands', 'detect-magic', 'mage-armor'], prepared: ['magic-missile', 'shield', 'sleep', 'burning-hands'] },
            magicInitiate: { background: { cantrips: ['light', 'prestidigitation'], spell: 'find-familiar' } } },
        description: 'Kasimir Adeyemi (he/him) is a young human wizard, twenty-three, tall and ink-stained, who came to the lake country to write the history of the village that drowned under Stillwater Mere when the old dam was built. He has maps, rumours and three notebooks, and no idea yet how dangerous the questions are. He talks to his notebook when he thinks, and his familiar (a small grey owl called Footnote) comments with disapproving hoots.',
        personality: 'Curious, earnest, over-prepared; explains too much when nervous and apologises for it. Brave in a surprised way. Loves old things, maps and a good argument.',
        notes: 'Bond: studies the drowned village and the dam. Familiar: Footnote, an owl (Find Familiar).',
    },
    {
        id: 'pell', pronouns: 'she/her', line: 'Halfling Rogue, Criminal · quick hands, guilty conscience',
        choices: { name: 'Pell Marrow', class: 'rogue', level: 1, background: 'criminal', species: 'halfling', method: 'standard',
            scores: { str: 8, dex: 15, con: 14, int: 13, wis: 12, cha: 10 }, bgBonus: { plus2: 'dex', plus1: 'con' },
            classSkills: ['acrobatics', 'deception', 'perception', 'investigation'], expertise: ['stealth', 'perception'], classEquipment: 'A', backgroundEquipment: 'A', alignment: 'Chaotic Good' },
        description: 'Pell Marrow (she/her) is a halfling in her early thirties with a quick grin, quicker hands and a boatman\'s shoulders. For two summers she rowed night crossings on Stillwater Mere for a crew of smugglers who wore reed-green cloaks; she left when the cargo stopped being barrels and started being things they would not let her see. She knows the lake\'s moods, a hidden beach and a few people she would rather not meet again. She is back in the lake country to make up for something, though she will not say what.',
        personality: 'Quick, funny, restless; deflects with jokes, notices exits first. Loyal once trust is earned, and ashamed of her past in a way she hides badly. Hates bullies.',
        notes: 'Bond: once rowed for the smugglers (the Reedcloaks) and knows the hidden beach; wants to make amends.',
    },
];

function pregenCard(p) {
    const sheet = buildSheet(p.choices);
    sheet.notes = p.notes;
    const data = writeSheet({
        name: p.choices.name, description: p.description, personality: p.personality,
        scenario: '', first_mes: '', mes_example: '', alternate_greetings: [],
        creator_notes: 'Pregenerated character for the RPmod starter adventure "The Drowned Lantern". Rules: SRD 5.2.1.',
        system_prompt: '', post_history_instructions: '', tags: ['RPmod pregen', 'The Drowned Lantern'],
        creator: 'KLITE RPmod', character_version: String(VERSION), extensions: {},
    }, sheet);
    Object.assign(data.extensions.klite_rpmod, { adventure: ID, pregen: p.id, line: p.line, pronouns: p.pronouns });
    return { spec: 'chara_card_v2', spec_version: '2.0', data };
}
// the builder choices, for the content tests
export const PREGEN_CHOICES = Object.fromEntries(PREGENS.map(p => [p.id, p.choices]));

// A pregen as a world person: at the Tipsy Heron, can join the party, and gone from the world
// when it is the player's own character (flag pregen_<id>, set by the loader).
const pregenPerson = (p, x, y) => ({ id: `npc_${p.id}`, name: p.choices.name, characterRef: { pregen: p.id }, homeLocationId: 'bw_heron', canJoin: true,
    phases: [{ id: 'ph_you', label: 'is you', conditions: [flagIs(`pregen_${p.id}`)], gone: true }], ui: { x, y } });

// ---- the world ----------------------------------------------------------------------------
function world() {
    return {
        id: 'world_drowned_lantern', name: 'The Drowned Lantern',
        description: 'The lake country around Stillwater Mere: the village of Brindlewick, the lakeside town of Lanternport, the roads between them and the drowned village under the lake. Supply carts between Brindlewick and Lanternport keep vanishing, and each place blames the other.',
        rules: [
            'Classic heroic fantasy with light humour; the lake and everything drowned are eerie and quiet, never gory.',
            'Keep replies vivid but concise, and end on a moment the player can act on.',
            'RPmod rolls the dice and runs every fight: never invent rolls, hits, damage or deaths — narrate the results RPmod reports.',
            'People are what their descriptions say: respect pronouns and portray every trait (a prosthetic leg, short sight) as part of the person, never as a joke or a problem to fix.',
        ],
        ruleset: { aiMode: 'gm' },
        ui: { x: 80, y: 300 },
        start: { locationId: 'bw_heron', clock: { day: 1, month: 4, year: 1, time: 'morning', season: 'spring', weather: 'mist over the lake' }, view: 'player' },
        locations: [
            // --- the world graph ---
            place('loc_brindlewick', 'Brindlewick', 'A mill village of thatched roofs and stone walls where the Brindle stream leaves the hills for Stillwater Mere. Everyone knows everyone, and everyone is talking about the missing carts.',
                { kind: 'town', mapStyle: 'plots', atmosphere: 'worried', hub: true, ui: { x: 300, y: 300 },
                  phases: [{ id: 'ph_relieved', label: 'Goblins driven off', conditions: [questIs('q_hollow_oak', 'turnedin')], atmosphere: 'relieved', description: 'A mill village of thatched roofs and stone walls. The mill wheel turns again, and people talk about the heroes of the Hollow Oak — and, more quietly, about the strange coin they found there.' }] }),
            place('loc_forest_road', 'Forest Road', 'The old trade road east of Brindlewick, under oak and beech. Ferns crowd the verges; the ruts are deep from carts that no longer come. A side track runs north to a huge dead oak, and the sound of the river comes from the south.',
                { atmosphere: 'tense', connectedLocationIds: ['loc_river_ford', 'loc_gravel_road'], ui: { x: 600, y: 300 },
                  localLore: [{ id: 'll_cart', content: 'Liu Wen\'s cart lies overturned in the ferns a mile out of the village: the grain sacks are gone, the mule cut loose, and small bare footprints lead north towards the Hollow Oak.', keys: ['cart', 'tracks', 'footprints'] }] }),
            place('loc_hollow_oak', 'The Hollow Oak', 'A dead oak so old and vast that a whole goblin band lives in its trunk and in the burrows between its roots. It smells of smoke, wet earth and stolen bread.',
                { kind: 'dungeon', mapStyle: 'stone', atmosphere: 'menacing', ui: { x: 600, y: 110 } }),
            place('loc_river_ford', 'River Ford', 'Where the Forest Road meets the Brindle river: a ford of flat stones for dry summers and Odo\'s rope ferry for the rest of the year. Reeds, herons, and now and then a green old coin washed out of the gravel.',
                { atmosphere: 'calm', connectedLocationIds: ['loc_forest_road', 'loc_meadow_road'], ui: { x: 600, y: 490 } }),

            // --- Brindlewick (town map) ---
            room('bw_green', 'Village Green', 'loc_brindlewick', [5, 4], 'Grass, geese and an old stone trough in the middle of Brindlewick. The notice board is covered in "missing" notes about carts and goods.',
                { exits: [exit('ex_bw_green_heron', 'bw_heron', 'n'), exit('ex_bw_green_mill', 'bw_mill', 'w'), exit('ex_bw_green_smithy', 'bw_smithy', 's'), exit('ex_bw_green_road', 'loc_forest_road', 'e')] }),
            room('bw_heron', 'The Tipsy Heron', 'loc_brindlewick', [5, 0], 'The village inn: low beams, a fire that never quite goes out, and a stuffed heron over the bar that leans a little to the left. Travellers and villagers share the long tables.',
                { light: 'bright', exits: [exit('ex_bw_heron_shrine', 'bw_shrine', 'e'), exit('ex_bw_heron_farm', 'bw_farm', 'w')] }),
            room('bw_mill', "Quill's Mill", 'loc_brindlewick', [0, 4], 'The water mill on the Brindle stream. Its wheel stands still: the grain carts are gone, and something squeaks in the cellar.',
                { exits: [exit('ex_bw_mill_farm', 'bw_farm', 'n'), exit('ex_bw_mill_cellar', 'bw_mill_cellar', 'down', 'stairs', { door: { state: 'closed', material: 'wooden trapdoor' } })] }),
            room('bw_mill_cellar', 'Mill Cellar', 'loc_brindlewick', [0, 8], 'A damp cellar of flour sacks and gnawed beams. The rats have become bold since the goblins took the grain.',
                { light: 'dark', hazards: ['slippery flour dust'] }),
            room('bw_smithy', "Brandt's Smithy", 'loc_brindlewick', [5, 8], 'An open forge, a stone anvil and racks of tools and weapons. Oskar Brandt sings while he hammers.',
                { exits: [exit('ex_bw_smithy_elder', 'bw_elder', 'e')] }),
            room('bw_shrine', 'Shrine of the Still Water', 'loc_brindlewick', [10, 0], 'A small round shrine of river stones with a basin of still water at its heart. Candles float on it in paper boats.',
                { light: 'dim' }),
            room('bw_elder', "Elder Holt's House", 'loc_brindlewick', [10, 8], 'A tidy house with a herb garden and a long table covered in ledgers: who owes what, whose cart went missing when.'),
            room('bw_farm', "Wen's Farm", 'loc_brindlewick', [0, 0], 'Fields, a goose pond and an empty cart shed. Liu Wen\'s mule came home alone two days ago.'),

            // --- the Hollow Oak (dungeon map) ---
            room('ho_roots', 'Root Tunnel', 'loc_hollow_oak', [0, 4], 'A tunnel between the oak\'s great roots, just high enough to walk bent over. Bones and bread crusts in the dirt.',
                { light: 'dark', exits: [exit('ex_ho_out', 'loc_forest_road', 'w'), exit('ex_ho_roots_pen', 'ho_wolfpen', 'e', 'corridor')] }),
            room('ho_wolfpen', 'Wolf Den', 'loc_hollow_oak', [5, 4], 'A low cave under the trunk that stinks of wet fur. Gnawed harness straps from the stolen mules lie in the straw.',
                { light: 'dark', exits: [exit('ex_ho_pen_trunk', 'ho_trunk', 'n', 'corridor'), exit('ex_ho_pen_stores', 'ho_stores', 'e', 'door', { door: { state: 'closed', material: 'plank' } }), exit('ex_ho_pen_burrow', 'ho_burrow', 's', 'corridor')] }),
            room('ho_trunk', 'Hollow Trunk', 'loc_hollow_oak', [5, 0], 'Inside the dead trunk: a tall dark shaft with rope ladders up to a lookout knot-hole over the road.',
                { light: 'dim' }),
            room('ho_stores', 'Stolen Stores', 'loc_hollow_oak', [10, 4], 'Grain sacks, barrels and crates from the missing carts, stacked in a dry burrow — some still marked with the Brindlewick mill\'s stamp.',
                { light: 'dark', exits: [exit('ex_ho_stores_chief', 'ho_chief', 's', 'secret', { secretDC: 13 })] }),
            room('ho_burrow', 'Sleeping Burrow', 'loc_hollow_oak', [5, 8], 'A burrow of moss beds and stolen blankets where the goblins sleep, gamble and quarrel.',
                { light: 'dim', exits: [exit('ex_ho_burrow_flooded', 'ho_flooded', 'w', 'corridor'), exit('ex_ho_burrow_chief', 'ho_chief', 'e', 'door', { door: { state: 'locked', material: 'bone-studded plank', lockDC: 13, keyItem: 'Bone Key' } })] }),
            room('ho_flooded', 'Flooded Burrow', 'loc_hollow_oak', [0, 8], 'A burrow where groundwater has risen knee-deep. Rats swarm over a half-sunken sack.',
                { light: 'dark', hazards: ['knee-deep muddy water'] }),
            room('ho_chief', "Chief's Hollow", 'loc_hollow_oak', [10, 8], 'The goblin chief\'s hall: a firepit, a throne of cart wheels and a chest the chief never lets out of sight.',
                { light: 'dim', secret: false }),
        ],
        objects: [
            { id: 'obj_notice_board', name: 'Notice board', desc: '"MISSING: one cart of seed grain (Wen)." "MISSING: two barrels of cider (the Heron)." "Anyone travelling to Lanternport, ask for news of the Quill cart."', locationId: 'bw_green', kind: 'furniture' },
            { id: 'obj_wrecked_cart', name: "Liu Wen's cart", desc: 'Overturned in the ferns, one wheel broken. Small bare footprints lead north towards a huge dead oak.', locationId: 'loc_forest_road' },
            { id: 'obj_basin', name: 'Basin of still water', desc: 'Offerings to the Still Water float here. An old carving on the rim shows a lantern over a church roof.', locationId: 'bw_shrine', kind: 'furniture' },
            { id: 'obj_snare', name: 'Snare line', desc: 'A cord hidden in the dirt that drops a net of thorn branches.', locationId: 'ho_roots', kind: 'trap', trapDC: 12 },
            { id: 'obj_grain', name: 'Stolen grain sacks', desc: 'Three sacks with the mill\'s stamp, still dry.', locationId: 'ho_stores', kind: 'container', contains: ['Grain Sack x3'] },
            { id: 'obj_sunken_sack', name: 'Half-sunken sack', desc: 'Soggy, heavy, gnawed open at one corner; something hard inside.', locationId: 'ho_flooded', kind: 'container', contains: ['Bone Key', '6 sp'] },
            { id: 'obj_chief_chest', name: "The chief's chest", desc: 'A battered strongbox under the cart-wheel throne.', locationId: 'ho_chief', kind: 'container', contains: ['Lake-green Coin', '14 gp', 'Potion of Healing'] },
            { id: 'obj_firepit', name: 'Firepit', desc: 'Smoky and low; a good place to duck behind.', locationId: 'ho_chief', kind: 'light', lit: true },
        ],
        factions: [
            { id: 'fac_brindlewick', name: 'Brindlewick', description: 'The villagers of Brindlewick: millers, farmers and one inn.', hqLocationId: 'loc_brindlewick', startReputation: 0, ui: { x: 80, y: 120 },
              goals: 'Get the carts moving again; find out who is behind the thefts (they suspect Lanternport).' },
        ],
        npcs: [
            { id: 'npc_maren', name: 'Elder Maren Holt', personality: 'The village elder, sixty, sharp-eyed and dry; keeps ledgers of everything and suspects Lanternport of "letting the road go wild".', factionId: 'fac_brindlewick', homeLocationId: 'bw_elder', mood: 'worried',
              schedule: [{ time: 'morning', locationId: 'bw_heron' }, { time: 'noon', locationId: 'bw_green' }], ui: { x: 140, y: 420 } },
            { id: 'npc_tobias', name: 'Tobias Quill', personality: 'The miller, round and anxious; his wheel stands still without grain, and his cellar is full of rats.', factionId: 'fac_brindlewick', homeLocationId: 'bw_mill', mood: 'fretful', ui: { x: 140, y: 500 } },
            { id: 'npc_ada', name: 'Ada Fenn', personality: 'Keeper of the Tipsy Heron; brisk, warm, hears every rumour and repeats the good ones.', factionId: 'fac_brindlewick', homeLocationId: 'bw_heron', mood: 'busy', ui: { x: 140, y: 580 },
              shop: { items: [{ item: 'Hot meal', price: '3 sp' }, { item: 'Ale', price: '4 cp' }, { item: 'Rations', price: '' }, { item: 'Torch', price: '' }, { item: 'Waterskin', price: '' }, { item: 'Oil', price: '' }, { item: 'Potion of Healing', price: '', stock: 1 }], buys: true, note: 'A bed in the loft is 5 sp a night; friends of the village eat for less.' } },
            { id: 'npc_oskar', name: 'Oskar Brandt', personality: 'The smith, huge and gentle, sings while he works and haggles badly.', factionId: 'fac_brindlewick', homeLocationId: 'bw_smithy', mood: 'cheerful', ui: { x: 220, y: 420 },
              shop: { items: [{ item: 'Dagger', price: '' }, { item: 'Handaxe', price: '' }, { item: 'Spear', price: '' }, { item: 'Shortsword', price: '' }, { item: 'Mace', price: '' }, { item: 'Shield', price: '' }, { item: 'Leather Armor', price: '' }, { item: 'Chain Shirt', price: '', stock: 1 }, { item: 'Arrows (20)', price: '1 gp' }], buys: true, note: 'He buys old iron and anything goblin-made, "for scrap".' } },
            { id: 'npc_imani', name: 'Sister Imani', personality: 'Keeper of the Shrine of the Still Water; calm, tall, speaks slowly and remembers the old lake stories.', factionId: 'fac_brindlewick', homeLocationId: 'bw_shrine', mood: 'serene', ui: { x: 220, y: 500 },
              shop: { items: [{ item: "Healer's Kit", price: '' }, { item: 'Holy Water', price: '' }, { item: 'Potion of Healing', price: '', stock: 2 }], buys: false, note: 'Healing at the shrine is free for anyone hurt defending the village.' } },
            { id: 'npc_liu', name: 'Liu Wen', personality: 'A farmer in her thirties, blunt and angry; her seed grain was on the lost cart and her mule came home alone.', factionId: 'fac_brindlewick', homeLocationId: 'bw_farm', mood: 'angry', ui: { x: 220, y: 580 },
              phases: [{ id: 'ph_grateful', label: 'Grain back', conditions: [questIs('q_hollow_oak', 'turnedin')], mood: 'grateful, a little embarrassed about her temper' }] },
            { id: 'npc_odo', name: 'Odo the ferryman', personality: 'An old man with a pipe and a rope ferry; has seen everything the river carried in fifty years and believes half of it.', homeLocationId: 'loc_river_ford', mood: 'unhurried', ui: { x: 760, y: 560 } },
            pregenPerson(PREGENS[0], 40, 640), pregenPerson(PREGENS[1], 110, 640), pregenPerson(PREGENS[2], 180, 640), pregenPerson(PREGENS[3], 250, 640),
        ],
        quests: [
            { id: 'q_missing_carts', title: 'Missing Carts', giverPersonId: 'npc_maren', turninPersonId: 'npc_maren', ui: { x: 420, y: 420 },
              description: 'Liu Wen\'s grain cart never reached the mill. Elder Holt wants to know what happened on the Forest Road.',
              offerText: 'Third cart this month. Liu Wen\'s, with the seed grain — the mule came home alone. Lanternport says the road is our business; I say it\'s theirs. Talk to Liu, then go and look. Please.',
              progressText: 'Anything on the road?', completionText: 'Goblins? That close to the village… and here I was blaming Lanternport. Well. We\'ll have to do something about that oak.',
              objectives: [{ id: 'o1', kind: 'talk', target: 'npc_liu', text: 'Ask Liu Wen about the cart' }, { id: 'o2', kind: 'visit', target: 'loc_forest_road', text: 'Find the cart on the Forest Road' }],
              rewards: [{ type: 'xp', xp: 50 }, { type: 'gold', gold: 5 }, { type: 'reputation', factionId: 'fac_brindlewick', amount: 50 }] },
            { id: 'q_hollow_oak', title: 'The Hollow Oak', giverPersonId: 'npc_maren', turninPersonId: 'npc_tobias', prerequisites: { quests: ['q_missing_carts'] }, ui: { x: 420, y: 500 },
              description: 'Goblins in the Hollow Oak are stealing from the road. Drive them out and bring the miller back his grain.',
              offerText: 'The goblins sit in that dead oak off the road and eat our winter. Drive them out — and bring Tobias his grain, or the wheel won\'t turn this spring.',
              progressText: 'The oak still full of goblins?', completionText: 'My grain! Oh, my grain. The wheel turns tonight — and you eat at the Heron on me for a week, I\'ll tell Ada.',
              objectives: [{ id: 'o1', kind: 'kill', target: 'Goblin Boss', count: 1, text: 'Defeat the goblin chief' }, { id: 'o2', kind: 'collect', target: 'Grain Sack', count: 3, text: 'Bring back the grain sacks' }],
              rewards: [{ type: 'xp', xp: 150 }, { type: 'gold', gold: 25 }, { type: 'reputation', factionId: 'fac_brindlewick', amount: 100 },
                        { type: 'choice', options: [{ item: 'Potion of Healing', qty: 2 }, { item: 'Shield', qty: 1 }, { item: 'Light Crossbow', qty: 1 }] }] },
            { id: 'q_old_coin', title: 'An Old Coin', giverPersonId: 'npc_imani', turninPersonId: 'npc_imani', startItem: 'Lake-green Coin', ui: { x: 420, y: 580 },
              description: 'The goblin chief was paid in a strange green coin. Someone in the village may know where it comes from.',
              offerText: 'May I? …Lake-green, and the stamp is a lantern over a church roof. This is from Old Brindle — the village under the lake. Ask Odo at the ford; the river gives these up now and then.',
              progressText: 'What did Odo say?', completionText: 'Coins that washed out at the ford — and more of them in goblin hands. Someone is bringing things up from the drowned village. Follow the river, and ask the temple in Lanternport what the lantern means.',
              objectives: [{ id: 'o1', kind: 'talk', target: 'npc_imani', text: 'Show the coin to Sister Imani' }, { id: 'o2', kind: 'talk', target: 'npc_odo', text: 'Ask Odo the ferryman about green coins' }, { id: 'o3', kind: 'visit', target: 'loc_river_ford', text: 'Go to the River Ford' }],
              rewards: [{ type: 'xp', xp: 100 }, { type: 'reputation', factionId: 'fac_brindlewick', amount: 25 }] },
            { id: 'q_mill_rats', title: 'Rats in the Mill', giverPersonId: 'npc_tobias', turninPersonId: 'npc_tobias', ui: { x: 500, y: 420 },
              description: 'The rats in the mill cellar have grown bold. Tobias would be grateful.',
              offerText: 'Without grain the rats go for the sacks, the beams — my boots! There\'s a whole swarm down there. Would you…?',
              progressText: 'Still squeaking down there?', completionText: 'Quiet! Blessed quiet. Here — it isn\'t much.',
              objectives: [{ id: 'o1', kind: 'kill', target: 'Swarm of Rats', count: 1, text: 'Clear the rats from the mill cellar' }],
              rewards: [{ type: 'xp', xp: 25 }, { type: 'gold', gold: 5 }, { type: 'reputation', factionId: 'fac_brindlewick', amount: 25 }] },
        ],
        encounters: [
            { id: 'enc_road_ambush', name: 'Goblin ambush on the road', monsters: [{ key: 'goblin-warrior', count: 2 }], personIds: [], start: 'near', ui: { x: 760, y: 300 } },
            { id: 'enc_mill_rats', name: 'Rats in the mill cellar', monsters: [{ key: 'swarm-of-rats', count: 1 }], personIds: [], locationId: 'bw_mill_cellar', start: 'same' },
            { id: 'enc_den_wolves', name: 'Goblin wolves', monsters: [{ key: 'wolf', count: 2 }], personIds: [], locationId: 'ho_wolfpen', start: 'auto' },
            { id: 'enc_den_lookout', name: 'Lookouts in the trunk', monsters: [{ key: 'goblin-warrior', count: 2 }], personIds: [], locationId: 'ho_trunk', start: 'auto' },
            { id: 'enc_den_burrow', name: 'Goblins in the sleeping burrow', monsters: [{ key: 'goblin-warrior', count: 3 }], personIds: [], locationId: 'ho_burrow', start: 'auto' },
            { id: 'enc_den_rats', name: 'Rats in the flooded burrow', monsters: [{ key: 'swarm-of-rats', count: 2 }], personIds: [], locationId: 'ho_flooded', start: 'auto' },
            { id: 'enc_den_chief', name: 'Chief Snagtooth and a guard', monsters: [{ key: 'goblin-boss', count: 1 }, { key: 'goblin-warrior', count: 1 }], personIds: [], locationId: 'ho_chief', start: 'auto' },
        ],
        events: [
            { id: 'ev_road_ambush', name: 'Ambush at the cart', description: 'Two goblins burst out of the ferns beside the wrecked cart, rusty blades up.',
              triggers: [{ type: 'onEnterLocation', locationId: 'loc_forest_road' }], conditions: [questIs('q_missing_carts', 'active')],
              effects: [{ type: 'encounter', value: 'enc_road_ambush' }], repeatable: false, ui: { x: 760, y: 200 } },
        ],
        globalLore: [
            { id: 'gl_mere', label: 'Stillwater Mere', content: 'Stillwater Mere is the long lake south of Brindlewick. Fishermen say it is never quite still at night, and that bells ring under it in storms.', keys: ['mere', 'lake', 'Stillwater'] },
            { id: 'gl_old_brindle', label: 'Old Brindle', content: 'Two hundred years ago the old dam at the lake\'s outflow raised the water, and the village of Old Brindle, with its chapel of the Still Water, drowned. Its people moved uphill and founded Brindlewick.', keys: ['Old Brindle', 'drowned village', 'dam', 'chapel'] },
            { id: 'gl_lanternport', label: 'Lanternport', content: 'Lanternport is the market town on the far side of the lake, famous for its spring Lantern Fair. Brindlewick sells it grain and buys its fish, and the two have argued about the road between them for as long as anyone remembers.', keys: ['Lanternport', 'fair', 'town'] },
            { id: 'gl_still_water', label: 'The Still Water', content: 'The Still Water is an old, quiet order of shrine keepers along rivers and lakes; their sign is a lantern reflected in water.', keys: ['Still Water', 'shrine', 'order'] },
        ],
    };
}

// ---- layer 2 (R8 step 4): the roads to Lanternport ----------------------------------------------
function layer2(w) {
    w.locations.push(
        // --- the world graph ---
        place('loc_gravel_road', 'Gravel Road', 'The mountain road climbs out of the forest in loose grey switchbacks. Halfway up there is an old campfire ring under a leaning pine — the only flat, sheltered spot before the pass, and everyone who uses this road has slept there. It is the quicker way to Lanternport, about a day, if the weather holds.',
            { atmosphere: 'lonely', connectedLocationIds: ['loc_forest_road', 'loc_windgap'], ui: { x: 900, y: 180 } }),
        place('loc_windgap', 'Windgap Pass', 'A notch between two bare peaks where the wind never stops. Far below, Stillwater Mere shines like a sheet of tin, and on the far shore the roofs of Lanternport. A broken watchtower stands on the crag above the road; a shepherds\' trail drops steeply towards the meadows.',
            { atmosphere: 'windswept', connectedLocationIds: ['loc_gravel_road', 'loc_shepherds_trail'], ui: { x: 1200, y: 180 } }),
        place('loc_watchtower', 'Watchtower Ruin', 'A square tower from the days of the old dam, half its roof gone. Harpies nest at the top, and lately someone has been using the rooms below.',
            { kind: 'dungeon', mapStyle: 'stone', atmosphere: 'eerie', ui: { x: 1200, y: 30 } }),
        place('loc_shepherds_trail', "Shepherds' Trail", 'A steep, narrow trail between the pass and the meadows, marked with cairns. Sheep use it; carts cannot.',
            { atmosphere: 'quiet', connectedLocationIds: ['loc_windgap'], ui: { x: 1200, y: 370 } }),
        place('loc_meadow_road', 'Meadow Road', 'The valley road: wide, flat and slow, through flowering meadows along the Brindle river — two easy days to Lanternport. Old Harrowfield\'s hut stands by a sheepfold; wild garlic and feverfew grow thick along the ditches. A trampled path leads into a thicket to the south.',
            { atmosphere: 'peaceful', connectedLocationIds: ['loc_river_ford'], ui: { x: 900, y: 560 } }),
        place('loc_owlbear_hollow', 'Owlbear Hollow', 'A hollow in a thorn thicket, littered with wool and feathers. Something big lives here.',
            { kind: 'dungeon', mapStyle: 'stone', atmosphere: 'menacing', ui: { x: 900, y: 740 } }),
        place('loc_outpost', "Traveler's Outpost", 'A walled waystation where the Meadow Road meets the lake road: an inn, stables, a smithy corner and a lantern that burns all night over the gate. Carters, drovers and pilgrims to the Lantern Fair stop here.',
            { kind: 'town', mapStyle: 'plots', atmosphere: 'busy', hub: true, ui: { x: 1200, y: 560 } }),
        place('loc_lanternport', 'Lanternport', 'The market town on the far shore of Stillwater Mere: stone quays, tall narrow houses and lanterns on every corner. In spring it holds its famous Lantern Fair, when the Founders\' Lantern is shown in the guildhall.',
            { kind: 'town', mapStyle: 'streets', atmosphere: 'lively', hub: true, ui: { x: 1500, y: 370 },
              phases: [{ id: 'ph_fair', label: 'The Lantern Fair', conditions: [flagIs('fair_open')], atmosphere: 'festive, crowded, noisy' },
                       { id: 'ph_saved', label: 'The Lantern saved', conditions: [flagIs('lantern_saved')], atmosphere: 'grateful, celebrating' }] }),

        // --- the Traveler's Outpost (town map) ---
        room('op_yard', 'Outpost Yard', 'loc_outpost', [5, 4], 'A cobbled yard with a well, a mounting block and the all-night lantern over the gate. Carts come in from the Meadow Road and leave for Lanternport.',
            { exits: [exit('ex_op_yard_common', 'op_common', 'n'), exit('ex_op_yard_stables', 'op_stables', 's'), exit('ex_op_out_meadow', 'loc_meadow_road', 'w'), exit('ex_op_out_lanternport', 'lp_gate', 'e')] }),
        room('op_common', 'Common Room', 'loc_outpost', [5, 0], 'Long tables, a roaring hearth, travellers from everywhere and a board of rooms for rent. It smells of stew and wet wool.',
            { light: 'bright', exits: [exit('ex_op_common_kitchen', 'op_kitchen', 'e'), exit('ex_op_common_rooms', 'op_rooms', 'w')] }),
        room('op_kitchen', 'Kitchen', 'loc_outpost', [10, 0], 'Baba Okafor\'s kingdom: copper pots, strings of onions, and a cook who tastes everything twice.',
            { light: 'bright', exits: [exit('ex_op_kitchen_cellar', 'op_cellar', 'down', 'stairs', { door: { state: 'closed', material: 'oak trapdoor' } })] }),
        room('op_rooms', 'Guest Rooms', 'loc_outpost', [0, 0], 'A narrow upstairs corridor of small clean rooms, each with a bed, a basin and a shutter over the meadows.'),
        room('op_stables', 'Stables', 'loc_outpost', [5, 8], 'Two rows of stalls, hay to the rafters, and a tack room. The horses are restless lately, and the mare in the end stall is ill.',
            { exits: [exit('ex_op_stables_trail', 'loc_shepherds_trail', 's')] }),
        room('op_cellar', 'Outpost Cellar', 'loc_outpost', [10, 4], 'Barrels, sacks and a cold store. Baba\'s stores are running low: the carts from Brindlewick have stopped.',
            { light: 'dark' }),

        // --- Watchtower Ruin (dungeon map) ---
        room('wt_gate', 'Broken Gate', 'loc_watchtower', [0, 4], 'The gate arch still stands; its door lies rotting in the grass. Fresh boot prints lead inside.',
            { exits: [exit('ex_wt_out', 'loc_windgap', 'w'), exit('ex_wt_gate_hall', 'wt_hall', 'e')] }),
        room('wt_hall', 'Fallen Hall', 'loc_watchtower', [5, 4], 'The ground floor, open to the sky where the upper floors fell in. Rubble, nettles and a gap in the east wall towards the shepherds\' trail.',
            { light: 'dim', hazards: ['rubble underfoot'], exits: [exit('ex_wt_hall_stairs', 'wt_stairs', 'n', 'corridor'), exit('ex_wt_hall_guard', 'wt_guard', 's', 'door', { door: { state: 'closed', material: 'patched plank' } }), exit('ex_wt_out_trail', 'loc_shepherds_trail', 'e')] }),
        room('wt_stairs', 'Spiral Stair', 'loc_watchtower', [5, 0], 'A stone stair winding up inside the wall; some steps are missing, others only look safe. Bats hang in the dark above.',
            { light: 'dark', exits: [exit('ex_wt_stairs_top', 'wt_top', 'e', 'stairs')] }),
        room('wt_top', 'Harpies\' Roost', 'loc_watchtower', [10, 0], 'The open top of the tower, ringed by broken battlements. A nest of stolen cloth, bones and shiny things. The view reaches from the pass to the lake.',
            { light: 'bright' }),
        room('wt_guard', 'Guardroom', 'loc_watchtower', [5, 8], 'Someone lives here now: bedrolls, a cold brazier, dice, and cloaks the green of lake reeds hung on pegs.',
            { light: 'dim', exits: [exit('ex_wt_guard_cellar', 'wt_cellar', 'e', 'door', { door: { state: 'locked', material: 'iron-bound trapdoor', lockDC: 14, keyItem: 'Iron Key' } })] }),
        room('wt_cellar', 'Cellar', 'loc_watchtower', [10, 8], 'A damp cellar with one barred window slit. A man in torn stable clothes sits chained to the wall — and he has the face of the Outpost\'s stablemaster.',
            { light: 'dark' }),

        // --- Owlbear Hollow (dungeon map) ---
        room('oh_thicket', 'Thorn Thicket', 'loc_owlbear_hollow', [0, 4], 'A tunnel through thorns, snagged with wool. Deep claw marks on the trees.',
            { light: 'dim', exits: [exit('ex_oh_out', 'loc_meadow_road', 'w'), exit('ex_oh_thicket_den', 'oh_den', 'e', 'corridor')] }),
        room('oh_den', 'The Den', 'loc_owlbear_hollow', [5, 4], 'A hollow of flattened grass and bones under an overhanging rock. The air is thick with musk.',
            { light: 'dim', exits: [exit('ex_oh_den_back', 'oh_back', 'e', 'corridor')] }),
        room('oh_back', 'Back Cave', 'loc_owlbear_hollow', [10, 4], 'A low cave behind the den. Something small bleats in the dark.',
            { light: 'dark' }),
    );
    w.objects.push(
        { id: 'obj_campfire', name: 'Old campfire ring', desc: 'Blackened stones, a stack of dry wood someone left for the next traveller. A good place to rest — if you keep watch.', locationId: 'loc_gravel_road', kind: 'furniture' },
        { id: 'obj_herbs', name: 'Wild garlic and feverfew', desc: 'Thick along the ditches of the Meadow Road; easy to gather.', locationId: 'loc_meadow_road', kind: 'container', contains: ['Wild Garlic x3', 'Feverfew x2'] },
        { id: 'obj_room_board', name: 'Board of rooms', desc: 'Chalk: "Beds 5 sp · Meals 3 sp · Stable & feed 5 sp · NO fighting in the yard — H. Morrow."', locationId: 'op_common', kind: 'furniture' },
        { id: 'obj_loose_steps', name: 'Loose steps', desc: 'Three steps that tip under weight over a long drop.', locationId: 'wt_stairs', kind: 'trap', trapDC: 13 },
        { id: 'obj_nest', name: 'Harpy nest', desc: 'Cloth, bones and glittering things.', locationId: 'wt_top', kind: 'container', contains: ['Potion of Healing', '32 gp', 'Silver Mirror'] },
        { id: 'obj_guard_chest', name: 'Chest under the bedrolls', desc: 'Unlocked; the guards trusted each other.', locationId: 'wt_guard', kind: 'container', contains: ['Iron Key', 'Reed-green Cloak', '11 gp'] },
        { id: 'obj_brazier', name: 'Cold brazier', desc: 'Heavy iron; good cover.', locationId: 'wt_guard', kind: 'furniture', cover: 'half' },
        { id: 'obj_lamb', name: 'A lamb in the dark', desc: 'A muddy, frightened lamb with a notched ear, wedged behind a rock — alive.', locationId: 'oh_back', kind: 'container', contains: ['Lost Lamb'] },
        { id: 'obj_bones', name: 'Old bones', desc: 'Sheep bones — and a shepherd\'s crook with a carved ram\'s head.', locationId: 'oh_den', kind: 'container', contains: ["Harrowfield's Crook", '8 sp'] },
    );
    w.factions.push(
        { id: 'fac_outpost', name: "Traveler's Outpost", description: 'Hedda Morrow\'s waystation and the people who work there.', hqLocationId: 'loc_outpost', startReputation: 100, ui: { x: 1380, y: 700 },
          goals: 'Keep the road open and the beds full for the Lantern Fair.' },
        { id: 'fac_reedcloaks', name: 'The Reedcloaks', description: 'Smugglers in reed-green cloaks who move goods across Stillwater Mere at night.', startReputation: -100, killReputation: -25, ui: { x: 1380, y: 40 },
          goals: 'Move the cargo, pay no tolls, and keep the lake road quiet.' },
    );
    w.npcs.push(
        { id: 'npc_hedda', name: 'Hedda Morrow', personality: 'Keeper of the Outpost (she/her): tall, grey-haired, speaks like a quartermaster and misses nothing. Proud of her waystation and worried about the empty roads.', factionId: 'fac_outpost', homeLocationId: 'op_common', mood: 'watchful', ui: { x: 1380, y: 520 },
          shop: { items: [{ item: 'Hot meal', price: '3 sp' }, { item: 'Rations', price: '' }, { item: 'Rope', price: '' }, { item: 'Torch', price: '' }, { item: 'Oil', price: '' }, { item: 'Tinderbox', price: '' }, { item: "Healer's Kit", price: '' }, { item: 'Potion of Healing', price: '', stock: 2 }], buys: true, note: 'A bed is 5 sp a night; friends of the Outpost stay for free.' } },
        { id: 'npc_baba', name: 'Babajide "Baba" Okafor', personality: 'The Outpost\'s cook (he/him): large, cheerful, sings to his stew, and takes food far more seriously than danger. Enters the Lantern Fair\'s cook-off every year.', factionId: 'fac_outpost', homeLocationId: 'op_kitchen', mood: 'busy', ui: { x: 1480, y: 520 } },
        { id: 'npc_pip', name: 'Pip', personality: 'Stable hand, fourteen (she/her): fearless with horses, shy with people, notices everything. She is sure the stablemaster "came back wrong" from the pass.', factionId: 'fac_outpost', homeLocationId: 'op_stables', mood: 'uneasy', ui: { x: 1380, y: 620 },
          phases: [{ id: 'ph_relieved', label: 'Mr Lark is back', conditions: [questIs('q_stablemaster', 'turnedin')], mood: 'happy, talkative for once' }] },
        { id: 'npc_corwin', name: 'Corwin Lark', personality: 'The Outpost\'s stablemaster (he/him): friendly, helpful, a little too interested in which carts leave when — and oddly forgetful about horses he has known for years.', factionId: 'fac_outpost', homeLocationId: 'op_stables', mood: 'friendly', ui: { x: 1480, y: 620 },
          phases: [{ id: 'ph_unmasked', label: 'Unmasked', conditions: [flagIs('corwin_unmasked')], gone: true }] },
        { id: 'npc_prisoner', name: 'Chained prisoner', personality: 'A man in torn stable clothes (he/him), thin and bruised, chained in the tower cellar for weeks. He says he is Corwin Lark, stablemaster of the Outpost, taken on the pass by men in green cloaks and "a thing that stole my face".', homeLocationId: 'wt_cellar', mood: 'weak, desperate', canJoin: true, ui: { x: 1480, y: 40 },
          phases: [{ id: 'ph_home', label: 'Home again', conditions: [questIs('q_stablemaster', 'turnedin')], name: 'Corwin Lark', homeLocationId: 'op_stables', mood: 'grateful, recovering' }] },
        { id: 'npc_harrowfield', name: 'Old Harrowfield', personality: 'A shepherd (he/him), eighty if a day, who has lost six sheep and a lamb to "a bear with a beak" and will tell you all their names.', homeLocationId: 'loc_meadow_road', mood: 'grieving, stubborn', ui: { x: 1000, y: 640 } },
    );
    w.quests.push(
        { id: 'q_kitchen_stores', title: 'Kitchen Stores', giverPersonId: 'npc_baba', turninPersonId: 'npc_baba', repeat: 'daily', ui: { x: 1560, y: 460 },
          description: 'The carts have stopped and Baba\'s stores are low. Wild garlic grows along the Meadow Road.',
          offerText: 'No carts, no stores, no stew! Bring me wild garlic from the meadow ditches — three good bunches — and you eat like lords tonight.',
          progressText: 'Garlic?', completionText: 'Now THIS is garlic. Sit, sit — the stew will be ready when you have washed.',
          objectives: [{ id: 'o1', kind: 'collect', target: 'Wild Garlic', count: 3, text: 'Gather wild garlic on the Meadow Road' }],
          rewards: [{ type: 'xp', xp: 50 }, { type: 'reputation', factionId: 'fac_outpost', amount: 25 }, { type: 'item', item: 'Rations', qty: 2 }] },
        { id: 'q_sick_mare', title: 'The Sick Mare', giverPersonId: 'npc_pip', turninPersonId: 'npc_pip', ui: { x: 1560, y: 620 },
          description: 'The mare in the end stall has a fever. Pip knows feverfew helps, but she cannot leave the horses.',
          offerText: 'She is burning up. Feverfew — the little white daisies by the road ditches. Two handfuls. Please? Mr Lark says leave her, but… Mr Lark would never say that.',
          progressText: 'Did you find the flowers?', completionText: 'She is drinking! Thank you. …Mr Lark did not even come to look at her.',
          objectives: [{ id: 'o1', kind: 'collect', target: 'Feverfew', count: 2, text: 'Bring feverfew from the Meadow Road' }],
          rewards: [{ type: 'xp', xp: 75 }, { type: 'reputation', factionId: 'fac_outpost', amount: 50 }] },
        { id: 'q_night_raid', title: 'Night Raid', giverPersonId: 'npc_hedda', turninPersonId: 'npc_hedda', prerequisites: { quests: ['q_kitchen_stores'] }, ui: { x: 1560, y: 540 },
          description: 'Someone has been creeping into the Outpost yard at night. Hedda wants them caught.',
          offerText: 'Twice now someone has been in my yard after dark, looking at the carts and the stable doors. Stay tonight and keep watch. Catch whoever leads them.',
          progressText: 'Anything in the yard last night?', completionText: 'Green cloaks. Reed green. Those are lake smugglers — this far up the road? Somebody is telling them which carts to watch.',
          objectives: [{ id: 'o1', kind: 'kill', target: 'Scout', count: 1, text: 'Stop the night raiders\' leader in the Outpost yard' }],
          rewards: [{ type: 'xp', xp: 100 }, { type: 'gold', gold: 15 }, { type: 'reputation', factionId: 'fac_outpost', amount: 100 }] },
        { id: 'q_lost_sheep', title: "Harrowfield's Sheep", giverPersonId: 'npc_harrowfield', turninPersonId: 'npc_harrowfield', ui: { x: 1000, y: 800 },
          description: 'Something is taking Old Harrowfield\'s sheep. The trail leads into the thorn thicket south of the Meadow Road.',
          offerText: 'Dilly, Brannoch, Old Margery, the twins, Soot — and now the lamb. A bear, it was, with an owl\'s beak, I swear it. In the thorns. Get my lamb back, if she lives.',
          progressText: 'My lamb?', completionText: 'Little Nettle! Oh, you brave, stupid lot. Here — it is not much, but it is yours.',
          objectives: [{ id: 'o1', kind: 'kill', target: 'Owlbear', count: 1, text: 'Deal with the beast in the thorn thicket' }, { id: 'o2', kind: 'collect', target: 'Lost Lamb', count: 1, consume: true, text: 'Bring back the lamb' }],
          rewards: [{ type: 'xp', xp: 200 }, { type: 'gold', gold: 30 }, { type: 'choice', options: [{ item: 'Potion of Healing', qty: 2 }, { item: 'Shortbow', qty: 1 }, { item: 'Chain Shirt', qty: 1 }] }] },
        { id: 'q_watchtower', title: 'The Old Watchtower', giverPersonId: 'npc_pip', turninPersonId: 'npc_pip', prerequisites: { quests: ['q_sick_mare'] }, ui: { x: 1560, y: 700 },
          description: 'Pip saw lights in the ruined watchtower on Windgap Pass — the week Mr Lark "came back wrong" from there.',
          offerText: 'Mr Lark went up to the pass in winter to buy a horse. He came back without one, and… wrong. He calls the horses by the wrong names. And there are lights in the old tower at night. Would you look? Please don\'t tell him I asked.',
          progressText: 'The tower?', completionText: 'He is ALIVE? Then the man in our stables… oh. Oh no. Hedda has to know — we have to do something.',
          objectives: [{ id: 'o1', kind: 'visit', target: 'wt_hall', text: 'Search the Watchtower Ruin on Windgap Pass' }, { id: 'o2', kind: 'talk', target: 'npc_prisoner', text: 'Find out who is held in the cellar' }],
          rewards: [{ type: 'xp', xp: 150 }, { type: 'reputation', factionId: 'fac_outpost', amount: 50 }] },
        { id: 'q_stablemaster', title: 'The Stablemaster', giverPersonId: 'npc_hedda', turninPersonId: 'npc_hedda', prerequisites: { quests: ['q_watchtower'] }, ui: { x: 1560, y: 780 },
          description: 'The real Corwin Lark was chained in the watchtower. Something wearing his face works in the Outpost stables.',
          offerText: 'Pip told me. If Corwin is in that tower, then what is in my stables? …I have a crossbow and a very bad temper. Go and face it with me.',
          progressText: 'It is still in the stables.', completionText: 'A shapechanger. In my stables, for a whole season, telling smugglers our carts. Corwin is home now — and you have a room here for as long as you live.',
          objectives: [{ id: 'o1', kind: 'kill', target: 'Doppelganger', count: 1, text: 'Unmask the false stablemaster' }],
          rewards: [{ type: 'xp', xp: 300 }, { type: 'gold', gold: 50 }, { type: 'reputation', factionId: 'fac_outpost', amount: 200 }, { type: 'reputation', factionId: 'fac_reedcloaks', amount: -100 },
                    { type: 'choice', options: [{ item: 'Cloak of Protection', qty: 1 }, { item: 'Potion of Healing', qty: 3 }] }] },
    );
    w.encounters.push(
        { id: 'enc_campfire_wolves', name: 'Wolves at the campfire', monsters: [{ key: 'dire-wolf', count: 1 }, { key: 'wolf', count: 2 }], personIds: [], start: 'near' },
        { id: 'enc_tower_bats', name: 'Bats on the stair', monsters: [{ key: 'swarm-of-bats', count: 1 }], personIds: [], locationId: 'wt_stairs', start: 'same' },
        { id: 'enc_tower_harpies', name: 'Harpies on the roost', monsters: [{ key: 'harpy', count: 2 }], personIds: [], locationId: 'wt_top', start: 'auto' },
        { id: 'enc_tower_guards', name: 'Reedcloak guards', monsters: [{ key: 'bandit', count: 3 }, { key: 'scout', count: 1 }], personIds: [], locationId: 'wt_guard', start: 'auto', factionId: 'fac_reedcloaks' },
        { id: 'enc_night_raid', name: 'Night raiders in the yard', monsters: [{ key: 'bandit', count: 3 }, { key: 'scout', count: 1 }], personIds: [], start: 'near', factionId: 'fac_reedcloaks' },
        { id: 'enc_owlbear', name: 'The owlbear', monsters: [{ key: 'owlbear', count: 1 }], personIds: [], locationId: 'oh_den', start: 'auto' },
        { id: 'enc_doppelganger', name: 'The false stablemaster', monsters: [{ key: 'doppelganger', count: 1 }], personIds: [], start: 'same', factionId: 'fac_reedcloaks' },
    );
    w.events.push(
        { id: 'ev_campfire_night', name: 'Eyes beyond the firelight', description: 'Eyes gleam beyond the firelight: a big grey wolf and two smaller ones, circling the camp.',
          triggers: [{ type: 'onEnterLocation', locationId: 'loc_gravel_road' }], conditions: [{ field: 'time', op: '==', value: 'night' }],
          effects: [{ type: 'encounter', value: 'enc_campfire_wolves' }], repeatable: false, ui: { x: 900, y: 60 } },
        { id: 'ev_night_raid', name: 'Raiders in the yard', description: 'Shadows in reed-green cloaks slip over the Outpost wall and make for the carts.',
          triggers: [{ type: 'onEnterLocation', locationId: 'op_yard' }, { type: 'onTime' }], conditions: [questIs('q_night_raid', 'active'), { field: 'time', op: '==', value: 'night' }, { field: 'location', op: '==', value: 'op_yard' }],
          effects: [{ type: 'encounter', value: 'enc_night_raid' }], repeatable: false, ui: { x: 1560, y: 380 } },
        { id: 'ev_unmask', name: 'The mask slips', description: 'Corwin Lark turns from the horses — and his face runs like wax into something grey and smooth.',
          triggers: [{ type: 'onEnterLocation', locationId: 'op_stables' }], conditions: [questIs('q_stablemaster', 'active')],
          effects: [{ type: 'flag', key: 'corwin_unmasked', value: true }, { type: 'encounter', value: 'enc_doppelganger' }], repeatable: false, ui: { x: 1560, y: 860 } },
    );
    w.globalLore.push(
        { id: 'gl_reedcloaks', label: 'The Reedcloaks', content: 'On the lake they speak of smugglers who wear cloaks the green of lake reeds and row at night without lights.', keys: ['Reedcloak', 'green cloak', 'smuggler'] },
        { id: 'gl_watchtower', label: 'The old watchtower', content: 'The watchtower on Windgap Pass was built with the old dam, to watch the road and the water. It has stood empty for a century.', keys: ['watchtower', 'tower', 'Windgap'] },
    );
    return w;
}

// ---- layer 3 (R8 step 5): Lanternport and the Lantern Fair ------------------------------------------
const fairDay = (n) => ({ field: 'flag.fair_day', op: '==', value: n });
// A contest of the fair: a daily quest from the fair master, one check objective RPmod rolls.
const contest = (id, title, at, check, text, words, ui) => ({
    id, title, giverPersonId: 'npc_marlow', turninPersonId: 'npc_marlow', repeat: 'daily', ui,
    prerequisites: { quests: ['q_fair_signup'], notFlags: ['fair_over'] },
    description: words.description, offerText: words.offer, progressText: 'Go on — the crowd is waiting.', completionText: words.done,
    objectives: [Object.assign({ id: 'o1', kind: 'check', text, at }, check)],
    rewards: [{ type: 'xp', xp: 50 }, { type: 'gold', gold: 5 }, { type: 'reputation', factionId: 'fac_lanternport', amount: 15 }] });
function layer3(w) {
    w.locations.push(
        // --- Lanternport (town map): three columns of streets from the hill down to the shore ---
        room('lp_hilltop', 'The Hilltop', 'loc_lanternport', [5, 0], 'The quiet top of the town: old trees, walled gardens and Ashcombe House behind its iron gate. The hill road climbs from here to Windgap Pass.',
            { exits: [exit('ex_lp_hill_windgap', 'loc_windgap', 'n'), exit('ex_lp_hill_temple', 'lp_temple', 'e')] }),
        room('lp_temple', 'Temple of the Lantern', 'loc_lanternport', [10, 0], 'A tall white temple with a lantern carved over the door. Inside, a hundred candles, and an empty bracket where the Founders\' Lantern hangs when it is not on show.',
            { light: 'dim' }),
        room('lp_gate', 'Lake Gate & Market Square', 'loc_lanternport', [5, 4], 'The lake road enters under a gate of green stone into a square of stalls, awnings and gossip. A lantern pole stands in the middle, hung with ribbons for the fair.',
            { exits: [exit('ex_lp_gate_hill', 'lp_hilltop', 'n'), exit('ex_lp_gate_guild', 'lp_guildhall', 'e'), exit('ex_lp_gate_inn', 'lp_inn', 's')] }),
        room('lp_guildhall', 'Guildhall & Counting House', 'loc_lanternport', [10, 4], 'The merchants\' hall: a great timbered room with the guild banners, a gallery, and behind it the counting house with its iron-bound doors. During the fair the Founders\' Lantern stands here on a plinth under guard.',
            { light: 'bright', exits: [exit('ex_lp_guild_watch', 'lp_watch', 's', 'door', { door: { state: 'closed', material: 'oak' } })] }),
        room('lp_crafts', 'Crafts Lane', 'loc_lanternport', [0, 8], 'A crooked lane of workshops: hammering from Dagna Holloway\'s forge, strange smells from Yara Sels\' shop of bottles.',
            { exits: [exit('ex_lp_crafts_ware', 'lp_warehouses', 's')] }),
        room('lp_inn', 'The Lamplighter', 'loc_lanternport', [5, 8], 'The town\'s big inn, loud and warm, with a stage for fiddlers and an arm-wrestling table everyone pretends is for dining.',
            { light: 'bright', exits: [exit('ex_lp_inn_crafts', 'lp_crafts', 'w'), exit('ex_lp_inn_watch', 'lp_watch', 'e'), exit('ex_lp_inn_docks', 'lp_docks', 's')] }),
        room('lp_watch', 'Watch House', 'loc_lanternport', [10, 8], 'A squat stone house with barred cells, a map of the town on the wall and a kettle that is never off the fire.',
            { exits: [exit('ex_lp_watch_fair', 'lp_fairground', 's')] }),
        room('lp_warehouses', 'Warehouse Row', 'loc_lanternport', [0, 12], 'Tall warehouses along a dark canal, rope and tar and gulls. Old Fisk keeps a "shop" in the last one, where nothing has a receipt.',
            { light: 'dim', hazards: ['slick cobbles by the canal'] }),
        room('lp_docks', 'Docks & Fish Market', 'loc_lanternport', [5, 12], 'Stone quays, fishing boats, nets drying on poles and a fish market that starts before dawn. The boat race starts and ends here.',
            { exits: [exit('ex_lp_docks_ware', 'lp_warehouses', 'w'), exit('ex_lp_docks_fair', 'lp_fairground', 'e')] }),
        room('lp_fairground', 'Fairground', 'loc_lanternport', [10, 12], 'The meadow on the shore, full of tents and banners: the archery butts, the riddle tent, cook fires, jugglers — and every night, lanterns on the water.',
            { light: 'bright' }),
    );
    w.objects.push(
        { id: 'obj_founders_lantern', name: "The Founders' Lantern", desc: 'A tall lantern of green bronze and old glass on a plinth, its flame pale and strangely steady. The guard says it came from the old chapel "before the water".', locationId: 'lp_guildhall', kind: 'light', lit: true },
        { id: 'obj_fair_board', name: 'Fair programme', desc: '"THE LANTERN FAIR — three days! Archery at the butts · The Riddle Tent · Arm-wrestling at the Lamplighter · The Boat Race from the docks · The great Cook-off · Fireworks on the last night. Contestants sign up with Magpie Marlow."', locationId: 'lp_gate', kind: 'furniture' },
        { id: 'obj_fisk_crates', name: 'Unmarked crates', desc: 'Crates stamped with the Brindlewick mill\'s mark, painted over in a hurry.', locationId: 'lp_warehouses', kind: 'container', contains: ['Grain Sack x2'] },
        { id: 'obj_stalls', name: 'Market stalls', desc: 'Cloth, pots, sweets and fish; good cover if a fight breaks out.', locationId: 'lp_gate', kind: 'furniture', cover: 'half' },
    );
    w.factions.push(
        { id: 'fac_lanternport', name: 'Lanternport', description: 'The town: its guild, its watch and its people.', hqLocationId: 'loc_lanternport', startReputation: 0, ui: { x: 1700, y: 120 },
          goals: 'A fair without trouble; the road to Brindlewick safe again (they suspect Brindlewick of stealing the carts).',
          phases: [{ id: 'ph_truth', label: 'The truth is out', conditions: [questIs('q_whispers', 'turnedin')], goals: 'Catch the smugglers and whoever inside the town helps them; make peace with Brindlewick.' }] },
    );
    w.npcs.push(
        { id: 'npc_varga', name: 'Mayor Isolde Varga', personality: 'The mayor (she/her): fifty, brisk, elegant, carries a ledger like a shield. Blames Brindlewick for the missing carts until someone shows her better.', factionId: 'fac_lanternport', homeLocationId: 'lp_guildhall', mood: 'harried', ui: { x: 1700, y: 200 } },
        { id: 'npc_almeer', name: 'Guildmaster Rashid Almeer', personality: 'Head of the merchants\' guild (he/him): soft-spoken, precise, knows every debt in town and hates gossip — unless it is true.', factionId: 'fac_lanternport', homeLocationId: 'lp_guildhall', mood: 'careful', ui: { x: 1780, y: 200 } },
        { id: 'npc_dahl', name: 'Captain Sunniva Dahl', personality: 'Captain of the town watch (she/her): tall, freckled, blunt and tired; has too few guards for the fair and knows it.', factionId: 'fac_lanternport', homeLocationId: 'lp_watch', mood: 'tense', ui: { x: 1860, y: 200 } },
        { id: 'npc_aurelio', name: 'Brother Aurelio', personality: 'Keeper of the Temple of the Lantern (he/him): old, gentle, a little deaf, and the only person in town who still reads the chapel\'s records.', factionId: 'fac_lanternport', homeLocationId: 'lp_temple', mood: 'serene', ui: { x: 1700, y: 280 },
          shop: { items: [{ item: 'Holy Water', price: '' }, { item: "Healer's Kit", price: '' }, { item: 'Potion of Healing', price: '', stock: 2 }], buys: false, note: 'He heals the hurt for a donation, or for nothing.' } },
        { id: 'npc_nell', name: 'Nell', personality: 'Keeper of the Lamplighter (she/her): round, quick-tongued, remembers every face and every tab.', factionId: 'fac_lanternport', homeLocationId: 'lp_inn', mood: 'busy', ui: { x: 1780, y: 280 },
          shop: { items: [{ item: 'Hot meal', price: '4 sp' }, { item: 'Ale', price: '4 cp' }, { item: 'Rations', price: '' }, { item: 'Torch', price: '' }, { item: 'Lantern, Hooded', price: '' }, { item: 'Oil', price: '' }, { item: 'Potion of Healing', price: '', stock: 1 }], buys: true, note: 'A bed is 8 sp a night during the fair.' } },
        { id: 'npc_tam', name: 'Tam', personality: 'Nell\'s brother (he/him): fiddler, cook and the town\'s worst liar; knows every rumour on the waterfront.', factionId: 'fac_lanternport', homeLocationId: 'lp_inn', mood: 'cheerful', ui: { x: 1860, y: 280 } },
        { id: 'npc_greta', name: 'Greta Salt', personality: 'A fish seller at the market (she/her): loud, weather-beaten, sells the best lake fish and has opinions about the boat race.', factionId: 'fac_lanternport', homeLocationId: 'lp_docks', mood: 'loud', ui: { x: 1700, y: 360 },
          shop: { items: [{ item: 'Lake Fish', price: '1 sp' }, { item: 'Smoked Eel', price: '3 sp' }, { item: 'Fishing Tackle', price: '1 gp' }], buys: false } },
        { id: 'npc_jory', name: 'Jory', personality: 'A dockhand (he/him): young, strong, frightened of the wrong people; has seen boats without lights going out at night.', homeLocationId: 'lp_docks', mood: 'nervous', ui: { x: 1780, y: 360 } },
        { id: 'npc_fisk', name: 'Old Fisk', personality: 'A "dealer in second-hand goods" in Warehouse Row (he/him): toothless, charming, a fence for anyone who pays. Knows exactly whose goods he sells and would rather not say.', homeLocationId: 'lp_warehouses', mood: 'sly', ui: { x: 1860, y: 360 },
          shop: { items: [{ item: "Thieves' Tools", price: '' }, { item: 'Caltrops', price: '' }, { item: 'Lantern, Bullseye', price: '' }, { item: 'Reed-green Cloak', price: '2 gp' }], buys: true, note: 'He buys anything and asks nothing.' } },
        { id: 'npc_ashcombe', name: 'Lord Percival Ashcombe', personality: 'The last of an old family (he/him): charming, beautifully dressed, deep in debt, and nervous whenever the fair or the Lantern is mentioned.', homeLocationId: 'lp_hilltop', mood: 'jittery', ui: { x: 1700, y: 440 },
          phases: [{ id: 'ph_caught', label: 'Found out', conditions: [flagIs('lantern_saved')], mood: 'disgraced, under guard' }] },
        { id: 'npc_marlow', name: 'Magpie Marlow', personality: 'The fair master (they/them): quick, theatrical, in a coat of a hundred patches; runs every contest and loves a good loser as much as a winner.', factionId: 'fac_lanternport', homeLocationId: 'lp_fairground', mood: 'exuberant', ui: { x: 1780, y: 440 } },
        { id: 'npc_yara', name: 'Yara Sels', personality: 'The alchemist of Crafts Lane (she/her): precise, dry, gloves stained every colour; sells remedies and spices and sniffs every customer.', factionId: 'fac_lanternport', homeLocationId: 'lp_crafts', mood: 'focused', ui: { x: 1860, y: 440 },
          shop: { items: [{ item: 'Potion of Healing', price: '', stock: 3 }, { item: 'Antitoxin', price: '' }, { item: "Alchemist's Fire", price: '' }, { item: 'Potion of Climbing', price: '75 gp', stock: 1 }, { item: 'Lakeshore Saffron', price: '5 sp' }], buys: true } },
        { id: 'npc_dagna', name: 'Dagna Holloway', personality: 'The smith of Crafts Lane (she/her): huge, soot-black to the elbows, laughs like a bellows; makes the best blades on the lake.', factionId: 'fac_lanternport', homeLocationId: 'lp_crafts', mood: 'cheerful', ui: { x: 1940, y: 440 },
          shop: { items: [{ item: 'Longsword', price: '' }, { item: 'Rapier', price: '' }, { item: 'Warhammer', price: '' }, { item: 'Longbow', price: '' }, { item: 'Light Crossbow', price: '' }, { item: 'Arrows (20)', price: '1 gp' }, { item: 'Scale Mail', price: '' }, { item: 'Chain Mail', price: '', stock: 1 }, { item: 'Shield', price: '' }], buys: true } },
    );
    // Baba comes to the fair for the cook-off (while it runs)
    const baba = w.npcs.find(n => n.id === 'npc_baba');
    baba.phases = [{ id: 'ph_fair', label: 'At the fair', conditions: [flagIs('fair_open'), { field: 'flag.fair_over', op: '!=', value: true }], homeLocationId: 'lp_fairground', mood: 'excited, competitive' }];
    w.quests.push(
        // the hook from Brindlewick
        { id: 'q_word_lanternport', title: 'Word to Lanternport', giverPersonId: 'npc_maren', turninPersonId: 'npc_varga', prerequisites: { quests: ['q_hollow_oak'] }, ui: { x: 1780, y: 540 },
          description: 'Elder Holt wants Lanternport\'s mayor to hear that goblins — not Brindlewick — took the carts, and to see the strange green coin.',
          offerText: 'Lanternport says we steal our own carts to cheat them. Take this letter to Mayor Varga — in person — and show her that coin. Tell her about the oak. Maybe then she\'ll help with the road.',
          progressText: 'You have a letter from Brindlewick?', completionText: 'Goblins, paid in coins from under the lake. …I owe your elder an apology, and I hate owing people apologies. Stay for the fair — and keep your eyes open.',
          objectives: [{ id: 'o1', kind: 'visit', target: 'loc_lanternport', text: 'Go to Lanternport' }, { id: 'o2', kind: 'talk', target: 'npc_varga', text: 'Give the letter to Mayor Varga' }],
          rewards: [{ type: 'xp', xp: 100 }, { type: 'reputation', factionId: 'fac_lanternport', amount: 50 }, { type: 'reputation', factionId: 'fac_brindlewick', amount: 50 }] },
        // B1
        { id: 'q_fair_signup', title: 'A Stranger at the Fair', giverPersonId: 'npc_marlow', turninPersonId: 'npc_marlow', ui: { x: 1940, y: 540 },
          description: 'The Lantern Fair needs contestants, and Magpie Marlow has decided you are one.',
          offerText: 'A new face! Wonderful. The fair opens the moment I have enough fools — sorry, contestants. Get a ribbon from Nell at the Lamplighter, go and see the Lantern in the guildhall for luck, and come back to me.',
          progressText: 'Ribbon? Lantern? Tick tock!', completionText: 'Marvellous. The Lantern Fair is OPEN! Three days, four contests, one cook-off, and fireworks on the last night. Try anything once a day — I remember every winner.',
          objectives: [{ id: 'o1', kind: 'talk', target: 'npc_nell', text: 'Get a contestant\'s ribbon from Nell at the Lamplighter' }, { id: 'o2', kind: 'visit', target: 'lp_guildhall', text: 'See the Founders\' Lantern in the guildhall' }],
          rewards: [{ type: 'xp', xp: 50 }, { type: 'item', item: "Contestant's Ribbon", qty: 1 }] },
        // B2: the contests (daily) and the cook-off
        contest('q_contest_archery', 'Archery at the Butts', 'lp_fairground', { ability: 'dex', dc: 13 }, 'Hit the gold at the archery butts',
            { description: 'Three arrows at the painted butts on the shore.', offer: 'Three arrows, one straw man, and the whole town watching. Dexterity, darling — and do not shoot the goat.', done: 'Gold! The crowd loves you. Same time tomorrow?' }, { x: 2020, y: 460 }),
        contest('q_contest_arms', 'Arm-Wrestling at the Lamplighter', 'lp_inn', { skill: 'athletics', dc: 13 }, 'Win a bout at the Lamplighter\'s arm-wrestling table',
            { description: 'The Lamplighter\'s famous table, where dockhands and farmers settle arguments.', offer: 'The Lamplighter\'s table: elbow down, grip, and try not to break the furniture.', done: 'The table survived — barely. Well pulled!' }, { x: 2020, y: 540 }),
        contest('q_contest_riddles', 'The Riddle Tent', 'lp_fairground', { ability: 'int', dc: 13 }, 'Answer the riddle-keeper\'s three riddles',
            { description: 'A tent of silk and puzzles; the riddle-keeper never smiles.', offer: 'In the striped tent sits a woman who has never smiled. Answer her three riddles and you will see her try.', done: 'She SMILED. I owe Tam a silver piece.' }, { x: 2020, y: 620 }),
        contest('q_contest_boats', 'The Boat Race', 'lp_docks', { skill: 'athletics', dc: 14 }, 'Row the boat race from the docks around the buoy and back',
            { description: 'Rowing boats from the docks around the red buoy and back.', offer: 'From the docks to the red buoy and back, before the bell. Oars are provided. Swimming is discouraged.', done: 'First to the bell! The fishwives are already arguing about it.' }, { x: 2020, y: 700 }),
        { id: 'q_cookoff', title: 'The Great Cook-off', giverPersonId: 'npc_baba', turninPersonId: 'npc_baba', prerequisites: { quests: ['q_fair_signup'], notFlags: ['fair_over'] }, ui: { x: 2100, y: 460 },
          description: 'Baba Okafor has come to the fair to win the cook-off at last, and he needs fresh lake fish and saffron.',
          offerText: 'Every year Lanternport\'s cooks win with fish. This year I use THEIR fish and MY spice. Two lake fish from the market and saffron from the alchemist — quickly, before they see my face!',
          progressText: 'Fish? Saffron? My pot is waiting!', completionText: 'Taste. TASTE. …We won. Twenty years! Hedda will never believe it.',
          objectives: [{ id: 'o1', kind: 'collect', target: 'Lake Fish', count: 2, text: 'Buy two lake fish at the fish market' }, { id: 'o2', kind: 'collect', target: 'Lakeshore Saffron', count: 1, text: 'Buy saffron from Yara Sels in Crafts Lane' }],
          rewards: [{ type: 'xp', xp: 100 }, { type: 'gold', gold: 10 }, { type: 'reputation', factionId: 'fac_outpost', amount: 50 }, { type: 'reputation', factionId: 'fac_lanternport', amount: 25 }] },
        { id: 'q_fair_champion', title: 'Champion of the Fair', giverPersonId: 'npc_marlow', turninPersonId: 'npc_marlow', prerequisites: { quests: ['q_contest_archery', 'q_contest_arms', 'q_contest_riddles', 'q_contest_boats'] }, ui: { x: 2100, y: 540 },
          description: 'You have won every contest of the fair at least once. Magpie wants to crown you.',
          offerText: 'Archery, arms, riddles, oars — all four! Stand on the barrel, champion, and choose your prize before the guild changes its mind.',
          progressText: 'On the barrel!', completionText: 'THE CHAMPION OF THE LANTERN FAIR! Lanternport will be singing about you for a week. Badly.',
          objectives: [{ id: 'o1', kind: 'talk', target: 'npc_marlow', text: 'Be crowned by Magpie Marlow' }],
          rewards: [{ type: 'xp', xp: 150 }, { type: 'reputation', factionId: 'fac_lanternport', amount: 100 },
                    { type: 'choice', options: [{ item: '+1 Longsword', qty: 1 }, { item: '+1 Shortbow', qty: 1 }, { item: '+1 Rapier', qty: 1 }, { item: '+1 Mace', qty: 1 }] }] },
        // B3
        { id: 'q_whispers', title: 'Whispers on the Docks', giverPersonId: 'npc_dahl', turninPersonId: 'npc_dahl', prerequisites: { quests: ['q_fair_signup'] }, ui: { x: 2180, y: 460 },
          description: 'Captain Dahl has heard that someone plans to rob the fair. Three people may know more: the fence in Warehouse Row, the dockhands, and the guildmaster.',
          offerText: 'Word on the water is that someone means to rob the fair. I have six guards and a thousand visitors. Ask Old Fisk what he is selling, ask the dockhands about boats without lights, and ask Guildmaster Almeer who in this town owes too much money.',
          progressText: 'What have you heard?', completionText: 'Brindlewick grain in Fisk\'s shop, boats without lights, and Lord Ashcombe owing half the guild — and last week he asked to see the guildhall\'s night-watch plan. On the last night, when the fireworks go up, someone comes for the Lantern.',
          objectives: [{ id: 'o1', kind: 'talk', target: 'npc_fisk', text: 'Ask Old Fisk what he sells in Warehouse Row' }, { id: 'o2', kind: 'talk', target: 'npc_jory', text: 'Ask the dockhands about boats at night' }, { id: 'o3', kind: 'talk', target: 'npc_almeer', text: 'Ask Guildmaster Almeer who owes too much' }],
          rewards: [{ type: 'xp', xp: 200 }, { type: 'gold', gold: 20 }, { type: 'reputation', factionId: 'fac_lanternport', amount: 100 }] },
        // B4
        { id: 'q_last_night', title: 'The Last Night', giverPersonId: 'npc_dahl', turninPersonId: 'npc_dahl', prerequisites: { quests: ['q_whispers'] }, ui: { x: 2180, y: 540 },
          description: 'On the fair\'s last night, when the fireworks go up, thieves will come for the Founders\' Lantern in the guildhall.',
          offerText: 'The last night of the fair. The fireworks start at nightfall; the guildhall will be half empty, and Ashcombe\'s friends know the watch plan. Be in the guildhall when the sky lights up. I will be there too.',
          progressText: 'Tonight? Or have they come already?', completionText: 'The Lantern is safe, the thieves are in my cells, and Lord Ashcombe is explaining himself to the mayor. One of them had a green coin like yours… and a map of the lake with a cave marked on it.',
          objectives: [{ id: 'o1', kind: 'visit', target: 'lp_guildhall', text: 'Be in the guildhall on the fair\'s last night' }, { id: 'o2', kind: 'kill', target: 'Spy', count: 1, text: 'Stop the thieves\' leader' }],
          rewards: [{ type: 'xp', xp: 300 }, { type: 'gold', gold: 50 }, { type: 'reputation', factionId: 'fac_lanternport', amount: 250 }, { type: 'reputation', factionId: 'fac_reedcloaks', amount: -100 },
                    { type: 'choice', options: [{ item: 'Potion of Heroism', qty: 1 }, { item: 'Potion of Healing', qty: 3 }, { item: 'Cloak of Protection', qty: 1 }] }] },
    );
    w.encounters.push(
        { id: 'enc_warehouse_toughs', name: 'Toughs in Warehouse Row', monsters: [{ key: 'tough', count: 2 }, { key: 'bandit', count: 1 }], personIds: [], start: 'near', factionId: 'fac_reedcloaks' },
        { id: 'enc_heist', name: 'The Lantern thieves', monsters: [{ key: 'spy', count: 1 }, { key: 'bandit', count: 2 }, { key: 'scout', count: 1 }], personIds: [], start: 'near', factionId: 'fac_reedcloaks' },
    );
    w.events.push(
        // the fair: opens with the sign-up and runs three days (a night, then the next morning)
        { id: 'ev_fair_opens', name: 'The Lantern Fair opens', description: 'Drums, bunting and a hundred lanterns: the Lantern Fair of Lanternport is open, and Magpie Marlow announces the first contests.',
          triggers: [{ type: 'onQuestState', questId: 'q_fair_signup', state: 'turnedin' }], conditions: [],
          effects: [{ type: 'flag', key: 'fair_open', value: true }, { type: 'flag', key: 'fair_day', value: 1 }], repeatable: false, ui: { x: 2260, y: 300 } },
        { id: 'ev_fair_night1', name: 'Lanterns on the water', description: 'The first night of the fair: lanterns float out on the lake and the Lamplighter is full until dawn.',
          triggers: [{ type: 'onTime' }], conditions: [fairDay(1), { field: 'time', op: '==', value: 'night' }],
          effects: [{ type: 'flag', key: 'fair_night1', value: true }], repeatable: false, ui: { x: 2260, y: 360 } },
        { id: 'ev_fair_day2', name: 'The fair\'s second day', description: 'The second day of the Lantern Fair: the boat crews practise at the docks and the riddle tent has a queue.',
          triggers: [{ type: 'onTime' }], conditions: [fairDay(1), flagIs('fair_night1'), { field: 'time', op: '==', value: 'morning' }],
          effects: [{ type: 'flag', key: 'fair_day', value: 2 }], repeatable: false, ui: { x: 2260, y: 420 } },
        { id: 'ev_fair_night2', name: 'Music at the Lamplighter', description: 'The second night of the fair: fiddles at the Lamplighter, and boats without lights slipping out from the far end of the docks.',
          triggers: [{ type: 'onTime' }], conditions: [fairDay(2), { field: 'time', op: '==', value: 'night' }],
          effects: [{ type: 'flag', key: 'fair_night2', value: true }], repeatable: false, ui: { x: 2260, y: 480 } },
        { id: 'ev_fair_day3', name: 'The fair\'s last day', description: 'The last day of the Lantern Fair: the town is packed, the fireworks are stacked on the shore for tonight, and the guard at the guildhall is thin.',
          triggers: [{ type: 'onTime' }], conditions: [fairDay(2), flagIs('fair_night2'), { field: 'time', op: '==', value: 'morning' }],
          effects: [{ type: 'flag', key: 'fair_day', value: 3 }], repeatable: false, ui: { x: 2260, y: 540 } },
        { id: 'ev_heist', name: 'Fireworks and broken glass', description: 'The first rockets burst over the lake — and in the guildhall a window shatters. Figures in dark coats, one with a face you would forget at once, make for the Lantern.',
          triggers: [{ type: 'onEnterLocation', locationId: 'lp_guildhall' }, { type: 'onTime' }], conditions: [questIs('q_last_night', 'active'), fairDay(3), { field: 'time', op: '==', value: 'night' }, { field: 'location', op: '==', value: 'lp_guildhall' }],
          effects: [{ type: 'flag', key: 'heist_night', value: true }, { type: 'encounter', value: 'enc_heist' }], repeatable: false, ui: { x: 2260, y: 600 } },
        { id: 'ev_fair_closes', name: 'The Lantern saved', description: 'The Founders\' Lantern is back on its plinth; the fair ends with cheering on the shore.',
          triggers: [{ type: 'onQuestState', questId: 'q_last_night', state: 'turnedin' }], conditions: [],
          effects: [{ type: 'flag', key: 'lantern_saved', value: true }, { type: 'flag', key: 'fair_over', value: true }], repeatable: false, ui: { x: 2260, y: 660 } },
        { id: 'ev_warehouse_toughs', name: 'Unfriendly dockworkers', description: 'Three broad men step out of a warehouse door with cudgels: someone does not like your questions.',
          triggers: [{ type: 'onEnterLocation', locationId: 'lp_warehouses' }], conditions: [questIs('q_whispers', 'active')],
          effects: [{ type: 'encounter', value: 'enc_warehouse_toughs' }], repeatable: false, ui: { x: 2260, y: 720 } },
    );
    w.globalLore.push(
        { id: 'gl_lantern', label: "The Founders' Lantern", content: 'The Founders\' Lantern is Lanternport\'s relic, brought from the drowned village\'s chapel when the dam was built. Its flame is said never to have gone out. It is shown in the guildhall during the Lantern Fair.', keys: ['Lantern', 'Founders', 'relic'] },
        { id: 'gl_fair', label: 'The Lantern Fair', content: 'The Lantern Fair lasts three days in spring: contests (archery, arm-wrestling, riddles, the boat race), a cook-off, and fireworks over the lake on the last night.', keys: ['fair', 'contest', 'fireworks'] },
    );
    return w;
}

export const OPENING = [
    'Mist lies over Stillwater Mere this spring morning, and it creeps up the lane into Brindlewick, beading on the thatch of the Tipsy Heron.',
    'Inside, the fire crackles, Ada Fenn is slicing bread faster than anyone can eat it, and the stuffed heron over the bar leans a little further to the left than yesterday.',
    'The door bangs open. Elder Maren Holt comes in out of the mist, ledger under one arm, and looks around the common room at the villagers and the handful of travellers at the long tables.',
    '"Another cart," she says, to no one and everyone. "Liu Wen\'s, with the seed grain. The mule came home alone." Her eyes settle on you. "You look like someone who can walk a road without losing it. Can I buy you breakfast and a question?"',
].join('\n\n');

// ---- the package ----------------------------------------------------------------------------
export function drownedLantern() {
    return {
        format: 'rpmod-adventure', version: VERSION, id: ID,
        title: 'The Drowned Lantern',
        summary: 'Supply carts keep vanishing between the village of Brindlewick and the lakeside town of Lanternport. Follow the trail from goblin raiders to smugglers on Stillwater Mere, and to what lies under the lake. A starter adventure for one character and a companion.',
        levels: [1, 5],
        credits: [SRD.attribution],
        world: layer3(layer2(world())),
        characters: PREGENS.map(pregenCard),
        start: { view: 'player', pregens: PREGENS.map(p => p.id), opening: OPENING },
    };
}
