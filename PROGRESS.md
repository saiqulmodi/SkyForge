# SkyForge - South India travel, STAGE 1: flight model fixes

STATUS: DONE

User said "go" on 2026-10-31 for stage 1 of the South India airports plan (game must stay under 20 MB).
Stages: 1 flight model (this) -> 2 large world + real terrain/coast -> 3 airports -> 4 route/navigation.
Phased work: finish THIS stage only, commit, report, then wait for the user's "go".

## Stage 1 steps
- [x] Fixed-wing velocity follows the heading (thrust/drag along the nose direction, sideways slip decays, bank turns the aircraft: turn rate = g sin(bank) / v)
- [x] Lift from angle of attack and speed: L = g (v/Vs)^2 (CL/CLmax), CL = cl0 + clAlpha * alpha, stall above stallAoA; climb costs speed (g sin gamma); induced drag
- [x] Profiles: stallKt + approachKt per airframe so approach pitch is ~3-6 deg (trainer 48/62, fighter 92/135, airliner 78/101 kt); lift-off from real lift (no +12 m/s jump)
- [x] Approach start trims to the new model; IAS = speed along the nose; helicopter IAS too
- [x] Test: take-off, turn 90/180 deg and fly that way, approach + landing from cockpit with runway visible, no console errors; commit "Stage 1: flight model flies along heading, normal approach attitude"; STATUS: DONE

## Log
- 2026-10-31: stage 1 started.
- 2026-10-31: stage 1 done. Tests: take-off (lift-off 72 kt, pitch 6.7), turn -> hdg 156 travelling SSE, approach trainer 4.6-4.7 deg / 62 kt / -330 fpm with runway visible in cockpit, landing SMOOTH 218 fpm 389 m past threshold, stop 75 m with brakes; fighter 4.5 deg, airliner 3.5 deg on approach; heli hover holds; no console errors. Waiting for user go for stage 2.
