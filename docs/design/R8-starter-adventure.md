# R8 — Starter adventure "The Drowned Lantern" (design)

> Status: **draft for the owner's review** (2026-09-25). Nothing is built yet. Working title and
> all names are placeholders until the owner approves them.
> Related: [USERSTORY.md](../USERSTORY.md) (copyright guardrails), [ROADMAP.md](../ROADMAP.md)
> (known issue 22), [R7-world-map.md](R7-world-map.md) (dungeons, towns, zone combat).

## Goal

A complete, original starter adventure built into RPmod, next to the development world Eldoria:

- choose **Play the starter adventure** → pick one of **four pregenerated characters** → play;
- it starts in the **Player view** with the chosen pregen as your persona; pregens that are not in
  Esolite's Library yet are added to it; the other three can join as companions;
- it takes a character from **level 1 to 5**, about the size of a boxed starter set;
- English only; SRD 5.2.1 rules and monsters only.

It is also the vehicle for the real-backend play test (known issue 5) and the worked example of the
World Building guide.

## Copyright (read first)

- The reference material in `docs/reference/` (the German starter set, *Frozen Sick*, *Hoard of the
  Dragon Queen*) is **Wizards of the Coast product content, not SRD**. We take only its **size and
  structure** as a yardstick. No names, places, plot, NPCs, maps, text, art or the Forgotten Realms
  setting. `docs/reference/` is git-ignored as a whole.
