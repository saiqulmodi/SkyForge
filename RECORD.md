# SkyForge record: what is done, what can still be better

Kept up to date with each round of work. Newest round first in "Done".

## The two versions

| Version | Where | Aircraft | Stratos |
|---|---|---|---|
| Web (phone and browser) | `web/`, built by `python tools/build_web.py` from the root files; never edit `web/` by hand | Fighter only | The only version for stratos.games |
| Full | repo root, `index.html` | Fighter, trainer, airliner, helicopter | Never on Stratos |

## Done

### Round 4f, 09-Nov-2026: fighter upgrade, phase 6 (cameras, gamepad, phone, polish)
- Cameras (computer buttons in CAMERA & VIEW): [,] fly-by (a fixed camera beside the path, moved on as the aircraft passes), [.] missile camera (follows your next missile, holds 2 s on the hit, then back), [/] replay of the last 20 s (game paused, camera circles the aircraft along its recorded path, [/] again stops; the aircraft comes back exactly where it was). The HUD hides in fly-by / missile camera.
- Gamepad, fighter in the air: Circle = fire selected store, L3 = weapon select, R3 = radar lock (hold = unlock), D-pad left/right = flares/chaff, Cross = gun; hold L1+R1: D-pad = manoeuvres 1-4, Square/Triangle/Circle/Cross = 5-8, Options = RTB. Master arm comes on by itself with the pad (as on phones). On the ground the old pad map is unchanged.
- Phone (symbols only, fighter): fire column is now 2 wide: missile, gun, bomb, flares + chaff, radar lock (tap = lock / next, hold = unlock), return to runway; the CCIP pipper shows on phones while bombs are left.
- Sound: RWR tones (phase 5), lock beeps, launch / release / flare / blast (phase 4) join the engine spool, afterburner roar, wind with speed, sonic boom and g-strain already there.
- window.skyforgeFps gives frames a second (console). Browser checks: fly-by, missile camera, replay and its return, no console errors.

### Round 4e, 09-Nov-2026: fighter upgrade, phase 5 (targets that fight back)
- src/combat/threats.js: TGT-AIR-03 weaving drone (3 g), TGT-AIR-04 jinking drone (5 g) that breaks and drops flares against missiles, BANDIT-1/2 enemy fighters (patrol, then lead-pursuit turn fight at 7 g, 2 heat seekers each, flares + break against your missiles), SAM-SITE-01 radar SAM (tracks 20 km, locks 12 km, fires 3 s after lock, 2 ready, reload 20 s; RADAR-SITE-02 search radar feeds it, without it 10 km), SAM-SITE-03 heat-seeking SAM (no warning until launch, inside 5 km below 3,000 m), TRUCK-1..3 convoy. All join the range list: radar sees them, every weapon hits them, they come back after 45 s.
- Enemy missiles fly the same missile physics (FighterWeapons.launchFrom); your flares fool heat seekers, chaff + flying across the line of sight fools radar SAMs.
- RWR on the HUD (both views): ring round the centre, S / F / M at their bearing, lock = amber diamond, missile = red flashing + big MISSILE; tones (new radar chirp, lock beeps, fast launch beeps); launch / hit / defeated messages.
- Damage (src/combat/damage.js): a hit takes 30-75 %; below 85 % smoke, below 60 % engine (60 % power, no afterburner), below 40 % fire and half control authority, 0 % = shot down (eject, crash scene). HUD DMG line.
- [H] / THREATS button: threats on (default) or off (targets only); threats only engage the fighter in the air.
- Tests (node tools/test_threats.mjs, 8 checks): bandit hits a straight-flying player 12/12; flares + 6 g break: 1 hit from 18 missiles; SAM quiet at 24 km and below 100 m, fires 3.0 s after lock; beaming with chaff 0 hits from 61 SAMs, doing nothing 19/20 hit; search radar sets SAM range; damage steps; flaring jinker hit 2/16 vs weaver 16/16; IR SAM envelope. Browser: bandit locked and fired, HUD MISSILE + RWR shown, a flare decoyed it; damage smoke/fire/ENG CTRL shown.
- Can be better: enemy fighters use simple point-mass flight (not the full flight model); no enemy guns.

