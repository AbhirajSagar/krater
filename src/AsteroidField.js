import * as THREE from 'three';
import { sounds } from './SoundManager.js';

// Reusable static calculation vectors to eliminate garbage collection in collision loops
const _seg = new THREE.Vector3();
const _v = new THREE.Vector3();
const _closest = new THREE.Vector3();

export class AsteroidField {
  /**
   * High-performance, zero-allocation asteroid field with pre-pooled debris & shockwaves
   * @param {THREE.Scene} scene
   * @param {number} count
   */
  constructor(scene, count = 450) {
    this.scene = scene;
    this.count = count;
    this.asteroids = [];
    this.group = new THREE.Group();

    // 1. Pre-create 3 main asteroid geometry variants with computed bounding spheres
    this.geometries = [
      this.createAsteroidGeometry(1.0, 1),
      this.createAsteroidGeometry(1.4, 2),
      this.createAsteroidGeometry(2.2, 1)
    ];

    // 2. Pre-create 3 fragment geometry variants for smaller pieces
    this.fragmentGeometries = [
      this.createAsteroidGeometry(0.45, 0),
      this.createAsteroidGeometry(0.65, 1),
      this.createAsteroidGeometry(0.85, 0)
    ];

    // 3. Shared rock materials (only 3 materials total = instant rendering, zero shader recompiles)
    this.rockMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x6e727e, roughness: 0.85, metalness: 0.15, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x5e636f, roughness: 0.88, metalness: 0.12, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x7a7775, roughness: 0.82, metalness: 0.18, flatShading: true })
    ];

    this.fragmentMaterial = new THREE.MeshStandardMaterial({
      color: 0x585c66,
      roughness: 0.90,
      metalness: 0.10,
      flatShading: true
    });

    // 4. Pre-allocated Explosion Sparks particle buffer (1 draw call, zero runtime allocations)
    this.setupSparks();

    // 5. Pre-allocated Shockwave Ring pool (8 rings)
    this.setupShockwaves();

    // 6. Pre-allocated Fragment pool (48 fragments ready in scene, zero runtime allocations)
    this.setupFragmentPool(48);

    this.onAsteroidDestroyed = null;

    // 7. Populate initial asteroids
    const spawnRadiusMin = 40;
    const spawnRadiusMax = 450;
    const baseRadii = [1.0, 1.4, 2.2];

    for (let i = 0; i < count; i++) {
      const geomIdx = i % this.geometries.length;
      const geom = this.geometries[geomIdx];
      const baseRadius = baseRadii[geomIdx];
      const mat = this.rockMaterials[i % this.rockMaterials.length];

      const mesh = new THREE.Mesh(geom, mat);

      const angle = Math.random() * Math.PI * 2;
      const dist = spawnRadiusMin + Math.random() * (spawnRadiusMax - spawnRadiusMin);
      const height = (Math.random() - 0.5) * 120;

      mesh.position.set(
        Math.cos(angle) * dist,
        height,
        Math.sin(angle) * dist
      );

      const scale = 1.5 + Math.random() * 6.5;
      const sx = scale * (0.8 + Math.random() * 0.4);
      const sy = scale * (0.8 + Math.random() * 0.4);
      const sz = scale * (0.8 + Math.random() * 0.4);
      mesh.scale.set(sx, sy, sz);

      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      );

      const maxScale = Math.max(sx, sy, sz);
      const avgScale = (sx + sy + sz) / 3;
      const effectiveRadius = baseRadius * avgScale;
      const boundingRadius = baseRadius * maxScale * 1.15;

      // Required laser hits directly proportional to the size of the asteroid
      const maxHealth = Math.max(1, Math.round(effectiveRadius * 0.75));

      this.group.add(mesh);

      this.asteroids.push({
        mesh,
        rotSpeed,
        effectiveRadius,
        boundingRadius,
        boundingRadiusSq: boundingRadius * boundingRadius,
        maxHealth,
        health: maxHealth,
        isDestroyed: false
      });
    }

    this.scene.add(this.group);
    this._cachedMeshes = [];
    this._meshesNeedUpdate = true;
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

  setupSparks() {
    this.maxSparks = 600;
    this.sparkCursor = 0;
    this.sparkPositions = new Float32Array(this.maxSparks * 3);
    this.sparkVelocities = new Float32Array(this.maxSparks * 3);
    this.sparkLifetimes = new Float32Array(this.maxSparks);
    this.sparkMaxLifetimes = new Float32Array(this.maxSparks);
    this.sparkSizes = new Float32Array(this.maxSparks);
    this.sparkAlphas = new Float32Array(this.maxSparks);
    this.sparkColors = new Float32Array(this.maxSparks * 3);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(this.sparkSizes, 1));
    geom.setAttribute('alpha', new THREE.BufferAttribute(this.sparkAlphas, 1));
    geom.setAttribute('color', new THREE.BufferAttribute(this.sparkColors, 3));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute float alpha;
        attribute vec3 color;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vAlpha = alpha;
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (260.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord) * 2.0;
          if (dist > 1.0) discard;
          float core = exp(-dist * dist * 4.0);
          gl_FragColor = vec4(vColor, vAlpha * core);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.sparkPoints = new THREE.Points(geom, mat);
    this.scene.add(this.sparkPoints);
  }

  setupShockwaves() {
    this.maxShockwaves = 8;
    this.shockwaves = [];
    const ringGeom = new THREE.RingGeometry(0.85, 1.0, 24);

    const mat = new THREE.MeshBasicMaterial({
      color: 0xff6618,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    for (let i = 0; i < this.maxShockwaves; i++) {
      const mesh = new THREE.Mesh(ringGeom, mat);
      mesh.visible = false;
      this.scene.add(mesh);

      this.shockwaves.push({
        mesh,
        mat,
        active: false,
        life: 0,
        maxLife: 0.32,
        maxScale: 1.0
      });
    }
  }

  /**
   * Pre-allocates all fragment debris meshes in the scene to completely prevent runtime allocations
   * @param {number} size
   */
  setupFragmentPool(size = 48) {
    this.maxFragments = size;
    this.fragmentPool = [];
    this.fragmentCursor = 0;

    for (let i = 0; i < size; i++) {
      const geom = this.fragmentGeometries[i % this.fragmentGeometries.length];
      const mesh = new THREE.Mesh(geom, this.fragmentMaterial);
      mesh.visible = false;
      mesh.castShadow = false; // Disable shadow map pass on tiny debris for high FPS
      mesh.receiveShadow = false;

      this.group.add(mesh);

      this.fragmentPool.push({
        mesh,
        velocity: new THREE.Vector3(),
        rotSpeed: new THREE.Vector3(),
        active: false,
        effectiveRadius: 1.0,
        boundingRadius: 1.0,
        boundingRadiusSq: 1.0,
        baseScale: 1.0,
        health: 1,
        life: 0.0,
        maxLife: 10.0
      });
    }
  }

  spawnImpactSparks(hitPoint, colorHex = '#ff2244') {
    const col = new THREE.Color(colorHex);
    const count = 12;
    for (let c = 0; c < count; c++) {
      const idx = this.sparkCursor;
      const i3 = idx * 3;

      this.sparkPositions[i3 + 0] = hitPoint.x;
      this.sparkPositions[i3 + 1] = hitPoint.y;
      this.sparkPositions[i3 + 2] = hitPoint.z;

      const speed = 12.0 + Math.random() * 24.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      this.sparkVelocities[i3 + 0] = Math.sin(phi) * Math.cos(theta) * speed;
      this.sparkVelocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      this.sparkVelocities[i3 + 2] = Math.cos(phi) * speed;

      this.sparkLifetimes[idx] = 0.0;
      this.sparkMaxLifetimes[idx] = 0.20 + Math.random() * 0.20;
      this.sparkSizes[idx] = 1.0 + Math.random() * 0.8;
      this.sparkAlphas[idx] = 1.0;

      const cMix = col.clone().lerp(new THREE.Color(1, 1, 1), Math.random() * 0.7);
      this.sparkColors[i3 + 0] = cMix.r;
      this.sparkColors[i3 + 1] = cMix.g;
      this.sparkColors[i3 + 2] = cMix.b;

      this.sparkCursor = (this.sparkCursor + 1) % this.maxSparks;
    }
  }

  spawnExplosionSparks(center, radius) {
    const count = Math.min(75, Math.max(30, Math.round(radius * 4.5)));
    const emberColors = [
      new THREE.Color('#fff275'),
      new THREE.Color('#ff9100'),
      new THREE.Color('#ff3d00'),
      new THREE.Color('#e53935')
    ];

    for (let c = 0; c < count; c++) {
      const idx = this.sparkCursor;
      const i3 = idx * 3;

      const offsetDist = Math.random() * (radius * 0.4);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const dirX = Math.sin(phi) * Math.cos(theta);
      const dirY = Math.sin(phi) * Math.sin(theta);
      const dirZ = Math.cos(phi);

      this.sparkPositions[i3 + 0] = center.x + dirX * offsetDist;
      this.sparkPositions[i3 + 1] = center.y + dirY * offsetDist;
      this.sparkPositions[i3 + 2] = center.z + dirZ * offsetDist;

      const speed = 15.0 + Math.random() * (25.0 + radius * 1.8);
      this.sparkVelocities[i3 + 0] = dirX * speed;
      this.sparkVelocities[i3 + 1] = dirY * speed;
      this.sparkVelocities[i3 + 2] = dirZ * speed;

      this.sparkLifetimes[idx] = 0.0;
      this.sparkMaxLifetimes[idx] = 0.35 + Math.random() * 0.45;
      this.sparkSizes[idx] = 1.6 + Math.random() * 1.8;
      this.sparkAlphas[idx] = 1.0;

      const col = emberColors[Math.floor(Math.random() * emberColors.length)];
      this.sparkColors[i3 + 0] = col.r;
      this.sparkColors[i3 + 1] = col.g;
      this.sparkColors[i3 + 2] = col.b;

      this.sparkCursor = (this.sparkCursor + 1) % this.maxSparks;
    }
  }

  spawnShockwave(pos, radius) {
    let sw = null;
    for (const item of this.shockwaves) {
      if (!item.active) {
        sw = item;
        break;
      }
    }
    if (!sw) sw = this.shockwaves[0];

    sw.active = true;
    sw.life = 0.0;
    sw.maxLife = 0.30;
    sw.maxScale = Math.max(5.0, radius * 3.0);
    sw.mesh.position.copy(pos);
    sw.mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    sw.mesh.scale.set(0.1, 0.1, 0.1);
    sw.mat.opacity = 0.95;
    sw.mesh.visible = true;
  }

  /**
   * Activates a pre-allocated fragment from the pool (0 memory allocations)
   */
  spawnFragmentFromPool(parentPos, parentRadius) {
    let frag = null;
    for (let i = 0; i < this.maxFragments; i++) {
      const idx = (this.fragmentCursor + i) % this.maxFragments;
      if (!this.fragmentPool[idx].active) {
        frag = this.fragmentPool[idx];
        this.fragmentCursor = (idx + 1) % this.maxFragments;
        break;
      }
    }
    if (!frag) {
      // Recycle oldest fragment
      frag = this.fragmentPool[this.fragmentCursor];
      this.fragmentCursor = (this.fragmentCursor + 1) % this.maxFragments;
    }

    const dirX = Math.random() - 0.5;
    const dirY = Math.random() - 0.5;
    const dirZ = Math.random() - 0.5;
    const len = Math.hypot(dirX, dirY, dirZ) || 1;
    const normX = dirX / len;
    const normY = dirY / len;
    const normZ = dirZ / len;

    const spawnDist = (0.2 + Math.random() * 0.45) * parentRadius;
    frag.mesh.position.set(
      parentPos.x + normX * spawnDist,
      parentPos.y + normY * spawnDist,
      parentPos.z + normZ * spawnDist
    );

    // Fragments scale between 20% and 35% of parent size
    const fragScale = Math.max(0.6, (0.20 + Math.random() * 0.15) * parentRadius);
    frag.baseScale = fragScale;
    frag.mesh.scale.set(fragScale, fragScale, fragScale);

    frag.mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    const speed = 12.0 + Math.random() * 22.0;
    frag.velocity.set(normX * speed, normY * speed, normZ * speed);

    frag.rotSpeed.set(
      (Math.random() - 0.5) * 4.0,
      (Math.random() - 0.5) * 4.0,
      (Math.random() - 0.5) * 4.0
    );

    frag.effectiveRadius = fragScale;
    frag.boundingRadius = fragScale * 1.25;
    frag.boundingRadiusSq = frag.boundingRadius * frag.boundingRadius;
    frag.health = 1;
    frag.life = 0.0;
    frag.maxLife = 9.0;
    frag.active = true;
    frag.mesh.visible = true;
  }

  /**
   * Checks collision of a laser bolt segment [oldPos, newPos] with zero vector allocations
   * @param {THREE.Vector3} oldPos
   * @param {THREE.Vector3} newPos
   * @param {string} laserColorHex
   * @returns {boolean} True if hit
   */
  checkLaserHit(oldPos, newPos, laserColorHex = '#ff2244') {
    _seg.subVectors(newPos, oldPos);
    const segLenSq = _seg.lengthSq();
    if (segLenSq < 0.0001) return false;

    // 1. Check main asteroids
    for (let i = 0; i < this.asteroids.length; i++) {
      const a = this.asteroids[i];
      if (a.isDestroyed || !a.mesh.visible) continue;

      const aPos = a.mesh.position;
      const r = a.boundingRadius;

      // Fast AABB early rejection
      if (Math.abs(oldPos.x - aPos.x) > r + 15 && Math.abs(newPos.x - aPos.x) > r + 15) continue;
      if (Math.abs(oldPos.y - aPos.y) > r + 15 && Math.abs(newPos.y - aPos.y) > r + 15) continue;
      if (Math.abs(oldPos.z - aPos.z) > r + 15 && Math.abs(newPos.z - aPos.z) > r + 15) continue;

      _v.subVectors(aPos, oldPos);
      const t = THREE.MathUtils.clamp(_v.dot(_seg) / segLenSq, 0, 1);
      _closest.copy(oldPos).addScaledVector(_seg, t);

      const distSq = _closest.distanceToSquared(aPos);
      if (distSq <= a.boundingRadiusSq) {
        this.handleHit(a, _closest, laserColorHex, i);
        return true;
      }
    }

    // 2. Check active fragments
    for (let i = 0; i < this.maxFragments; i++) {
      const frag = this.fragmentPool[i];
      if (!frag.active || !frag.mesh.visible) continue;

      const fPos = frag.mesh.position;
      const r = frag.boundingRadius;

      if (Math.abs(oldPos.x - fPos.x) > r + 10 && Math.abs(newPos.x - fPos.x) > r + 10) continue;
      if (Math.abs(oldPos.y - fPos.y) > r + 10 && Math.abs(newPos.y - fPos.y) > r + 10) continue;
      if (Math.abs(oldPos.z - fPos.z) > r + 10 && Math.abs(newPos.z - fPos.z) > r + 10) continue;

      _v.subVectors(fPos, oldPos);
      const t = THREE.MathUtils.clamp(_v.dot(_seg) / segLenSq, 0, 1);
      _closest.copy(oldPos).addScaledVector(_seg, t);

      const distSq = _closest.distanceToSquared(fPos);
      if (distSq <= frag.boundingRadiusSq) {
        this.handleFragmentHit(frag, _closest, laserColorHex);
        return true;
      }
    }

    return false;
  }

  handleHit(a, hitPoint, laserColorHex, index = -1) {
    a.health -= 1;
    this.spawnImpactSparks(hitPoint, laserColorHex);

    if (a.health <= 0) {
      this.explodeAsteroid(a);
      if (this.onAsteroidDestroyed && index >= 0) {
        this.onAsteroidDestroyed(index, a.mesh.position.toArray());
      }
    }
  }

  handleFragmentHit(frag, hitPoint, laserColorHex) {
    frag.active = false;
    frag.mesh.visible = false;
    this.spawnImpactSparks(hitPoint, laserColorHex);
    this.spawnExplosionSparks(frag.mesh.position, frag.effectiveRadius);
    sounds.playHit();
    this._meshesNeedUpdate = true;
  }

  explodeAsteroidByIndex(index) {
    if (this.asteroids && this.asteroids[index]) {
      this.explodeAsteroid(this.asteroids[index]);
    }
  }

  /**
   * Explodes asteroid instantly without scene graph changes or allocations
   */
  explodeAsteroid(a) {
    if (a.isDestroyed) return;
    a.isDestroyed = true;
    a.mesh.visible = false; // Fast toggle instead of group.remove to preserve scene graph

    sounds.playExplosion(0.75);

    // Trigger visual effects
    this.spawnExplosionSparks(a.mesh.position, a.effectiveRadius);
    this.spawnShockwave(a.mesh.position, a.effectiveRadius);

    // Spawn 3-6 smaller pieces from pre-allocated pool
    if (a.effectiveRadius > 1.6) {
      const numPieces = Math.min(6, Math.max(3, Math.round(a.effectiveRadius * 0.48)));
      for (let p = 0; p < numPieces; p++) {
        this.spawnFragmentFromPool(a.mesh.position, a.effectiveRadius);
      }
    }

    this._meshesNeedUpdate = true;
  }

  /**
   * Reuses internal array to eliminate garbage collection
   */
  getMeshes() {
    if (this._meshesNeedUpdate) {
      this._cachedMeshes.length = 0;

      for (let i = 0; i < this.asteroids.length; i++) {
        const a = this.asteroids[i];
        if (!a.isDestroyed && a.mesh.visible) {
          this._cachedMeshes.push(a.mesh);
        }
      }

      for (let i = 0; i < this.maxFragments; i++) {
        const f = this.fragmentPool[i];
        if (f.active && f.mesh.visible) {
          this._cachedMeshes.push(f.mesh);
        }
      }

      this._meshesNeedUpdate = false;
    }
    return this._cachedMeshes;
  }

  update(dt) {
    // 1. Update sparks
    this.updateSparks(dt);

    // 2. Update shockwaves
    this.updateShockwaves(dt);

    // 3. Update active asteroids
    for (let i = 0; i < this.asteroids.length; i++) {
      const a = this.asteroids[i];
      if (a.isDestroyed || !a.mesh.visible) continue;

      a.mesh.rotation.x += a.rotSpeed.x * dt;
      a.mesh.rotation.y += a.rotSpeed.y * dt;
      a.mesh.rotation.z += a.rotSpeed.z * dt;
    }

    // 4. Update fragments from pool
    const drag = Math.pow(0.96, dt * 60);
    for (let i = 0; i < this.maxFragments; i++) {
      const frag = this.fragmentPool[i];
      if (!frag.active) continue;

      frag.life += dt;
      if (frag.life >= frag.maxLife) {
        frag.active = false;
        frag.mesh.visible = false;
        this._meshesNeedUpdate = true;
        continue;
      }

      frag.mesh.position.addScaledVector(frag.velocity, dt);
      frag.velocity.multiplyScalar(drag);

      frag.mesh.rotation.x += frag.rotSpeed.x * dt;
      frag.mesh.rotation.y += frag.rotSpeed.y * dt;
      frag.mesh.rotation.z += frag.rotSpeed.z * dt;

      // Shrink gently near end of life
      if (frag.life > frag.maxLife * 0.75) {
        const fade = 1.0 - (frag.life - frag.maxLife * 0.75) / (frag.maxLife * 0.25);
        const s = frag.baseScale * Math.max(0.05, fade);
        frag.mesh.scale.set(s, s, s);
      }
    }
  }

  updateSparks(dt) {
    const posAttr = this.sparkPoints.geometry.attributes.position;
    const alphaAttr = this.sparkPoints.geometry.attributes.alpha;
    const sizeAttr = this.sparkPoints.geometry.attributes.size;

    let hasActive = false;

    for (let i = 0; i < this.maxSparks; i++) {
      if (this.sparkAlphas[i] <= 0) continue;
      hasActive = true;

      this.sparkLifetimes[i] += dt;
      if (this.sparkLifetimes[i] >= this.sparkMaxLifetimes[i]) {
        this.sparkAlphas[i] = 0;
        alphaAttr.setX(i, 0);
        sizeAttr.setX(i, 0);
        continue;
      }

      const progress = this.sparkLifetimes[i] / this.sparkMaxLifetimes[i];
      const i3 = i * 3;

      this.sparkPositions[i3 + 0] += this.sparkVelocities[i3 + 0] * dt;
      this.sparkPositions[i3 + 1] += this.sparkVelocities[i3 + 1] * dt;
      this.sparkPositions[i3 + 2] += this.sparkVelocities[i3 + 2] * dt;

      this.sparkVelocities[i3 + 0] *= 0.96;
      this.sparkVelocities[i3 + 1] *= 0.96;
      this.sparkVelocities[i3 + 2] *= 0.96;

      posAttr.setXYZ(i, this.sparkPositions[i3 + 0], this.sparkPositions[i3 + 1], this.sparkPositions[i3 + 2]);
      alphaAttr.setX(i, (1.0 - progress) * (1.0 - progress * 0.4));
      sizeAttr.setX(i, this.sparkSizes[i] * (1.0 - progress * 0.6));
    }

    if (hasActive) {
      posAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }
  }

  updateShockwaves(dt) {
    for (const sw of this.shockwaves) {
      if (!sw.active) continue;
      sw.life += dt;
      if (sw.life >= sw.maxLife) {
        sw.active = false;
        sw.mesh.visible = false;
        continue;
      }

      const progress = sw.life / sw.maxLife;
      const easeOut = 1.0 - Math.pow(1.0 - progress, 3);
      const curScale = sw.maxScale * easeOut;
      sw.mesh.scale.set(curScale, curScale, curScale);
      sw.mat.opacity = (1.0 - progress) * 0.95;
    }
  }
}