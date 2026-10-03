import * as THREE from 'three';

export class SpaceDust {
  /**
   * @param {THREE.Scene} scene
   * @param {number} count
   * @param {number} fieldRadius
   */
  constructor(scene, count = 2000, fieldRadius = 180) {
    this.scene = scene;
    this.count = count;
    this.radius = fieldRadius;

    this.positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this.positions[i * 3 + 0] = (Math.random() - 0.5) * fieldRadius * 2;
      this.positions[i * 3 + 1] = (Math.random() - 0.5) * fieldRadius * 2;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * fieldRadius * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    // Custom shader for stardust particles with soft circular falloff
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xb0d4ff) }
      },
      vertexShader: `
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 2.2 * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist) * 0.7;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(geometry, this.material);
    this.scene.add(this.points);
  }

  /**
   * Keep dust centered around player position so field is infinite
   * @param {THREE.Vector3} playerPos
   */
  update(playerPos) {
    const posAttr = this.points.geometry.attributes.position;
    const r = this.radius;
    const r2 = r * 2;

    for (let i = 0; i < this.count; i++) {
      let x = posAttr.getX(i);
      let y = posAttr.getY(i);
      let z = posAttr.getZ(i);

      // Wrap coordinate around player position
      while (x < playerPos.x - r) x += r2;
      while (x > playerPos.x + r) x -= r2;

      while (y < playerPos.y - r) y += r2;
      while (y > playerPos.y + r) y -= r2;

      while (z < playerPos.z - r) z += r2;
      while (z > playerPos.z + r) z -= r2;

      posAttr.setXYZ(i, x, y, z);
    }

    posAttr.needsUpdate = true;
  }
}