### Round 4d, 09-Nov-2026: fighter upgrade, phase 4 (radar, all weapons, CCIP)
- Radar (src/combat/radar.js): 40 km, 60 deg either side of the nose, hills hide targets. T = lock the contact nearest the nose, T again = next, hold T = unlock; lock lost 2 s after the target leaves the radar's view. Track: range, closure, target speed, heading, aspect; lock tone.
- Weapons (src/combat/fighterWeapons.js), real numbers: gun 511 rounds at 6,000/min, 1,036 m/s + own speed, drag + gravity, tracer every 5th round; 2 heat seekers (growl, high tone on lock, 0.8-18 km, 2.5 s motor to Mach 2.6, PN N=4, 35 g, 8 m fuse, flares can decoy them); 2 radar missiles (radar lock, 2-50 km, datalink then own radar at 15 km, chaff can fool them); 4 Mk-82 bombs; 30 flares + 30 chaff in pairs.
- Keys: Space gun (held), F fire the selected store, Y weapon select (GUN > IR MSL > RDR MSL > MK82), K master arm (refused with weight on wheels), U flares, I chaff. Buttons for all of them in the FIGHTER group (SAFE/ARM, weapon, LOCK, GUN, REL, FLR, CHF).
- Stores hang on the wings (tip rails, outer and inner pylons) and disappear when fired; their weight, drag and slower roll (bombs) go into the flight model and fall as they are fired (full load 1,568 kg, +24 % parasite drag).
- HUD (src/hud/weaponsHud.js, both views): target box with range or an arrow to an off-screen target, IR seeker circle, missile range scale (max / no-escape / min, caret + closure), SHOOT cue, lock data, LCOS gun ring only when locked inside 1.5 km with the gun selected, CCIP pipper + bomb fall line + TTI (DLY when below the HUD), ARM/SAFE + weapon + what is left.
- Radar picture and stores page (src/hud/radarScope.js): small display bottom left of the 3D view on a computer (sized to fit under the miniature), and two new cockpit displays (5 in all: flight, radar, map, stores, engine).
- Effects (src/fx/ordnanceFx.js, pooled, one draw call per cloud): missile smoke trails and plume, flares with light and smoke, chaff glints, gun sparks and dust, bomb fireball, dust wall, shock ring, crater, 30 s smoke column; sounds for launch, release, flare pop, blast, lock beeps.
- Phones (layout unchanged): weapons arm themselves in the air, the radar locks what is ahead (30 deg, 15 km) as before, the missile button fires a radar missile on a lock or else a heat seeker.
- Tests (node tools/test_weapons.mjs, 9 checks): IR 39/39 and radar 39/39 hits on straight drones inside the launch zone, IR Mach 2.65, radar missile 50 km head-on at 9 km, flares + hard turn beat 27/30 IR missiles, chaff while beaming 24/30, 24 bombs land 0.00 m from CCIP, bomb kills a SAM 14 m away, gun 100 rounds/s and a burst kills a drone at 600 m, stores weight/arm rules, radar lock rules. Browser: IR missile destroyed TGT-AIR-01, a bomb landed 0.00 m from the pipper, no console errors. Flight tests still 35/35.
- Can be better: enemy flares, SAMs, RWR and damage come in phase 5; gamepad has only the gun so far (phase 6); missile camera in phase 6.

