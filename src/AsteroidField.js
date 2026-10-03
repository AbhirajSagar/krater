import * as THREE from 'three';

export class AsteroidField {
  /**
   * @param {THREE.Scene} scene
   * @param {number} count
   */
  constructor(scene, count = 120) {
    this.scene = scene;
    this.count = count;
    this.asteroids = [];

    // Create 3 asteroid mesh variants
    const geometries = [
      this.createAsteroidGeometry(1.0, 1),
      this.createAsteroidGeometry(1.4, 2),
      this.createAsteroidGeometry(2.2, 1)
    ];

    const material = new THREE.MeshStandardMaterial({
      color: 0x6e727e,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: true
    });

    const group = new THREE.Group();
    const spawnRadiusMin = 40;
    const spawnRadiusMax = 450;

    for (let i = 0; i < count; i++) {
      const geom = geometries[i % geometries.length];
      const mesh = new THREE.Mesh(geom, material);

      // Distribute in a ring/torus and scattered sphere around origin
      const angle = Math.random() * Math.PI * 2;
      const dist = spawnRadiusMin + Math.random() * (spawnRadiusMax - spawnRadiusMin);
      const height = (Math.random() - 0.5) * 120;

      mesh.position.set(
        Math.cos(angle) * dist,
        height,
        Math.sin(angle) * dist
      );

      // Random uniform/non-uniform scale
      const scale = 1.5 + Math.random() * 6.5;
      mesh.scale.set(
        scale * (0.8 + Math.random() * 0.4),
        scale * (0.8 + Math.random() * 0.4),
        scale * (0.8 + Math.random() * 0.4)
      );

      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Spin rate
      const rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      );

      group.add(mesh);
      this.asteroids.push({ mesh, rotSpeed });
    }

    this.scene.add(group);
  }

  createAsteroidGeometry(radius, detail) {
    const geom = new THREE.IcosahedronGeometry(radius, detail);
    const pos = geom.attributes.position;
    const v = new THREE.Vector3();

    // Perturb vertices deterministically for rocky crags and craters
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const noise = (Math.sin(v.x * 3.5) * Math.cos(v.y * 3.5) * Math.sin(v.z * 3.5)) * 0.35;
      v.multiplyScalar(1.0 + noise);
      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geom.computeVertexNormals();
    geom.computeBoundingSphere();
    return geom;
  }

  getMeshes() {
    return this.asteroids.map(a => a.mesh);
  }

  update(dt) {
    for (let i = 0; i < this.asteroids.length; i++) {
      const a = this.asteroids[i];
      a.mesh.rotation.x += a.rotSpeed.x * dt;
      a.mesh.rotation.y += a.rotSpeed.y * dt;
      a.mesh.rotation.z += a.rotSpeed.z * dt;
    }
  }
}
