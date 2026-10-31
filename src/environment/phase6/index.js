import { createNandiHills, nandiHeightAt } from './nandiHills.js';
import { createKempegowdaStructures, RUNWAY, runwayAt } from './voblAirport.js';
import { createApproachLighting } from './approachLights.js';
import { createNH44Expressway } from './nh44Expressway.js';
import { createBengaluruCity } from './bengaluruCity.js';

// Phase 6: real Bengaluru scenery around VOBL (see geo.js for the coordinate system)
export function initPhase6Environment(scene) {
  const nandiHills = createNandiHills(scene);
  const voblComplex = createKempegowdaStructures(scene);
  const malsr09L = createApproachLighting(scene, RUNWAY.halfLength, 1);   // approach to 09L from the west
  const malsr27R = createApproachLighting(scene, -RUNWAY.halfLength, -1); // approach to 27R from the east
  const expressway = createNH44Expressway(scene);
  const city = createBengaluruCity(scene);

  return {
    nandiHills,
    voblComplex,
    city,
    runway: RUNWAY,
    terrainHeight: nandiHeightAt, // m above the field at world x, z (Nandi Hills; plateau = 0)
    runwayAt,                     // runway name under a ground position, or null
    // timeMs: performance.now(); aircraftPos: world position (drives the PAPI lights)
    update: (timeMs, aircraftPos) => {
      malsr09L.update(timeMs);
      malsr27R.update(timeMs);
      expressway.update(timeMs * 0.001);
      voblComplex.update(aircraftPos);
    }
  };
}
