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
# Threats (SAMs, enemy fighters) start OFF in the web edition (27-Nov-2026, user); [H] still turns them on.
# The full edition (root index.html) keeps them on.
for pattern, new in ((r"let threatsOn = true;", "let threatsOn = false;"),
                     (r'<button id="btn-threats" class="active" (onclick="toggleThreats\(\)"[^>]*>)THREATS ON \[H\]</button>',
                      r'<button id="btn-threats" \1THREATS OFF [H]</button>')):
    html, n = re.subn(pattern, new, html)
    assert n == 1, pattern
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

COINS = {"spend": False, "why": "A crash is the lesson and the flight restarts at the runway for free; there is no one-use help to sell."}
game = json.dumps({
    "title": "SkyForge",
    "maker": "Md. Saiqul Haque Modi",
    "category": "arcade",
    "github": "saiqulmodi",
    "coins": COINS,
    "one_line": "Fly a stealth fighter over real South India terrain and earn stars for every landing.",
    "how_to_play": "Power up, roll down the runway, pull back gently to lift off. Bank to turn, flare to land for 3 stars. Phone: on-screen stick and buttons. Computer: W/S pitch, A/D roll, Q/E rudder, Shift/Ctrl power.",
    "description": "A 3D fighter flight simulator on real flight physics over real South India terrain and coastline, with 29 real airports, wind and rain, a weapons range, stall, g and speed limits, stars for every landing and a daily streak.",
}, indent=2) + "\n"
# "coins" on one line, as the Stratos file had it: { "spend": false, "why": "..." }
coins_one_line = '{ "spend": false, "why": ' + json.dumps(COINS["why"]) + " }"
game, n = re.subn(r'\{\n    "spend": false,\n    "why": [^\n]*\n  \}', lambda m: coins_one_line, game)
assert n == 1, "coins entry not found in game.json"
(OUT / "game.json").write_text(game, encoding="utf-8")

size_mb = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file()) / 1024 / 1024
print(f"web edition built: {size_mb:.1f} MB in {OUT}")
raise SystemExit(1 if size_mb > MAX_MB else 0)