- Everything below is original. Monsters, spells, items and rules come from SRD 5.2.1 with its exact
  attribution (already in the Guide's Credits, the bundle header and USER_GUIDE).
- A test guards this: a list of names from the reference material (people, places, factions, the
  setting) that must never appear in the adventure data (step 1).

## How the reference is built (summary, for scale only)

The starter set's adventure has four parts: (1) a hook, an ambush on a road and a small hideout
(~8 keyed areas); (2) a hub town with important NPCs, several side quests and a gang hideout (~12);
(3) an open region with several optional sites (~14 over all sites); (4) a final dungeon (~20).
It takes characters from level 1 to 5; five pregenerated characters each have a personal bond to
the town that pulls them into the plot. The pattern — hook, hub, branching sites, finale — is
generic and is what we reuse.

## The adventure

### Premise (what the player learns step by step)

Supply carts between the village of **Brindlewick** and the lakeside town of **Lanternport** keep
vanishing. The two places blame each other. The trail leads from goblin raiders to the
**Reedcloaks**, smugglers who ship stolen goods across **Stillwater Mere** from a hidden beach — and
from them to what they are really doing: dredging relics out of a village that drowned when the old
dam was built, and trading them to **Mother Reedwater**, a hag who lives in the drowned chapel under
the lake. She wants the **Founders' Lantern**, Lanternport's relic, which once hung in that chapel:
with it she can wake the drowned village's dead and make the lake hers.

### Secrets (GM only; `hidden` / `hiddenDescription`, phases, flags)

- The goblins are paid in **drowned-village coins** (old, lake-green) — the first clue.
- The Outpost's stablemaster **Corwin Lark** is a **Doppelganger** who tells the Reedcloaks which
  carts to hit. The real Corwin is alive, tied up in the Watchtower cellar.
- **Lord Percival Ashcombe** (Lanternport) is deep in debt and has sold the Reedcloaks the guildhall's
  night-watch plan for the fair.
- The **Founders' Lantern** is the key to the chapel's inner sanctum; lit on the last night of the
  fair, it is at its most "awake" — that is why the heist is planned for then.
- The chapel can be reached two ways: at low water (open the **Old dam**'s sluice gates — costs
  Brindlewick's mill a season: reputation) or by diving in through the **Sea cave** (harder).

### Map

The region is a world graph of places; settlements are **towns**, sites are **dungeons** (R7), roads
are plain locations. Travel advances the clock (valley road ~2 days, mountain road ~1 day).

| Place | Kind | Size | Notes |
|---|---|---|---|
| Brindlewick | town (village) | 7 places | start: green, mill, the Tipsy Heron inn, smithy, shrine, the elder's house, farms |
| Forest Road | location | — | the fork: valley route or mountain route; side path to the goblin den |
| Hollow Oak goblin den | dungeon | 6–8 rooms | level 1; tree roots and burrows |
| River Ford | location | — | the old ferry; "follow the river" reveals the path to the hidden beach |
| Meadow Road | location | — | valley route; side path to the owlbear lair |
| Owlbear lair | dungeon | 2–3 rooms | level 3; Harrowfield's lost sheep quest |
| Traveler's Outpost | town (small) | 5 places | common room, kitchen, guest rooms, stables, cellar; meals, rooms, gear |
| Gravel Road | location | — | mountain route; the campfire site (rest — or ambush at night) |
| Windgap Pass | location | — | weather events; shepherds' trail down to the Outpost |
| Watchtower ruin | dungeon | 5–6 rooms | level 2; harpies on top, the real Corwin in the cellar |
| Lanternport | town | 10 places | lake gate + market square, docks + fish market, fairground on the shore, guildhall + counting house, temple of the Lantern, the Lamplighter inn, watch house, crafts lane (smith, alchemist), warehouse row, the hilltop |
| Hidden beach | location | — | found by following the river; beach encounter (giant crabs by day, giant frogs at night) |
| Sea cave | dungeon | ~10 rooms | levels 3–4; the Reedcloaks' base: dock, stores, bunks, captain's cabin, flooded passage |
| Old dam | dungeon | 3 rooms | the sluice house; lore about the drowned village |
| The Lost Chapel | dungeon | 12–16 rooms | levels 4–5; finale: drowned village streets, chapel nave, crypt, the sanctum |

Links: Brindlewick – Forest Road – (Hollow Oak) · Forest Road – River Ford – Meadow Road – Outpost –
Lanternport (valley) · Forest Road – Gravel Road – Windgap Pass – Lanternport (mountain) · Windgap –
Watchtower · Outpost – Watchtower (shepherds' trail, found later) · River Ford – Hidden beach (found by
searching / following the river) – Sea cave – Lost Chapel (low water or diving) · Hidden beach – Old
dam · Lanternport docks – Hidden beach (by boat, once hired). Diagram: shown to the owner in chat
2026-09-25; to be redrawn as `docs/starter-adventure-map.svg` with the content.

### Factions

| Faction | Start | Role |
|---|---|---|
| Brindlewick folk | Neutral | village; blames Lanternport until the truth is out (phase) |
| Lanternport | Neutral | town, guild and watch; blames Brindlewick until the truth is out; the fair raises standing |
| Traveler's Outpost | Friendly | small; its helper quests raise standing (better prices, free room) |
| Reedcloaks | Unfriendly | smugglers; kill reputation; a phase after their captain falls (scattered) |
| The Drowned | Hated | Mother Reedwater's dead (monsters) |

### Questlines

Rewards: XP + gold/items + reputation; about half of all XP comes from quests (milestones), so the
pacing does not depend on how many fights the player picks. Quest ids are provisional.

**A — Trouble on the road (from Brindlewick, levels 1–3)**
1. *Missing carts* (Elder Maren Holt) — find the last cart on Forest Road → talk, visit.
2. *The Hollow Oak* — clear the goblin den, bring back the miller's grain sacks → kill Goblin Boss,
   collect. Reward includes a **drowned-village coin** (start item of A3).
3. *Old coin* (item-started) — ask about the coin: the shrine (Sister Imani) → the Old dam or
   Lanternport's temple → learn about the drowned village.
4. *Follow the river* (the ferryman at the ford) — find the hidden beach → visit; beach encounter.
5. *The Reedcloaks' cave* — raid the sea cave, find the ledger → kill Bandit Captain Vesna Kral,
   collect ledger. The ledger names "the stablemaster" and "a lord on the hill".

**B — The Lantern Fair (in Lanternport, levels 2–4)**
1. *A stranger at the fair* (Fair master "Magpie" Marlow) — sign up; the fair runs three in-game days.
2. Contests, **daily** (repeatable once per day, skill checks through the dice log / `/check`):
   archery (DEX), arm-wrestling (STR, Athletics), the riddle tent (INT), the boat race (Athletics or
   hire a boat), the cook-off (help Baba Okafor from the Outpost: bring lake fish + wild herbs).
   Prizes: gold, a Potion of Healing, a +1 weapon for the champion (SRD magic items), town standing.
3. *Whispers on the docks* (Watch Captain Sunniva Dahl) — three clues: the fence Old Fisk in
   warehouse row, the dockhands, Lord Ashcombe's debts → talk objectives, flags.
4. *The last night* — the heist during the fireworks. Choice (flags): **stop it** (fight in the
   guildhall, the Lantern stays; Lanternport Honored) or **let it happen and follow** (the thieves
   lead to the sea cave; the Lantern must be recovered there; bigger reward inside, lower standing).

**The Outpost (levels 2–3, side quests)** — *Kitchen stores* (collect), *The sick mare* (Medicine
check or herbs from the meadow), *Night raid* (defend the stables — Reedcloak scouts); *The
stablemaster* (unlocked by the ledger or by finding the real Corwin in the Watchtower): unmask the
Doppelganger (Insight check, then a fight).

**Side quests** — *Harrowfield's sheep* (owlbear lair, level 3), *The Watchtower* (harpies; the
real Corwin; loot), *Lights on the lake* (night event: Will-o'-Wisps lure travellers; level 4),
*The sluice* (the Old dam; opening it is the "low water" way to the chapel — costs Brindlewick
standing).

**C — The Drowned Lantern (convergence, levels 4–5)**
1. *What the hag wants* (after A5 + B4, prerequisites) — the ledger and the Lantern point to the
   drowned chapel.
2. *Into the mere* — reach the chapel (low water or the flooded passage from the sea cave).
3. *The Lost Chapel* — the drowned street (zombies, ghouls), the nave (specter), the crypt (Sir Aldric,
   a **Wight** bound to the hag), the sanctum: **Mother Reedwater** (Green Hag). Put out the Lantern's
   drowned light or take it back.
4. *Home* — turn in at Brindlewick and Lanternport; the villages' phases change (they reconcile, the
   road is safe, the fair returns next year). Ending variants by flags: the Lantern returned or
   lost; the mill's season lost or kept; the Reedcloaks scattered or recruited (Pell's bond).

