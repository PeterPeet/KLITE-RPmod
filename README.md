# KLITE RPmod

KLITE RPmod turns **[Esobold Esolite](https://github.com/esolithe/esobold)** (a KoboldAI Lite fork) into a solo
AI-roleplay application: character sheets, dice and rules like D&D Beyond (SRD 5.2.1), character cards, personas,
group chat and lorebooks like SillyTavern, and quests, reputation and maps like a classic MMO — with the AI as the
game master and the mod enforcing the rules. It ships as one JavaScript usermod and enhances Esolite instead of
replacing it.

**Play it online:** <https://rp-lite.koboldai.net> — Esolite with RPmod already loaded. Connect your own AI in Esolite
and start the built-in adventure *The Drowned Lantern* (four pregenerated characters, or build your own).

## What you get

- **Characters:** a d20 character sheet in every character card (SRD 5.2.1, levels 1–20), a step-by-step character
  builder with spells, feats and level up, click-to-roll dice, inventory with what is in hand, a full-screen gallery.
- **Worlds:** a world editor with places, people, factions, quests and encounters; dungeons and towns room by room
  with doors, traps, secret doors, light and a generator; the AI only learns what the player knows.
- **Rules the AI does not decide:** combat with initiative, zones, cover and death saves; checks, spells, loot,
  quests and reputation are rolled and applied by RPmod — the AI narrates the results and writes tags
  (`<go>`, `<encounter>`, `<cast>`, `<give>`, …) that RPmod checks and applies or refuses.
- **Safety nets for real models:** replies cut off while thinking apply nothing; Retry/Undo take back what a reply
  did; refused tags come back as a story correction; the game log sends every roll since the last reply.
- **Compendium:** every SRD 5.2.1 monster, spell, item and rule, searchable, docked beside the chat.
- **Guide:** built into Esolite's Guide, with RPmod's own chapters.

Documentation: [User guide](USER_GUIDE.md) · [Roadmap and current state](docs/ROADMAP.md) ·
[Architecture](docs/ARCHITECTURE.md) · [Product vision](docs/USERSTORY.md)

## Which AI model?

RPmod needs a model that follows its rules: narrate only what RPmod rolled, write the tags, keep to the map. From the
real-backend play tests (2026-10-20, via Novita, the same set of scenes for every model — start and quest, an ambush,
a missed attack narrated three times with Retry, a spell after the fight, a trap, a waiting encounter, a walk through
several rooms):

| Model (reasoning) | Time per reply | Thinking | A miss narrated as a miss | Tags and game-master discipline | Weak spots |
|---|---|---|---|---|---|
| **Gemma 4 31B** (high, 4096) | – | without thinking it invented rolls | with thinking: every result in order | sometimes moves without `<go>` | keeps its own inventions (an invented key "opened" a locked door) |
| **DeepSeek V4 Pro** (low, 4096) | 20–60 s | 6,000–15,000 chars, often cut off | yes | reliable; starts prepared encounters by name; respects a refusal after the correction | tags sometimes in the wrong place; invents a substitute |
| **DeepSeek V4 Flash** (low) | ~7 s | 500–2,800 chars | 1 of 3 (2 invented kills) | reliable for simple tags | — |
| **DeepSeek V4 Flash** (high) | 3–7 s | 70–1,900 chars (uneven) | 2 of 3 | — | walked three rooms with **no** `<go>` |
| **GLM 5.3 Flash** (medium/high, 16k) | 30–100 s | 9,000–32,000 chars | **3 of 3** | a `<go>` for every move; encounter by name; `<cast>` by itself | invented a room; Generate More rewrites the whole answer |
| **GLM 5.3** (low, 4096/16k) | 19–91 s | 5,000–27,000 chars | **4 of 4** | `<cast>`, encounter by name, trap credited correctly | 4 of 8 replies cut off at 4096 (no tag applied each time); slow |
| **GLM 5.3** (no thinking, 4096) | **6–14 s** | a one-line plan | **3 of 3** (+ 2 of 2 without the preset) | `<cast>`, encounter, trap; follows a story correction at once | before the prompt fixes: invented a room and a place |

**Takeaways:**
- **GLM 5.3 without thinking** is the best price/quality so far: fast, never cut off, fights, spells and encounters
  as reliable as with thinking, and the best text of the cheap models. Set the reasoning to `none` — Esolite's GLM
  no-think instruct preset is not needed (an OpenAI-compatible API gets no instruct tags; `reasoning_effort: "none"`
  does it).
- **DeepSeek V4 Pro** is the most reliable game master with thinking, but slow and often at the end of a 4096-token
  output.
- **The Flash models** are fast but slipped in fights (invented kills) or on moves; GLM 5.3 Flash writes well but
  thinks long.
- On `reasoning_effort: "low"`, **max output does not scale GLM's thinking**: at 4k vs. 16k the thinking was about the
  same length ("high" not measured). A reply cut off while thinking applies nothing — use Generate More or Retry.
- **Exploring** was the common weak spot. Since the prompt fixes (fixed maps by default, one room per reply, the tags
  belong to the narrator) GLM 5.3 without thinking walks one room with `<go>` and stops; what lies behind the exits is
  now given to the narrator as well (not yet re-measured).

The numbers come from one day of testing on the same scenes; settings and some prompt fixes changed between runs, so
read the table as a trend, not a benchmark. Details: [docs/ROADMAP.md](docs/ROADMAP.md) (R8 step 8).

**Recommended Esolite settings** (also in the Guide: RPmod → "Which AI model? Settings that matter"):
- **Max Output 16,000** (Settings → Samplers; type the number, the slider stops at 2048) and **Context Size 32,768** —
  set the context first: Esolite keeps Max Output below 85% of the Context Size, so with a small context 16,000
  quietly becomes less. The "New here?" card warns while Max Output is below 16,000.
- **Reasoning** off or low.
- **World Info "Before A/N"** with the Author's Note "Turn based", 1 user turn (RPmod asks once and keeps it set).

## Install it yourself

The mod is one file, [`KLITE-RPmod.js`](KLITE-RPmod.js). In Esolite open the mod manager (Settings → user mod), load
the file and enable it. Esolite is the host: use a current Esobold
([esolithe/esobold](https://github.com/esolithe/esobold), branch `remoteManagement`).

## Development

```
npm install          # once (dev dependency: jsdom)
npm run build        # src/* -> KLITE-RPmod.js
npm test             # all tests (node:test + jsdom); needs an Esobold clone in ../esobold
npm run build:host   # Esolite site from ../esobold
npm run build:index  # the site with RPmod autoloading
npm run serve        # http://localhost:8747/index.rpmod.html
```

Sources are in `src/` (the bundle is generated). Branches: `main` ← `development` ← feature branches; `main` is
frozen (it holds the legacy files users fetch directly). See [CLAUDE.md](CLAUDE.md) for the project rules.

## Credits

This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC,
available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0
International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Icons: Lucide (ISC license; some icons derived from Feather, MIT license). Host: Esobold Esolite by Jaxxks, a fork of
KoboldAI Lite by Concedo.

Come say hi on Discord: https://discord.gg/koboldai

## License

KLITE RPmod is licensed under the **GNU Affero General Public License v3.0** ([LICENSE.md](LICENSE.md)) — the same
license as its host, Esobold Esolite. In short: you may use, change and share it; if you share it or run a modified
version for others over a network (like a website), you must offer its source code under the same license.

Copyright (C) 2025–2026 Peter Hauer (PeterPeet).

The SRD 5.2.1 material keeps its own license (CC-BY-4.0, see Credits); the Lucide icons are ISC/MIT.
