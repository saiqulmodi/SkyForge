import * as THREE from 'three';

export class ILSSystem {
  constructor() {
    // VOBL Runway 09L Localizer & Glide Path Antennas
    this.rwy09L = {
      threshold: new THREE.Vector3(0, 0, 0),
      headingDeg: 90,
      runwayVector: new THREE.Vector3(1, 0, 0), // Pointing East along +X
      locWidthDeg: 5.0,  // Full scale ±2.5°
      gsAngleDeg: 3.0,   // Standard 3° glideslope
      gsWidthDeg: 1.4    // Full scale ±0.7°
    };
  }

  // Calculate normalized deviation dots: -1.0 to +1.0 (Full scale needle)
  computeGuidance(aircraftPos) {
    const relPos = aircraftPos.clone().sub(this.rwy09L.threshold);

    // Distance outbound along runway centerline
    const distAlongCenterline = -relPos.x; // Inbound toward +X
    const lateralOffset = relPos.z;        // Lateral error (North/South)
    const altitudeAGL = relPos.y;

    if (distAlongCenterline < 100 || distAlongCenterline > 35000) {
      return { inRange: false, locDeviation: 0, gsDeviation: 0, dmeKm: 0 };
    }

    // 1. Localizer Angular Deviation
    const locAngleDeg = THREE.MathUtils.radToDeg(Math.atan2(lateralOffset, distAlongCenterline));
    const locDeviation = THREE.MathUtils.clamp(locAngleDeg / (this.rwy09L.locWidthDeg / 2), -1.0, 1.0);

    // 2. Glideslope Angular Deviation
    const currentSlopeDeg = THREE.MathUtils.radToDeg(Math.atan2(altitudeAGL, distAlongCenterline));
    const gsAngleDiff = currentSlopeDeg - this.rwy09L.gsAngleDeg;
    const gsDeviation = THREE.MathUtils.clamp(gsAngleDiff / (this.rwy09L.gsWidthDeg / 2), -1.0, 1.0);

    const dmeKm = aircraftPos.distanceTo(this.rwy09L.threshold) / 1000;

    return {
      inRange: true,
      locDeviation: -locDeviation, // Fly-right / Fly-left command
      gsDeviation: -gsDeviation,   // Fly-up / Fly-down command
      dmeKm: parseFloat(dmeKm.toFixed(1))
    };
  }
}
