# SkyForge - South India travel, STAGE 4 + phases 7-9 (stage 3 below)

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
- 2026-10-31: visual upgrade (src/render/visuals.js): physical sky + matching haze, sky reflections, sun shadows following the aircraft, farmland/asphalt/concrete detail, glossy sea, aircraft paint + panel lines, lit runway paint, Time of Day (Noon/Morning/Golden/Dusk) and Graphics (Low/Medium/High+Bloom) panels. No clouds (user: keep views clear). Stage 4 still waiting for go.
- 2026-10-31: user "go": stage 4 + phases 7-9 done.
  Stage 4: DESTINATION picker (any of the 29 airports) -> route TOC / WPn (every ~60 km) / TOD (3 NM per 1,000 ft) / arrival JOIN-IF-FAF-RW; cruise per aircraft (trainer 9,500, jets 25,000, heli 5,500) raised to clear ground +2,000 ft; NAV [V] autopilot banks to the next waypoint + holds its altitude; ARRIVED message with flight time.
  Nearest runway always on the map (user request): ICAO, runway end on the approach side, NM + KM, bearing, minutes; [J] / LAND NEAREST routes there.
  Phase 7: wind per weather button (clear 290/6, crosswind 28 kt square to the active runway, monsoon 240/16 G26 + rain + wet runway, CAT III calm + wet), drift + gust turbulence, wet braking; rain streaks only (no cloud decks, no fog override).
  Phase 8: two airliners fly touch-and-go circuits at VOBL (09L left, 09R right); ILS cross-pointer for the destination/active runway on final. Old fixed SID list superseded by the stage 4 route.
  Phase 9: fighter gun with hit detection, [F] missiles (6) on radar lock (orange box), target drones + ground sites on real terrain, respawn after 45 s, kills announced.
  Chase camera rides with the aircraft (always centred; world moves at true relative speed).
- 2026-11-01: 2 players on ONE screen (user: no split screen): [P] / 2 PLAYERS button; P2 flies with the second controller (same flight equations, own aircraft, gun + missiles on the range); shared camera frames both aircraft and pulls back as they separate; P1/P2 tags + separation on screen, edge arrows when off screen; P2 HUD bottom-right.
- 2026-11-01: fighter fins fixed (twin fins were built side-on, sticking out across the tail; now run nose-to-tail with their outward cant) in fighter.js and the TrainerModel copy. Graphics start on High on every computer (phones Low); the FPS guard no longer drops a computer below Medium.
- 2026-11-01: moving map: runway end names, take-off runway green with T/O arrow, landing runway cyan with LAND label and KM on the line, bigger YOU symbol + heading line, on the ground "ON RWY xx: N M LEFT OF L M" or distance to the take-off runway. Crash: src/fx/crashSequence.js - fireball, shockwave, scorch, big flames + smoke column, burning debris, pilot ejects (rocket seat) under a rainbow parachute, crash camera circles; new start on the active runway when the 10 s scene ends.
- 2026-11-01: SkyForge emblem (assets/skyforge-icon.svg: hex badge, twin-fin jet over a forge flame) replaces the written name: fixed top-left badge + browser tab icon; help text moved right of it.
- 2026-11-01: left-side controls write-up removed (emblem stays). Crash checks now use the attitude at the moment of contact (nose-first and wingtip strikes were missed because pitch/bank were levelled first) and a touchdown above 1.5 x approach speed is a crash. Verified: nose-down hit -> crash scene; normal landing -> NORMAL LANDING.
