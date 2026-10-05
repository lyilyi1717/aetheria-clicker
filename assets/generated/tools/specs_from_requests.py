"""Convert assets/requests.json entries into render specs (prompt + fixed seed) for render_batch.py.

Usage: python specs_from_requests.py <priority> <out.json>
Skips entries whose purpose says "tracking only". Prompt = prompt_brief + composition + house style.
Seeds are deterministic: 10000*priority + index in the ordered list.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REQ = os.path.join(HERE, "..", "..", "requests.json")
STYLE = ("Bold cartoon fantasy game art, thick clean black outlines, vibrant cel shading, glossy highlights, "
         "playful exaggerated proportions, same style as a polished mobile RPG. No text, no letters, no logos")
ICON = ("Single object centered and filling most of the frame, game inventory icon, three-quarter view, "
        "isolated on a plain flat dark charcoal background with nothing else in the scene")
# P2 order requested by the art director (category -> rank); unlisted categories go last
ORDER = {2: ["building", "excavation", "garden", "alchemy", "spell", "hero", "monster", "boss", "background", "splash"],
         1: ["boss", "monster", "building", "excavation", "splash"]}


def render_dims(w, h):
    """Render at ~1 MP keeping aspect, multiples of 16 (FLUX); small icons render at 768."""
    if w == h:
        return (768, 768) if w <= 256 else (1024, 1024)
    s = (1024 * 1024 / (w * h)) ** 0.5
    return int(round(w * s / 16) * 16), int(round(h * s / 16) * 16)


def main():
    pri, out = int(sys.argv[1]), sys.argv[2]
    items = [i for i in json.load(open(REQ, encoding="utf-8"))
             if i.get("priority") == pri and "tracking only" not in str(i.get("purpose", "")).lower()]
    rank = ORDER.get(pri, [])
    items.sort(key=lambda i: rank.index(i["category"]) if i["category"] in rank else len(rank))
    specs = []
    for n, i in enumerate(items):
        w, h = map(int, re.findall(r"\d+", i["size"])[:2])
        rw, rh = render_dims(w, h)
        small = max(w, h) <= 256
        tileable = "strata" in i["file"]
        comp = ("Seamless tileable texture, flat top-down, even mid-dark tone, no focal object" if tileable
                else ICON if small and i["category"] not in ("monster",)
                else "Wide cinematic scene, dark and low contrast so UI text stays readable" if i["category"] == "background"
                else "Centered composition, subject facing the viewer, dramatic rim lighting" if i["category"] in ("boss", "splash", "hero")
                else "Centered composition, subject facing the viewer, dark near-black background with soft glow")
        notes = i.get("style_notes", "")
        prompt = "%s. %s. %s." % (i["prompt_brief"].rstrip(". "), comp, STYLE)
        if notes and "House style" not in notes:
            prompt += " " + notes.strip()
        aid = i["file"].replace("assets/generated/", "").rsplit(".", 1)[0]
        specs.append({"id": aid, "request_id": i["id"], "category": i["category"], "priority": pri,
                      "seed": 10000 * pri + n + 1, "width": rw, "height": rh, "steps": 22 if small else 24,
                      "guidance": 3.5, "out_size": [w, h], "transparent_requested": bool(i.get("transparent")),
                      "prompt": prompt})
    json.dump(specs, open(os.path.join(HERE, out), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    from collections import Counter
    print(len(specs), dict(Counter(s["category"] for s in specs)))


if __name__ == "__main__":
    main()
