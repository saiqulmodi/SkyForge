import * as THREE from 'three';

export class TargetDroneManager {
  constructor(scene) {
    this.scene = scene;
    this.targets = [];
    this.initTargets();
  }

  initTargets() {
    // 1. Airborne Aerial Target Drones (North-East training range)
    const droneGeo = new THREE.ConeGeometry(1.8, 8, 6);
    droneGeo.rotateX(Math.PI / 2);
    const droneMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.5 });

    const droneConfigs = [
      { id: "TGT-AIR-01", pos: new THREE.Vector3(6000, 1800, -12000), speed: 180, heading: 45 },
      { id: "TGT-AIR-02", pos: new THREE.Vector3(-4000, 2400, -18000), speed: 210, heading: 220 }
    ];

    droneConfigs.forEach(cfg => {
      const mesh = new THREE.Mesh(droneGeo, droneMat);
      mesh.position.copy(cfg.pos);
      this.scene.add(mesh);

      this.targets.push({
        id: cfg.id,
        type: 'AIR',
        mesh: mesh,
        position: mesh.position,
        velocity: new THREE.Vector3(
          Math.sin(THREE.MathUtils.degToRad(cfg.heading)) * cfg.speed,
          0,
          Math.cos(THREE.MathUtils.degToRad(cfg.heading)) * cfg.speed
        ),
        hitRadius: 8.0,
        isDestroyed: false,
        health: 100
      });
    });

    // 2. Ground Threat Emplacements (Granite Ridge outpost north)
    const bunkerGeo = new THREE.CylinderGeometry(8, 12, 6, 8);
    const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x555a50, roughness: 0.9 });
    const groundTargets = [
      { id: "SAM-SITE-01", pos: new THREE.Vector3(-2200, 280, -22000) },
      { id: "RADAR-SITE-02", pos: new THREE.Vector3(-1800, 520, -24500) }
    ];

    groundTargets.forEach(cfg => {
      const mesh = new THREE.Mesh(bunkerGeo, bunkerMat);
      mesh.position.copy(cfg.pos);
      this.scene.add(mesh);

      this.targets.push({
        id: cfg.id,
        type: 'GROUND',
        mesh: mesh,
        position: mesh.position,
        velocity: new THREE.Vector3(0, 0, 0),
        hitRadius: 12.0,
        isDestroyed: false,
        health: 200
      });
    });
  }

  update(deltaSec) {
    this.targets.forEach(t => {
      if (t.isDestroyed) return;

      if (t.type === 'AIR') {
        t.position.addScaledVector(t.velocity, deltaSec);
        t.mesh.position.copy(t.position);
        t.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), t.velocity.clone().normalize());

        // Boundary rebound inside 30km sector
        if (Math.abs(t.position.x) > 15000) t.velocity.x *= -1;
        if (t.position.z < -30000 || t.position.z > -5000) t.velocity.z *= -1;
      }
    });

    return this.targets.filter(t => !t.isDestroyed);
  }
}
