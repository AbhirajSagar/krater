import * as THREE from 'three';

export class SpaceDust {
  /**
   * High-speed, multi-layer GPU cosmic dust and warp streak system.
   * Features:
   * - Dual-volume ambient micro-stardust (crisp 0.9-3.4px pinpoint diamond specks, zero bloat)
   * - Hypersonic motion streaks / warp speedlines via GPU LineSegments
   * - Speed-reactive elongation & brightness (accelerates from calm specks to lightspeed needles)
   * - Seamless GPU toroidal wrapping relative to player flight coordinates
   * - Hardware-level culling and smooth edge falloffs with zero fill-rate waste
   * - Dynamic skybox theme adaptation across all cosmic palettes
   * 
   * @param {THREE.Scene} scene
   * @param {object|number} [optionsOrCount]
   */
  constructor(scene, optionsOrCount = {}, ...legacyArgs) {
    this.scene = scene;

    // Configurable parameters with balanced, spacious flight defaults
    let pointCount = 2200;
    let streakCount = 450;
    let innerRadius = 85;
    let outerRadius = 380;
    let streakRadius = 90;

    if (typeof optionsOrCount === 'object' && optionsOrCount !== null) {
      if (optionsOrCount.pointCount !== undefined) pointCount = optionsOrCount.pointCount;
      if (optionsOrCount.streakCount !== undefined) streakCount = optionsOrCount.streakCount;
      if (optionsOrCount.innerRadius !== undefined) innerRadius = optionsOrCount.innerRadius;
      if (optionsOrCount.outerRadius !== undefined) outerRadius = optionsOrCount.outerRadius;
      if (optionsOrCount.streakRadius !== undefined) streakRadius = optionsOrCount.streakRadius;
    } else if (typeof optionsOrCount === 'number') {
      pointCount = optionsOrCount;
      if (typeof legacyArgs[0] === 'number') {
        if (legacyArgs[0] > 100) {
          outerRadius = legacyArgs[0];
          innerRadius = 85;
        } else {
          innerRadius = legacyArgs[0];
        }
      }
      if (typeof legacyArgs[1] === 'number') outerRadius = legacyArgs[1];
    }

    this.pointCount = pointCount;
    this.streakCount = streakCount;
    this.innerRadius = innerRadius;
    this.outerRadius = outerRadius;
    this.streakRadius = streakRadius;

    // Initial base palette (diamond white + vibrant cyan stardust)
    const basePalette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0x00f0ff),
      new THREE.Color(0x38bdf8),
      new THREE.Color(0x7dd3fc),
      new THREE.Color(0xa5f3fc)
    ];

    const col = new THREE.Color();

    // ----------------------------------------------------
    // 1. AMBIENT FINE COSMIC DUST (POINTS)
    // ----------------------------------------------------
    const positions = new Float32Array(pointCount * 3);
    const sizes = new Float32Array(pointCount);
    const colors = new Float32Array(pointCount * 3);
    const phases = new Float32Array(pointCount);
    const radii = new Float32Array(pointCount);

    const innerCount = Math.floor(pointCount * 0.45); // 45% in near flight stream, 55% in deep space

    for (let i = 0; i < pointCount; i++) {
      const isInner = i < innerCount;
      const r = isInner ? innerRadius : outerRadius;
      radii[i] = r;

      positions[i * 3 + 0] = (Math.random() - 0.5) * r * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * r * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * r * 2;

      // Visible, well-balanced cosmic dust sizing (a little bigger, clearly visible)
      if (isInner) {
        sizes[i] = 1.6 + Math.random() * 1.6;
      } else {
        sizes[i] = 1.3 + Math.random() * 1.3;
      }

      const choice = basePalette[Math.floor(Math.random() * basePalette.length)];
      col.copy(choice);
      col.r = Math.min(1.0, Math.max(0.0, col.r + (Math.random() - 0.5) * 0.06));
      col.g = Math.min(1.0, Math.max(0.0, col.g + (Math.random() - 0.5) * 0.06));
      col.b = Math.min(1.0, Math.max(0.0, col.b + (Math.random() - 0.5) * 0.06));

      colors[i * 3 + 0] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      phases[i] = Math.random() * Math.PI * 2;
    }

    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    pointGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    pointGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    pointGeometry.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    pointGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), Infinity);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uPlayerPos: { value: new THREE.Vector3(0, 0, 0) },
        uTime: { value: 0.0 },
        uSpeed: { value: 0.0 }
      },
      vertexShader: `
        uniform vec3 uPlayerPos;
        uniform float uTime;
        uniform float uSpeed;

        attribute float aSize;
        attribute vec3 aColor;
        attribute float aPhase;
        attribute float aRadius;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float boxSize = aRadius * 2.0;
          vec3 diff = position - uPlayerPos;

          // Seamless GPU toroidal wrapping relative to player position
          vec3 wrapped = mod(diff + vec3(aRadius), boxSize) - vec3(aRadius);
          vec3 worldPos = uPlayerPos + wrapped;

          vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);

          // 1. Behind-camera culling
          if (mvPosition.z > -0.5) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            gl_PointSize = 0.0;
            return;
          }

          vec4 clipPos = projectionMatrix * mvPosition;

          // 2. View frustum culling (+ 20% safety margin)
          float maxClip = clipPos.w * 1.20;
          if (abs(clipPos.x) > maxClip || abs(clipPos.y) > maxClip) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            gl_PointSize = 0.0;
            return;
          }

          gl_Position = clipPos;

          // Smooth distance edge falloffs
          float dist = length(wrapped);
          float outerFade = smoothstep(aRadius, aRadius * 0.72, dist);
          float innerFade = smoothstep(2.5, 6.0, dist);

          // Cosmic twinkling shimmer
          float twinkle = 0.82 + 0.18 * sin(uTime * 2.8 + aPhase);

          // Speed flare: motes brighten subtly when screaming past at high velocity
          float speedFlare = 1.0 + clamp(uSpeed / 100.0, 0.0, 0.5);

          vAlpha = outerFade * innerFade * twinkle * speedFlare;
          vColor = aColor;

          // Well-balanced cosmic dust size scaling (visible 2.8px to 9.0px)
          float pSize = aSize * (155.0 / -mvPosition.z);
          gl_PointSize = clamp(pSize, 2.8, 9.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;

          // Rich celestial core with pleasant luminous falloff
          float core = 1.0 - dist * 2.0;
          float hotspot = pow(core, 2.2);
          float glow = pow(core, 1.25);

          // Hot-white star core blending into colored aura
          vec3 finalColor = mix(vColor, vec3(1.0, 1.0, 1.0), hotspot * 0.88);

          gl_FragColor = vec4(finalColor, vAlpha * glow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(pointGeometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    // ----------------------------------------------------
    // 2. SUPERSONIC MOTION STREAKS / WARP SPEEDLINES
    // ----------------------------------------------------
    const streakVerts = streakCount * 2;
    const streakPositions = new Float32Array(streakVerts * 3);
    const streakHeadTail = new Float32Array(streakVerts);
    const streakColors = new Float32Array(streakVerts * 3);
    const streakLengthMult = new Float32Array(streakVerts);
    const streakAlpha = new Float32Array(streakVerts);
    const streakRadii = new Float32Array(streakVerts);

    const sr = streakRadius;

    for (let i = 0; i < streakCount; i++) {
      const px = (Math.random() - 0.5) * sr * 2;
      const py = (Math.random() - 0.5) * sr * 2;
      const pz = (Math.random() - 0.5) * sr * 2;

      const lenMult = 0.65 + Math.random() * 0.7;
      // Soft, subtle streak alpha (decreased intensity)
      const alphaVal = 0.18 + Math.random() * 0.24;

      const choice = basePalette[Math.floor(Math.random() * basePalette.length)];
      col.copy(choice);
      col.r = Math.min(1.0, Math.max(0.0, col.r + (Math.random() - 0.5) * 0.06));
      col.g = Math.min(1.0, Math.max(0.0, col.g + (Math.random() - 0.5) * 0.06));
      col.b = Math.min(1.0, Math.max(0.0, col.b + (Math.random() - 0.5) * 0.06));

      // Head vertex (v0)
      const v0 = i * 2;
      streakPositions[v0 * 3 + 0] = px;
      streakPositions[v0 * 3 + 1] = py;
      streakPositions[v0 * 3 + 2] = pz;
      streakHeadTail[v0] = 0.0;
      streakLengthMult[v0] = lenMult;
      streakAlpha[v0] = alphaVal;
      streakRadii[v0] = sr;
      streakColors[v0 * 3 + 0] = col.r;
      streakColors[v0 * 3 + 1] = col.g;
      streakColors[v0 * 3 + 2] = col.b;

      // Tail vertex (v1)
      const v1 = i * 2 + 1;
      streakPositions[v1 * 3 + 0] = px;
      streakPositions[v1 * 3 + 1] = py;
      streakPositions[v1 * 3 + 2] = pz;
      streakHeadTail[v1] = 1.0;
      streakLengthMult[v1] = lenMult;
      streakAlpha[v1] = alphaVal;
      streakRadii[v1] = sr;
      streakColors[v1 * 3 + 0] = col.r;
      streakColors[v1 * 3 + 1] = col.g;
      streakColors[v1 * 3 + 2] = col.b;
    }

    const streakGeometry = new THREE.BufferGeometry();
    streakGeometry.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
    streakGeometry.setAttribute('aHeadTail', new THREE.BufferAttribute(streakHeadTail, 1));
    streakGeometry.setAttribute('aLengthMult', new THREE.BufferAttribute(streakLengthMult, 1));
    streakGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(streakAlpha, 1));
    streakGeometry.setAttribute('aColor', new THREE.BufferAttribute(streakColors, 3));
    streakGeometry.setAttribute('aRadius', new THREE.BufferAttribute(streakRadii, 1));
    streakGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), Infinity);

    this.streakMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPlayerPos: { value: new THREE.Vector3(0, 0, 0) },
        uVelocity: { value: new THREE.Vector3(0, 0, 0) },
        uSpeed: { value: 0.0 },
        uBoost: { value: 0.0 },
        uTime: { value: 0.0 }
      },
      vertexShader: `
        uniform vec3 uPlayerPos;
        uniform vec3 uVelocity;
        uniform float uSpeed;
        uniform float uBoost;
        uniform float uTime;

        attribute float aHeadTail;
        attribute float aLengthMult;
        attribute float aAlpha;
        attribute vec3 aColor;
        attribute float aRadius;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float boxSize = aRadius * 2.0;
          vec3 diff = position - uPlayerPos;

          // Toroidal wrapping of head coordinate relative to player
          vec3 wrapped = mod(diff + vec3(aRadius), boxSize) - vec3(aRadius);
          vec3 headWorldPos = uPlayerPos + wrapped;

          // Direction of flight motion in world space
          vec3 moveDir = (uSpeed > 0.1) ? normalize(uVelocity) : vec3(0.0, 0.0, -1.0);

          // Sleeker, shorter streak length (subtle speed sensation without screen clutter)
          float baseLen = (uSpeed * 0.038 + uBoost * 2.0) * aLengthMult;
          float streakLen = clamp(baseLen, 0.0, 10.0);

          // Tail extends backwards along -moveDir (trailing behind head)
          vec3 worldPos = headWorldPos - moveDir * (streakLen * aHeadTail);

          vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Edge falloff prevents popping at bounding volume edge
          float dist = length(wrapped);
          float edgeFade = smoothstep(aRadius, aRadius * 0.70, dist);
          float nearFade = smoothstep(2.5, 6.0, dist);

          // Gentle, progressive speed activation
          float speedFade = smoothstep(8.0, 42.0, uSpeed);

          // Subtle afterburner boost glow (soft, non-blinding)
          float boostGlow = 1.0 + uBoost * 0.35;

          // Smooth tapering along streak length
          float trailFalloff = pow(1.0 - aHeadTail * 0.92, 1.3);

          vAlpha = speedFade * aAlpha * edgeFade * nearFade * trailFalloff * boostGlow;

          // Soft core blending into active skybox theme palette
          vec3 headColor = mix(aColor, vec3(1.0, 1.0, 1.0), 0.60);
          vColor = mix(headColor, aColor, aHeadTail);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          if (vAlpha <= 0.005) discard;
          gl_FragColor = vec4(vColor, vAlpha * 0.55);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.speedStreaks = new THREE.LineSegments(streakGeometry, this.streakMaterial);
    this.speedStreaks.frustumCulled = false;
    this.scene.add(this.speedStreaks);
  }

  /**
   * Adapts stardust and motion streak color palette to complement active skybox theme
   * @param {string} skyboxId
   */
  setTheme(skyboxId) {
    let palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0x00f0ff),
      new THREE.Color(0x38bdf8),
      new THREE.Color(0x7dd3fc),
      new THREE.Color(0xa5f3fc)
    ];

    if (skyboxId === 'purple_nebula') {
      palette = [
        new THREE.Color(0xffffff), // Diamond white
        new THREE.Color(0xf0abfc), // Bright fuchsia
        new THREE.Color(0xc084fc), // Radiant violet
        new THREE.Color(0xe879f9), // Neon purple
        new THREE.Color(0x38bdf8)  // Contrast cyan
      ];
    } else if (skyboxId === 'blue_nebula') {
      palette = [
        new THREE.Color(0xffffff), // Diamond white
        new THREE.Color(0x00f0ff), // Hyper cyan
        new THREE.Color(0x38bdf8), // Electric blue
        new THREE.Color(0x67e8f9), // Bright aqua
        new THREE.Color(0x60a5fa)  // Plasma blue
      ];
    } else if (skyboxId === 'blue_pink') {
      palette = [
        new THREE.Color(0xffffff), // Diamond white
        new THREE.Color(0x38bdf8), // Electric cyan
        new THREE.Color(0xf472b6), // Soft neon pink
        new THREE.Color(0xec4899), // Hot magenta pink
        new THREE.Color(0x818cf8)  // Violet transition
      ];
    } else if (skyboxId === 'golden_galaxy') {
      palette = [
        new THREE.Color(0xffffff), // Solar white
        new THREE.Color(0xfde047), // Brilliant gold
        new THREE.Color(0xfbbf24), // Amber star
        new THREE.Color(0xf97316), // Solar flare
        new THREE.Color(0xfef08a)  // Light gold
      ];
    } else if (skyboxId === 'deep_space') {
      palette = [
        new THREE.Color(0xffffff), // Pure diamond
        new THREE.Color(0xe2e8f0), // Crystalline silver
        new THREE.Color(0x93c5fd), // Pale azure
        new THREE.Color(0x67e8f9), // Ice blue
        new THREE.Color(0xc7d2fe)  // Indigo star
      ];
    }

    const col = new THREE.Color();

    // 1. Update ambient fine dust colors
    if (this.points && this.points.geometry) {
      const colorsAttr = this.points.geometry.attributes.aColor;
      if (colorsAttr) {
        for (let i = 0; i < this.pointCount; i++) {
          const choice = palette[Math.floor(Math.random() * palette.length)];
          col.copy(choice);
          col.r = Math.min(1.0, Math.max(0.0, col.r + (Math.random() - 0.5) * 0.06));
          col.g = Math.min(1.0, Math.max(0.0, col.g + (Math.random() - 0.5) * 0.06));
          col.b = Math.min(1.0, Math.max(0.0, col.b + (Math.random() - 0.5) * 0.06));
          colorsAttr.setXYZ(i, col.r, col.g, col.b);
        }
        colorsAttr.needsUpdate = true;
      }
    }

    // 2. Update speed streak colors (both head and tail vertices)
    if (this.speedStreaks && this.speedStreaks.geometry) {
      const streakColorsAttr = this.speedStreaks.geometry.attributes.aColor;
      if (streakColorsAttr) {
        for (let i = 0; i < this.streakCount; i++) {
          const choice = palette[Math.floor(Math.random() * palette.length)];
          col.copy(choice);
          col.r = Math.min(1.0, Math.max(0.0, col.r + (Math.random() - 0.5) * 0.06));
          col.g = Math.min(1.0, Math.max(0.0, col.g + (Math.random() - 0.5) * 0.06));
          col.b = Math.min(1.0, Math.max(0.0, col.b + (Math.random() - 0.5) * 0.06));

          streakColorsAttr.setXYZ(i * 2 + 0, col.r, col.g, col.b);
          streakColorsAttr.setXYZ(i * 2 + 1, col.r, col.g, col.b);
        }
        streakColorsAttr.needsUpdate = true;
      }
    }
  }

  /**
   * Updates player position, flight velocity, speed, and boost uniforms
   * Zero CPU particle updates or allocations per frame
   * 
   * @param {THREE.Vector3} playerPos
   * @param {number} [dt=0.016]
   * @param {THREE.Vector3} [velocity=null]
   * @param {number} [speed=0]
   * @param {number} [boost=0]
   */
  update(playerPos, dt = 0.016, velocity = null, speed = 0, boost = 0) {
    if (!playerPos) return;

    const absSpeed = Math.abs(speed);

    // Update ambient dust uniforms
    if (this.material && this.material.uniforms) {
      this.material.uniforms.uPlayerPos.value.copy(playerPos);
      this.material.uniforms.uTime.value += dt;
      this.material.uniforms.uSpeed.value = absSpeed;
    }

    // Update speed streaks uniforms
    if (this.streakMaterial && this.streakMaterial.uniforms) {
      this.streakMaterial.uniforms.uPlayerPos.value.copy(playerPos);
      this.streakMaterial.uniforms.uTime.value += dt;
      this.streakMaterial.uniforms.uSpeed.value = absSpeed;
      this.streakMaterial.uniforms.uBoost.value = boost;

      if (velocity) {
        this.streakMaterial.uniforms.uVelocity.value.copy(velocity);
      } else {
        this.streakMaterial.uniforms.uVelocity.value.set(0, 0, -absSpeed);
      }
    }
  }

  dispose() {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      this.material.dispose();
      this.points = null;
    }
    if (this.speedStreaks) {
      this.scene.remove(this.speedStreaks);
      this.speedStreaks.geometry.dispose();
      this.streakMaterial.dispose();
      this.speedStreaks = null;
    }
  }
}
