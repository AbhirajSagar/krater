import * as THREE from 'three';

/**
 * Thruster VFX - High-Fidelity Procedural Supersonic Plasma & Jet Fire
 * 
 * Replaces basic solid geometric cones with an authentic multi-layer
 * supersonic rocket/jet afterburner engine effect:
 * 1. Procedural plasma plume with flowing turbulent flame tendrils
 * 2. Supersonic Mach / Shock Diamonds (periodic expansion/compression wave nodes)
 * 3. Soft Fresnel / glancing-angle volumetric edge falloff (no harsh geometric cone silhouettes)
 * 4. Incandescent white-hot throat core transitioning to vibrant ion plasma flame
 * 5. Blinding nozzle exit throat disc with radial bloom
 * 6. High-velocity supersonic afterburner sparks & embers
 */

// Common fast GLSL simplex / value noise snippet
const NOISE_GLSL = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm2(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    v += a * valNoise(p);
    p = rot * p * 2.05 + vec2(17.3, 31.7);
    a *= 0.5;
  }
  return v;
}
`;

// Outer Plume Vertex Shader: turbulent flutter & supersonic micro-jitter
const PLUME_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

uniform float uTime;
uniform float uBoost;
uniform float uThrottle;

${NOISE_GLSL}

void main() {
  vUv = uv;
  vec3 pos = position;

  // uv.y = 0.0 at nozzle base (Z=0), uv.y = 1.0 at exhaust tail
  // Firmly pin the base to the engine nozzle rim; flutter increases down the plume
  float dispFactor = smoothstep(0.06, 0.65, uv.y);

  // Supersonic exhaust waist (convergent-divergent shock cell contour)
  float shockContour = 1.0 - 0.22 * sin(uv.y * 3.14159 * 1.5) * (1.0 - uBoost * 0.4);
  pos.xy *= shockContour;

  // Longitudinal turbulent fire flutter
  float scrollSpeed = 22.0 + uBoost * 36.0;
  vec2 flutterCoord = vec2(uv.y * 7.0 - uTime * scrollSpeed, uv.x * 4.0);
  float flutter = (valNoise(flutterCoord) - 0.5) * 0.22;

  // High-frequency supersonic vibration on boost
  float microJitter = sin(uTime * 75.0 + uv.y * 40.0) * 0.05 * uBoost;

  pos.xy += normal.xy * (flutter + microJitter) * dispFactor * (0.8 + uBoost * 0.6);

  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Outer Plume Fragment Shader: shock diamonds, fire scrolling, fresnel soft edge
const PLUME_FRAGMENT_SHADER = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

uniform float uTime;
uniform float uBoost;
uniform float uThrottle;
uniform vec3 uColor;
uniform vec3 uCoreColor;
uniform float uFlicker;

${NOISE_GLSL}

void main() {
  float t = vUv.y; // 0.0 at nozzle, 1.0 at tail
  float u = vUv.x; // 0.0 to 1.0 around circumference

  // 1. High-velocity longitudinal fire scrolling
  float flowSpeed = 16.0 + uBoost * 28.0;
  vec2 fireUv1 = vec2(u * 5.0, t * 6.5 - uTime * flowSpeed);
  vec2 fireUv2 = vec2(u * 9.0 + 2.3, t * 13.0 - uTime * (flowSpeed * 1.45));
  float fireNoise1 = fbm2(fireUv1);
  float fireNoise2 = fbm2(fireUv2);
  float fireStream = mix(fireNoise1, fireNoise2, 0.45);

  // 2. Supersonic Mach / Shock Diamonds
  // Repeating diamond shockwave nodes down the centerline
  float shockFreq = 20.0 + uBoost * 8.0;
  float shockWave = sin(t * shockFreq - uTime * (flowSpeed * 0.65));
  float shockNode = smoothstep(0.45, 0.95, shockWave);
  float shockFade = (1.0 - smoothstep(0.08, 0.85, t));
  float shockIntensity = shockNode * shockFade * (0.6 + uBoost * 1.4);

  // 3. Volumetric Rim / Fresnel Soft Falloff (removes hard geometric cone edges)
  vec3 viewDir = normalize(vViewPosition);
  float NdotV = abs(dot(vNormal, viewDir));
  float edgeSoftness = smoothstep(0.02, 0.4, NdotV); // Smooth out the outer silhouette
  float rimGlow = pow(1.0 - NdotV, 2.0) * (0.5 + uBoost * 0.5);

  // 4. Longitudinal Plume Decay & Turbulent Lick Dissipation
  float plumeDecay = 1.0 - smoothstep(0.45 + (1.0 - uBoost) * 0.25, 1.0, t + (fireStream - 0.5) * 0.35);

  // 5. Dual-Layer Color Gradient: Incandescent Throat -> Plasma Flame -> Smoky Tail
  float throatGlow = smoothstep(0.35, 0.0, t) * (1.2 + uBoost * 1.6);
  
  vec3 flameCol = uColor;
  // Boost shifts the flame towards brilliant high-energy afterburner combustion
  if (uBoost > 0.01) {
    vec3 hotCombustion = mix(uColor, vec3(1.0, 0.72, 0.35), 0.45);
    flameCol = mix(flameCol, hotCombustion, uBoost * 0.65);
  }

  // Shock diamond bright core
  vec3 shockColor = mix(flameCol, vec3(1.0), 0.75);

  vec3 outColor = mix(flameCol, uCoreColor, throatGlow * 0.85);
  outColor += shockColor * shockIntensity;
  outColor += uCoreColor * pow(fireStream, 2.2) * (0.4 + uBoost * 0.8);
  outColor += flameCol * rimGlow;

  // 6. Alpha calculation
  float alpha = plumeDecay * edgeSoftness * (0.8 + fireStream * 0.35) * uFlicker;
  alpha = clamp(alpha * (0.65 + uBoost * 0.4), 0.0, 1.0);

  // Smooth throttle gating
  alpha *= smoothstep(0.02, 0.22, uThrottle);

  gl_FragColor = vec4(outColor * (1.1 + uBoost * 0.9), alpha);
}
`;

