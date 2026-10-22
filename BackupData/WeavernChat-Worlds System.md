# Wyvern Worlds - Reconstructed Internal Specification
Version: Draft 0.9 (Unofficial)

---

# Purpose

Wyvern Worlds appears to be an evolution of traditional Lorebooks.

Instead of storing independent lore entries that are activated by keyword matches, Worlds models an actual game world consisting of locations, entities, relationships and current state.

The AI is then supplied only with the subset of information that is relevant to the player's current situation.

Conceptually:

Classic Lorebook
→ document retrieval

Wyvern Worlds
→ world state retrieval

---

# High-Level Architecture

```
World
│
├── Global Lore
├── Map
│    ├── Location
│    │     ├── NPCs
│    │     ├── Objects
│    │     ├── Local Lore
│    │     ├── Events
│    │     └── Connections
│    │
│    └── ...
│
├── Timeline
├── Party
├── Quest State
└── Runtime State
```

Everything belongs somewhere.

Nothing exists as an isolated text entry.

---

# Core Object Types

## World

Top-level container.

Contains

- maps
- timeline
- factions
- locations
- world lore
- rules
- event definitions

Example

```
World
Name:
Kingdom of Eldoria

Description:
Large medieval fantasy kingdom.
```

---

## Location

Represents a physical place.

Properties

- name
- description
- biome
- atmosphere
- exits
- connected locations
- resident NPCs
- local lore
- available events

Example

```
Forest Road

Description:
Old trade road through dense woodland.

Connected:
Village
Watchtower
River
```

---

## NPC

Persistent characters.

Properties

- name
- appearance
- personality
- current location
- faction
- schedule
- inventory
- relationships
- current state

Example

```
Name:
Captain Rowan

Location:
Watchtower

Mood:
Suspicious

Faction:
Royal Guard
```

Unlike classic lorebooks, NPCs are likely persistent objects.

They move.

Their state changes.

---

## Factions

Group entities.

Example

```
Royal Guard

Goals:
Protect kingdom.

Enemies:
Bandits
```

NPCs reference factions instead of duplicating information.

---

## Objects

Persistent world items.

Examples

- sword
- tavern sign
- magical crystal
- wagon

Objects may exist at locations or be owned by NPCs.

---

## Global Lore

General information not tied to any place.

Examples

History

Magic system

Religion

Economy

Languages

Calendar

This information is retrieved only when needed.

---

## Timeline

Tracks world time.

Possible fields

```
Current Day

Current Month

Current Year

Current Time

Season

Weather
```

Many systems can depend on it.

---

## Runtime State

Dynamic information.

Examples

```
Player Location

Party Members

Current Quest

Visited Places

Known NPCs

Inventory

Flags

Current Conversation
```

This changes constantly.

---

# Relationships

Everything is connected.

```
NPC
    ↓
Location
    ↓
Region
    ↓
World

NPC
    ↓
Faction

NPC
    ↓
Quest

Object
    ↓
Location

Event
    ↓
Timeline
```

Instead of keyword matching, retrieval likely follows these links.

---

# Retrieval Pipeline

Likely execution order.

```
User Message

↓

Determine Current World State

↓

Determine Current Location

↓

Load Nearby Objects

↓

Load Nearby NPCs

↓

Load Local Lore

↓

Load Active Events

↓

Load Relevant Global Lore

↓

Assemble Prompt

↓

LLM Generation
```

---

# Context Priorities

Likely priority order

1. Current conversation
2. Runtime state
3. Current location
4. Nearby NPCs
5. Nearby objects
6. Active quests
7. Active events
8. Relevant global lore
9. Historical lore

Older or distant information receives lower priority.

---

# Geographic Retrieval

Instead of keyword triggers.

```
Player

↓

Village

↓

Village Tavern

↓

Only retrieve

- bartender
- menu
- rumors
- local NPCs
- local objects

NOT

- distant king
- northern mountains
- dragon cave
```

This greatly reduces token usage.

---

# Graph-Based Retrieval

Internally the world probably behaves like a graph.

```
Village

├── Inn
├── Blacksmith
├── Market

Inn

├── Bartender
├── Innkeeper
├── Rumors

Bartender

↓

Knows

↓

Captain Rowan
```

The AI traverses connected nodes.

Not the entire database.

---

# Event System

Events appear to be conditional.

Example

```
Harvest Festival

Requirements

Month == Autumn

Location == Village

Not Completed

↓

Inject event description.
```

Another

```
Bandit Ambush

Requirements

Forest Road

Night

Player Level > 3
```

Events may activate automatically.

---

# NPC Scheduling

Likely implementation

```
08:00

Market

↓

12:00

Inn

↓

18:00

Home

↓

Night

Sleeping
```

The timeline determines current location.

---

# Prompt Assembly

A reconstructed prompt might resemble

```
SYSTEM

World Rules

---

Current Time

Morning

---

Current Location

Forest Road

---

Nearby NPCs

Captain Rowan

Merchant Elias

---

Nearby Objects

Broken Wagon

Campfire

---

Active Events

Bandit Activity

---

Relevant Lore

The King's Road is dangerous during autumn.

---

Conversation History

...

---

User Message
```

The LLM never receives the whole world.

Only the active slice.

---

# Token Budget

Probably divided roughly.

```
Conversation
45%

Current State
15%

Location
10%

NPCs
15%

Events
5%

Lore
10%
```

Exact values unknown.

---

# Persistence

Unlike lorebooks

NPCs probably remember

- injuries
- inventory
- friendships
- quest progress
- location

These become runtime state.

---

# Advantages

Compared to Lorebooks

✓ Less prompt bloat

✓ Better consistency

✓ Location awareness

✓ Time awareness

✓ Persistent NPCs

✓ Dynamic events

✓ Easier large worlds

---

# Likely Internal Data Model

```
World
{
    Maps[]
    Locations[]
    NPCs[]
    Objects[]
    Events[]
    Factions[]
    Timeline
    GlobalLore[]
}
```

Location

```
{
    id
    name
    description
    exits[]
    npc_ids[]
    object_ids[]
    event_ids[]
}
```

NPC

```
{
    id
    name
    personality
    faction
    current_location
    inventory[]
    relationships[]
    state
}
```

Event

```
{
    conditions[]
    effects[]
    description
}
```

---

# Comparison

Classic Lorebook

```
Keyword

↓

Insert Text
```

Worlds

```
Player State

↓

Location

↓

Nearby Graph

↓

Relevant Nodes

↓

Prompt
```

The retrieval becomes semantic rather than textual.

---

# Overall Interpretation

Wyvern Worlds is best understood not as an improved Lorebook but as a lightweight world simulation layer sitting in front of the LLM.

The LLM itself remains stateless.

Worlds acts as the state manager that determines which parts of the world's knowledge graph are relevant at any moment, assembles that information into a compact prompt, and supplies it to the language model.

Conceptually, the architecture resembles a Retrieval-Augmented Generation (RAG) system operating over a graph of world entities rather than over independent text documents. This allows the AI to reason from the player's current location, time, nearby characters, active events, and persistent world state instead of relying solely on keyword-triggered lore entries.