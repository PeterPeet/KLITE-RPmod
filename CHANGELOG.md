# Changelog

What's new in KLITE RPmod, newest first. Play it at <https://rp-lite.koboldai.net>; the Esolite mod manager loads the
same version.

## v0.10.1 — 2026-10-22

Hi everyone! A small one this time, but an important one. After all our play testing, one thing kept coming up: RPmod
plays a lot better with the right AI settings, and most of you will never open a README to find them. So we put them
where you'll actually see them.

There's a new chapter in the Guide, **"Which AI model? Settings that matter"**. It covers which models played well in
our tests, and the few settings that make a big difference. And when you start fresh, the **"New here?"** card now
gently warns you if your Max Output is too low. One click opens the right setting.

- **New Guide chapter (RPmod tab):** the models we tested and how they did. Max Output 16,000, Context Size 32,768.
  Reasoning off or low is plenty.
- **"New here?" warning** while Max Output is below 16,000, with a button straight to the setting. Esolite keeps Max
  Output below 85% of your Context Size, so raise the context first; the warning tells you when that's the case.
- **The AI Horde isn't a good fit for RPmod:** most of its models only have about 4,000 tokens of context, too little
  for the game. The Guide no longer suggests it as the easy start.
- Bigger models like Claude, GPT, Gemini or Grok will probably work great. We just haven't been able to test them yet.

## v0.10.0 — 2026-10-21

Hello adventurers! We have gone back in and debugged and improved the encounter management, and a lot of testing went
into this one. Fights should now work much more like you'd expect. We also played The Drowned Lantern with real AI
models for the first time, from small cheap ones to big ones, and fixed everything we tripped over along the way.
Playtesting is still going on, and next we'll focus on the inventory system and further minor fixes.

**Fights**
- A companion who's dying takes their turn and rolls their death saves, so fights don't get stuck anymore.
- One Attack action per turn, with Extra Attack from your class and level.
- Win the fight, and anyone still dying gets back up with 1 HP.
- Fights the AI or an event starts now run their first turns right away and open the Combat window.
- Prepared encounters only start where they belong, and the AI is told how many enemies are waiting.

**The AI as your game master**
- If the AI's reply gets cut off while it's still thinking, nothing from that half-finished reply changes your game.
- Retry and Undo take back what the AI's last reply did. RPmod asks first if you changed something in between.
- When the AI describes something that didn't happen (a hit after a miss, a room that isn't there), RPmod reminds it in
  the next reply to set the story straight.
- Moving through dungeons and towns works much better. The AI walks one room at a time, doesn't invent rooms in
  finished maps, and knows what's behind the next door before it describes it.
- Chests and other containers hand out what's inside, once. You can cast healing spells outside of fights too.
- RPmod asks once to set Esolite's World Info placement it needs, and keeps it set.

**Characters**
- Your character sheet no longer rewrites the whole character card, portrait and all, every time your HP changes. One
  of you noticed a lot of disk activity. Thanks for the report!
- Casting from the sheet uses up the spell slot right away. Leveling up keeps your class. Wizards get Scholar at
  level 2. Enter adds items and attacks.
- The four ready-made heroes now know their two extra languages.

**Other**
- The game log survives a page reload, and a new session starts with a clean one.

## v0.9.0 — 2026-09-25

The first version on <https://rp-lite.koboldai.net>: Esolite with RPmod already loaded, and the starter adventure
*The Drowned Lantern*. Its last parts (Lanternport, the south shore, the Lost Chapel) followed on 2026-09-26.
