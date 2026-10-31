import * as THREE from 'three';

export function createFighter() {
  const fighterGroup = new THREE.Group();
  fighterGroup.name = "stealth_fighter";

  // Materials
  const radarAbsorbentMat = new THREE.MeshStandardMaterial({
    color: 0x24282f,
    roughness: 0.45,
    metalness: 0.65,
    flatShading: true
  });

  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x997722, // Gold tinted radar-reflective bubble
    metalness: 0.9,
    roughness: 0.1,
    transmission: 0.7,
    transparent: true,
    opacity: 0.85
  });

  const burnerMat = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.0
  });

  // 1. Chiseled Stealth Fuselage
  const fuselageGeo = new THREE.ConeGeometry(1.4, 11, 6);
  fuselageGeo.rotateX(Math.PI / 2);
  fuselageGeo.scale(1.2, 0.45, 1.0);
  const fuselage = new THREE.Mesh(fuselageGeo, radarAbsorbentMat);
  fuselage.position.set(0, 0, 0);
  fighterGroup.add(fuselage);

  // 2. Cockpit Canopy Bubble
  const canopyGeo = new THREE.SphereGeometry(0.65, 16, 12);
  canopyGeo.scale(0.7, 0.65, 2.8);
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.set(0, 0.45, 1.2);
  fighterGroup.add(canopy);

  // 3. Diamond Delta Main Wings with Chines
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 2.5);       // Apex / chine start
  wingShape.lineTo(4.8, -2.5);     // Wingtip
  wingShape.lineTo(3.8, -4.0);     // Trailing edge tip
  wingShape.lineTo(0.9, -3.4);     // Inboard root
  wingShape.lineTo(-0.9, -3.4);    // Inboard root left
  wingShape.lineTo(-3.8, -4.0);    // Trailing edge tip left
  wingShape.lineTo(-4.8, -2.5);    // Wingtip left
  wingShape.closePath();

  const extrudeSettings = { depth: 0.12, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.05, bevelThickness: 0.04 };
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
  wingGeo.rotateX(Math.PI / 2);
  const wings = new THREE.Mesh(wingGeo, radarAbsorbentMat);
  wings.position.set(0, 0.05, 0);
  fighterGroup.add(wings);

  // 4. TWIN OUTWARD-CANTED RUDDERS / VERTICAL STABILIZERS (-22 deg outward cant)
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0.9, 1.8);
  finShape.lineTo(0.3, 1.8);
  finShape.lineTo(-0.7, 0);
  finShape.closePath();

  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.06, bevelEnabled: false });

  // Left Vertical Stabilizer (canted left)
  const leftFin = new THREE.Mesh(finGeo, radarAbsorbentMat);
  leftFin.position.set(-1.15, 0.15, -2.8);
  leftFin.rotation.z = 0.38; // ~22 degrees outward cant
  fighterGroup.add(leftFin);

  // Right Vertical Stabilizer (canted right)
  const rightFin = new THREE.Mesh(finGeo, radarAbsorbentMat);
  rightFin.position.set(1.15, 0.15, -2.8);
  rightFin.rotation.z = -0.38; // ~22 degrees outward cant
  fighterGroup.add(rightFin);

  // 5. Twin Reheat Afterburner Cones
  const abGeo = new THREE.ConeGeometry(0.35, 1.6, 12);
  abGeo.rotateX(-Math.PI / 2);

  const leftAB = new THREE.Mesh(abGeo, burnerMat);
  leftAB.position.set(-0.55, 0.0, -5.2);
  const rightAB = new THREE.Mesh(abGeo, burnerMat);
  rightAB.position.set(0.55, 0.0, -5.2);

  fighterGroup.add(leftAB);
  fighterGroup.add(rightAB);

  return {
    mesh: fighterGroup,
    type: 'fighter',
    cockpitOffset: new THREE.Vector3(0, 0.48, 1.35), // Pilot eye location inside canopy
    afterburners: [leftAB, rightAB],
    update: function(throttle) {
      // Light up reheat cones past 70% throttle
      const abIntensity = throttle > 0.7 ? (throttle - 0.7) / 0.3 : 0.0;
      burnerMat.opacity = abIntensity * 0.9;
    }
  };
}
