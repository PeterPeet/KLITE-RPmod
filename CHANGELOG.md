# Changelog

What's new in KLITE RPmod, newest first. Play it at <https://rp-lite.koboldai.net>; the Esolite mod manager loads the
same version.

## v0.11.0 — 2026-10-22

Hi everyone! Last time we promised the inventory system, and here it is. Your backpack is now a real backpack: every
item takes room by its weight, the way you know it from Diablo. A dagger is one small tile, a longsword a long row, a
bedroll a big block, and twenty arrows share a single tile. You pack it, you turn things to make them fit, and when it
gets too heavy, your character feels it.

We play-tested it with a real AI model and fixed what we found: the AI now picks things up, puts them down and leaves
them lying where they were dropped. Throw your heavy load into the mud before a fight, and it is still there afterwards.
Next we'll look at a few things the play test showed about shops and people in the world, and keep on fixing.

**Your inventory**
- A new **Inventory** tab on the character sheet: your hands, armor, back, belt, sheaths and two straps on the
  backpack on the left, and every bag as its own grid on the right — a pouch inside your backpack opens as its own grid.
- Click an item to pick it up and click where it goes, or just drag it (mouse or finger). Press **R** to turn it.
  A green or red outline shows whether it fits, and if it doesn't, RPmod tells you why.
- Bags hold what the rules allow: a Backpack 50 lb, a Pouch 6 lb, a Quiver your arrows, a Bag of Holding 500 lb.
  And everyone has pockets for a coin or a key.
- You carry up to **Strength × 15 lb**. More than that you can only drag along — your Speed drops to 5 ft, in fights
  too. Drop something, and you're quick again.
- **Drop** puts something on the ground right where you are; the Here row offers **Pick up** later. Loot that doesn't
  fit stays on the ground too, and nothing is ever lost.
- Shops don't sell you more than you can carry (and you don't pay for it).
- Colours and icons tell melee weapons, ranged weapons, armor, ammunition, potions and bags apart; hover over an item
  for its name, weight and where it is.
- The left panel shows a small card for you and every companion: how much they carry, their coins, and a button
  straight to their inventory.
- Your characters keep everything they had. The four heroes of *The Drowned Lantern* start with a well-packed bag,
  and Oona carries her greatsword in her hands.

**The AI**
- It knows how to give you things, take them away and leave them on the ground, and it can say how heavy something
  unusual is ("a broken cart axle, 40 lb").
- It knows when you are overloaded and slowed down, and it tells you so in the story.

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
