# SkyForge record: what is done, what can still be better

Kept up to date with each round of work. Newest round first in "Done".

## The two versions

| Version | Where | Aircraft | Stratos |
|---|---|---|---|
| Web (phone and browser) | `web/`, built by `python tools/build_web.py` from the root files; never edit `web/` by hand | Fighter only | The only version for stratos.games |
| Full | repo root, `index.html` | Fighter, trainer, airliner, helicopter | Never on Stratos |

## Done

### Round 3, 04-Nov-2026: fighter to the limit
- New fighter model: grey paint, lofted body, intakes, tailplanes, real nozzles with a glow that follows power.
- Afterburner flame grows and dies smoothly. Thrust climbs on through the 70 % gate with no jump.
- Gear folds away after take-off and comes down below 300 ft.
- Vapor cone near Mach 1, white wing-tip trails above 4 g, sonic boom sound.
- Smooth transitions: nose and wings settle at touchdown instead of snapping; slow steady rotation for take-off; wave drag rises smoothly; chase camera follows loops and rolls at a limited rate with no flip at the top.
- Leftover banner behind the tabs removed.
- Crash in the air (user's report: wreck on the ground, altitude 7,734 ft): a crash now always reads 0 ft and 0 kt. The fighter's flight computer holds it inside its speed limit under power; only a steep dive can still overspeed it.
- Tested on the fighter: take-off roll 12 s on dry power, supersonic on afterburner and subsonic on dry, full loop, 360 roll in 2.4 s, split-S, dive into the ground, restart at 0 ft.

### Round 2, 04-Nov-2026: flight rules from the user's documents
- Stall speeds from each wing: fighter 119 kt, trainer 70 kt, airliner 114 kt (`tools/validate_flight.py`).
- Stall and recovery. The fighter's flight computer stops a pull-up stall.
- G limits +9/-3, +6/-3, +2.5/-1. Airliner bank limit 45 degrees. Never-exceed speeds, with break-up well past them.
- Engine spool per aircraft, empty tanks stop the engine, pilot blackout under sustained g.
- Phone: analog stick, picture tabs, sound button in the camera tab, sharper picture with an automatic step down on slow phones.
- Landing stars, running total, daily streak.
- Two versions split (table above).

### Round 1, 03-Nov-2026: phone and real flight
- On-screen flight buttons for phones.
- Phones show only the view, two tabs, flight buttons and a corner map with runways and flight path.
- Every version: two bottom tabs, no centre write-up, no aiming ring, fighter by default. Changing aircraft is a fresh start on the runway.
- Air flight rebuilt on lift, drag, thrust, standard atmosphere and true 3D velocity. Bank turns the aircraft, hard turns cost speed, a nose-down aircraft dives, pitch stays within 90 degrees.
- Altitude reads 0 on the ground; no power until it reads 0.
- Flight runs in real time at any frame rate.

## Can still be better

Most useful first. "Needs the user" means it cannot be finished from this computer alone.

1. **Real phone test (needs the user).** All tests ran at phone sizes on a computer. Frame rate and feel on a real phone are unmeasured.
2. **Easier landing on a phone.** A flare with a touch stick may be hard. Options: a landing aid that eases the sink rate near the runway, or a gentler stick near centre.
3. **Goals to fly for.** Only landing stars so far. Could add a daily route, target runs on the weapons range, and fastest-lap rings.
4. **Ground up close and from high.** Fields and hills are procedural and look plain from high up. Better terrain colours and more villages, roads and trees would help, within phone limits.
5. **More lifelike weapons and enemies.** Target drones on the range do not fight back. Enemy fighters with simple tactics would be the next step in the documents' roadmap.
6. **Sound.** Engine, boom and warnings are synthesised. Recorded sounds would be richer but add download size.
7. **Damage model.** The aircraft is either fine or destroyed. Partial damage and engine temperature limits are not modelled.
8. **Cross-check the flight data.** Compare against JSBSim's aircraft or published figures. The numbers are representative, not certified.
9. **Full version only:** helicopter and Player 2 still use older flight code.
10. **Online multiplayer (needs the user).** Needs an account and an online service, plus the decision to run one.

## Not possible in this game

- Unreal Engine 5: no browser export, so it would not run on Stratos or in a phone browser. It would be a separate desktop project and a full rewrite.
- MATLAB, XFLR5, OpenVSP, OpenFOAM: desktop design tools, not parts of a game.

## Known limits of the testing

- Flight tests use a simulated pilot on a test clock, with crosswind drift removed for the landing test.
- Pictures were checked on a software graphics renderer, so real colours and speed may differ a little.
