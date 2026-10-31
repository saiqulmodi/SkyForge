# SkyForge - South India travel, STAGE 2: large world, real terrain + coast

STATUS: DONE

User said "go" for stage 2 and "yes" (2026-10-31) to downloading 30 AWS Terrain Tiles (terrarium z7, x 90-94,
y 56-61, ~2-3 MB) into the scratchpad. Game must stay under 20 MB. Phased: finish stage 2, commit, wait for "go".
World: origin = VOBL runway 09L/27R centre, y = 0 = 915 m AMSL; -Z east, +Z west, -X north, +X south.

## Steps
- [x] Download tiles to scratchpad/terrain_tiles (data only), build assets/terrain/south_india.png (8-bit: 0 = sea, land = 1 + h/11 m) + JSON bounds; tools/build_heightmap.py kept in repo
- [x] src/world/terrain.js: load heightmap, heightAt(x, z) (world y), streamed chunks (20 km, ring around the aircraft), vertex colours, sea plane at y = -915, VOBL area flattened to y = 0, Nandi Hills detail kept
- [x] index.html: replace flat plateau with streamed terrain; ground contact = terrain height + gear (fixed-wing + rotorcraft); Phase 6 roads / city / lakes draped on terrain; credit line
- [x] Test: no console errors, FPS, take-off/landing at VOBL unchanged, fly over Ghats / coast screenshot, size check; commit "Stage 2: real South India terrain and coastline"; STATUS: DONE

## Log
- 2026-10-31: stage 2 started.
- 2026-10-31: stage 2 done. Heightmap 218 KB (1056x1104, ~1.16 km; VOBL 902 m, HYD 616, MAA 11, Ooty 2266). Streamed 24 km chunks (7x7), sea at y -915, VOBL flattened, Nandi detail on top. Altitudes now AMSL everywhere (VOBL 3,002 ft). Tests: 60 FPS at VOBL, landing NORMAL 281 fpm, heli settles on Ooty hills 2302 m, fighter into Nilgiris = TERRAIN IMPACT + reset, Chennai coast + Bay of Bengal, Mangaluru coast; no console errors. Waiting for go on stage 3 (airports).
