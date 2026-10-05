"""Writes specs.json (prompt + seed per asset) for the initial batch. Prompts are the source of truth."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
STYLE = ("Bold cartoon fantasy game art, thick clean black outlines, vibrant cel shading, glossy highlights, "
         "playful exaggerated proportions, same style as a polished mobile RPG")

ICON_BG = ("Single object centered and filling most of the frame, game inventory icon, three-quarter view, "
           "isolated on a plain flat dark charcoal background with nothing else in the scene")

RARITY_FX = {
    "common": "plain dull materials, no glow, worn and humble",
    "rare": "polished materials with a soft sapphire-blue magical glow and a few small blue sparkles",
    "epic": "ornate gold filigree and amethyst gems, strong purple magical aura and swirling violet sparks",
    "legendary": "lavish gold and rubies, wreathed in crimson-orange flames and embers, intense red glow",
    "cosmic": "radiant celestial gold, made of starlight with a tiny swirling galaxy inside, blazing golden aura, "
              "glittering stars and light rays",
}

GEAR = {
    "weapon": {
        "common": "a rusty bent iron shortsword with a cloth-wrapped wooden hilt",
        "rare": "a polished steel Arabian scimitar with a leather grip and a blue sapphire in the pommel",
        "epic": "an ornate curved Arabian scimitar with an engraved blade and a large amethyst in the guard",
        "legendary": "a magnificent golden Arabian scimitar encrusted with rubies, its blade on fire",
        "cosmic": "a divine curved Arabian scimitar whose blade is a sliver of the night sky full of stars",
    },
    "armor": {
        "common": "a tattered patched beige cloth tunic with frayed edges",
        "rare": "a steel chainmail vest with a white cloth sash and blue trim",
        "epic": "an ornate breastplate under a flowing violet bisht cloak with gold embroidered edges",
        "legendary": "a royal crimson and gold plate armor with a gold-trimmed black bisht cloak",
        "cosmic": "a celestial golden plate armor with a cloak made of a starry galaxy",
    },
    "amulet": {
        "common": "a simple grey pebble pendant on a frayed string",
        "rare": "a silver crescent-moon pendant holding a blue sapphire on a silver chain",
        "epic": "a gold amulet shaped like an eight-pointed star with a glowing amethyst center",
        "legendary": "a gold falcon-shaped amulet with ruby eyes and spread wings",
        "cosmic": "a golden locket amulet whose open center holds a swirling miniature galaxy",
    },
    "relic": {
        "common": "a dented old tin Arabic coffee pot (dallah) with a chipped spout",
        "rare": "a polished brass Arabic coffee pot (dallah) with blue magic steam rising from the spout",
        "epic": "an ornate silver Arabic coffee pot (dallah) with purple gems and swirling violet magic steam",
        "legendary": "a solid gold Arabic coffee pot (dallah) studded with rubies, crimson flames pouring from the spout",
        "cosmic": "a radiant celestial Arabic coffee pot (dallah) pouring a stream of liquid starlight",
    },
}

ZONES = {
    1: ("Thumama Dunes", "towering red-orange sand dunes at dusk with a hazy amber sky"),
    2: ("Tahlia Street", "a neon-lit Riyadh boulevard at night with glowing pink shop signs and blurred car lights"),
    3: ("Al-Batha Market", "a crowded old Saudi souq at night with hanging lanterns, spice sacks and carpets"),
}

# zone<N>_boss<M> = M-th boss floor in zone N (bosses every 10 floors; name = MONSTER_NAMES[(floor-1) % 12])
BOSSES = [
    ("zone1_boss1", 1, 10, "Rukbah Soda",
     "a furious giant living soda can monster with fizzy foam bursting from its top, cartoon angry eyes, "
     "muscular arms, bubbles and spraying soda around it"),
    ("zone1_boss2", 1, 20, "Mutawa",
     "a towering stern cartoon elder in a white thobe and red-checkered shemagh with a long grey beard, "
     "wagging a giant scolding finger, frowning comically with bushy eyebrows"),
    ("zone1_boss3", 1, 30, "Giant Kabsa Monster",
     "a huge roaring monster made of a mountain of golden kabsa rice on a silver platter, with chicken-leg arms, "
     "glowing eyes, almonds, raisins and chili peppers stuck in its body, steam rising"),
    ("zone2_boss1", 2, 60, "Al-Modir",
     "a smug giant office manager boss in a crisp white thobe and shemagh, sitting on a massive executive chair, "
     "sunglasses, holding a rubber stamp like a weapon, stacks of paperwork flying around him"),
    ("zone3_boss1", 3, 160, "Drifting Camry",
     "a monstrous white sedan car with a menacing grille of teeth and glowing headlight eyes, drifting sideways "
     "on two wheels, huge clouds of tire smoke and sparks"),
]


def main():
    specs = []
    seed = 7100
    for slot, tiers in GEAR.items():
        for i, (rar, item) in enumerate(tiers.items()):
            seed += 1
            specs.append({
                "id": "gear/%s_%s" % (slot, rar), "category": "gear", "slot": slot, "rarity": rar.capitalize(),
                "tier": i + 1, "seed": seed, "width": 768, "height": 768, "steps": 22, "guidance": 3.5,
                "out_size": 128,
                "prompt": "%s, %s. %s. %s." % (item.capitalize(), RARITY_FX[rar], ICON_BG, STYLE),
            })
    seed = 9100
    for bid, zone, floor, name, desc in BOSSES:
        seed += 1
        zname, bg = ZONES[zone]
        specs.append({
            "id": "bosses/" + bid, "category": "bosses", "zone": zone, "zone_name": zname, "floor": floor,
            "boss_name": name, "seed": seed, "width": 1024, "height": 1024, "steps": 24, "guidance": 3.5,
            "out_size": 512,
            "prompt": "Epic boss monster portrait: %s. Centered full-body, facing the viewer, menacing but funny. "
                      "Background: %s, slightly blurred. Dramatic rim lighting. %s." % (desc, bg, STYLE),
        })
    json.dump(specs, open(os.path.join(HERE, "specs.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(len(specs), "specs")


if __name__ == "__main__":
    main()