// Inner Supersonic Needle Core Vertex Shader
const CORE_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
varying vec3 vViewPosition;

uniform float uTime;
uniform float uBoost;

void main() {
  vUv = uv;
  vec3 pos = position;

  // Needle taper: very sharp focus along the thrust axis
  float taper = 1.0 - uv.y * 0.75;
  pos.xy *= taper;

  // Supersonic micro-pulsing
  float pulse = sin(uTime * 60.0 + uv.y * 50.0) * 0.03 * (0.5 + uBoost * 0.8);
  pos.xy += normal.xy * pulse * uv.y;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Inner Supersonic Needle Core Fragment Shader: laser-like white-hot supersonic shock core
const CORE_FRAGMENT_SHADER = /* glsl */ `
varying vec2 vUv;
varying vec3 vViewPosition;

uniform float uTime;
uniform float uBoost;
uniform float uThrottle;
uniform vec3 uColor;
uniform vec3 uCoreColor;
uniform float uFlicker;

void main() {
  float t = vUv.y;

  // Center shock diamonds in the inner core
  float shockRate = 32.0 + uBoost * 12.0;
  float shock = sin(t * shockRate - uTime * (30.0 + uBoost * 45.0));
  float shockNodes = smoothstep(0.3, 0.98, shock);

  // Falloff from nozzle
  float decay = 1.0 - smoothstep(0.4 + uBoost * 0.4, 0.95, t);

  // Pure blinding incandescence at throat, tinted shock diamonds down the needle
  vec3 coreCol = mix(uCoreColor, uColor, t * 0.45);
  coreCol = mix(coreCol, vec3(1.0), shockNodes * 0.65);

  float alpha = decay * (0.85 + shockNodes * 0.3) * uFlicker;
  alpha *= smoothstep(0.04, 0.25, uThrottle);
  alpha = clamp(alpha * (0.75 + uBoost * 0.5), 0.0, 1.0);

  gl_FragColor = vec4(coreCol * (1.4 + uBoost * 1.2), alpha);
}
`;

// Nozzle Exit Throat Disc Shader: radial incandescent engine bloom
const THROAT_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const THROAT_FRAGMENT_SHADER = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform float uBoost;
uniform float uThrottle;
uniform vec3 uColor;
uniform vec3 uCoreColor;
uniform float uFlicker;

void main() {
  // Radial distance from center [0, 1]
  vec2 centered = vUv - vec2(0.5);
  float dist = length(centered) * 2.0;
  if (dist > 1.0) discard;

  // Exponential white-hot glow bloom
  float innerBloom = exp(-dist * dist * 4.5);
  float outerHalo = exp(-dist * dist * 1.8);

  vec3 col = mix(uColor, uCoreColor, innerBloom * 0.9);
  col += vec3(1.0) * innerBloom * (0.8 + uBoost * 1.2);

  float alpha = (innerBloom * 0.95 + outerHalo * 0.45) * uFlicker;
  alpha *= smoothstep(0.02, 0.2, uThrottle);
  alpha = clamp(alpha * (0.7 + uBoost * 0.4), 0.0, 1.0);

  gl_FragColor = vec4(col * (1.2 + uBoost * 1.0), alpha);
}
`;

/**
 * Single Thruster Flame Assembly
 * Comprises:
 * - Outer turbulent plasma plume mesh
 * - Inner supersonic shock needle mesh
 * - Nozzle exit throat radial disc
 * - Dynamic PointLight engine flare
 */
export class ThrusterFlame {
  /**
   * @param {object} config - Thruster config from spaceshipConfig.js
   * @param {number} radius - Engine nozzle radius (m)
   * @param {number} length - Base flame length (m)
   */
  constructor(config, radius = 0.22, length = 1.35) {
    this.config = config;
    this.baseRadius = radius;
    this.baseLength = Math.min(0.95, length * 0.70);

    const baseColorHex = config.color || '#38bdf8';
    const coreColorHex = config.coreColor || '#ffffff';
    this.flameColor = new THREE.Color(baseColorHex);
    this.coreColor = new THREE.Color(coreColorHex);

    this.root = new THREE.Group();
    if (config.position) {
      this.root.position.set(config.position.x, config.position.y, config.position.z);
    }

    // Current animated dynamics
    this.currentBoost = 0.0;
    this.currentThrottle = 0.2;
    this.elapsedTime = Math.random() * 10.0; // Random offset to desync multiple engines

    // 1. Outer Turbulent Plasma Plume Mesh
    // High-resolution tapered cylinder: 24 radial segments, 32 height segments
    // In Three.js CylinderGeometry: radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded
    // Oriented along +Z (exhaust vector behind ship)
    const plumeGeom = new THREE.CylinderGeometry(
      this.baseRadius * 0.25, // Tip radius (at +Z)
      this.baseRadius,        // Base radius (at Z=0, nozzle exit)
      this.baseLength,
      24,
      32,
      true
    );
    plumeGeom.rotateX(Math.PI / 2);
    plumeGeom.translate(0, 0, this.baseLength * 0.5);

    this.plumeUniforms = {
      uTime: { value: 0 },
      uBoost: { value: 0 },
      uThrottle: { value: 0.2 },
      uColor: { value: this.flameColor.clone() },
      uCoreColor: { value: this.coreColor.clone() },
      uFlicker: { value: 1.0 }
    };

    this.plumeMaterial = new THREE.ShaderMaterial({
      vertexShader: PLUME_VERTEX_SHADER,
      fragmentShader: PLUME_FRAGMENT_SHADER,
      uniforms: this.plumeUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.plumeMesh = new THREE.Mesh(plumeGeom, this.plumeMaterial);
    this.root.add(this.plumeMesh);

    // 2. Inner Supersonic Shock Needle Mesh
    const coreGeom = new THREE.CylinderGeometry(
      this.baseRadius * 0.08,
      this.baseRadius * 0.42,
      this.baseLength * 0.72,
      16,
      20,
      true
    );
    coreGeom.rotateX(Math.PI / 2);
    coreGeom.translate(0, 0, (this.baseLength * 0.72) * 0.5);

    this.coreUniforms = {
      uTime: { value: 0 },
      uBoost: { value: 0 },
      uThrottle: { value: 0.2 },
      uColor: { value: this.flameColor.clone() },
      uCoreColor: { value: this.coreColor.clone() },
      uFlicker: { value: 1.0 }
    };

    this.coreMaterial = new THREE.ShaderMaterial({
      vertexShader: CORE_VERTEX_SHADER,
      fragmentShader: CORE_FRAGMENT_SHADER,
      uniforms: this.coreUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.coreMesh = new THREE.Mesh(coreGeom, this.coreMaterial);
    this.root.add(this.coreMesh);

    // 3. Nozzle Throat Radial Bloom Disc
    const discSize = this.baseRadius * 2.3;
    const throatGeom = new THREE.PlaneGeometry(discSize, discSize);
    throatGeom.translate(0, 0, 0.015); // Just outside the metal nozzle lip

    this.throatUniforms = {
      uTime: { value: 0 },
      uBoost: { value: 0 },
      uThrottle: { value: 0.2 },
      uColor: { value: this.flameColor.clone() },
      uCoreColor: { value: this.coreColor.clone() },
      uFlicker: { value: 1.0 }
    };

    this.throatMaterial = new THREE.ShaderMaterial({
      vertexShader: THROAT_VERTEX_SHADER,
      fragmentShader: THROAT_FRAGMENT_SHADER,
      uniforms: this.throatUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.throatMesh = new THREE.Mesh(throatGeom, this.throatMaterial);
    this.root.add(this.throatMesh);

    // 4. Dynamic PointLight Engine Flare
    this.pointLight = new THREE.PointLight(
      this.flameColor,
      config.lightIntensity || 2.2,
      8.0
    );
    this.pointLight.position.set(0, 0, 0.25);
    this.root.add(this.pointLight);
  }

  /**
   * Update thruster animation, supersonic scaling, flicker, and lights
   * @param {number} dt
   * @param {number} targetThrottle - Normalized throttle [0, 1]
   * @param {boolean} isBoosting
   */
  update(dt, targetThrottle, isBoosting) {
    this.elapsedTime += dt;

    // Smooth boost transition (fast attack, smooth release)
    const targetBoost = isBoosting ? 1.0 : 0.0;
    const boostLerpRate = isBoosting ? 14.0 : 6.0;
    this.currentBoost = THREE.MathUtils.lerp(this.currentBoost, targetBoost, 1 - Math.exp(-boostLerpRate * dt));

    // Smooth throttle transition
    this.currentThrottle = THREE.MathUtils.lerp(this.currentThrottle, targetThrottle, 1 - Math.exp(-12.0 * dt));

    // Realistic multi-frequency flame flicker
    const f1 = Math.sin(this.elapsedTime * 45.0) * 0.07;
    const f2 = Math.sin(this.elapsedTime * 85.0 + 1.3) * 0.05;
    const f3 = (Math.random() - 0.5) * 0.12 * (0.6 + this.currentBoost * 0.8);
    const flicker = Math.max(0.75, 1.0 + f1 + f2 + f3);

    // Update shader uniforms
    this.plumeUniforms.uTime.value = this.elapsedTime;
    this.plumeUniforms.uBoost.value = this.currentBoost;
    this.plumeUniforms.uThrottle.value = this.currentThrottle;
    this.plumeUniforms.uFlicker.value = flicker;

    this.coreUniforms.uTime.value = this.elapsedTime;
    this.coreUniforms.uBoost.value = this.currentBoost;
    this.coreUniforms.uThrottle.value = this.currentThrottle;
    this.coreUniforms.uFlicker.value = flicker;

    this.throatUniforms.uTime.value = this.elapsedTime;
    this.throatUniforms.uBoost.value = this.currentBoost;
    this.throatUniforms.uThrottle.value = this.currentThrottle;
    this.throatUniforms.uFlicker.value = flicker;

    // Supersonic Plume Scaling:
    // Tight, focused supersonic lance (shortened for sleek aesthetic)
    const throttleScale = Math.max(0.15, this.currentThrottle);
    const lenScale = throttleScale * (0.80 + this.currentBoost * 0.55);
    const radScale = Math.max(0.2, throttleScale * (1.0 + this.currentBoost * 0.15));

    this.plumeMesh.scale.set(radScale, radScale, lenScale);
    this.coreMesh.scale.set(radScale * 0.88, radScale * 0.88, lenScale * 1.05);
    this.throatMesh.scale.set(radScale, radScale, 1.0);

    // Dynamic Engine Light
    const baseLight = this.config.lightIntensity || 2.2;
    const boostLightMultiplier = 1.0 + this.currentBoost * 2.5;
    this.pointLight.intensity = baseLight * throttleScale * boostLightMultiplier * flicker;

    // Color shift on boost for the light
    if (this.currentBoost > 0.05) {
      const boostLightCol = this.flameColor.clone().lerp(new THREE.Color(1.0, 0.8, 0.4), this.currentBoost * 0.4);
      this.pointLight.color.copy(boostLightCol);
    } else {
      this.pointLight.color.copy(this.flameColor);
    }
  }

  /**
   * Set theme color (cycles with 'C' key)
   * @param {THREE.Color|string} color
   */
  setColor(color) {
    this.flameColor = color instanceof THREE.Color ? color.clone() : new THREE.Color(color);
    this.plumeUniforms.uColor.value.copy(this.flameColor);
    this.coreUniforms.uColor.value.copy(this.flameColor);
    this.throatUniforms.uColor.value.copy(this.flameColor);
    this.pointLight.color.copy(this.flameColor);
  }

  /**
   * Free GPU resources
   */
  dispose() {
    this.plumeMesh.geometry.dispose();
    this.plumeMaterial.dispose();
    this.coreMesh.geometry.dispose();
    this.coreMaterial.dispose();
    this.throatMesh.geometry.dispose();
    this.throatMaterial.dispose();
  }
}

/**
 * High-Velocity Supersonic Exhaust Sparks & Embers System
 */
export class ThrusterSparkSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {number} maxSparks
   */
  constructor(scene, maxSparks = 240) {
    this.scene = scene;
    this.maxSparks = maxSparks;
    this.cursor = 0;

    this.positions = new Float32Array(maxSparks * 3);
    this.velocities = new Float32Array(maxSparks * 3);
    this.lifetimes = new Float32Array(maxSparks); // [0, maxLife]
    this.maxLifetimes = new Float32Array(maxSparks);
    this.sizes = new Float32Array(maxSparks);
    this.alphas = new Float32Array(maxSparks);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geom.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));

    this.sparkColor = new THREE.Color('#38bdf8');

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: this.sparkColor },
        uCoreColor: { value: new THREE.Color('#ffffff') }
      },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (280.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform vec3 uCoreColor;
        varying float vAlpha;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord) * 2.0;
          if (dist > 1.0) discard;

          // Glowing spark: bright center, fading halo
          float core = exp(-dist * dist * 6.0);
          float halo = exp(-dist * dist * 2.2);

          vec3 col = mix(uColor, uCoreColor, core * 0.9);
          gl_FragColor = vec4(col, vAlpha * (core * 0.9 + halo * 0.45));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(geom, this.material);
    this.scene.add(this.points);
  }

  /**
   * Spawn spark particles behind an engine nozzle
   * @param {THREE.Vector3} worldPos
   * @param {THREE.Vector3} shipDir - Ship forward direction
   * @param {boolean} isBoosting
   */
  spawnSparks(worldPos, shipDir, isBoosting) {
    const count = isBoosting ? 3 : 1;
    for (let c = 0; c < count; c++) {
      const idx = this.cursor;
      const i3 = idx * 3;

      this.positions[i3 + 0] = worldPos.x + (Math.random() - 0.5) * 0.15;
      this.positions[i3 + 1] = worldPos.y + (Math.random() - 0.5) * 0.15;
      this.positions[i3 + 2] = worldPos.z + (Math.random() - 0.5) * 0.15;

      // Exhaust shoots backward along -shipDir with compact trail distance
      const baseSpeed = isBoosting ? 18.0 : 8.0;
      const spread = isBoosting ? 1.6 : 0.8;

      this.velocities[i3 + 0] = -shipDir.x * baseSpeed + (Math.random() - 0.5) * spread;
      this.velocities[i3 + 1] = -shipDir.y * baseSpeed + (Math.random() - 0.5) * spread;
      this.velocities[i3 + 2] = -shipDir.z * baseSpeed + (Math.random() - 0.5) * spread;

      this.lifetimes[idx] = 0.0;
      this.maxLifetimes[idx] = isBoosting ? 0.14 : 0.08;
      this.sizes[idx] = isBoosting ? (0.85 + Math.random() * 0.45) : (0.45 + Math.random() * 0.25);
      this.alphas[idx] = 1.0;

      this.cursor = (this.cursor + 1) % this.maxSparks;
    }
  }

  /**
   * Update active sparks
   * @param {number} dt
   */
  update(dt) {
    const posAttr = this.points.geometry.attributes.position;
    const alphaAttr = this.points.geometry.attributes.alpha;
    const sizeAttr = this.points.geometry.attributes.size;

    for (let i = 0; i < this.maxSparks; i++) {
      if (this.alphas[i] <= 0) continue;

      this.lifetimes[i] += dt;
      if (this.lifetimes[i] >= this.maxLifetimes[i]) {
        this.alphas[i] = 0;
        alphaAttr.setX(i, 0);
        sizeAttr.setX(i, 0);
        continue;
      }

      const progress = this.lifetimes[i] / this.maxLifetimes[i];
      const i3 = i * 3;

      this.positions[i3 + 0] += this.velocities[i3 + 0] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;

      posAttr.setXYZ(i, this.positions[i3 + 0], this.positions[i3 + 1], this.positions[i3 + 2]);
      alphaAttr.setX(i, (1.0 - progress) * (1.0 - progress * 0.3));
      sizeAttr.setX(i, this.sizes[i] * (1.0 - progress * 0.5));
    }

    posAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  /**
   * Set spark color to match thruster theme
   * @param {THREE.Color|string} color
   */
  setColor(color) {
    this.sparkColor = color instanceof THREE.Color ? color.clone() : new THREE.Color(color);
    this.material.uniforms.uColor.value.copy(this.sparkColor);
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
