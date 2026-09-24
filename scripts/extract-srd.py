#!/usr/bin/env python3
# =============================================================================
# SRD 5.2.1 → src/data/srd52.js (character creation data for levels 1–20), srd52-monsters.js,
# srd52-spells.js
# -----------------------------------------------------------------------------
# Source: System Reference Document 5.2.1 by Wizards of the Coast LLC, CC-BY-4.0,
# downloaded from https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf
# to docs/reference/ (git-ignored). Needs: pip install pypdf
#
# Feature/trait/feat texts are extracted from the PDF text; tables whose layout the PDF
# text scrambles (core class traits, spell progression, backgrounds, weapons, armor) are
# transcribed here by hand from that same text and checked against it.
#
# Usage:  python3 scripts/extract-srd.py   (writes src/data/srd52.js)
# =============================================================================
import json, os, re, sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
PDF = os.path.join(ROOT, 'docs', 'reference', 'SRD_CC_v5.2.1.pdf')
OUT = os.path.join(ROOT, 'src', 'data', 'srd52.js')
MONSTERS_OUT = os.path.join(ROOT, 'src', 'data', 'srd52-monsters.js')
SPELLS_OUT = os.path.join(ROOT, 'src', 'data', 'srd52-spells.js')

ATTRIBUTION = ('This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of '
               'the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the '
               'Creative Commons Attribution 4.0 International License, available at '
               'https://creativecommons.org/licenses/by/4.0/legalcode.')

def pdf_text():
    import pypdf
    r = pypdf.PdfReader(PDF)
    return ''.join(f'\n=====PAGE {i + 1}=====\n' + (p.extract_text() or '') for i, p in enumerate(r.pages))

def clean(block):
    b = re.sub(r'(\w) ?-\s*\n(?=[a-z])', r'\1', block)          # "Ar -\nmor" -> "Armor"
    b = re.sub(r'(\w)- \n?(?=[a-z])', r'\1', b)
    paras, cur = [], ''
    for ln in b.split('\n'):
        if not ln.strip():
            continue
        new_para = ln.startswith(' ') or ln.startswith('•') or not cur
        if new_para and cur:
            paras.append(cur.strip()); cur = ''
        cur += (' ' if cur else '') + ln.strip()
    if cur:
        paras.append(cur.strip())
    out = []
    for p in paras:
        p = re.sub(r'\s+', ' ', p).replace(' ,', ',').replace(' .', '.').replace('’', "'").replace('“', '"').replace('”', '"')
        out.append(p)
    return out