About 20 quests plus the daily contests. Every monster must exist in SRD 5.2.1 (checked by a test):
Goblin Warrior, Goblin Boss, Wolf, Bandit, Bandit Captain, Scout, Spy, Harpy, Giant Crab, Giant Frog,
Swarm of Rats, Owlbear, Doppelganger, Will-o'-Wisp, Zombie, Ghoul, Specter, Wight, Green Hag.

### XP and fights

SRD thresholds: level 2 at 300 XP, 3 at 900, 4 at 2,700, 5 at 6,500. Encounter budgets per character
(SRD 5.2.1): level 1 low 50 / moderate 75 / high 100; level 3 150 / 225 / 400; level 5 500 / 750 / 1,100.

**Open decision — companions and XP.** RPmod pays a won fight's **whole** XP to the persona's sheet;
the SRD divides it among the characters. Fights authored for one hero are trivial with three
companions; fights authored for four level a solo hero far too fast. Recommendation:

1. **Divide combat XP among the party** (persona + companions on the party side), as in the SRD —
   additive, a small engine change with tests; quest XP stays per character.
2. **Author the fights for a party of two** (your pregen + one companion) — the Combat window already
   shows the difficulty for the actual party, and the Guide says "take one companion, or two for an
   easier game".

With (1) and (2), level 5 needs roughly 25–30 fights plus the quest XP; the table per site follows
with the content (step 3 onwards).

### Pregenerated characters

Four level-1 characters built with RPmod's character builder from SRD 5.2.1 options, one per SRD
background; each has pronouns in the card, a trait written as part of who they are (never a joke,
never a problem to overcome) and a bond to the story. Portraits: none bundled at first (initials
avatars); the owner can add them with Esolite's image generation.

| Pregen | Build (SRD 5.2.1) | Who | Bond to the story |
|---|---|---|---|
| **Oona Greycairn** | Orc Fighter (Champion from level 3), Soldier | she/her, 44; prosthetic left leg; steady, protective, dry humour | Former caravan guard; lost her crew on Forest Road years ago |
| **Tove Emberfall** | Dwarf Cleric (Life Domain), Acolyte | they/them; very short-sighted and refuses to wear glasses — sees the surroundings as a blur, cannot tell faces beyond a few steps, knows people by their voice; warm and loud | Their order kept the chapel that drowned with the old village |
| **Kasimir Adeyemi** | Human Wizard (Evoker from level 3), Sage | he/him, 23; curious, over-prepared, talks to his notebook | Studies the drowned village and the dam |
| **Pell Marrow** | Halfling Rogue (Thief from level 3), Criminal | she/her; quick, guilty conscience | Once rowed for the Reedcloaks and knows the beach; wants to make amends |

Tove's short sight is story flavour the AI plays (card text + a line in the sheet notes); no rules
penalty. The card tells the AI how to portray each trait. The three pregens not chosen appear as
world persons (linked to their cards) at the Tipsy Heron and can join the party.

### Key persons (placeholders, diverse names)

Brindlewick: Elder Maren Holt, miller Tobias Quill, innkeeper Ada Fenn (vendor), smith Oskar Brandt
(vendor), Sister Imani (shrine), farmer Liu Wen, the ferryman Odo. Outpost: keeper Hedda Morrow
(vendor), cook Babajide "Baba" Okafor, stablemaster Corwin Lark (the Doppelganger), stable hand Pip.
Lanternport: Mayor Isolde Varga, Guildmaster Rashid Almeer, Watch Captain Sunniva Dahl, Brother
Aurelio (temple), the Lamplighter's Nell and Tam (vendor), fence Old Fisk, Lord Percival Ashcombe,
fair master "Magpie" Marlow, alchemist Yara Sels (vendor), smith Dagna Holloway (vendor), shepherd
Harrowfield. Reedcloaks: Captain Vesna Kral (Bandit Captain), "Slate" (Spy). The Drowned: Mother
Reedwater (Green Hag), Sir Aldric (Wight).

