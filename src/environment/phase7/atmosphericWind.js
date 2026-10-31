import * as THREE from 'three';

export class AtmosphereEngine {
  constructor() {
    // VOBL Monsoon pattern: SW Monsoon typical 240° at 16 kt, gusts to 28 kt
    this.windOriginDeg = 240; 
    this.baseSpeedKts = 16;
    this.gustSpeedKts = 10;
    
    // Wind vector in m/s (local world space: X = East, Z = South)
    this.windVector = new THREE.Vector3();
    this.gustNoise = 0;
  }

  update(timeSec, altitudeMeters) {
    // Altitude shear profile (logarithmic boundary layer up to 1000m)
    const altitudeFactor = Math.min(2.2, 0.4 + Math.log10(Math.max(1, altitudeMeters)) * 0.35);
    
    // Low-frequency Perlin-style gust variation
    this.gustNoise = Math.sin(timeSec * 0.4) * 0.6 + Math.sin(timeSec * 1.1) * 0.4;
    const currentSpeedKts = (this.baseSpeedKts + Math.max(0, this.gustNoise * this.gustSpeedKts)) * altitudeFactor;
    const speedMs = currentSpeedKts * 0.514444;

    const rad = THREE.MathUtils.degToRad(this.windOriginDeg);
    // Wind blows *from* windOriginDeg
    this.windVector.set(
      -Math.sin(rad) * speedMs,
      0,
      -Math.cos(rad) * speedMs
    );

    return {
      vector: this.windVector,
      speedKts: currentSpeedKts,
      gustDeltaKts: this.gustNoise * this.gustSpeedKts
    };
  }

  // Calculate HUD velocity vector drift given aircraft world velocity
  computeDriftAngle(aircraftVelocityVec) {
    const groundTrack = Math.atan2(aircraftVelocityVec.x, aircraftVelocityVec.z);
    const airTrack = Math.atan2(
      aircraftVelocityVec.x - this.windVector.x,
      aircraftVelocityVec.z - this.windVector.z
    );
    return groundTrack - airTrack; // Radians
  }
}
