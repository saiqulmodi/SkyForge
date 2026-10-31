# SkyForge - Phase 6: real Bengaluru terrain + landmarks + runway take-off / landing

STATUS: DONE

User asked on 2026-10-31: "now do phase 6 bengaluru terrain", then "real bangalore", then
"include landing, and take off on the runway". The page runs the inline module in index.html.
World axes: runway 09L/27R along Z, -Z = east, +Z = west, -X = north, +X = south; origin = runway centre.
Real placement via src/environment/phase6/geo.js (lat/lon -> metres). Keep fleet, cockpit, gamepad working.

## Steps
- [x] geo.js - real coordinates (VOBL, Nandi Hills, Skandagiri, T1, T2, ATC, NH44 route, roads, Bengaluru CBD)
- [x] nandiHills.js - granite massif elevation grid at the real Nandi / Skandagiri summits (~19-24 km N)
- [x] voblAirport.js - T1, T2 concourses, ATC tower, hangars, apron, taxiways, south runway 09R/27L, runway 09L/27R markings (piano keys, numbers, TDZ, aiming points), edge lights, PAPI
- [x] approachLights.js - MALSR stanchions past both thresholds (steady bars + sequenced flashers)
- [x] nh44Expressway.js - NH44 + airport access + Devanahalli-Doddaballapur + Hennur-Bagalur roads with traffic; Bengaluru city + Manyata + Yelahanka AFS
- [x] index.html - load phase 6, remove placeholder T1/ATC/Nandi bump, larger terrain, clearer haze
- [x] landing/take-off - brakes (B key / gamepad L3), realistic rollout, touchdown rating (fpm, on/off runway, crash -> reset), approach start (key L / button) on 3 deg glide path
- [x] DONE CHECK - no console errors, take-off and landing tested, screenshots; git commit "Phase 6: real Bengaluru terrain, VOBL airport, MALSR, NH44, runway landing"; STATUS: DONE

## Log
- 2026-10-31: Phase 6 started.
- 2026-10-31: done. Browser: no console errors, 55-59 FPS; smooth landing 199-235 fpm rated on RWY 09L, brakes stop in ~340 m, off-runway touchdown and Nandi terrain crash + reset work. Note: flight model needs ~21 deg nose-up at approach speed (lift = pitch x speed) - asked user before changing it.
