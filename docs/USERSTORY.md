# User Story & Product Vision

> Source of truth for *what* we are building. The *how/when* lives in
> [ROADMAP.md](ROADMAP.md); technical internals in [ARCHITECTURE.md](ARCHITECTURE.md).
> Agreed with the project owner on 2026-09-23.

## The user story

> **As a solo roleplayer using Esolite (a KoboldAI Lite fork), I want one integrated
> application that combines the best of D&D Beyond, SillyTavern and World of Warcraft —
> character sheets, rules, encounters and dice; character cards, personas, group chat and
> lorebooks; quest givers, quest logs, quest chains, zones and reputation — with the AI
> acting as game master while the software enforces rules and tracks state, presented
> graphically through familiar-but-original UIs, so that I get the ultimate AI roleplay
> experience.**
>
> Plus a world map of places — dungeons and towns, room by room — that RPmod draws from the world
> state (no full virtual tabletop; revised 2026-09-23).

The product is a **wedding of those three platforms**. Every item in the feature
catalogue below is in scope unless marked optional or listed under non-goals.

## Decisions (locked 2026-09-23)

| Topic | Decision | Consequence |
|---|---|---|
| Platform | **Inside Esolite**, as one unified app shell | Esolite stays the LLM/prompt engine (backends, instruct templates, WorldInfo pipeline, RAG/TextDB, TTS, image gen). We ship one usermod file (`KLITE-RPmod.js`) or the integrated `index.rpmod.html`. |
| Ruleset | **SRD 5.2.1** (2024 rules), CC-BY-4.0 | All rules data, monsters, spells, items come from SRD 5.2.1 (official PDF, downloaded 2026-09-23 to `docs/reference/`, git-ignored; extracted by `scripts/extract-srd.py`) with its exact attribution statement and no other attribution to Wizards. Existing SRD 5.1 monster presets must be replaced. |
| Play mode | **Solo, AI as DM** | One local user. The AI narrates and plays NPCs; the mod is authoritative for dice, HP, quest state, etc. A Creator mode exists for authoring. No multiplayer. |
| Map / VTT | **No VTT — a world map of places, room by room** (revised 2026-09-23) | The owner does not want a full VTT; location kinds `location`/`dungeon`/`town`, a dungeon/town is one node in the world graph with its own editor over the world editor, rooms stay locations hidden from the world graph, and the player gets a mini-map (design: `docs/design/R7-world-map.md`). R7 represents the world as places the player moves between (dungeon rooms; town places like market, temple garden, adventurers' guild, bathhouse — whatever the creator puts into the world). Same mechanic for dungeons and towns. The world state (rooms, connections with doors, contents, exploration) is the truth; a tile grid/board is **derived** by RPmod and drawn — the LLM never writes coordinates or ASCII, it names places and uses tags. Dungeons come from the editor, a generator, or the AI during play (all three). |
| Combat distance (R7) | **Distance bands instead of a grid** (2026-09-23) | Close (melee) · Near (ranged) · Far · Out of the fight; one move action = one band (idea of "Ultimate Dungeon Terrain", Dungeon Craft — reimplemented as rules, no material copied). Cover and hiding from the SRD 5.2.1 rules (half/three-quarters cover +2/+5 AC; Hide → Invisible). |
| Host version | **Esolite RMv1.35.0** (2026-09-23) | Reference folder `Esobold Esolite a fork of KoboldAI Lite RMv1.35.0/`; upgrades follow ARCHITECTURE §2. |
| Shell layout | **Two docked sidebars** around Esolite's chat (2026-09-23) | Left: party/character + quest tracker. Right: tabbed tools. |
| Big views | **Floating windows** (2026-09-23) | Sheet, quest log, compendium, combat, editor, map: draggable, resizable, several open, positions remembered. |
| Visual style | **Neutral, matches Esolite** (2026-09-23) | Design tokens bound to Esolite's `--theme_color_*`; no separate theme. |
| Character store | **Esolite's Library is the master** (2026-09-23) | One store: Esolite's Library (Jaxxks). RPmod's gallery is a presentation layer on top — a Chub.ai-style TavernCard collection (portraits, tags, ratings, search) — and writes through Esolite's own Library functions. Stay as close to Esobold as possible wherever the function already exists there; RPmod adds the RP-focused presentation (Esolite itself is more data-/agent-oriented). RPmod-only fields (rating, talkativeness, sheets) are kept alongside, keyed by the Library entry. |
| Inventory (R4) | **One inventory: the persona's sheet** (2026-09-23) | Quest rewards (items, gold, XP), `<give>`/`<take>` and collect objectives use the persona's character card; the story inventory is only the fallback without a persona. Items stay with the character across stories; resetting a world's state slots does not take them back. |
| Combat (R5) | **RPmod rolls, the AI narrates** (2026-09-23) | Monster turns are rolled by the mod (automatically until the player's turn, switchable); the AI only narrates the logged results. The fight starts at the persona sheet's current HP; HP and XP are written back to the sheet. All SRD 5.2.1 monsters are bundled. R5 runs before R3 so the owner can play; R3 keeps the compendium window. |
| Onboarding | **Build on Esolite's Quick Start (Jaxxks) + RPmod Guide** (2026-09-23, revised) | No RPmod setup wizard: RPmod adds an "RPmod world" section to Esolite's Quick Start and ships a reading-first **Guide** with "Show me" highlights. GuidedRP retired. Official extension hook proposed to Jaxxks (`docs/proposals/`). |

## Feature catalogue (target state)

### From D&D Beyond (character & rules toolset)
- **Character builder** — step-by-step: species, class, background, ability scores,
  equipment, spells. Produces an interactive sheet.
- **Interactive character sheet** — auto-calculated ability modifiers, proficiency bonus,
  AC, saving throws, skills, HP; everything clickable to roll.
- **Rules compendium** — SRD rules, monsters, spells, magic items, equipment, conditions;
  searchable and cross-linked from sheets, encounters and chat.
- **Campaigns** — adapted for solo play: *worlds* + a Creator/Player lens instead of
  multi-user campaigns.
- **Encounter builder** — pick monsters, get a difficulty rating against the party
  (XP budget), then run the fight with initiative order and HP tracking.
- **Digital dice + game log** — roll from the sheet (attack, damage, check, save);
  results appear in a shared game log that the AI also sees.
- **Leveling / XP** — XP thresholds, level-up flow.
- **Maps** — see VTT (optional).

### From SillyTavern (AI chat & roleplay frontend)
- **Character cards** — TavernCard V1/V2/V3 (PNG or JSON): description, personality,
  scenario, first message, example dialogue, system prompt, embedded `character_book`.
- **Personas** — the user's own character (`{{user}}`), which is the player character in
  game terms.
- **Group chats** — multiple characters with speaker-selection modes (manual, natural,
  list order / round-robin).
- **World Info / lorebooks** — keyword entries with position/depth, recursion,
  constant/selective/probability; import/export. Our *Worlds* graph is the richer,
  state-aware successor, but classic lorebooks must round-trip.
- **Prompt building** — author's note, context/instruct templates, token budget
  (provided natively by Esolite; we integrate, not rebuild).
- **Extensions** — slash commands / scripting, quick replies, vector storage / RAG,
  summaries, expressions / sprites, TTS, image generation (use Esolite's where it exists).

### From World of Warcraft (questing & world structure)
- **Quest-giver markers** — yellow `!` available · grey `!` available later (level or
  prerequisite not met) · yellow `?` ready to turn in · grey `?` accepted, in progress.
- **Quest log** — accepted quests, objectives with progress counters (kill X, collect Y,
  talk to Z, reach place), one tracked quest on screen, abandon.
- **Quest chains** — completing a quest unlocks the next; follow-up NPCs; item-started
  quests; prerequisites (level, previous quest, faction, reputation).
- **Rewards** — XP, gold, and "choose one of N" items.
- **World structure** — zones and subzones, hub cities, **phasing** (the world visibly
  changes after quests).
- **Factions & reputation** — standing tiers from Hated to Exalted affecting vendors,
  access and hostility.

### World map: dungeons & towns (phase R7, revised 2026-09-23)
Inspiration: HeroQuest-style room-by-room boards, roguelikes (NetHack, Dwarf Fortress) for a
text-first world state, Dungeon Scrawl for the look of hand-drawn dungeon maps — ideas only.
- Places the player moves between: dungeon rooms and town places, as world state in the World
  editor (connections with direction/type/door state, furniture/containers/traps/light,
  inhabitants) and exploration state per story (unknown → known → discovered → visited; secret
  doors/rooms found by searching).
- A board RPmod lays out and draws itself (fog over unexplored places); click a place to go there.
- The AI builds and changes the map with tags by name (rooms, doors, searching), sees the current
  place, its exits and a small minimap of what is explored.
- Combat uses distance bands (close / near / far / out) with move actions, cover and hiding.

## Experience principles
- **Graphical first.** Familiar layouts (sheet sections, quest log, initiative tracker,
  compendium entries) with an **original** visual design.
- **Everything reachable through the UI.** Chat tags (`<move>`, `<attack>` …) remain an
  optional power feature and the way the AI changes state.
- **AI narrates, software adjudicates.** Dice, HP, quest state and rewards are computed
  by the mod and injected into the AI's context so it narrates real outcomes.
- **Never lose user data.** Saves, characters and worlds must survive every upgrade.

## Non-goals
- Multiplayer, networked campaigns, sync servers.
- Rebuilding what Esolite already provides (backends, templates, WI engine, RAG, TTS,
  image generation).
- Any non-SRD D&D content, and any Blizzard/Wizards/Roll20/Foundry/Owlbear assets.

## Copyright & licensing guardrails
Standard practice, not legal advice.
- **Mechanics may be reimplemented; expression may not be copied.** Rules systems and UI
  *concepts* (a quest log with objectives, an initiative tracker) are fine. Art, icons,
  logos, fonts, UI textures, names and lore are not.
- **D&D:** only SRD content (we use **SRD 5.2.1**, CC-BY-4.0) with the required attribution:
  > This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.
  No "D&D", "Dungeons & Dragons" or "D&D Beyond" branding; no non-SRD monsters,
  spells or settings.
- **World of Warcraft:** `!`/`?` markers and quest-log conventions are generic; no
  Blizzard art, icons, fonts, names or lore.
- **Code:** SillyTavern, KoboldAI Lite/Esolite and MapTool are AGPL-3.0; Roll20, Foundry
  and Owlbear Rodeo are commercial products. Reimplement ideas — **do not copy their code**.
- **Assets:** our own visual design; icons only from permissive licenses (e.g. Lucide,
  ISC) bundled offline; user-supplied map images only.
- **TavernCard** is an open community spec — supporting it is fine.