## Technical design

### Adventure package (additive, versioned)

An adventure is a file/object RPmod can bundle, import and export:

```
{ format: 'rpmod-adventure', version: 1,
  id: 'drowned-lantern', title, summary, levels: [1, 5], credits: [SRD attribution],
  world: <the world object, as exportWorld()>,
  characters: [ <TavernCard V2 with data.extensions.rpmod = { pregen: 'oona', adventure: id, sheet }> ],
  start: { locationId, clock, view: 'player', pregens: ['oona','tove','kasimir','pell'],
           companionsAt: locationId, opening: '<first message of the story>' } }
```

- **Per-world start settings** (`world.start`, additive): start place, clock and view. The loader and
  "Back to start" use them, which also solves known issue 22 for every world: `useWorld` of another
  world gets a fresh runtime at its start instead of keeping the previous world's (migration: worlds
  without `start` behave as today).
- **Per-world view:** `world.start.view` sets the Creator/Player lens when the world is loaded
  (today one global setting that defaults to Creator).

### Loader ("Play the starter adventure")

Entry points: the **New here?** card, the RPmod section of Esolite's Quick Start, the World tab
(Example menu). Flow:

1. Choose a pregen (a small window with the four cards: name, build, one line, pronouns).
2. Import the adventure world as a new library entry (never overwrite a saved copy — as
   `loadExample` does today).
3. For each pregen: find it in Esolite's Library by `extensions.rpmod.pregen` + `adventure` (not by
   name); if missing, save it through `esoliteLibrary.saveCharacter` (a clash of names gets Esolite's
   `Name_1`); never touch an existing card (the player's progress lives there).
4. Set the chosen pregen as the persona; link the other three to their world persons.
5. New story in Esolite (the user confirms if the current story is unsaved — Esolite's own dialog),
   world enabled, runtime at `start`, **Save as start**, Player view, the `opening` as the first
   message.

### Save format

All additive: `world.start`, `world.adventure { id, version }`, card `extensions.rpmod.pregen`.
Stories saved before R8 load unchanged. Tests for the migrations.

### Where the content lives

`src/data/adventures/drowned-lantern.js` (generated from an authored JSON in the same folder, like
the SRD data), bundled. Estimated 150–250 KB. The same file can be exported/imported by users, so
people can share adventures later.

### Tests

- **Validator** (pure, reusable for any adventure): every id resolves, every quest is reachable
  (prerequisites satisfiable), every place is reachable from the start, every monster and item exists
  in SRD 5.2.1, XP totals reach level 5, no text from the forbidden-names list.
- **Loader:** pregens added once (second load adds nothing), persona set, Player view, start state.
- **Play-through (acceptance):** questlines A, B and C through the API and chat tags to the final
  turn-in, as the R6/R7 acceptance tests do.
- **Real backend:** one session per layer with a real model (known issue 5).

## Steps (each ends tested, documented, committed)

1. **Package + loader:** adventure format, `world.start` (+ issue 22), per-world view, the pregen
   picker, Library import by `pregen` id, validator, forbidden-names test; Eldoria gets a `start` too.
2. **Companions and XP** — the owner's decision on the XP split, then the change and its tests.
3. **Layer 1:** Brindlewick, Forest Road, Hollow Oak, River Ford; quests A1–A3; the pregens.
4. **Layer 2:** both routes, the Outpost, the Watchtower, the owlbear lair; Outpost and side quests.
5. **Layer 3:** Lanternport and the Lantern Fair (questline B).
6. **Layer 4:** the hidden beach, the sea cave, the Old dam, the Doppelganger; A4–A5.
7. **Layer 5:** the Lost Chapel, the endings; balance pass over all XP.
8. **Play test** with a real backend; fixes; then the World Building guide (A2) uses this adventure
   as its worked example.

## Open questions for the owner

1. **XP split and party size** (see "XP and fights"): divide combat XP among the party and author for
   two — agreed?
2. **Title and names** — "The Drowned Lantern", Brindlewick, Lanternport, Stillwater Mere, the pregens
   and persons: keep, or rename any?
3. **Tone:** classic heroic fantasy with light humour (the fair, Tove, Kasimir) and a spooky finale —
   right?
4. **The fair's length:** three in-game days — or shorter for pacing?
5. **Portraits:** initials avatars at first, images later (owner-made or generated) — fine?
