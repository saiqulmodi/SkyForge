import * as THREE from 'three';

export class AITrafficManager {
  constructor(scene) {
    this.scene = scene;
    this.aircraftList = [];
    this.initFleet();
  }

  initFleet() {
    // Shared low-poly airliner mesh representation
    const bodyGeo = new THREE.ConeGeometry(3, 24, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const wingGeo = new THREE.BoxGeometry(22, 0.4, 3.5);
    const finGeo = new THREE.BoxGeometry(0.4, 4, 3);
    finGeo.translate(0, 2, -9);

    const airlinerMat = new THREE.MeshStandardMaterial({ color: 0xefefef, roughness: 0.4 });

    // Spawn 2 AI circuits (Traffic 1 on 09L Left Pattern, Traffic 2 on 27R Right Pattern)
    const patterns = [
      { id: "AIC-412", startLeg: 0, runway: "09L", turnDir: -1, alt: 450, speed: 70 },
      { id: "AIC-805", startLeg: 2, runway: "27R", turnDir: 1,  alt: 600, speed: 75 }
    ];

    patterns.forEach((cfg, idx) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, airlinerMat);
      const wings = new THREE.Mesh(wingGeo, airlinerMat);
      const fin = new THREE.Mesh(finGeo, airlinerMat);
      group.add(body, wings, fin);

      const navLightGeo = new THREE.SphereGeometry(0.3, 4, 4);
      const portLight = new THREE.Mesh(navLightGeo, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      portLight.position.set(-11, 0, 0);
      const stbdLight = new THREE.Mesh(navLightGeo, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
      stbdLight.position.set(11, 0, 0);
      group.add(portLight, stbdLight);

      this.scene.add(group);

      this.aircraftList.push({
        id: cfg.id,
        mesh: group,
        leg: cfg.startLeg, // 0: Upwind, 1: Crosswind, 2: Downwind, 3: Base, 4: Final
        progress: idx * 0.4,
        speed: cfg.speed,
        patternAlt: cfg.alt,
        turnDir: cfg.turnDir, // -1: Left traffic, 1: Right traffic
        position: new THREE.Vector3(),
        heading: 0
      });
    });
  }

  update(deltaSec) {
    const rwyLength = 4000;
    const patternWidth = 2200;

    this.aircraftList.forEach(ac => {
      ac.progress += (ac.speed * deltaSec) / 4000;
      if (ac.progress >= 1.0) {
        ac.progress = 0;
        ac.leg = (ac.leg + 1) % 5;
      }

      const p = ac.progress;
      let x = 0, y = ac.patternAlt, z = 0, yaw = 0;

      // VOBL Runway 09L aligned along Z axis (0 to 4000)
      switch (ac.leg) {
        case 0: // Upwind / Departure climb
          x = 0;
          z = p * rwyLength;
          y = Math.min(ac.patternAlt, p * ac.patternAlt * 1.5);
          yaw = 0;
          break;
        case 1: // Crosswind leg
          x = ac.turnDir * (p * patternWidth);
          z = rwyLength + p * 800;
          yaw = ac.turnDir * (Math.PI / 2);
          break;
        case 2: // Downwind leg
          x = ac.turnDir * patternWidth;
          z = rwyLength - (p * (rwyLength + 1200));
          yaw = Math.PI;
          break;
        case 3: // Base leg
          x = ac.turnDir * (patternWidth * (1 - p));
          z = -1200 - p * 800;
          yaw = -ac.turnDir * (Math.PI / 2);
          break;
        case 4: // Final approach descent
          x = 0;
          z = -2000 + p * 2000;
          y = Math.max(10, (1 - p) * ac.patternAlt);
          yaw = 0;
          break;
      }

      ac.mesh.position.set(x, y, z);
      ac.mesh.rotation.set(0, yaw, 0);
      ac.position.copy(ac.mesh.position);
      ac.heading = THREE.MathUtils.radToDeg(yaw);
    });

    return this.aircraftList;
  }
}
