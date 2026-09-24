// Guide tab "Zone combat": how fights work without a grid (R7 step 5). Same block format as
// chapters.js; { code: false, table } = a table of plain text. Keep in sync with USER_GUIDE.md
// ("Zone combat") and src/game/zone-rules.js.
// show: [{ label, run(ctx) }] — ctx: { open(viewId), highlight(target, note), hostCall(fn), navLink(text), zoneGuide(), show(viewId) }

export const ZONE_CHAPTERS = [
    {
        id: 'zones-idea', title: 'Zones instead of a grid',
        blocks: [
            { p: 'D&D usually measures distances in feet on a grid. RPmod does not: a fight takes place in the room you are in, and the room is split into a few zones. Every creature stands in exactly one zone. Who can reach whom follows from the zones, not from measuring.' },
            { list: [
                'Same zone: close enough for melee.',
                'The next zone: one move away; short-range weapons still reach it.',
                'Further zones: long-range weapons only.',
            ] },
            { p: 'The Combat window draws the room as circles, with every creature as a token in its zone. The AI gets the same picture as text, so it can describe where everyone is.' },
            { tip: 'The idea comes from the zone combat of Ultimate Dungeon Terrain (Dungeon Craft). RPmod uses it with the free SRD 5.2.1 rules for cover and hiding.' },
        ],
        show: [
            { label: 'See the three layouts', run: (c) => (c.show || c.open)('zones-demo') },
        ],
    },
    {
        id: 'zones-layouts', title: 'Small rooms, large spaces, corridors',
        blocks: [
            { p: 'The size of the room decides its zones. One square on the dungeon map is 10 feet.' },
            { code: false, table: [
                ['Layout', 'Zones'],
                ['Small room (up to 30 × 30 ft)', 'The whole room is one zone: everyone can reach everyone. Around it: just outside (behind the doors).'],
                ['Large space (bigger rooms, caverns, outdoors)', 'A centre and four sides: north, east, south, west. Each side touches the centre and the two sides next to it. Around it: just outside.'],
                ['Corridor (one square wide)', 'The middle and only the arms the passage has. Walls separate the arms.'],
            ] },
            { list: [
                'Doors are drawn on the room\'s edge, on their side. Coming in through a door puts you on that side of the room.',
                '"Just outside" reaches the room only through its doors. "Out of range" is out of the fight.',
                'Creators can set the fighting space of a room in the dungeon editor, and the cover and zone of each feature.',
            ] },
        ],
        show: [
            { label: 'See the three layouts', run: (c) => (c.show || c.open)('zones-demo') },
        ],
    },
    {
        id: 'zones-moving', title: 'Moving',
        blocks: [
            { list: [
                'On your turn you may move to the next zone, or anywhere within your zone, for example behind a pillar.',
                'Creatures with a speed of 60 feet or more move up to two zones.',
                'Fleeing: up to two zones, but no attack this turn. Enemies in the zone you leave get an opportunity attack.',
                'A fighting retreat of one zone provokes no opportunity attack.',
            ] },
            { tip: 'In the Combat window, highlighted zones are within your reach: click one to move there. Or pick a zone and press Move or Flee.' },
        ],
    },
    {
        id: 'zones-attacking', title: 'Attacking',
        blocks: [
            { code: false, table: [
                ['Attack', 'Reaches'],
                ['Melee', 'the same zone (reach over 30 ft: the next zone)'],
                ['Ranged, range 30 ft or less (dagger, javelin, sling)', 'the same zone or the next zone'],
                ['Ranged, longer range (bows, crossbows)', 'any zone in the line of fire'],
            ] },
            { list: [
                'Shooting at an enemy who attacked you in melee within the last round: −3 to hit.',
                'Walls block the line of fire, for example around a corridor corner.',
                'Only one ranged attack per round can go through a doorway.',
                'Nobody out of range can attack or be attacked.',
            ] },
            { p: 'When an attack is not possible, the Combat window says why, and RPmod refuses it with a note in the log.' },
        ],
    },
    {
        id: 'zones-cover', title: 'Cover and hiding',
        blocks: [
            { p: 'Room features give cover: a table half cover, a pillar or statue three-quarters cover. Take cover behind a feature in your zone; it protects you against attacks from other zones. An enemy in your own zone just steps around it.' },
            { code: false, table: [
                ['Cover', 'Bonus'],
                ['Half cover', '+2 to AC'],
                ['Three-quarters cover', '+5 to AC'],
            ] },
            { p: 'Hide (your action): a Dexterity (Stealth) check against DC 15. You need three-quarters cover with no enemy in your zone, or darkness. If you succeed, you are Invisible: attacks against you have disadvantage and yours have advantage. Enemies can search for you (Wisdom (Perception) against your Stealth total). Attacking ends hiding.' },
        ],
    },
    {
        id: 'zones-play', title: 'Playing a fight',
        blocks: [
            { list: [
                'Start a fight in the Combat window and choose where the enemies start: across the room, right beside you, the next zone, or outside.',
                'On your turn: move, take cover, hide or attack. The line above the buttons shows your zone, the movement you have left and whether your action is used.',
                'Enemies play by the same rules. Melee fighters close in, and dash when they are too far away. Archers step away from melee and look for cover. When they cannot see you, they search.',
                'The AI narrates from the log, which lists moves, opportunity attacks and cover.',
                'Settings → RPmod → "Zone combat" turns zones off. Everyone can then reach everyone, as before. Fights that are already running keep their mode.',
            ] },
        ],
        show: [
            { label: 'Combat window', run: (c) => { c.open('combat'); c.highlight('[data-window="combat"]', 'Zones appear here during a fight'); } },
        ],
    },
];
