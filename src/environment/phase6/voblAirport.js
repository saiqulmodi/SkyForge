import * as THREE from 'three';

export function createKempegowdaStructures(scene) {
  const airportGroup = new THREE.Group();

  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xc8c8c4, roughness: 0.7 });
  const terminalGlass = new THREE.MeshStandardMaterial({ color: 0x3a6073, roughness: 0.2, metalness: 0.8 });
  const roofCopperMat = new THREE.MeshStandardMaterial({ color: 0x937047, roughness: 0.5 });
  const towerShaftMat = new THREE.MeshStandardMaterial({ color: 0xe2e2dc, roughness: 0.4 });

  // 1. VOBL ATC Tower (65m tall)
  const towerShaftGeo = new THREE.CylinderGeometry(4.5, 6.0, 56, 16);
  const towerShaft = new THREE.Mesh(towerShaftGeo, towerShaftMat);
  towerShaft.position.set(400, 28, 450);

  const cabGeo = new THREE.CylinderGeometry(8.5, 6.0, 9, 8);
  const cabMesh = new THREE.Mesh(cabGeo, terminalGlass);
  cabMesh.position.set(400, 58, 450);

  const domeGeo = new THREE.SphereGeometry(3.5, 12, 12);
  const domeMesh = new THREE.Mesh(domeGeo, concreteMat);
  domeMesh.position.set(400, 64, 450);

  airportGroup.add(towerShaft, cabMesh, domeMesh);

  // 2. Terminal 1 Concourse (Curved Barrel Vault)
  const t1Width = 450;
  const t1Depth = 90;
  const t1Height = 22;
  const t1Body = new THREE.Mesh(
    new THREE.BoxGeometry(t1Width, t1Height, t1Depth),
    concreteMat
  );
  t1Body.position.set(700, t1Height / 2, 600);

  const t1Roof = new THREE.Mesh(
    new THREE.CylinderGeometry(t1Depth * 0.7, t1Depth * 0.7, t1Width, 16, 1, false, 0, Math.PI),
    roofCopperMat
  );
  t1Roof.rotation.z = Math.PI / 2;
  t1Roof.position.set(700, t1Height, 600);
  airportGroup.add(t1Body, t1Roof);

  // 3. Terminal 2 ("Garden Concourse" Pavilion Layout)
  const t2Width = 520;
  const t2Depth = 130;
  const t2Height = 26;
  const t2Body = new THREE.Mesh(
    new THREE.BoxGeometry(t2Width, t2Height, t2Depth),
    terminalGlass
  );
  t2Body.position.set(1350, t2Height / 2, 620);

  const t2Canopy = new THREE.Mesh(
    new THREE.BoxGeometry(t2Width + 40, 2.5, t2Depth + 30),
    roofCopperMat
  );
  t2Canopy.position.set(1350, t2Height + 1.25, 620);
  airportGroup.add(t2Body, t2Canopy);

  // 4. Hangars
  for (let i = 0; i < 3; i++) {
    const hangar = new THREE.Mesh(
      new THREE.CylinderGeometry(30, 30, 80, 16, 1, false, 0, Math.PI),
      concreteMat
    );
    hangar.rotation.z = Math.PI / 2;
    hangar.position.set(-300 + i * 95, 0, 480);
    airportGroup.add(hangar);
  }

  scene.add(airportGroup);
  return airportGroup;
}
