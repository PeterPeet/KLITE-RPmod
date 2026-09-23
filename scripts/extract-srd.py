#!/usr/bin/env python3
# =============================================================================
# SRD 5.2.1 → src/data/srd52.js (character creation data for levels 1–3)
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
            if lvl <= 3 and not any(f['name'] == m.group(2).strip() for f in feats):
                feats.append(dict(level=lvl, name=m.group(2).strip().replace('’', "'"), text=trim_tail(clean(m.group(3)))))
        sub = []
        for m in re.finditer(r'\nLevel (\d+): ([^\n]+)\n(.*?)(?=\nLevel \d+: |$)', subsec, re.S):
            if int(m.group(1)) <= 3:
                sub.append(dict(level=3, name=m.group(2).strip().replace('’', "'"), text=trim_tail(clean(m.group(3)))))
        intro = clean(subsec[subsec.index('\n', 2):subsec.index('\nLevel ')]) if subsec else []
        out[cid] = dict(features=feats, subclassFeatures=sub, subclassIntro=[p for p in intro if len(p) > 40][:2])
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
    s = txt[a:txt.index('\nEpic Boon Feats', a)]   # (the table of contents also lists these headings)
    s = re.sub(r'\n=====PAGE \d+=====\nSystem Reference Document 5\.2\.1\n\d+', '', s)
    out = {}
    for m in re.finditer(r'\n([A-Z][A-Za-z -]+)\n((?:Origin|General|Fighting Style) Feat[^\n]*(?:\n[^\n]*\))?)\n(.*?)(?=\n[A-Z][A-Za-z -]+\n(?:Origin|General|Fighting Style) Feat|\nGeneral Feats\n|\nFighting Style Feats\n|$)', s, re.S):
        name = m.group(1).strip()
        cat = re.sub(r'\s+', ' ', m.group(2)).replace('Dexterit y', 'Dexterity')
        out[name] = dict(name=name, category=cat, text=clean(m.group(3)))
    return out

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
    )
    texts = extract_classes(txt)
    for cid, c in CLASSES.items():
        c = dict(c); c['skills'] = dict(choose=c['skills']['choose'], options=c['skills']['from_'])
        c.update(texts[cid]); data['classes'][cid] = c
    js = ('// GENERATED by scripts/extract-srd.py from the SRD 5.2.1 PDF — do not edit; re-run the script.\n'
          '// ' + ATTRIBUTION + '\n'
          '// Character creation data for levels 1–3 (classes, subclasses, backgrounds, species, origin and\n'
          '// fighting-style feats, weapons, armor).\n'
          'export const SRD = ' + json.dumps(data, indent=1, ensure_ascii=False) + ';\n')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w').write(js)
    print('= wrote', os.path.relpath(OUT, ROOT), f'({len(js) // 1024} KB)')
    for cid, c in data['classes'].items():
        print(f"  {c['name']:9} features: {', '.join(str(f['level']) + ':' + f['name'] for f in c['features'])} | {c['subclass']}: {', '.join(f['name'] for f in c['subclassFeatures'])}")
    for sid, sp in data['species'].items():
        print(f"  {sp['name']:10} {sp['size'][:28]:28} {sp['speed']} ft | {', '.join(t['name'] for t in sp['traits'])}")
    print('  feats:', ', '.join(data['feats']))

if __name__ == '__main__':
    main()
