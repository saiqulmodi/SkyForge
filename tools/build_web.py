"""Builds the fighter-only WEB EDITION of SkyForge into web/ (the only edition meant for stratos.games).
The full edition (index.html at the repo root, all aircraft) is never copied to Stratos.
Run: python tools/build_web.py    Fails if the folder is over the Stratos 20 MB limit.
"""
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web"
KEEP = ["css", "data", "src", "vendor", "assets", "thumbnail.png"]
MAX_MB = 20

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()
for name in KEEP:
    src = ROOT / name
    if src.is_dir():
        shutil.copytree(src, OUT / name)
    else:
        shutil.copy2(src, OUT / name)

# The page: same game, web edition switch on
html = (ROOT / "index.html").read_text(encoding="utf-8")
html, n = re.subn(r'(<meta name="skyforge-edition" content=")full(")', r"\1web\2", html)
assert n == 1, "edition switch not found in index.html"
(OUT / "index.html").write_text(html, encoding="utf-8", newline="\n")

# Only the fighter can be flown: drop the trainer and helicopter airframes. The airliner stays for the AI traffic.
fleet_path = OUT / "src" / "aircraft" / "FleetManager.js"
fleet = fleet_path.read_text(encoding="utf-8")
for pattern in (r"import \{ createTrainer \}[^\n]*\n", r"import \{ createAirliner \}[^\n]*\n", r"import \{ createHelicopter \}[^\n]*\n",
                r"  trainer: createTrainer,\n", r"  airliner: createAirliner,\n", r",?\n  heli: createHelicopter"):
    fleet, n = re.subn(pattern, "\n" if "heli:" in pattern else "", fleet.replace("\r\n", "\n"))
    assert n == 1, pattern
fleet_path.write_text(fleet, encoding="utf-8", newline="\n")
(OUT / "src" / "aircraft" / "trainer.js").unlink()
(OUT / "src" / "aircraft" / "helicopter.js").unlink()
(OUT / "src" / "main.js").unlink()   # old entry point, not used by index.html

# Player 2 flies the fighter too
wing_path = OUT / "src" / "multiplayer" / "wingman.js"
wing = wing_path.read_text(encoding="utf-8").replace("\r\n", "\n")
for pattern, new in ((r"import \{ createTrainer \}[^\n]*\n", ""), (r"import \{ createHelicopter \}[^\n]*\n", ""),
                     (r"const FACTORIES = \{[^\n]*\};", "const FACTORIES = { fighter: createFighter };")):
    wing, n = re.subn(pattern, new, wing)
    assert n == 1, pattern
wing_path.write_text(wing, encoding="utf-8", newline="\n")

(OUT / "game.json").write_text(json.dumps({
    "title": "SkyForge",
    "maker": "Md. Saiqul Haque Modi",
    "category": "arcade",
    "github": "saiqulmodi",
    "one_line": "Fly a stealth fighter over real South India terrain and earn stars for every landing.",
    "how_to_play": "Power up, roll down the runway, pull back gently to lift off. Bank to turn, flare to land for 3 stars. Phone: on-screen stick and buttons. Computer: W/S pitch, A/D roll, Q/E rudder, Shift/Ctrl power.",
    "description": "A 3D fighter flight simulator on real flight physics over real South India terrain and coastline, with 29 real airports, wind and rain, a weapons range, stall, g and speed limits, stars for every landing and a daily streak.",
}, indent=2) + "\n", encoding="utf-8")

size_mb = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file()) / 1024 / 1024
print(f"web edition built: {size_mb:.1f} MB in {OUT}")
raise SystemExit(1 if size_mb > MAX_MB else 0)
