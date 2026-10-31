# SkyForge - Navigation map + return-to-land route

STATUS: DONE

User asked on 2026-10-31: "a navigation map displaying the route to come back and land again".
(South India stage plan: stage 1 done 2a7c21b; stage 2 waits for the user's "go".)
World axes: -Z = east, +Z = west, -X = north, +X = south; heading = 90 - rot.y (deg). Runway 09L threshold z = +2000.

## Steps
- [x] src/nav/returnRoute.js - plan route after take-off: JOIN (beside the extended centreline, if needed) -> IF 11 km -> FAF 6 km (3 deg, ~1000 ft) -> RWY 09L threshold; waypoint sequencing, bearing / distance / turn / target altitude
- [x] src/nav/movingMap.js - north-up moving map overlay (corner, M = large/small): runways, terminals, Nandi Hills, NH44 + roads, city, route line, aircraft symbol, NEXT / BRG / DIST / ETA / ALT box
- [x] Cockpit: NAV MFD bearing needle + distance; HUD steering diamond + waypoint text
- [x] Keys: M map size, N re-plan; gamepad touchpad = map size
- [x] Test in browser, no console errors; commit "Navigation map with return-to-land route"; STATUS: DONE

## Log
- 2026-10-31: started.
- 2026-10-31: done. Route plans JOIN>IF>FAF>RW09L from the east, IF/FAF onward when already on the west centreline cone; sequences, completes on landing, re-plans after next take-off. Map (small/large, fits window), HUD diamond + text, NAV MFD needle verified in browser; no console errors. South India stage 2 still waits for go.
