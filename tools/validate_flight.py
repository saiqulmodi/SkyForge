"""Checks SkyForge's flight data against the aerodynamic equations, using each aircraft's own numbers from src/aircraft/*.js.
Run: python tools/validate_flight.py   (exit code 1 when a stored speed no longer matches the wing data)

  Stall speed   Vs = sqrt(2 m g / (rho S CLmax))
  Load factor   n = 1 / cos(bank)
  Turn          radius = V^2 / (g tan(bank)), rate = g tan(bank) / V
  Drag          CD = CD0 + CL^2 / (pi e AR)
"""
import math
import re
from pathlib import Path

G, RHO, MS_TO_KT = 9.81, 1.225, 1.94384
ROOT = Path(__file__).resolve().parent.parent
FIELDS = ["mass", "wingArea", "aspectRatio", "oswaldEfficiency", "cd0", "cl0", "clAlpha", "stallAoA", "stallKt", "vr", "approachKt"]


def read_specs(name):
    text = (ROOT / "src" / "aircraft" / f"{name}.js").read_text(encoding="utf-8")
    return {f: float(re.search(rf"\b{f}:\s*([\d.]+)", text).group(1)) for f in FIELDS}


failed = False
for name in ("fighter", "trainer", "airliner"):
    s = read_specs(name)
    cl_max = s["cl0"] + s["clAlpha"] * s["stallAoA"]
    vs = math.sqrt(2 * s["mass"] * G / (RHO * s["wingArea"] * cl_max)) * MS_TO_KT
    match = abs(vs - s["stallKt"]) <= 3
    failed |= not match
    v = s["approachKt"] / MS_TO_KT
    cl = cl_max * (s["stallKt"] / s["approachKt"]) ** 2
    cd = s["cd0"] + cl ** 2 / (math.pi * s["oswaldEfficiency"] * s["aspectRatio"])
    print(f"{name}: CLmax {cl_max:.2f}, stall {vs:.0f} kt (game {s['stallKt']:.0f}) {'OK' if match else 'MISMATCH'}, "
          f"Vr {s['vr']:.0f}, approach {s['approachKt']:.0f}, L/D on approach {cl / cd:.1f}")
    for bank in (30, 45, 60):
        t = math.tan(math.radians(bank))
        print(f"   bank {bank}: n {1 / math.cos(math.radians(bank)):.2f}, at approach speed radius {v * v / (G * t):.0f} m, rate {math.degrees(G * t / v):.1f} deg/s")
raise SystemExit(1 if failed else 0)
