# SkyForge - South India travel, STAGE 3: airports

STATUS: DONE

User said "go" for stage 3 and "yes" (2026-10-31) to downloading OurAirports airports.csv (12.8 MB) +
runways.csv (4.0 MB) into the scratchpad. Ship only assets/airports/south_india_airports.json (~20 KB).
Game must stay under 20 MB. Phased: finish stage 3, commit, wait for "go" (stage 4 = route between airports).
World: origin = VOBL 09L/27R centre, y = 0 = 915 m AMSL; -Z east, +Z west, -X north, +X south.

## Steps
- [x] tools/build_airports.py -> assets/airports/south_india_airports.json (scheduled-service airports in KA/TN/KL/AP/TG/PY, paved runways >= 1500 m, runway end lat/lon, heading, length, width, elevation)
- [x] src/world/airports.js: load JSON, runway registry (incl. VOBL's two runways), runwayAt(x, z, heading), terrain flatten zones per airport, scenery streamed within ~45 km
- [x] Generic airport scenery: oriented runway, markings, edge lights, MALSR + PAPI both ends, taxiway, apron, terminal, tower (helpers shared with voblAirport.js)
- [x] Active runway: take-off / approach / route home use the chosen runway (not just VOBL 09L); airport picker in the control deck; touchdown rating on any runway
- [x] Moving map shows other airports' runways + ICAO
- [x] Test several airports (take-off, approach, landing), no console errors, FPS, size; commit "Stage 3: South India airports"; STATUS: DONE

## Log
- 2026-10-31: stage 3 started.
- 2026-10-31: stage 3 done. 29 airports (8.7 KB JSON). runwayAt verified (VOMM 07/25, VOTV 14, VOCI 27, VOHS 09L, VOBL, VOML 24; abeam = none). Spawn VOMM 07 at field 56 ft, scenery + PAPI + crossing 12/30 visible; approach VOMM 07 / VOTV 14 with route home to the chosen runway; chase camera snaps after jumps. Browser window was throttled to ~1.6 FPS (stage-2 build identical there) - FPS not re-measured. Waiting for go on stage 4.
