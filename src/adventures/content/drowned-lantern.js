// =============================================================================
// KLITE RPmod — Starter adventure "The Drowned Lantern" (R8). Original content; SRD 5.2.1 rules
// and monsters only (the attribution is in `credits`). Design: docs/design/R8-starter-adventure.md.
// -----------------------------------------------------------------------------
// Built layer by layer (R8 steps 3–7). Layer 1 (step 3): Brindlewick, the Forest Road, the Hollow
// Oak goblin den, the River Ford; quests A1–A3 and the mill; the four pregenerated characters.
// Raise VERSION whenever the content changes: a player's Library then gets the new world beside
// the old one (never overwritten), while their pregens keep their sheets.
// The pregens are built with the character builder when the bundle loads, so their sheets always
// follow the builder's rules.
// =============================================================================
import { SRD } from '../../data/srd52.js';
import { buildSheet } from '../../characters/builder-rules.js';
import { writeSheet } from '../../characters/sheet.js';

export const ID = 'drowned-lantern';
export const VERSION = 1;

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
                { kind: 'town', mapStyle: 'plots', atmosphere: 'worried', hub: true, connectedLocationIds: ['loc_forest_road'], ui: { x: 300, y: 300 },
                  phases: [{ id: 'ph_relieved', label: 'Goblins driven off', conditions: [questIs('q_hollow_oak', 'turnedin')], atmosphere: 'relieved', description: 'A mill village of thatched roofs and stone walls. The mill wheel turns again, and people talk about the heroes of the Hollow Oak — and, more quietly, about the strange coin they found there.' }] }),
            place('loc_forest_road', 'Forest Road', 'The old trade road east of Brindlewick, under oak and beech. Ferns crowd the verges; the ruts are deep from carts that no longer come. A side track runs north to a huge dead oak, and the sound of the river comes from the south.',
                { atmosphere: 'tense', connectedLocationIds: ['loc_brindlewick', 'loc_hollow_oak', 'loc_river_ford'], ui: { x: 600, y: 300 },
                  localLore: [{ id: 'll_cart', content: 'Liu Wen\'s cart lies overturned in the ferns a mile out of the village: the grain sacks are gone, the mule cut loose, and small bare footprints lead north towards the Hollow Oak.', keys: ['cart', 'tracks', 'footprints'] }] }),
            place('loc_hollow_oak', 'The Hollow Oak', 'A dead oak so old and vast that a whole goblin band lives in its trunk and in the burrows between its roots. It smells of smoke, wet earth and stolen bread.',
                { kind: 'dungeon', mapStyle: 'stone', atmosphere: 'menacing', connectedLocationIds: ['loc_forest_road'], ui: { x: 600, y: 110 } }),
            place('loc_river_ford', 'River Ford', 'Where the Forest Road meets the Brindle river: a ford of flat stones for dry summers and Odo\'s rope ferry for the rest of the year. Reeds, herons, and now and then a green old coin washed out of the gravel.',
                { atmosphere: 'calm', connectedLocationIds: ['loc_forest_road'], ui: { x: 600, y: 490 } }),

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
            { id: 'enc_road_ambush', name: 'Goblin ambush on the road', monsters: [{ key: 'goblin-warrior', count: 2 }], personIds: [], locationId: 'loc_forest_road', start: 'near', ui: { x: 760, y: 300 } },
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
        world: world(),
        characters: PREGENS.map(pregenCard),
        start: { view: 'player', pregens: PREGENS.map(p => p.id), opening: OPENING },
    };
}
