import { AtmosphereEngine } from './atmosphericWind.js';
import { MonsoonWeather } from './weatherSystem.js';
import { RunwayFrictionModel } from './surfaceFriction.js';

export function initPhase7Weather(scene) {
  const atmosphere = new AtmosphereEngine();
  const weather = new MonsoonWeather(scene);
  const friction = new RunwayFrictionModel();

  return {
    atmosphere,
    weather,
    friction,
    update: (timeSec, aircraftPos, aircraftVelocity) => {
      const windState = atmosphere.update(timeSec, aircraftPos.y);
      weather.update(aircraftPos, aircraftVelocity);
      return windState;
    }
  };
}
