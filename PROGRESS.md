# SkyForge - Prompt 1: FleetManager (4 switchable aircraft)

STATUS: DONE

User asked on 2026-10-31: "now do prompt 1 fleet manager". Prompt 2 (3D cockpit) is already committed (bfbb097).
The page runs the inline module in index.html (src/main.js is NOT loaded). Keep the inline flight feel:
same numbers for trainer and fighter, only moved into each aircraft's profile. Keep the 3D cockpit,
C view toggle, glance keys 1-8, mouse-look, throttle and flight keys working. No new npm packages.

## Steps (tick each when finished and verified)
- [x] STEP 1 - common contract: createTrainer() in trainer.js (wraps buildMilitaryTrainer), createFighter() in fighter.js returns contract (keeps look, +-22 deg fins, afterburner plume); contract = { id, name, mesh, profile, cockpitOffset, chaseOffset, update(dt, flightState), dispose() }
- [x] STEP 2 - new src/aircraft/airliner.js (high-wing cargo, 4 turbofans, T-tail, ramp on R below 150 kt) and src/aircraft/helicopter.js (tandem cockpit, 4-blade rotor spin follows rotor RPM, tail rotor, stub-wing pylons); aero.js separate rotorcraft branch (collective lift, cyclic disc tilt, pedals yaw, stable hover)
- [x] STEP 3 - src/aircraft/FleetManager.js: registry, switchTo(id) (airborne keeps pos/heading/speed, ground resets to 09L threshold), dispose old, push profile into aero.js, cockpit/chase offsets, keep view mode, dispatch 'aircraftchanged'
- [x] STEP 4 - wire the 4 bottom buttons, active highlight, start on Trainer
- [x] DONE CHECK - zero console errors, 20 swaps -> renderer.info.memory.geometries not growing, heli hovers, C works on all 4; git add . ; git commit -m "FleetManager: 4 switchable aircraft"; set STATUS: DONE

## Log
- 2026-10-31: started Prompt 1; routine SkyForge_AutoContinue re-enabled.
- 2026-10-31: done in one session. Browser: 4 aircraft swap with no console errors; 20 swaps -> geometries cycle back to 79 (no growth); heli holds ~158 ft at 71 % collective; airborne swap kept altitude; ramp opens only < 150 kt; C works on all 4. FPS 20-30 on this laptop (JS 2.7 ms/frame, GPU-bound). Committed; routine disabled.
