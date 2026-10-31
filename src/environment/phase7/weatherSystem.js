import * as THREE from 'three';

export class MonsoonWeather {
  constructor(scene) {
    this.scene = scene;
    this.cloudBaseAlt = 650;  // 650 m (~2,100 ft AGL)
    this.cloudTopsAlt = 2200; // 2,200 m (~7,200 ft AGL)
    this.rainRate = 0.85;     // 0 = dry, 1.0 = heavy tropical downpour

    this.initClouds();
    this.initPrecipitation();
  }

  initClouds() {
    const cloudLayerGeo = new THREE.PlaneGeometry(30000, 30000);
    cloudLayerGeo.rotateX(-Math.PI / 2);

    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0x8a9299,
      roughness: 1.0,
      transparent: true,
      opacity: 0.82,
      depthWrite: false
    });

    this.cloudBottom = new THREE.Mesh(cloudLayerGeo, this.cloudMat);
    this.cloudBottom.position.set(0, this.cloudBaseAlt, 0);

    this.cloudTop = new THREE.Mesh(cloudLayerGeo, this.cloudMat);
    this.cloudTop.position.set(0, this.cloudTopsAlt, 0);

    this.scene.add(this.cloudBottom, this.cloudTop);
  }

  initPrecipitation() {
    this.rainCount = 4000;
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 400;
      positions[i * 3 + 1] = Math.random() * 250;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0xbbd0e8,
      size: 0.9,
      transparent: true,
      opacity: 0.65
    });

    this.rainPoints = new THREE.Points(rainGeo, rainMat);
    this.scene.add(this.rainPoints);
  }

  update(aircraftPos, aircraftVelocity) {
    // Keep rain localized relative to aircraft position
    this.rainPoints.position.copy(aircraftPos);

    const pos = this.rainPoints.geometry.attributes.position;
    const speedDown = 35 * this.rainRate; // Terminal fall velocity

    for (let i = 0; i < this.rainCount; i++) {
      let y = pos.getY(i) - speedDown * 0.016;
      if (y < 0) y = 250;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;

    // Inside cloud deck fog/opacity density adjustment
    const inCloud = aircraftPos.y >= this.cloudBaseAlt && aircraftPos.y <= this.cloudTopsAlt;
    this.scene.fog = inCloud
      ? new THREE.FogExp2(0x8a9299, 0.008)
      : new THREE.FogExp2(0xa6b5c4, 0.00015);
  }
}
