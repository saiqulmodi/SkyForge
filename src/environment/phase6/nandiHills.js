import * as THREE from 'three';

export function createNandiHills(scene) {
  const width = 10000;
  const depth = 6000;
  const segmentsX = 64;
  const segmentsZ = 48;
  const geometry = new THREE.PlaneGeometry(width, depth, segmentsX, segmentsZ);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  const peakHeight = 550;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    const nx = x / (width * 0.5);
    const nz = z / (depth * 0.5);

    const ridgeProfile = Math.max(0, 1 - Math.sqrt(nx * nx * 0.7 + nz * nz * 2.2));
    const jagged = Math.sin(x * 0.003) * Math.cos(z * 0.004) * 45 +
                   Math.sin(x * 0.009 + z * 0.006) * 20;

    let elevation = Math.pow(ridgeProfile, 1.8) * peakHeight + (ridgeProfile > 0.1 ? jagged : 0);
    if (elevation < 0) elevation = 0;

    pos.setY(i, elevation);
  }

  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x4a4f44,
    roughness: 0.85,
    metalness: 0.1,
    flatShading: true
  });

  const nandiMesh = new THREE.Mesh(geometry, material);
  nandiMesh.position.set(-2500, 0, -25000);
  scene.add(nandiMesh);

  return nandiMesh;
}