# ---- hand-transcribed tables (SRD 5.2.1 pp. 19–23, 28–82, 83, 91–92) --------------------
CLASSES = {
    'barbarian': dict(name='Barbarian', primary=['str'], hitDie=12, saves=['str', 'con'],
        skills=dict(choose=2, from_=['animal_handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival']),
        weapons='Simple and Martial weapons', armor='Light and Medium armor and Shields', tools='',
        equipment=[dict(id='A', items=['Greataxe', '4 Handaxes', "Explorer's Pack"], gp=15), dict(id='B', items=[], gp=75)],
        standardArray=dict(str=15, dex=13, con=14, int=10, wis=12, cha=8), subclass='Path of the Berserker',
        columns={1: dict(rages=2, rageDamage=2, weaponMastery=2), 2: dict(rages=2, rageDamage=2, weaponMastery=2), 3: dict(rages=3, rageDamage=2, weaponMastery=2)}),
    'bard': dict(name='Bard', primary=['cha'], hitDie=8, saves=['dex', 'cha'],
        skills=dict(choose=3, from_='any'), weapons='Simple weapons', armor='Light armor', tools='Choose 3 Musical Instruments',
        equipment=[dict(id='A', items=['Leather Armor', '2 Daggers', 'Musical Instrument of your choice', "Entertainer's Pack"], gp=19), dict(id='B', items=[], gp=90)],
        standardArray=dict(str=8, dex=14, con=12, int=13, wis=10, cha=15), subclass='College of Lore',
        spellcasting=dict(ability='cha', levels={1: dict(cantrips=2, prepared=4, slots=[2]), 2: dict(cantrips=2, prepared=5, slots=[3]), 3: dict(cantrips=2, prepared=6, slots=[4, 2])}),
        columns={1: dict(bardicDie='d6'), 2: dict(bardicDie='d6'), 3: dict(bardicDie='d6')}),
    'cleric': dict(name='Cleric', primary=['wis'], hitDie=8, saves=['wis', 'cha'],
        skills=dict(choose=2, from_=['history', 'insight', 'medicine', 'persuasion', 'religion']),
        weapons='Simple weapons', armor='Light and Medium armor and Shields', tools='',
        equipment=[dict(id='A', items=['Chain Shirt', 'Shield', 'Mace', 'Holy Symbol', "Priest's Pack"], gp=7), dict(id='B', items=[], gp=110)],
        standardArray=dict(str=14, dex=8, con=13, int=10, wis=15, cha=12), subclass='Life Domain',
        spellcasting=dict(ability='wis', levels={1: dict(cantrips=3, prepared=4, slots=[2]), 2: dict(cantrips=3, prepared=5, slots=[3]), 3: dict(cantrips=3, prepared=6, slots=[4, 2])}),
        columns={2: dict(channelDivinity=2), 3: dict(channelDivinity=2)}),
    'druid': dict(name='Druid', primary=['wis'], hitDie=8, saves=['int', 'wis'],
        skills=dict(choose=2, from_=['animal_handling', 'arcana', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival']),
        weapons='Simple weapons', armor='Light armor and Shields', tools='Herbalism Kit',
        equipment=[dict(id='A', items=['Leather Armor', 'Shield', 'Sickle', 'Druidic Focus (Quarterstaff)', "Explorer's Pack", 'Herbalism Kit'], gp=9), dict(id='B', items=[], gp=50)],
        standardArray=dict(str=8, dex=12, con=14, int=13, wis=15, cha=10), subclass='Circle of the Land',
        spellcasting=dict(ability='wis', levels={1: dict(cantrips=2, prepared=4, slots=[2]), 2: dict(cantrips=2, prepared=5, slots=[3]), 3: dict(cantrips=2, prepared=6, slots=[4, 2])}),
        columns={2: dict(wildShape=2), 3: dict(wildShape=2)}),
    'fighter': dict(name='Fighter', primary=['str', 'dex'], hitDie=10, saves=['str', 'con'],
        skills=dict(choose=2, from_=['acrobatics', 'animal_handling', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival']),
        weapons='Simple and Martial weapons', armor='Light, Medium, and Heavy armor and Shields', tools='',
        equipment=[dict(id='A', items=['Chain Mail', 'Greatsword', 'Flail', '8 Javelins', "Dungeoneer's Pack"], gp=4),
                   dict(id='B', items=['Studded Leather Armor', 'Scimitar', 'Shortsword', 'Longbow', '20 Arrows', 'Quiver', "Dungeoneer's Pack"], gp=11),
                   dict(id='C', items=[], gp=155)],
        standardArray=dict(str=15, dex=14, con=13, int=8, wis=10, cha=12), subclass='Champion',
        columns={1: dict(secondWind=2, weaponMastery=3), 2: dict(secondWind=2, weaponMastery=3), 3: dict(secondWind=2, weaponMastery=3)}),
    'monk': dict(name='Monk', primary=['dex', 'wis'], hitDie=8, saves=['str', 'dex'],
        skills=dict(choose=2, from_=['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth']),
        weapons='Simple weapons and Martial weapons that have the Light property', armor='None',
        tools="Choose one type of Artisan's Tools or Musical Instrument",
        equipment=[dict(id='A', items=['Spear', '5 Daggers', "Artisan's Tools or Musical Instrument (as chosen)", "Explorer's Pack"], gp=11), dict(id='B', items=[], gp=50)],
        standardArray=dict(str=12, dex=15, con=13, int=10, wis=14, cha=8), subclass='Warrior of the Open Hand',
        columns={1: dict(martialArts='1d6'), 2: dict(martialArts='1d6', focusPoints=2, unarmoredMovement=10), 3: dict(martialArts='1d6', focusPoints=3, unarmoredMovement=10)}),
    'paladin': dict(name='Paladin', primary=['str', 'cha'], hitDie=10, saves=['wis', 'cha'],
        skills=dict(choose=2, from_=['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion']),
        weapons='Simple and Martial weapons', armor='Light, Medium, and Heavy armor and Shields', tools='',
        equipment=[dict(id='A', items=['Chain Mail', 'Shield', 'Longsword', '6 Javelins', 'Holy Symbol', "Priest's Pack"], gp=9), dict(id='B', items=[], gp=150)],
        standardArray=dict(str=15, dex=10, con=13, int=8, wis=12, cha=14), subclass='Oath of Devotion',
        spellcasting=dict(ability='cha', levels={1: dict(cantrips=0, prepared=2, slots=[2]), 2: dict(cantrips=0, prepared=3, slots=[2]), 3: dict(cantrips=0, prepared=4, slots=[3])}),
        columns={3: dict(channelDivinity=2)}),
    'ranger': dict(name='Ranger', primary=['dex', 'wis'], hitDie=10, saves=['str', 'dex'],
        skills=dict(choose=3, from_=['animal_handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival']),
        weapons='Simple and Martial weapons', armor='Light and Medium armor and Shields', tools='',
        equipment=[dict(id='A', items=['Studded Leather Armor', 'Scimitar', 'Shortsword', 'Longbow', '20 Arrows', 'Quiver', 'Druidic Focus (sprig of mistletoe)', "Explorer's Pack"], gp=7), dict(id='B', items=[], gp=150)],
        standardArray=dict(str=12, dex=15, con=13, int=8, wis=14, cha=10), subclass='Hunter',
        spellcasting=dict(ability='wis', levels={1: dict(cantrips=0, prepared=2, slots=[2]), 2: dict(cantrips=0, prepared=3, slots=[2]), 3: dict(cantrips=0, prepared=4, slots=[3])}),
        columns={1: dict(favoredEnemy=2), 2: dict(favoredEnemy=2), 3: dict(favoredEnemy=2)}),
    'rogue': dict(name='Rogue', primary=['dex'], hitDie=8, saves=['dex', 'int'],
        skills=dict(choose=4, from_=['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleight_of_hand', 'stealth']),
        weapons='Simple weapons and Martial weapons that have the Finesse or Light property', armor='Light armor', tools="Thieves' Tools",
        equipment=[dict(id='A', items=['Leather Armor', '2 Daggers', 'Shortsword', 'Shortbow', '20 Arrows', 'Quiver', "Thieves' Tools", "Burglar's Pack"], gp=8), dict(id='B', items=[], gp=100)],
        standardArray=dict(str=12, dex=15, con=13, int=14, wis=10, cha=8), subclass='Thief',
        columns={1: dict(sneakAttack='1d6'), 2: dict(sneakAttack='1d6'), 3: dict(sneakAttack='2d6')}),
    'sorcerer': dict(name='Sorcerer', primary=['cha'], hitDie=6, saves=['con', 'cha'],
        skills=dict(choose=2, from_=['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion']),
        weapons='Simple weapons', armor='None', tools='',
        equipment=[dict(id='A', items=['Spear', '2 Daggers', 'Arcane Focus (crystal)', "Dungeoneer's Pack"], gp=28), dict(id='B', items=[], gp=50)],
        standardArray=dict(str=10, dex=13, con=14, int=8, wis=12, cha=15), subclass='Draconic Sorcery',
        spellcasting=dict(ability='cha', levels={1: dict(cantrips=4, prepared=2, slots=[2]), 2: dict(cantrips=4, prepared=4, slots=[3]), 3: dict(cantrips=4, prepared=6, slots=[4, 2])}),
        columns={2: dict(sorceryPoints=2), 3: dict(sorceryPoints=3)}),
    'warlock': dict(name='Warlock', primary=['cha'], hitDie=8, saves=['wis', 'cha'],
        skills=dict(choose=2, from_=['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion']),
        weapons='Simple weapons', armor='Light armor', tools='',
        equipment=[dict(id='A', items=['Leather Armor', 'Sickle', '2 Daggers', 'Arcane Focus (orb)', 'Book (occult lore)', "Scholar's Pack"], gp=15), dict(id='B', items=[], gp=100)],
        standardArray=dict(str=8, dex=14, con=13, int=12, wis=10, cha=15), subclass='Fiend Patron',
        # Pact Magic: all slots are of the listed slot level
        spellcasting=dict(ability='cha', pact=True, levels={1: dict(cantrips=2, prepared=2, slots=[1], slotLevel=1), 2: dict(cantrips=2, prepared=3, slots=[2], slotLevel=1), 3: dict(cantrips=2, prepared=4, slots=[0, 2], slotLevel=2)}),
        columns={1: dict(invocations=1), 2: dict(invocations=3), 3: dict(invocations=3)}),
    'wizard': dict(name='Wizard', primary=['int'], hitDie=6, saves=['int', 'wis'],
        skills=dict(choose=2, from_=['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion']),
        weapons='Simple weapons', armor='None', tools='',
        equipment=[dict(id='A', items=['2 Daggers', 'Arcane Focus (Quarterstaff)', 'Robe', 'Spellbook', "Scholar's Pack"], gp=5), dict(id='B', items=[], gp=55)],
        standardArray=dict(str=8, dex=12, con=13, int=15, wis=14, cha=10), subclass='Evoker',
        spellcasting=dict(ability='int', levels={1: dict(cantrips=3, prepared=4, slots=[2]), 2: dict(cantrips=3, prepared=5, slots=[3]), 3: dict(cantrips=3, prepared=6, slots=[4, 2])}),
        columns={}),
}

BACKGROUNDS = {
    'acolyte': dict(name='Acolyte', abilities=['int', 'wis', 'cha'], feat='Magic Initiate (Cleric)', skills=['insight', 'religion'],
        tool="Calligrapher's Supplies", equipment=[dict(id='A', items=["Calligrapher's Supplies", 'Book (prayers)', 'Holy Symbol', 'Parchment (10 sheets)', 'Robe'], gp=8), dict(id='B', items=[], gp=50)]),
    'criminal': dict(name='Criminal', abilities=['dex', 'con', 'int'], feat='Alert', skills=['sleight_of_hand', 'stealth'],
        tool="Thieves' Tools", equipment=[dict(id='A', items=['2 Daggers', "Thieves' Tools", 'Crowbar', '2 Pouches', "Traveler's Clothes"], gp=16), dict(id='B', items=[], gp=50)]),
    'sage': dict(name='Sage', abilities=['con', 'int', 'wis'], feat='Magic Initiate (Wizard)', skills=['arcana', 'history'],
        tool="Calligrapher's Supplies", equipment=[dict(id='A', items=['Quarterstaff', "Calligrapher's Supplies", 'Book (history)', 'Parchment (8 sheets)', 'Robe'], gp=8), dict(id='B', items=[], gp=50)]),
    'soldier': dict(name='Soldier', abilities=['str', 'dex', 'con'], feat='Savage Attacker', skills=['athletics', 'intimidation'],
        tool='Choose one kind of Gaming Set', equipment=[dict(id='A', items=['Spear', 'Shortbow', '20 Arrows', 'Gaming Set (same as above)', "Healer's Kit", 'Quiver', "Traveler's Clothes"], gp=14), dict(id='B', items=[], gp=50)]),
}

# name -> (damage, damage type, properties, mastery)
WEAPONS = {
    'Club': ('1d4', 'Bludgeoning', 'Light', 'Slow', 'simple melee'), 'Dagger': ('1d4', 'Piercing', 'Finesse, Light, Thrown (Range 20/60)', 'Nick', 'simple melee'),
    'Greatclub': ('1d8', 'Bludgeoning', 'Two-Handed', 'Push', 'simple melee'), 'Handaxe': ('1d6', 'Slashing', 'Light, Thrown (Range 20/60)', 'Vex', 'simple melee'),
    'Javelin': ('1d6', 'Piercing', 'Thrown (Range 30/120)', 'Slow', 'simple melee'), 'Light Hammer': ('1d4', 'Bludgeoning', 'Light, Thrown (Range 20/60)', 'Nick', 'simple melee'),
    'Mace': ('1d6', 'Bludgeoning', '', 'Sap', 'simple melee'), 'Quarterstaff': ('1d6', 'Bludgeoning', 'Versatile (1d8)', 'Topple', 'simple melee'),
    'Sickle': ('1d4', 'Slashing', 'Light', 'Nick', 'simple melee'), 'Spear': ('1d6', 'Piercing', 'Thrown (Range 20/60), Versatile (1d8)', 'Sap', 'simple melee'),
    'Dart': ('1d4', 'Piercing', 'Finesse, Thrown (Range 20/60)', 'Vex', 'simple ranged'), 'Light Crossbow': ('1d8', 'Piercing', 'Ammunition (Range 80/320; Bolt), Loading, Two-Handed', 'Slow', 'simple ranged'),
    'Shortbow': ('1d6', 'Piercing', 'Ammunition (Range 80/320; Arrow), Two-Handed', 'Vex', 'simple ranged'), 'Sling': ('1d4', 'Bludgeoning', 'Ammunition (Range 30/120; Bullet)', 'Slow', 'simple ranged'),
    'Battleaxe': ('1d8', 'Slashing', 'Versatile (1d10)', 'Topple', 'martial melee'), 'Flail': ('1d8', 'Bludgeoning', '', 'Sap', 'martial melee'),
    'Glaive': ('1d10', 'Slashing', 'Heavy, Reach, Two-Handed', 'Graze', 'martial melee'), 'Greataxe': ('1d12', 'Slashing', 'Heavy, Two-Handed', 'Cleave', 'martial melee'),
    'Greatsword': ('2d6', 'Slashing', 'Heavy, Two-Handed', 'Graze', 'martial melee'), 'Halberd': ('1d10', 'Slashing', 'Heavy, Reach, Two-Handed', 'Cleave', 'martial melee'),
    'Lance': ('1d10', 'Piercing', 'Heavy, Reach, Two-Handed (unless mounted)', 'Topple', 'martial melee'), 'Longsword': ('1d8', 'Slashing', 'Versatile (1d10)', 'Sap', 'martial melee'),
    'Maul': ('2d6', 'Bludgeoning', 'Heavy, Two-Handed', 'Topple', 'martial melee'), 'Morningstar': ('1d8', 'Piercing', '', 'Sap', 'martial melee'),
    'Pike': ('1d10', 'Piercing', 'Heavy, Reach, Two-Handed', 'Push', 'martial melee'), 'Rapier': ('1d8', 'Piercing', 'Finesse', 'Vex', 'martial melee'),
    'Scimitar': ('1d6', 'Slashing', 'Finesse, Light', 'Nick', 'martial melee'), 'Shortsword': ('1d6', 'Piercing', 'Finesse, Light', 'Vex', 'martial melee'),
    'Trident': ('1d8', 'Piercing', 'Thrown (Range 20/60), Versatile (1d10)', 'Topple', 'martial melee'), 'Warhammer': ('1d8', 'Bludgeoning', 'Versatile (1d10)', 'Push', 'martial melee'),
    'War Pick': ('1d8', 'Piercing', 'Versatile (1d10)', 'Sap', 'martial melee'), 'Whip': ('1d4', 'Slashing', 'Finesse, Reach', 'Slow', 'martial melee'),
    'Blowgun': ('1', 'Piercing', 'Ammunition (Range 25/100; Needle), Loading', 'Vex', 'martial ranged'), 'Hand Crossbow': ('1d6', 'Piercing', 'Ammunition (Range 30/120; Bolt), Light, Loading', 'Vex', 'martial ranged'),
    'Heavy Crossbow': ('1d10', 'Piercing', 'Ammunition (Range 100/400; Bolt), Heavy, Loading, Two-Handed', 'Push', 'martial ranged'),
    'Longbow': ('1d8', 'Piercing', 'Ammunition (Range 150/600; Arrow), Heavy, Two-Handed', 'Slow', 'martial ranged'),
    'Musket': ('1d12', 'Piercing', 'Ammunition (Range 40/120; Bullet), Loading, Two-Handed', 'Slow', 'martial ranged'),
    'Pistol': ('1d10', 'Piercing', 'Ammunition (Range 30/90; Bullet), Loading', 'Vex', 'martial ranged'),
}
# name -> (category, base AC, dex cap (None = full, 0 = none))
ARMOR = {
    'Padded Armor': ('light', 11, None), 'Leather Armor': ('light', 11, None), 'Studded Leather Armor': ('light', 12, None),
    'Hide Armor': ('medium', 12, 2), 'Chain Shirt': ('medium', 13, 2), 'Scale Mail': ('medium', 14, 2), 'Breastplate': ('medium', 14, 2),
    'Half Plate Armor': ('medium', 15, 2), 'Ring Mail': ('heavy', 14, 0), 'Chain Mail': ('heavy', 16, 0), 'Splint Armor': ('heavy', 17, 0), 'Plate Armor': ('heavy', 18, 0),
}

# Columns of each "<Class> Features" table after the feature names: (key, number of tokens).
# 'slots' = the spell slot columns (9 for full casters, 5 for half casters).
TABLE_COLUMNS = {
    'barbarian': [('rages', 1), ('rageDamage', 1), ('weaponMastery', 1)],
    'bard': [('bardicDie', 1), ('cantrips', 1), ('prepared', 1), ('slots', 9)],
    'cleric': [('channelDivinity', 1), ('cantrips', 1), ('prepared', 1), ('slots', 9)],
    'druid': [('wildShape', 1), ('cantrips', 1), ('prepared', 1), ('slots', 9)],
    'fighter': [('secondWind', 1), ('weaponMastery', 1)],
    'monk': [('martialArts', 1), ('focusPoints', 1), ('unarmoredMovement', 2)],
    'paladin': [('channelDivinity', 1), ('prepared', 1), ('slots', 5)],
    'ranger': [('favoredEnemy', 1), ('prepared', 1), ('slots', 5)],
    'rogue': [('sneakAttack', 1)],
    'sorcerer': [('sorceryPoints', 1), ('cantrips', 1), ('prepared', 1), ('slots', 9)],
    'warlock': [('invocations', 1), ('cantrips', 1), ('prepared', 1), ('pactSlots', 1), ('slotLevel', 1)],
    'wizard': [('cantrips', 1), ('prepared', 1), ('slots', 9)],
}
SPELL_KEYS = ('cantrips', 'prepared', 'slots', 'pactSlots', 'slotLevel')

def table_value(tokens):
    t = ' '.join(tokens)
    if t in ('—', '-'): return None
    m = re.fullmatch(r'\+(\d+)(?: ft\.)?', t)
    if m: return int(m.group(1))                       # "+2" rage damage, "+10 ft." movement
    if re.fullmatch(r'\d+', t): return int(t)
    return t.lower()                                   # dice: "1d6", "D8" -> "d8"

# The class table (levels 1–20): feature names per level + the class columns. Rows can wrap
# over several lines ("1 +2 Spellcasting, Ritual Adept, \nArcane Recovery\n3 4 2 — …").
def extract_table(txt, cid, name):
    a = txt.index('\n' + name + ' Features\n')
    head_end = txt.index('\n1 +2 ', a)
    b = txt.index('\n', txt.index('\n20 +6', a) + 1)
    rows, cur = [], None
    for ln in txt[head_end:b].split('\n'):
        if not ln.strip(): continue
        m = re.match(r'^(\d+) \+(\d) (.*)$', ln)
        if m and int(m.group(1)) == len(rows) + 1:
            cur = [int(m.group(1)), m.group(3)]; rows.append(cur)
        elif cur: cur[1] += ' ' + ln
    assert len(rows) == 20, (name, len(rows))
    cols = TABLE_COLUMNS[cid]
    table = {}
    for lvl, rest in rows:
        toks = rest.split()
        # read the columns from the right ("+10 ft." is two tokens, "—" one)
        parts, end = {}, len(toks)
        for key, n in reversed(cols):
            if n == 2 and toks[end - 1] != 'ft.': n = 1
            parts[key] = toks[end - n:end]; end -= n
        feats = [f.strip().replace('’', "'") for f in re.sub(r'\s+', ' ', ' '.join(toks[:end])).split(',') if f.strip() and f.strip() != '—']
        row = dict(features=feats)
        for key, n in cols:
            part = parts[key]
            if key == 'slots':
                row['slots'] = [0 if v in ('—', '-') else int(v) for v in part]
                while row['slots'] and not row['slots'][-1]: row['slots'].pop()
            else:
                v = table_value(part)
                if v is not None: row[key] = v
        table[lvl] = row
    return table

def extract_classes(txt):
    order = [c['name'] for c in CLASSES.values()]
    out = {}
    for i, (cid, c) in enumerate(CLASSES.items()):
        name = c['name']
        start = txt.index('\n' + name + '\nCore ' + name + ' Traits')
        end = txt.index('\n' + order[i + 1] + '\nCore ' + order[i + 1] + ' Traits') if i + 1 < len(order) else txt.index('\nCharacter Origins\n', start)
        sec = txt[start:end]
        # remove the features table (…"Features" header through the level-20 row)
        sec = re.sub(r'\n' + name + r' Features\n.*?\n20 \+6[^\n]*(\n[^\n]*—[^\n]*)?', '\n', sec, flags=re.S)
        split = re.search(r'\n' + name + r' Subclass: ', sec)
        main, subsec = (sec[:split.start()], sec[split.start():]) if split else (sec, '')
        feats = []
        for m in re.finditer(r'\nLevel (\d+): ([^\n]+)\n(.*?)(?=\nLevel \d+: |$)', main, re.S):
            lvl = int(m.group(1))
            if not any(f['name'] == m.group(2).strip() and f['level'] == lvl for f in feats):
                feats.append(dict(level=lvl, name=m.group(2).strip().replace('’', "'"), text=trim_tail(clean(m.group(3)))))
        sub = []
        for m in re.finditer(r'\nLevel (\d+): ([^\n]+)\n(.*?)(?=\nLevel \d+: |$)', subsec, re.S):
            if True:
                sub.append(dict(level=int(m.group(1)), name=m.group(2).strip().replace('’', "'"), text=trim_tail(clean(m.group(3)))))
        intro = clean(subsec[subsec.index('\n', 2):subsec.index('\nLevel ')]) if subsec else []
        out[cid] = dict(features=feats, subclassFeatures=sub, subclassIntro=[p for p in intro if len(p) > 40][:2],
                        table=extract_table(txt, cid, name))
    return out

def trim_tail(paras):
    # drop layout leftovers: spell list headings / table rows that follow a feature at a page end
    keep = []
    for p in paras:
        if re.match(r'^(Level |[A-Z][a-z]+ Spell List|Spell Level|Cantrips? \(Level 0|Spell School|Barbarian|Bard|Cleric|Druid|Fighter|Monk|Paladin|Ranger|Rogue|Sorcerer|Warlock|Wizard)\b', p) and keep:
            break
        keep.append(p)
    return keep

def extract_species(txt):
    s = txt[txt.index('\nSpecies Descriptions\n'):txt.index('\nFeats\nFeat Descriptions')]
    s = re.sub(r'\n=====PAGE \d+=====\nSystem Reference Document 5\.2\.1\n\d+', '', s)
    names = ['Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Goliath', 'Halfling', 'Human', 'Orc', 'Tiefling']
    out = {}
    for i, n in enumerate(names):
        a = s.index('\n' + n + '\nCreature Type')
        b = s.index('\n' + names[i + 1] + '\nCreature Type') if i + 1 < len(names) else len(s)
        block = s[a:b]
        size = re.sub(r'\s+', ' ', re.search(r'Size: ([^\n]+(?:\n[^\n:]+\))?)', block).group(1))
        speed = int(re.search(r'Speed: (\d+) feet', block).group(1))
        body = block[block.index('special traits.') + len('special traits.'):]
        # tables of lineages/legacies appear in the flow; keep them as raw text on the species
        paras = clean(body)
        traits, extra = [], []
        for p in paras:
            m = re.match(r"^([A-Z][A-Za-z'’ ]{2,30})\. (.*)$", p)
            if m and not re.match(r'^(Level|Lineage|Legacy|Dragon)\b', p):
                traits.append(dict(name=m.group(1).replace('’', "'"), text=[m.group(2)]))
            elif traits and not re.match(r'^(Draconic Ancestors|Elven Lineages|Fiendish Legacies|Lineage Level|Legacy Level|Dragon Damage)', p):
                traits[-1]['text'].append(p)
            else:
                extra.append(p)
        out[n.lower()] = dict(name=n, size=size, speed=speed, traits=traits)
    return out

def extract_feats(txt):
    a = txt.index('\nOrigin Feats\nAlert')
    s = txt[a:txt.index('\nEquipment\nCoins\n', a)]   # (the table of contents also lists these headings)
    s = re.sub(r'\nsEllinG EquipMEnt\n.*$', '', s, flags=re.S)
    s = re.sub(r'\n=====PAGE \d+=====\nSystem Reference Document 5\.2\.1\n\d+', '', s)
    out = {}
    kinds = r'(?:Origin|General|Fighting Style|Epic Boon) Feat'
    for m in re.finditer(r'\n([A-Z][A-Za-z -]+)\n(' + kinds + r'[^\n]*(?:\n[^\n]*\)\s*)?)\n(.*?)(?=\n[A-Z][A-Za-z -]+\n' + kinds + r'|\nGeneral Feats\n|\nFighting Style Feats\n|\nEpic Boon Feats\n|$)', s, re.S):
        name = m.group(1).strip()
        cat = re.sub(r'\s+', ' ', m.group(2)).replace('Dexterit y', 'Dexterity').strip()
        feat = dict(name=name, category=cat, text=clean(m.group(3)))
        inc = ability_increase(feat['text'])
        if inc: feat['increase'] = inc
        out[name] = feat
    return out

# "Increase one ability score of your choice by 1, to a maximum of 30." → structured increase.
ABIL = dict(strength='str', dexterity='dex', constitution='con', intelligence='int', wisdom='wis', charisma='cha')
def ability_increase(paras):
    for p in paras:
        m = re.search(r'Increase (one ability score of your choice|your ([A-Za-z, ]+?) score) by (\d)(?:, to a maximum of (\d+))?', p)
        if not m: continue
        opts = 'any' if m.group(1).startswith('one') else [ABIL[w.lower()] for w in re.findall(r'[A-Z][a-z]+', m.group(2)) if w.lower() in ABIL]
        mx = re.search(r'(?:to a maximum of|above) (\d+)', p)
        return dict(choose=opts, by=int(m.group(3)), max=int(mx.group(1)) if mx else 20)
    return None

def _unused():
    out = {}
    return out

# ---- monsters (Monsters A–Z + Animals) ----------------------------------------------------
SIZES = r'(?:Tiny|Small|Medium|Large|Huge|Gargantuan)'
NUM = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6}
ABILITY_WORDS = dict(strength='str', dexterity='dex', constitution='con', intelligence='int', wisdom='wis', charisma='cha')
SECTIONS = ('Traits', 'Actions', 'Bonus Actions', 'Reactions', 'Legendary Actions')

def signed(t):
    return int(t.replace('−', '-').replace('–', '-').replace('+', ''))

def dice_expr(t):
    # "1d6 + 2" -> "1d6+2", "1d10 − 1" -> "1d10-1"
    return re.sub(r'\s+', '', t.replace('−', '-').replace('–', '-'))

SMALL = {'of', 'the', 'and', 'in', 'a', 'an', 'to', 'with', 'or', 'on', 'from'}
def title_case(name):
    words = re.sub(r'\([^)]*\)', '', name).replace('-', ' ').split()
    return bool(words) and all(w[0].isupper() or w in SMALL for w in words)
def heading_like(ln):
    l = ln.strip()
    return bool(l) and len(l.split()) <= 4 and not re.search(r'[:,.;)]', l) and title_case(l)

def parse_entries(lines):
    # "Name. text…" paragraphs; a new entry starts at a line "Word Word (…). …"
    entries, cur = [], None
    for ln in lines:
        m = re.match(r"^([A-Z][A-Za-z'’\-, ]{1,40}(?: \([^)]{1,40}\))?)\. (.*)$", ln)
        if m and not title_case(m.group(1)): m = None   # "Piercing damage. …" continues the entry
        if m and not re.match(r'^(Hit|Failure|Success|Failure or Success|Trigger|Response|At Will|\d/Day)', m.group(1)):
            cur = dict(name=m.group(1).replace('’', "'"), text=m.group(2)); entries.append(cur)
        elif cur:
            if re.search(r'\w-$', cur['text']) and re.match(r'^[a-z]', ln): cur['text'] = cur['text'][:-1] + ln   # "Slash-" + "ing"
            else: cur['text'] += ' ' + ln
        # text before the first entry (legendary preamble) goes to a pseudo entry
        elif ln.strip():
            cur = dict(name='', text=ln); entries.append(cur)
    for e in entries:
        e['text'] = re.sub(r'(\w)- (?=[a-z])', r'\1', re.sub(r'\s+', ' ', e['text'])).strip().replace('’', "'")
    return entries

def attack_of(e):
    t = e['text']
    m = re.match(r'^(Melee or Ranged|Melee|Ranged) Attack Roll: ([+−–-]\d+)', t)
    if m:
        reach = re.search(r'(reach \d+ ft\.(?: or range [\d/]+ ft\.)?|range [\d/]+ ft\.)', t)
        hit = t[t.index('Hit:'):] if 'Hit:' in t else ''
        d = re.match(r'Hit: (\d+) \(([^)]+)\) (\w+) damage', hit) or re.match(r'Hit: (\d+) (\w+) damage', hit)
        dmg = (dice_expr(d.group(2)), d.group(3)) if d and d.lastindex == 3 else ((d.group(1), d.group(2)) if d else ('', ''))
        return dict(name=e['name'], kind=m.group(1).lower(), toHit=signed(m.group(2)), reach=reach.group(1) if reach else '',
                    damage=dmg[0], avg=int(d.group(1)) if d else 0, type=dmg[1])
    m = re.match(r'^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC (\d+)', t)
    if m:
        d = re.search(r'Failure: (\d+) \(([^)]+)\) (\w+) damage', t)
        return dict(name=e['name'], kind='save', save=ABILITY_WORDS[m.group(1).lower()], dc=int(m.group(2)),
                    damage=dice_expr(d.group(2)) if d else '', type=d.group(3) if d else '', half='Success: Half damage' in t)
    return None

def extract_monsters(txt):
    a = txt.rindex('\nMonsters A–Z\n')
    s = txt[a:]
    s = re.sub(r'\n=====PAGE \d+=====\n(?:\d+\n)?System Reference Document 5\.2\.1\s*\n(?:\d+\n)?', '\n', s)
    lines = s.split('\n')
    starts = [i - 1 for i in range(1, len(lines) - 1) if re.match('^' + SIZES + r'( or ' + SIZES + r')? [A-Z]', lines[i]) and re.match(r'^AC \d+', lines[i + 1])]
    out = {}
    for k, st in enumerate(starts):
        end = starts[k + 1] if k + 1 < len(starts) else len(lines)
        blk = [l.rstrip() for l in lines[st:end]]
        nxt = lines[starts[k + 1]].strip() if k + 1 < len(starts) else None
        # group headings before the next monster ("Black Dragons", "Animated Objects")
        stem = lambda w: w.lower().rstrip('s')
        near_next = lambda l: nxt and {stem(w) for w in l.split()} & {stem(w) for w in nxt.split()}
        while len(blk) > 3 and (not blk[-1].strip() or blk[-1].strip() == nxt or (heading_like(blk[-1]) and (re.search(r'[.)]\s*$', blk[-2]) or near_next(blk[-1])))): blk.pop()
        name = blk[0].strip()
        typ = blk[1].strip()
        body = ' \n'.join(blk[2:])
        g = lambda rx, d=None: (re.search(rx, body) or [None, d])[1] if re.search(rx, body) else d
        ac = int(re.search(r'AC (\d+)', body).group(1))
        ini = re.search(r'Initiative ([+−–-]\d+)', body)
        hp = re.search(r'HP (\d+)(?: \(([^)]+)\))?', body)
        speed = re.search(r'Speed ([^\n]+)', body).group(1).strip()
        abil, saves = {}, {}
        for m in re.finditer(r'\b(Str|Dex|Con|Int|WIS|Wis|Cha)\s+(\d+)\s*([+−–-]\d+)\s+([+−–-]?\d+)', body):
            ab = m.group(1).lower()[:3]; abil[ab] = int(m.group(2)); sv = signed(m.group(4))
            if sv != signed(m.group(3)): saves[ab] = sv
        cr = re.search(r'CR ([\d/]+) \((?:XP ([\d, ]+?)|([\d, ]+?) XP)(?:, or [\d, ]+ in lair)?; PB \+(\d+)\)', body)
        if not cr or len(abil) != 6:
            print('  ! skipped', name, 'cr' if not cr else 'abilities'); continue
        field = lambda key: (re.search(r'\n?' + key + r' ([^\n]+(?:\n(?!(?:Skills|Senses|Languages|CR|Gear|Immunities|Resistances|Vulnerabilities|Traits|Actions)\b)[^\n]*\)?)?)', body) or [None, ''])
        def fld(key):
            m = re.search(r'(?:^|\n)' + key + r' (.+?)(?= \n(?:Skills|Senses|Languages|CR|Gear|Immunities|Resistances|Vulnerabilities|Traits|Actions|Bonus Actions|Reactions)\b)', body, re.S)
            return re.sub(r'\s+', ' ', m.group(1)).strip() if m else ''
        # sections
        tail = body[body.index(cr.group(0)) + len(cr.group(0)):]
        sec, cur = {}, None
        for ln in tail.split('\n'):
            l = ln.strip()
            if l in SECTIONS: cur = l; sec[cur] = []; continue
            if cur and l: sec[cur].append(l)
        m = dict(name=name, type=typ, ac=ac, initiative=signed(ini.group(1)) if ini else (abil['dex'] - 10) // 2,
                 hp=int(hp.group(1)), hitDice=dice_expr(hp.group(2)) if hp and hp.group(2) else '', speed=speed,
                 abilities=abil, saves=saves, skills=fld('Skills'), resistances=fld('Resistances'), immunities=fld('Immunities'),
                 vulnerabilities=fld('Vulnerabilities'), senses=fld('Senses'), languages=fld('Languages'),
                 cr=cr.group(1), xp=int(re.sub(r'[, ]', '', cr.group(2) or cr.group(3))), pb=int(cr.group(4)))
        for key, label in (('traits', 'Traits'), ('actions', 'Actions'), ('bonusActions', 'Bonus Actions'), ('reactions', 'Reactions'), ('legendary', 'Legendary Actions')):
            if label in sec: m[key] = parse_entries(sec[label])
        atks = [x for x in (attack_of(e) for e in m.get('actions', [])) if x]
        m['attacks'] = atks
        multi = next((e for e in m.get('actions', []) if e['name'] == 'Multiattack'), None)
        if multi:
            n = re.search(r'makes (one|two|three|four|five|six)\b', multi['text'])
            if n: m['multiattack'] = NUM[n.group(1)]
        key = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        if key in out: key += '-' + re.sub(r'[^a-z0-9]+', '-', typ.split(',')[0].lower())
        out[key] = m
    return out

CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible',
              'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious']
def extract_conditions(txt):
    g = txt[txt.index(' [Condition]\n') - 40:]
    g = re.sub(r'\n=====PAGE \d+=====\n(?:\d+\n)?System Reference Document 5\.2\.1\s*\n(?:\d+\n)?', '\n', g)
    out = {}
    for c in CONDITIONS:
        m = re.search(r'\n' + c + r' \[Condition\]\n(.*?)(?=\n[A-Z][A-Za-z’\' ]+(?: \[[A-Za-z ]+\])?\n(?=[A-Z])|$)', g, re.S)
        if m: out[c] = clean(m.group(1))
        else: print('  ! condition not found', c)
    return out

XP_BUDGET = {1: (50, 75, 100), 2: (100, 150, 200), 3: (150, 225, 400), 4: (250, 375, 500), 5: (500, 750, 1100), 6: (600, 1000, 1400),
             7: (750, 1300, 1700), 8: (1000, 1700, 2100), 9: (1300, 2000, 2600), 10: (1600, 2300, 3100), 11: (1900, 2900, 4100),
             12: (2200, 3700, 4700), 13: (2600, 4200, 5400), 14: (2900, 4900, 6200), 15: (3300, 5400, 7800), 16: (3800, 6100, 9800),
             17: (4500, 7200, 11700), 18: (5000, 8700, 14200), 19: (5500, 10700, 17200), 20: (6400, 13200, 22000)}

# ---- spells (R2: choose cantrips/prepared spells; R3 compendium) ---------------------------
SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation']
SPELL_CLASSES = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard']
SPELL_ABILITY = dict(Strength='str', Dexterity='dex', Constitution='con', Intelligence='int', Wisdom='wis', Charisma='cha')
DAMAGE_TYPES = 'Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder'
_SCH = '|'.join(SCHOOLS)
SPELL_HEAD = re.compile(r'^(?:Level ([1-9]) (' + _SCH + r')|(' + _SCH + r') Cantrip)\s*(\(.*)?$')
STAT_SIZE = re.compile(r'^(Tiny|Small|Medium|Large|Huge|Gargantuan)\b.*(Aberration|Beast|Celestial|Construct|Dragon|Elemental|Fey|Fiend|Giant|Humanoid|Monstrosity|Ooze|Plant|Undead)')
LIST_ROW = re.compile(r'^(.+?) (' + _SCH + r') ([—–-]|[CRM](?:, [CRM])*)\s*$')

# "<Class> Spell List" tables: { class: { spell name: dict(level, school, special) } }
def extract_class_spell_lists(txt):
    out = {}
    for cls in SPELL_CLASSES:
        lists = {}
        for m in re.finditer(r'\n(?:Cantrips \(Level 0 ' + cls + r' Spells\)|Level ([1-9]) ' + cls + r' Spells)\n', txt):
            level = int(m.group(1) or 0)
            for ln in txt[m.end():].split('\n'):
                ln = ln.strip()
                if not ln or ln == 'Spell School Special': continue
                row = LIST_ROW.match(ln)
                if not row: break
                lists[row.group(1).replace('’', "'")] = dict(level=level, school=row.group(2), special=[] if row.group(3) in ('—', '–', '-') else row.group(3).split(', '))
        assert lists, cls
        out[cls.lower()] = lists
    return out

def _field(block, label, nxt):
    m = re.search(label + r':\s*(.*?)\s*\n' + (nxt + ':' if nxt else ''), block, re.S) if nxt else re.search(label + r':\s*(.*)', block)
    return re.sub(r'\s+', ' ', m.group(1)).strip().replace('’', "'") if m else ''

def extract_spells(txt):
    lists = extract_class_spell_lists(txt)
    proper = {n.lower(): n for l in lists.values() for n in l}
    a = txt.index('\nSpell Descriptions\n', txt.index('Spell Descriptions') + 20)
    b = txt.index('\nRules Glossary\n', a)
    lines = txt[a:b].split('\n')
    heads = []   # (name line index, header line index)
    for i, ln in enumerate(lines):
        if SPELL_HEAD.match(ln.strip()) and i > 0:
            j = i - 1
            while j > 0 and not lines[j].strip(): j -= 1
            heads.append((j, i))
    spells, stat_blocks = {}, []
    for k, (ni, hi) in enumerate(heads):
        end = heads[k + 1][0] if k + 1 < len(heads) else len(lines)
        # a summoned creature's stat block printed inside the text flow (it runs to the next spell)
        for si in range(hi + 1, end - 1):
            if STAT_SIZE.match(lines[si].strip()) and lines[si + 1].startswith('AC '):
                stat_blocks.append(dict(name=lines[si - 1].strip(), lines=[re.sub(r'\s+', ' ', x).strip().replace('’', "'") for x in lines[si:end] if x.strip()]))
                end = si - 1
                break
        raw_name = re.sub(r'\s+', ' ', lines[ni]).strip()
        name = proper.get(raw_name.lower().replace('’', "'"), raw_name)
        h = SPELL_HEAD.match(lines[hi].strip())
        level = int(h.group(1) or 0); school = h.group(2) or h.group(3)
        head = (h.group(4) or '')
        i = hi + 1
        while head and ')' not in head and i < end:          # class list wraps
            head += ' ' + lines[i].strip(); i += 1
        classes = [c.strip().lower() for c in head.strip('() ').split(',') if c.strip()]
        block = '\n'.join(lines[i:end])
        cast = _field(block, 'Casting Time', 'Range'); rng = _field(block, 'Range', 'Components?')
        comp = _field(block, 'Components?', 'Duration'); dur_m = re.search(r'Duration:\s*(.*)', block)
        dur = dur_m.group(1).strip().replace('’', "'")
        body = block[dur_m.end():]
        paras = clean(body)
        higher = upgrade = ''
        text = []
        for p in paras:
            if p.startswith('Using a Higher-Level Spell Slot.'): higher = p[len('Using a Higher-Level Spell Slot.'):].strip()
            elif p.startswith('Cantrip Upgrade.'): upgrade = p[len('Cantrip Upgrade.'):].strip()
            else: text.append(p)
        full = ' '.join(text)
        mat = re.search(r'M \((.*)\)', comp)
        sp = dict(name=name, level=level, school=school, classes=classes, castingTime=cast, range=rng,
                  components=[c for c in ('V', 'S', 'M') if re.search(r'(^|, )' + c + r'(\b|$)', comp)], material=mat.group(1) if mat else '',
                  duration=dur, concentration=dur.startswith('Concentration'), ritual='Ritual' in cast, text=text)
        if higher: sp['higher'] = higher
        if upgrade: sp['upgrade'] = upgrade
        if 'ranged spell attack' in full: sp['attack'] = 'ranged'
        elif 'melee spell attack' in full: sp['attack'] = 'melee'
        sv = re.search(r'(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw', full)
        if sv: sp['save'] = SPELL_ABILITY[sv.group(1)]
        dm = re.search(r'(\d+d\d+(?: ?\+ ?\d+)?) (' + DAMAGE_TYPES + r') damage', full)
        if dm: sp['damage'] = dm.group(1).replace(' ', ''); sp['damageType'] = dm.group(2)
        hm = re.search(r'regains? (?:a number of )?Hit Points equal to (\d+d\d+)( plus your spellcasting ability modifier)?', full)
        if hm: sp['heal'] = hm.group(1) + ('+mod' if hm.group(2) else '')
        else:
            hm = re.search(r'regains? (\d+d\d+(?: \+ \d+)?) Hit Points', full)      # "regain 2d8 Hit Points", "regains 4d8 + 15 Hit Points"
            if hm: sp['heal'] = hm.group(1).replace(' ', '')
        key = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        assert key not in spells, name
        spells[key] = sp
    # attach each stat block to the spell that names its creature (e.g. Find Steed → Otherworldly Steed)
    for sb in stat_blocks:
        owner = next((sp for sp in spells.values() if sb['name'] in ' '.join(sp['text'])), None)
        assert owner, sb['name']
        owner['statBlock'] = sb
    # checks: every class list entry matches a description (same level and class; school, C/R and
    # classes missing from a list are reported — the description is authoritative)
    issues = []
    for cls, l in lists.items():
        for n, row in l.items():
            key = re.sub(r'[^a-z0-9]+', '-', n.lower()).strip('-')
            assert key in spells, (cls, n)
            s = spells[key]
            assert s['level'] == row['level'] and cls in s['classes'], (cls, n, row, s['level'], s['classes'])
            if s['school'] != row['school']: issues.append(f"{cls} list: {n} is {row['school']}, description says {s['school']}")
            if ('C' in row['special']) != s['concentration'] or ('R' in row['special']) != s['ritual']:
                issues.append(f"{cls} list: {n} special {row['special']}, description: {s['duration']} / {s['castingTime']}")
    for key, s in spells.items():
        for cls in s['classes']:
            if s['name'] not in lists[cls]: issues.append(f"{s['name']}: description names {cls}, the {cls} list does not (kept: the description is authoritative)")
        assert s['castingTime'] and s['range'] and s['duration'] and s['text'], (s['name'], s)
        assert not re.search(r'MOD SAVE', ' '.join(s['text']) + s.get('higher', '')), ('stat block left in', s['name'])
    for i in issues: print('  SRD inconsistency:', i)
    return spells

# Spells granted without choosing them (hand-transcribed from the flattened SRD tables, checked
# below: every name is a spell and appears in the SRD text): species by character level,
# SRD subclasses by class level (always prepared; they do not count against prepared spells).
SPELL_GRANTS = dict(
    species=dict(
        elf={'Drow': {1: ['Dancing Lights'], 3: ['Faerie Fire'], 5: ['Darkness']},
             'High Elf': {1: ['Prestidigitation'], 3: ['Detect Magic'], 5: ['Misty Step']},
             'Wood Elf': {1: ['Druidcraft'], 3: ['Longstrider'], 5: ['Pass without Trace']}},
        gnome={'Forest Gnome': {1: ['Minor Illusion', 'Speak with Animals']},
               'Rock Gnome': {1: ['Mending', 'Prestidigitation']}},
        tiefling={'*': {1: ['Thaumaturgy']},
                  'Abyssal': {1: ['Poison Spray'], 3: ['Ray of Sickness'], 5: ['Hold Person']},
                  'Chthonic': {1: ['Chill Touch'], 3: ['False Life'], 5: ['Ray of Enfeeblement']},
                  'Infernal': {1: ['Fire Bolt'], 3: ['Hellish Rebuke'], 5: ['Darkness']}},
    ),
    subclass=dict(
        cleric={3: ['Aid', 'Bless', 'Cure Wounds', 'Lesser Restoration'], 5: ['Mass Healing Word', 'Revivify'], 7: ['Aura of Life', 'Death Ward'], 9: ['Greater Restoration', 'Mass Cure Wounds']},
        paladin={3: ['Protection from Evil and Good', 'Shield of Faith'], 5: ['Aid', 'Zone of Truth'], 9: ['Beacon of Hope', 'Dispel Magic'], 13: ['Freedom of Movement', 'Guardian of Faith'], 17: ['Commune', 'Flame Strike']},
        sorcerer={3: ['Alter Self', 'Chromatic Orb', 'Command', "Dragon's Breath"], 5: ['Fear', 'Fly'], 7: ['Arcane Eye', 'Charm Monster'], 9: ['Legend Lore', 'Summon Dragon']},
        warlock={3: ['Burning Hands', 'Command', 'Scorching Ray', 'Suggestion'], 5: ['Fireball', 'Stinking Cloud'], 7: ['Fire Shield', 'Wall of Fire'], 9: ['Geas', 'Insect Plague']},
        druid={'arid': {3: ['Blur', 'Burning Hands', 'Fire Bolt'], 5: ['Fireball'], 7: ['Blight'], 9: ['Wall of Stone']},
               'polar': {3: ['Fog Cloud', 'Hold Person', 'Ray of Frost'], 5: ['Sleet Storm'], 7: ['Ice Storm'], 9: ['Cone of Cold']},
               'temperate': {3: ['Misty Step', 'Shocking Grasp', 'Sleep'], 5: ['Lightning Bolt'], 7: ['Freedom of Movement'], 9: ['Tree Stride']},
               'tropical': {3: ['Acid Splash', 'Ray of Sickness', 'Web'], 5: ['Stinking Cloud'], 7: ['Polymorph'], 9: ['Insect Plague']}},
    ),
)
def spell_key(name): return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
# names → spell keys, after checking each name against the spells and the SRD text
def grants_to_keys(grants, spells, txt):
    flat = re.sub(r'\s+', ' ', txt.replace('’', "'"))
    def conv(v):
        if isinstance(v, dict): return {k: conv(x) for k, x in v.items()}
        out = []
        for n in v:
            assert spell_key(n) in spells, ('granted spell not found', n)
            assert n in flat, ('granted spell not in the SRD text', n)
            out.append(spell_key(n))
        return out
    return conv(grants)

def main():
    # page breaks → plain line breaks (headers "System Reference Document 5.2.1" + page number)
    txt = re.sub(r'\n=====PAGE \d+=====\nSystem Reference Document 5\.2\.1\s*\n\d+\n', '\n', pdf_text())
    data = dict(
        attribution=ATTRIBUTION, source='SRD 5.2.1',
        standardArray=[15, 14, 13, 12, 10, 8], pointBuy=dict(budget=27, costs={8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9}),
        xp=[0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000],
        languages=dict(standard=['Common Sign Language', 'Draconic', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc'],
                       rare=['Abyssal', 'Celestial', 'Deep Speech', 'Druidic', 'Infernal', 'Primordial', 'Sylvan', "Thieves' Cant", 'Undercommon']),
        alignments=['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'],
        classes={}, backgrounds=BACKGROUNDS, species=extract_species(txt), feats=extract_feats(txt),
        weapons={k: dict(damage=v[0], type=v[1], properties=v[2], mastery=v[3], category=v[4]) for k, v in WEAPONS.items()},
        armor={k: dict(category=v[0], base=v[1], dexCap=v[2]) for k, v in ARMOR.items()},
        xpBudget={l: dict(low=v[0], moderate=v[1], high=v[2]) for l, v in XP_BUDGET.items()},
        conditions=extract_conditions(txt),
    )
    monsters = extract_monsters(txt)
    spells = extract_spells(txt)
    texts = extract_classes(txt)
    for cid, c in CLASSES.items():
        c = dict(c); c['skills'] = dict(choose=c['skills']['choose'], options=c['skills']['from_'])
        t = texts[cid]; table = t['table']
        for lvl in (1, 2, 3):   # the parsed table must agree with the hand-checked level 1–3 values
            hand = c.get('columns', {}).get(lvl, {})
            for k, v in hand.items():
                got = table[lvl].get(k)
                assert str(got).lower() == str(v).lower(), (cid, lvl, k, got, v)
            if c.get('spellcasting'):
                h = c['spellcasting']['levels'][lvl]; row = table[lvl]
                slots = [0] * (row['slotLevel'] - 1) + [row['pactSlots']] if c['spellcasting'].get('pact') else row['slots']
                assert h['slots'] == slots and h['prepared'] == row['prepared'] and h['cantrips'] == row.get('cantrips', 0), (cid, lvl, h, row)
        c['columns'] = {l: {k: v for k, v in r.items() if k not in SPELL_KEYS and k != 'features'} for l, r in table.items()}
        c['columns'] = {l: v for l, v in c['columns'].items() if v}
        if c.get('spellcasting'):
            sp = dict(c['spellcasting']); lv = {}
            for l, r in table.items():
                if sp.get('pact'): lv[l] = dict(cantrips=r.get('cantrips', 0), prepared=r['prepared'], slots=[0] * (r['slotLevel'] - 1) + [r['pactSlots']], slotLevel=r['slotLevel'])
                else: lv[l] = dict(cantrips=r.get('cantrips', 0), prepared=r['prepared'], slots=r['slots'])
            sp['levels'] = lv; c['spellcasting'] = sp
        c['levels'] = {l: r['features'] for l, r in table.items()}
        c.update({k: v for k, v in t.items() if k != 'table'}); data['classes'][cid] = c
    js = ('// GENERATED by scripts/extract-srd.py from the SRD 5.2.1 PDF — do not edit; re-run the script.\n'
          '// ' + ATTRIBUTION + '\n'
          '// Character creation data for levels 1–20 (classes with their tables and features, SRD subclasses,\n'
          '// backgrounds, species, feats incl. epic boons, weapons, armor).\n'
          'export const SRD = ' + json.dumps(data, indent=1, ensure_ascii=False) + ';\n')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w').write(js)
    mjs = ('// GENERATED by scripts/extract-srd.py from the SRD 5.2.1 PDF — do not edit; re-run the script.\n'
           '// ' + ATTRIBUTION + '\n'
           '// Monster stat blocks (Monsters A–Z and Animals). Attack/save actions are parsed into `attacks`.\n'
           'export const MONSTERS = ' + json.dumps(monsters, ensure_ascii=False, separators=(',', ':')) + ';\n')
    open(MONSTERS_OUT, 'w').write(mjs)
    sjs = ('// GENERATED by scripts/extract-srd.py from the SRD 5.2.1 PDF — do not edit; re-run the script.\n'
           '// ' + ATTRIBUTION + '\n'
           '// Spells (Spell Descriptions + the class spell lists): level (0 = cantrip), school, classes, casting\n'
           '// time, range, components, duration, text; best-effort attack/save/damage for combat.\n'
           'export const SPELLS = ' + json.dumps(spells, ensure_ascii=False, separators=(',', ':')) + ';\n'
           '// Spells granted by species (character level) and SRD subclasses (class level; druid: by land type).\n'
           'export const SPELL_GRANTS = ' + json.dumps(grants_to_keys(SPELL_GRANTS, spells, txt), ensure_ascii=False, separators=(',', ':')) + ';\n')
    open(SPELLS_OUT, 'w').write(sjs)
    print('= wrote', os.path.relpath(SPELLS_OUT, ROOT), f'({len(sjs) // 1024} KB, {len(spells)} spells:', ', '.join(f"L{l} {sum(1 for x in spells.values() if x['level'] == l)}" for l in range(10)) + ')')
    print('= wrote', os.path.relpath(MONSTERS_OUT, ROOT), f'({len(mjs) // 1024} KB, {len(monsters)} monsters)')
    no_atk = [m['name'] for m in monsters.values() if not m['attacks']]
    print('  monsters without a parsed attack:', len(no_atk), ', '.join(no_atk[:40]))
    print('  conditions:', ', '.join(data['conditions']))
    print('= wrote', os.path.relpath(OUT, ROOT), f'({len(js) // 1024} KB)')
    for cid, c in data['classes'].items():
        print(f"  {c['name']:9} features: {', '.join(str(f['level']) + ':' + f['name'] for f in c['features'])} | {c['subclass']}: {', '.join(f['name'] for f in c['subclassFeatures'])}")
    for sid, sp in data['species'].items():
        print(f"  {sp['name']:10} {sp['size'][:28]:28} {sp['speed']} ft | {', '.join(t['name'] for t in sp['traits'])}")
    print('  feats:', ', '.join(data['feats']))

if __name__ == '__main__':
    main()
