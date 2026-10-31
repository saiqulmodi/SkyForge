import * as THREE from 'three';

export function createNH44Expressway(scene) {
  const roadGroup = new THREE.Group();
  const roadLength = 12000;
  const roadWidth = 28;

  const deckGeo = new THREE.BoxGeometry(roadWidth, 1.2, roadLength);
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x2b2d2f, roughness: 0.9 });
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.set(-2800, 10, -5000);
  roadGroup.add(deck);

  const pierGeo = new THREE.CylinderGeometry(1.4, 1.4, 10, 8);
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.8 });

  for (let z = -roadLength / 2; z <= roadLength / 2; z += 80) {
    const pier = new THREE.Mesh(pierGeo, pierMat);
    pier.position.set(-2800, 5, -5000 + z);
    roadGroup.add(pier);
  }

  const carCount = 120;
  const trafficGeo = new THREE.SphereGeometry(0.4, 4, 4);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff0aa });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });

  const southLanes = new THREE.InstancedMesh(trafficGeo, headMat, carCount);
  const northLanes = new THREE.InstancedMesh(trafficGeo, tailMat, carCount);

  const dummy = new THREE.Object3D();
  const carOffsets = Array.from({ length: carCount }, () => Math.random() * roadLength);

  roadGroup.add(southLanes, northLanes);
  scene.add(roadGroup);

  return {
    update: (timeSec) => {
      const speed = 25;
      for (let i = 0; i < carCount; i++) {
        const zSouth = -5000 - roadLength / 2 + ((carOffsets[i] + timeSec * speed) % roadLength);
        dummy.position.set(-2800 + 4 + (i % 2) * 4, 10.8, zSouth);
        dummy.updateMatrix();
        southLanes.setMatrixAt(i, dummy.matrix);

        const zNorth = -5000 + roadLength / 2 - ((carOffsets[i] + timeSec * speed * 1.1) % roadLength);
        dummy.position.set(-2800 - 4 - (i % 2) * 4, 10.8, zNorth);
        dummy.updateMatrix();
        northLanes.setMatrixAt(i, dummy.matrix);
      }
      southLanes.instanceMatrix.needsUpdate = true;
      northLanes.instanceMatrix.needsUpdate = true;
    }
  };
}
