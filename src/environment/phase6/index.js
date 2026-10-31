import { createNandiHills } from './nandiHills.js';
import { createKempegowdaStructures } from './voblAirport.js';
import { createApproachLighting } from './approachLights.js';
import { createNH44Expressway } from './nh44Expressway.js';

export function initPhase6Environment(scene) {
  const nandiHills = createNandiHills(scene);
  const voblComplex = createKempegowdaStructures(scene);
  const malsr09L = createApproachLighting(scene, 0, -1);
  const malsr27R = createApproachLighting(scene, 4000, 1);
  const expressway = createNH44Expressway(scene);

  return {
    nandiHills,
    voblComplex,
    update: (timeMs) => {
      const timeSec = timeMs * 0.001;
      malsr09L.update(timeMs);
      malsr27R.update(timeMs);
      expressway.update(timeSec);
    }
  };
}
