"""Downscale/compress raw renders into assets/generated/<category>/ and rebuild manifest.json.

Usage: python postprocess.py specs.json [specs2.json ...]
Picks the newest raw render ComfyUI/output/clicker/<id>_*.png for each spec.
Bosses: 512x512 WebP <=150 KB. Icons: 128x128 WebP <=40 KB (clean dark background, opaque).
"""
import glob, json, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GEN = os.path.dirname(HERE)
RAW = r"C:\Users\BigB\Documents\comfy\ComfyUI\output\clicker"
def limit_for(w, h):
    return 40 * 1024 if max(w, h) <= 128 else 60 * 1024 if max(w, h) <= 256 else 150 * 1024
MODEL = "FLUX.1-dev fp8 (flux1-dev-fp8.safetensors) + t5xxl_fp8 + clip_l, euler/simple, cfg 1.0"


def save(img, path, limit):
    for q in (90, 85, 80, 75, 70, 65, 60, 50, 40):
        img.save(path, "WEBP", quality=q, method=6)
        if os.path.getsize(path) <= limit:
            return q
    return q


def main():
    man_path = os.path.join(GEN, "manifest.json")
    manifest = {"version": 1, "style": "bold cartoon fantasy game art, thick black outlines, cel shading", "assets": []}
    if os.path.exists(man_path):
        manifest = json.load(open(man_path, encoding="utf-8"))
    byid = {a["id"]: a for a in manifest["assets"]}
    for sp in sys.argv[1:]:
        for s in json.load(open(sp, encoding="utf-8")):
            raws = sorted(glob.glob(os.path.join(RAW, s["id"].replace("/", os.sep) + "_*.png")), key=os.path.getmtime)
            if not raws:
                print("MISSING raw", s["id"]); continue
            out = os.path.join(GEN, s["id"] + ".webp")
            os.makedirs(os.path.dirname(out), exist_ok=True)
            w, h = s["out_size"] if isinstance(s["out_size"], list) else (s["out_size"], s["out_size"])
            img = Image.open(raws[-1]).convert("RGB").resize((w, h), Image.LANCZOS)
            q = save(img, out, limit_for(w, h))
            entry = {k: v for k, v in s.items() if k not in ("width", "height", "out_size", "guidance", "steps")}
            entry.update(file="assets/generated/%s.webp" % s["id"], size=[w, h],
                         bytes=os.path.getsize(out), model=MODEL,
                         render={"width": s["width"], "height": s["height"], "steps": s["steps"], "guidance": s["guidance"]})
            byid[s["id"]] = entry
            print("%-26s %6d B q%d" % (s["id"], os.path.getsize(out), q))
    manifest["assets"] = sorted(byid.values(), key=lambda a: a["id"])
    json.dump(manifest, open(man_path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