### Round 4c, 09-Nov-2026: fighter upgrade, phase 3 (return to base, overhead break, landing) + controls bar + flight-path miniature
- [9] (cockpit: G then 9) or the RTB button: the fighter turns back to the nearest runway and flies the overhead break pattern itself (src/flight/returnToBase.js): RTB (to 12 km out on the centre line, above the hills on the way), INITIAL (1,500 ft, 350 kt), BREAK (60 deg bank, idle), DOWNWIND (200 kt, gear down), BASE (descending half circle), FINAL (localizer + 3 deg glide slope, the fighter's approach speed of 160 kt), FLARE, ROLLOUT (power off, brakes, nose-wheel steering on the centre line). Already lined up on final: it carries straight on. Press 9 again or move the stick to take over.
- HUD: phase and runway on top (e.g. FINAL VOBL 09L), steering diamond to the RTB's next heading, ILS needles (localizer, glide slope) on final, AoA approach bracket by the flight path marker when the gear is down. The map shows the nearest runway (not the route planner's legs) during RTB.
- Computer (user, 09-Nov-2026): every button, tab and switch is shown in a bar BELOW the 3D view, so nothing covers the picture; new FIGHTER group (manoeuvres 1-8, RTB, limiter, gun, missile). Phones keep their own layout.
- Miniature 3D flight-path display, top left under the badge (src/hud/pathMini.js): last 3 minutes coloured like the ribbons, drop lines to the ground, the manoeuvre ghost dashed, the landing runway during RTB; it turns slowly. Click it: full 3D view for 5 s, then small again.
- ILS box moved under the moving map (the shorter 3D view had put it behind the map).
- Tests: 6 RTB landings from different start points, all on the centre line (within 2 m), 400-420 m past the threshold, 222-236 fpm, 153 kt, pitch under 11 deg; 35 checks in all pass. In the browser: RTB from a short final -> FINAL -> FLARE -> touchdown -> ROLLOUT with brakes, landing rated by the game (2 stars at the browser's ~1.5 FPS), full-screen miniature returned after 5 s, no console errors.

### Round 4b, 09-Nov-2026: fighter upgrade, phase 2 (aerobatics, ghost guide, flight-path visuals)
- Eight manoeuvres flown by an autopilot that moves the stick, rudder and throttle through the same flight physics (src/flight/maneuvers.js). Chase view: number keys 1-8. Cockpit view (numbers turn the head there): G, then the number.
  1 Loop, 2 Immelmann, 3 Split-S (needs 1,500 m), 4 Break 180 (turns towards the nearest runway), 5 Aileron roll, 6 Barrel roll (true helix), 7 Cuban eight, 8 Wingover.
- Loops fly a true constant-radius circle; the throttle manages the energy like a pilot, so the exit speed matches the entry.
- Entry checks: too slow or too low and the HUD shows e.g. LOOP SPD LOW and nothing starts.
- Moving the stick or rudder hands the aircraft back at once (HUD: MANUAL); the ghost and the score stay, so the pilot can finish it by hand.
- Ghost guide: the manoeuvre is flown ahead on a copy of the aircraft; its path is drawn as a faint line with rings about every 250 m (the next three bright, passed ones dim).
- Score 0-100 and stars on the HUD at the end: closeness to the ghost path, exit heading and exit height. Letting go half way through a loop scores 0.
- Flight-path visuals (src/fx/flightPath.js): wing-tip ribbons for the last 20 s (cyan normal, amber Mach 0.85-1.2, white above Mach 1.2, red above 5 g), fading near the camera; dots for the next 8 s of flight; contrails from both engines above 8,000 m.
- Wing vapour over the upper wing at high angle of attack in a hard pull low down; shock diamonds in a strong afterburner flame.
- Tests: 11 more checks (every manoeuvre's exit heading and height, g within 7.6, entry refusals, manual score), 29 in all, all pass. In the browser: aileron roll scored 99 with 3 stars, cockpit G+1, entry refusal and MANUAL hand-over checked; no console errors.
- Not done: the hammerhead (stall turn). This fighter has no thrust vectoring, and its rudder loses its grip near zero speed, so the physics cannot cartwheel it; 8 is the wingover instead. Heat haze behind the engines was left out (it needs a screen-distortion pass that is too heavy for phones).

### Round 4, 09-Nov-2026: fighter upgrade, phase 1 (flight model, g effects, HUD)
- Weight: the fighter gets lighter as fuel burns (full tanks = the old weight, so take-off is unchanged). A light fighter pulls more g and accelerates faster.
- Roll rate up to 240 deg/s at full stick (was 172).
- [O] switches the angle-of-attack limiter off and on. Off: full back stick takes the wing past the stall, a wing drops, and a held stall turns into a spin. Stick forward + opposite rudder recovers. HUD shows LIM OFF. Every new start puts it back on.
- G on the HUD is the real g the pilot feels (all forces except weight, along the seat), with MAX G for the flight.
- Pilot g over time (src/physics/pilotG.js): colour drains from about 6.5 g, tunnel vision near 8 g, blackout near 9 g after about 7 s, then G-LOC (6 s unconscious, controls dead) and 3 s coming round. Red-out below -2.5 g. Straining-breath sound above 5.5 g.
- New fighter HUD (src/hud/fighterHud.js), the same on the cockpit glass and full screen in the chase view: horizon, 5-degree pitch ladder (solid above, dashed below, ends bent towards the horizon, numbers both ends), zenith/nadir marks, gun cross, flight path marker, heading tape, speed tape with Mach and angle of attack, altitude tape (height above ground, R below 5,000 ft) with climb rate, G + MAX, power/AB, bank scale with pointer and angle, route/runway steering diamond, flashing STALL / OVSPD / FUEL. Dimmer at dusk. Phones get a smaller HUD (ladder every 10 deg, speed, altitude, G, Mach).
- Bug fixed: the cockpit HUD picture was never refreshed after its first frame (fighter).
- Same fix for the trainer, airliner and helicopter cockpit HUDs (user, 09-Nov-2026).
- Tests: `node tools/test_flight_model.mjs`, 18 checks against the formulas (turn rate and radius within 10 %, 9 g limit, roll rate, stall/spin/recovery, weight, Mach 1.2+, pilot g timings), all pass. `tools/validate_flight.py` still OK.

### Round 3, 04-Nov-2026: fighter to the limit
- New fighter model: grey paint, lofted body, intakes, tailplanes, real nozzles with a glow that follows power.
- Afterburner flame grows and dies smoothly. Thrust climbs on through the 70 % gate with no jump.
- Gear folds away after take-off and comes down below 300 ft.
- Vapor cone near Mach 1, white wing-tip trails above 4 g, sonic boom sound.
- Smooth transitions: nose and wings settle at touchdown instead of snapping; slow steady rotation for take-off; wave drag rises smoothly; chase camera follows loops and rolls at a limited rate with no flip at the top.
- On the ground it moves like any aircraft: small power taxis, power off coasts, nose-wheel steering is tight at taxi speed and gentle at speed, brakes stop it. Nothing moves at a standstill, and the nose lifts only near take-off speed.
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

## Waiting on the Stratos team

- Front-page hover clip: new clip made 04-Nov (`stratos-preview.mp4`, 480 x 300, 6 s, same format as the others). Sahariar or Sahil needs to put it in as `assets/previews/saiqulmodi-skyforge.mp4`, because makers cannot change that shared folder.
- Stratos team's reports on the fighter version.

## Can still be better

Most useful first. "Needs the user" means it cannot be finished from this computer alone.

0. **Feel at real frame rate (needs the user): g effects, full-screen HUD, aerobatics, the RTB flare (3 stars in the 120 Hz test, 2 stars in the 1.5 FPS test browser).** The test browser runs at about 1.5 FPS, so the g build-up was checked by the test clock, not by eye.
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
