import * as THREE from 'three';

export function createApproachLighting(scene, thresholdZ, direction = 1) {
  const lightGroup = new THREE.Group();
  const stationSpacing = 60;
  const stationsCount = 12;

  const stanchionMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const whiteGlowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const greenGlowMat = new THREE.MeshBasicMaterial({ color: 0x22ff44 });

  const threshBarGeo = new THREE.BoxGeometry(45, 0.4, 0.4);
  const threshBar = new THREE.Mesh(threshBarGeo, greenGlowMat);
  threshBar.position.set(0, 0.5, thresholdZ);
  lightGroup.add(threshBar);

  const strobes = [];

  for (let i = 1; i <= stationsCount; i++) {
    const zPos = thresholdZ + direction * (i * stationSpacing);
    const height = Math.min(2 + i * 0.5, 12);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, height), stanchionMat);
    pole.position.set(0, height / 2, zPos);
    lightGroup.add(pole);

    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 0.2), whiteGlowMat);
    crossBar.position.set(0, height, zPos);
    lightGroup.add(crossBar);

    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), whiteGlowMat.clone());
    strobe.position.set(0, height + 0.3, zPos);
    lightGroup.add(strobe);
    strobes.push(strobe);
  }

  scene.add(lightGroup);

  return {
    group: lightGroup,
    update: (timeMs) => {
      const cycleTime = 1000;
      const phase = (timeMs % cycleTime) / cycleTime;
      const activeIdx = Math.floor(phase * strobes.length);

      for (let s = 0; s < strobes.length; s++) {
        const isFiring = direction > 0 ? (strobes.length - 1 - s === activeIdx) : (s === activeIdx);
        strobes[s].material.color.setHex(isFiring ? 0xffffff : 0x222222);
      }
    }
  };
}
