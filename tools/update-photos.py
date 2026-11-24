#!/usr/bin/env python3
"""Writes photos.js: the list of extra angles for each shop photo in images/real/.

Extra angles are files named like the first photo plus -2, -3 ... (g-tail.jpg, g-tail-2.jpg, g-tail-3.png).
GitHub runs this by itself after every push (see .github/workflows/photo-list.yml), so you never need to run it by hand.
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REAL = os.path.join(ROOT, "images", "real")
EXTS = (".jpg", ".jpeg", ".png", ".webp")

files = sorted(f for f in os.listdir(REAL) if f.lower().endswith(EXTS))
names = set(files)
angles = {}
for f in files:
    m = re.match(r"^(.*)-(\d+)\.(\w+)$", f)
    if not m:
        continue
    base, n = m.group(1), int(m.group(2))
    first = next((base + e for e in EXTS if base + e in names), None)
    if first and n >= 2:
        angles.setdefault("images/real/" + first, []).append((n, "images/real/" + f))
out = {k: [u for _, u in sorted(v)] for k, v in sorted(angles.items())}
with open(os.path.join(ROOT, "photos.js"), "w") as fh:
    fh.write('"use strict";\n/* Made by tools/update-photos.py: extra angles for each shop photo. Don\'t edit by hand. */\n')
    fh.write("const PHOTO_ANGLES = " + json.dumps(out, indent=1) + ";\n")
print(f"{len(out)} photos with extra angles")
