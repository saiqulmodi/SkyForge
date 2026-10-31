import { AITrafficManager } from './aiTrafficCircuit.js';
import { ILSSystem } from './ilsLocalizerGlide.js';
import { WaypointNavigator } from './sidWaypoints.js';

export function initPhase8Navigation(scene) {
  const traffic = new AITrafficManager(scene);
  const ils = new ILSSystem();
  const navigation = new WaypointNavigator();

  return {
    traffic,
    ils,
    navigation,
    update: (deltaSec, aircraftPos) => {
      const activeTraffic = traffic.update(deltaSec);
      const ilsGuidance = ils.computeGuidance(aircraftPos);
      const navStatus = navigation.update(aircraftPos);

      return {
        traffic: activeTraffic,
        ils: ilsGuidance,
        nav: navStatus
      };
    }
  };
}
