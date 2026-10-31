import * as THREE from 'three';

export class WeaponsSystem {
  constructor(scene) {
    this.scene = scene;
    this.bullets = [];
    this.missiles = [];

    // Vulcan 20mm Tracer Specs
    this.bulletSpeed = 1050; // m/s (~Mach 3.1)
    this.bulletLife = 2.5;   // Seconds before tracer burn-out

    // Tracer visual geometry
    const bulletGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 4);
    bulletGeo.rotateX(Math.PI / 2);
    this.bulletMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });

    // Missile visual geometry
    this.missileGeo = new THREE.CylinderGeometry(0.18, 0.18, 3.6, 6);
    this.missileGeo.rotateX(Math.PI / 2);
    this.missileMat = new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.3 });
  }

  fireCannon(muzzlePos, aircraftVel, forwardDir) {
    const mesh = new THREE.Mesh(this.bulletGeo, this.bulletMat);
    mesh.position.copy(muzzlePos);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forwardDir);
    this.scene.add(mesh);

    const muzzleVelocity = forwardDir.clone().multiplyScalar(this.bulletSpeed).add(aircraftVel);

    this.bullets.push({
      mesh: mesh,
      position: mesh.position,
      velocity: muzzleVelocity,
      life: this.bulletLife
    });
  }

  launchMissile(railPos, aircraftVel, forwardDir, lockedTarget) {
    const mesh = new THREE.Mesh(this.missileGeo, this.missileMat);
    mesh.position.copy(railPos);
    this.scene.add(mesh);

    this.missiles.push({
      mesh: mesh,
      position: mesh.position,
      velocity: forwardDir.clone().multiplyScalar(300).add(aircraftVel),
      target: lockedTarget,
      thrust: 650, // m/s^2 acceleration
      maxSpeed: 1200,
      life: 8.0
    });
  }

  update(deltaSec) {
    // 1. Advance Cannon Shells
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= deltaSec;
      b.velocity.y -= 9.81 * deltaSec; // Ballistic gravity drop
      b.position.addScaledVector(b.velocity, deltaSec);
      b.mesh.position.copy(b.position);

      if (b.life <= 0 || b.position.y <= 0) {
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
      }
    }

    // 2. Advance Guided Missiles
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= deltaSec;

      if (m.target && !m.target.isDestroyed) {
        // Proportional navigation intercept steering
        const desiredDir = m.target.position.clone().sub(m.position).normalize();
        m.velocity.lerp(desiredDir.multiplyScalar(m.maxSpeed), deltaSec * 4.5);
      }

      m.position.addScaledVector(m.velocity, deltaSec);
      m.mesh.position.copy(m.position);
      m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), m.velocity.clone().normalize());

      if (m.life <= 0 || m.position.y <= 0) {
        this.scene.remove(m.mesh);
        this.missiles.splice(i, 1);
      }
    }

    return { bullets: this.bullets, missiles: this.missiles };
  }
}
