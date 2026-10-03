import * as THREE from 'three';

/**
 * Authentic StarSparrow Color Themes extracted from EbalStudios StarSparrow Unity Materials
 */
export const SPARROW_THEMES = {
  Red: {
    name: 'Crimson Fury',
    color1: [0.396078, 0.098039, 0.098039],
    color2: [0.152941, 0.152941, 0.152941],
    color3: [0.454902, 0.454902, 0.454902],
    logosColor: [0.964706, 0.772549, 0.058824],
    emission1: [0.0, 0.062745, 0.247059],
    emission2: [0.121569, 0.572549, 0.854902],
    emission3: [0.509804, 0.952941, 0.952941],
    cockpit1: [0.0, 0.062745, 0.247059],
    cockpit2: [0.121569, 0.572549, 0.854902],
    cockpit3: [0.509804, 0.952941, 0.952941],
    flameColor: '#ff4422'
  },
  Blue: {
    name: 'Cobalt Falcon',
    color1: [0.050980, 0.239216, 0.486275],
    color2: [0.254902, 0.270588, 0.282353],
    color3: [0.819608, 0.819608, 0.819608],
    logosColor: [0.964706, 0.772549, 0.058824],
    emission1: [0.0, 0.062745, 0.247059],
    emission2: [0.121569, 0.572549, 0.854902],
    emission3: [0.509804, 0.952941, 0.952941],
    cockpit1: [0.0, 0.062745, 0.247059],
    cockpit2: [0.121569, 0.572549, 0.854902],
    cockpit3: [0.509804, 0.952941, 0.952941],
    flameColor: '#38bdf8'
  },
  Cyan: {
    name: 'Cyan Interceptor',
    color1: [0.062745, 0.627451, 0.725490],
    color2: [0.152941, 0.152941, 0.152941],
    color3: [0.454902, 0.454902, 0.454902],
    logosColor: [0.964706, 0.772549, 0.058824],
    emission1: [0.0, 0.062745, 0.247059],
    emission2: [0.121569, 0.572549, 0.854902],
    emission3: [0.509804, 0.952941, 0.952941],
    cockpit1: [0.0, 0.062745, 0.247059],
    cockpit2: [0.121569, 0.572549, 0.854902],
    cockpit3: [0.509804, 0.952941, 0.952941],
    flameColor: '#00f5ff'
  },
  Orange: {
    name: 'Blaze Solar',
    color1: [0.600000, 0.376471, 0.027451],
    color2: [0.152941, 0.152941, 0.152941],
    color3: [0.454902, 0.454902, 0.454902],
    logosColor: [0.964706, 0.772549, 0.058824],
    emission1: [0.0, 0.062745, 0.247059],
    emission2: [0.121569, 0.572549, 0.854902],
    emission3: [0.509804, 0.952941, 0.952941],
    cockpit1: [0.0, 0.062745, 0.247059],
    cockpit2: [0.121569, 0.572549, 0.854902],
    cockpit3: [0.509804, 0.952941, 0.952941],
    flameColor: '#f97316'
  },
  Green: {
    name: 'Emerald Viper',
    color1: [0.094118, 0.270588, 0.160784],
    color2: [0.152941, 0.152941, 0.152941],
    color3: [0.486275, 0.345098, 0.321569],
    logosColor: [0.964706, 0.772549, 0.058824],
    emission1: [0.0, 0.062745, 0.247059],
    emission2: [0.121569, 0.572549, 0.854902],
    emission3: [0.509804, 0.952941, 0.952941],
    cockpit1: [0.0, 0.062745, 0.247059],
    cockpit2: [0.121569, 0.572549, 0.854902],
    cockpit3: [0.509804, 0.952941, 0.952941],
    flameColor: '#34d399'
  },
  Purple: {
    name: 'Void Phantom',
    color1: [0.184314, 0.098039, 0.349020],
    color2: [0.152941, 0.152941, 0.152941],
    color3: [0.454902, 0.454902, 0.454902],
    logosColor: [0.964706, 0.772549, 0.058824],
    emission1: [0.0, 0.062745, 0.247059],
    emission2: [0.121569, 0.572549, 0.854902],
    emission3: [0.509804, 0.952941, 0.952941],
    cockpit1: [0.0, 0.062745, 0.247059],
    cockpit2: [0.121569, 0.572549, 0.854902],
    cockpit3: [0.509804, 0.952941, 0.952941],
    flameColor: '#c084fc'
  },
  Yellow: {
    name: 'Gold Hornet',
    color1: [0.807843, 0.670588, 0.125490],
    color2: [0.152941, 0.152941, 0.152941],
    color3: [0.454902, 0.454902, 0.454902],
    logosColor: [0.964706, 0.772549, 0.058824],
    emission1: [0.0, 0.062745, 0.247059],
    emission2: [0.121569, 0.572549, 0.854902],
    emission3: [0.509804, 0.952941, 0.952941],
    cockpit1: [0.0, 0.062745, 0.247059],
    cockpit2: [0.121569, 0.572549, 0.854902],
    cockpit3: [0.509804, 0.952941, 0.952941],
    flameColor: '#facc15'
  },
  White: {
    name: 'Arctic Specter',
    color1: [0.701961, 0.701961, 0.701961],
    color2: [0.258824, 0.258824, 0.258824],
    color3: [0.584314, 0.584314, 0.584314],
    logosColor: [0.964706, 0.772549, 0.058824],
    emission1: [0.0, 0.062745, 0.247059],
    emission2: [0.121569, 0.572549, 0.854902],
    emission3: [0.509804, 0.952941, 0.952941],
    cockpit1: [0.0, 0.062745, 0.247059],
    cockpit2: [0.121569, 0.572549, 0.854902],
    cockpit3: [0.509804, 0.952941, 0.952941],
    flameColor: '#67e8f9'
  },
  Black: {
    name: 'Obsidian Shadow',
    color1: [0.149020, 0.149020, 0.149020],
    color2: [0.149020, 0.149020, 0.149020],
    color3: [0.454902, 0.454902, 0.454902],
    logosColor: [0.964706, 0.772549, 0.058824],
    emission1: [0.0, 0.062745, 0.247059],
    emission2: [0.121569, 0.572549, 0.854902],
    emission3: [0.509804, 0.952941, 0.952941],
    cockpit1: [0.0, 0.062745, 0.247059],
    cockpit2: [0.121569, 0.572549, 0.854902],
    cockpit3: [0.509804, 0.952941, 0.952941],
    flameColor: '#f43f5e'
  },
  Grey: {
    name: 'Titanium Dread',
    color1: [0.270588, 0.270588, 0.270588],
    color2: [0.152941, 0.152941, 0.152941],
    color3: [0.537255, 0.537255, 0.537255],
    logosColor: [0.964706, 0.772549, 0.058824],
    emission1: [0.0, 0.062745, 0.247059],
    emission2: [0.121569, 0.572549, 0.854902],
    emission3: [0.509804, 0.952941, 0.952941],
    cockpit1: [0.0, 0.062745, 0.247059],
    cockpit2: [0.121569, 0.572549, 0.854902],
    cockpit3: [0.509804, 0.952941, 0.952941],
    flameColor: '#94a3b8'
  }
};

export const THEME_KEYS = Object.keys(SPARROW_THEMES);

/**
 * Singleton Texture Manager for StarSparrow 2K textures
 */
class SparrowTextureManager {
  constructor() {
    this.textureCache = new Map();
    this.loader = new THREE.TextureLoader();
  }

  loadTexture(path) {
    if (!path) return Promise.resolve(null);
    if (this.textureCache.has(path)) {
      return Promise.resolve(this.textureCache.get(path));
    }

    return new Promise((resolve) => {
      this.loader.load(
        path,
        (tex) => {
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = true;
          this.textureCache.set(path, tex);
          resolve(tex);
        },
        undefined,
        (err) => {
          console.warn(`Failed to load texture ${path}, using fallback:`, err);
          const canvas = document.createElement('canvas');
          canvas.width = 2;
          canvas.height = 2;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 2, 2);
          const fallbackTex = new THREE.CanvasTexture(canvas);
          fallbackTex.wrapS = THREE.RepeatWrapping;
          fallbackTex.wrapT = THREE.RepeatWrapping;
          this.textureCache.set(path, fallbackTex);
          resolve(fallbackTex);
        }
      );
    });
  }

  loadTextureSet(texturePaths = {}) {
    const paths = {
      masksBC: texturePaths.masksBC || '/models/textures/StarSparrow_Masks_BC.png',
      logosCockpit: texturePaths.logosCockpit || '/models/textures/StarSparrow_Masks_LogosCockpit.png',
      wearout: texturePaths.wearout || '/models/textures/StarSparrow_Masks_Wearout.png',
      metallicSmoothness: texturePaths.metallicSmoothness || '/models/textures/StarSparrow_MetallicSmoothness.png',
      emission: texturePaths.emission || '/models/textures/StarSparrow_Masks_E.png',
      normal: texturePaths.normal || '/models/textures/StarSparrow_Normal.png'
    };

    return Promise.all([
      this.loadTexture(paths.masksBC),
      this.loadTexture(paths.logosCockpit),
      this.loadTexture(paths.wearout),
      this.loadTexture(paths.metallicSmoothness),
      this.loadTexture(paths.emission),
      this.loadTexture(paths.normal)
    ]).then(([colors, logosCockpit, wearout, metallicSmoothness, emission, normal]) => {
      return { colors, logosCockpit, wearout, metallicSmoothness, emission, normal };
    });
  }
}

export const sparrowTextureManager = new SparrowTextureManager();

/**
 * Creates an authentic Three.js PBR Material faithfully implementing
 * Unity's "Shader Graphs/EbalStudios_ColorizeSparrow"
 *
 * @param {string|object} themeOrConfig - Theme key (e.g. 'Red') OR full spaceship config object
 * @param {object} options - Optional overrides for colors, textures, wearout
 */
export function createStarSparrowMaterial(themeOrConfig = 'Red', options = {}) {
  let colors = {};
  let textures = {};
  let wearout = {};
  let themeKey = 'Red';

  if (typeof themeOrConfig === 'object' && themeOrConfig !== null) {
    colors = { ...(themeOrConfig.colors || {}) };
    textures = { ...(themeOrConfig.textures || {}) };
    wearout = { ...(themeOrConfig.wearout || {}) };
    themeKey = themeOrConfig.themeKey || themeOrConfig.name || 'Custom';
  } else {
    themeKey = themeOrConfig;
    const theme = SPARROW_THEMES[themeKey] || SPARROW_THEMES.Red;
    colors = {
      color1: theme.color1,
      color2: theme.color2,
      color3: theme.color3,
      logosColor: theme.logosColor,
      emission1: theme.emission1,
      emission2: theme.emission2,
      emission3: theme.emission3,
      cockpit1: theme.cockpit1,
      cockpit2: theme.cockpit2,
      cockpit3: theme.cockpit3
    };
    wearout = {
      dirty: 0.35,
      darken: 0.20,
      logos: 1.0,
      emissionMultiplier: 1.2,
      cockpitMultiplier: 1.3
    };
  }

  // Apply explicit option overrides if provided
  if (options.colors) Object.assign(colors, options.colors);
  if (options.textures) Object.assign(textures, options.textures);
  if (options.wearout) Object.assign(wearout, options.wearout);

  // Material uniforms reflecting Unity Shader Graph parameters
  const uniforms = {
    uColor1: { value: new THREE.Vector3(...(colors.color1 || [0.396, 0.098, 0.098])) },
    uColor2: { value: new THREE.Vector3(...(colors.color2 || [0.153, 0.153, 0.153])) },
    uColor3: { value: new THREE.Vector3(...(colors.color3 || [0.455, 0.455, 0.455])) },
    uLogosColor: { value: new THREE.Vector3(...(colors.logosColor || [0.965, 0.773, 0.059])) },
    uLogos: { value: wearout.logos !== undefined ? wearout.logos : 1.0 },
    uDirty: { value: wearout.dirty !== undefined ? wearout.dirty : 0.35 },
    uDarken: { value: wearout.darken !== undefined ? wearout.darken : 0.20 },

    uEmissionMultiplier: { value: wearout.emissionMultiplier !== undefined ? wearout.emissionMultiplier : 1.2 },
    uEmission1: { value: new THREE.Vector3(...(colors.emission1 || [0.0, 0.063, 0.247])) },
    uEmission2: { value: new THREE.Vector3(...(colors.emission2 || [0.122, 0.573, 0.855])) },
    uEmission3: { value: new THREE.Vector3(...(colors.emission3 || [0.510, 0.953, 0.953])) },

    uCockpitMultiplier: { value: wearout.cockpitMultiplier !== undefined ? wearout.cockpitMultiplier : 1.3 },
    uCockpit1: { value: new THREE.Vector3(...(colors.cockpit1 || [0.0, 0.063, 0.247])) },
    uCockpit2: { value: new THREE.Vector3(...(colors.cockpit2 || [0.122, 0.573, 0.855])) },
    uCockpit3: { value: new THREE.Vector3(...(colors.cockpit3 || [0.510, 0.953, 0.953])) },

    tColors: { value: null },
    tLogosCockpit: { value: null },
    tWearout: { value: null },
    tMetallicSmoothness: { value: null },
    tEmission: { value: null }
  };

  const material = new THREE.MeshStandardMaterial({
    roughness: 1.0,
    metalness: 1.0,
    envMapIntensity: 1.25,
    normalScale: new THREE.Vector2(1.0, 1.0)
  });

  material.defines = { USE_UV: '' };

  // Bind textures once loaded asynchronously
  sparrowTextureManager.loadTextureSet(textures).then((tex) => {
    uniforms.tColors.value = tex.colors;
    uniforms.tLogosCockpit.value = tex.logosCockpit;
    uniforms.tWearout.value = tex.wearout;
    uniforms.tMetallicSmoothness.value = tex.metallicSmoothness;
    uniforms.tEmission.value = tex.emission;
    material.normalMap = tex.normal;
    material.needsUpdate = true;
  });

  material.onBeforeCompile = (shader) => {
    // Merge custom uniforms
    Object.assign(shader.uniforms, uniforms);

    // Uniform declarations & color space conversion helper
    const uniformHeader = `
      uniform sampler2D tColors;
      uniform sampler2D tLogosCockpit;
      uniform sampler2D tWearout;
      uniform sampler2D tMetallicSmoothness;
      uniform sampler2D tEmission;

      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform vec3 uLogosColor;
      uniform float uLogos;
      uniform float uDirty;
      uniform float uDarken;

      uniform float uEmissionMultiplier;
      uniform vec3 uEmission1;
      uniform vec3 uEmission2;
      uniform vec3 uEmission3;

      uniform float uCockpitMultiplier;
      uniform vec3 uCockpit1;
      uniform vec3 uCockpit2;
      uniform vec3 uCockpit3;

      vec3 sparrowSRGBToLinear(vec3 c) {
        return pow(c, vec3(2.2));
      }
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>\n${uniformHeader}`
    );

    // 1. Base color calculation (TriColorAdd + Logos + Wearout)
    const colorFragmentLogic = `
      #include <color_fragment>

      // Sample StarSparrow texture maps
      vec4 colorsMask = texture2D(tColors, vUv);
      vec4 logosCockpit = texture2D(tLogosCockpit, vUv);
      vec4 wearout = texture2D(tWearout, vUv);
      vec4 metallicSmoothness = texture2D(tMetallicSmoothness, vUv);
      vec4 emissionSample = texture2D(tEmission, vUv);

      // SG_EbalStudiosTriColorAdd: Color = Color1*R + Color2*G + Color3*B
      vec3 triColor = uColor1 * colorsMask.r + uColor2 * colorsMask.g + uColor3 * colorsMask.b;

      // SG_EbalStudiosChannelMixerMult: mix(cleanLogo, wornLogo, uDirty) * uLogos
      float logoChannel = mix(logosCockpit.r, logosCockpit.g, clamp(uDirty, 0.0, 1.0)) * uLogos;

      // SG_EbalStudiosChannelOver3Color: blend logos over base color
      vec3 colorAfterLogos = mix(triColor, uLogosColor, logoChannel);

      // SG_EbalStudiosWearout: soot, peel, and darken masks
      float sootMask = wearout.r * uDirty;
      float peelMask = wearout.g * uDirty;
      float darkenMask = wearout.b * uDarken;

      // SG_EbalStudiosWearoutColor: peeled paint reveals bare metal (0.4862745 in sRGB)
      vec3 bareMetalColor = sparrowSRGBToLinear(vec3(0.4862745));
      vec3 peeledColor = mix(colorAfterLogos, bareMetalColor, peelMask);

      // Total soot & darken grime reduction
      float totalDarken = clamp(sootMask + darkenMask, 0.0, 1.0);
      vec3 finalBaseColor = peeledColor * (1.0 - totalDarken);

      diffuseColor.rgb = finalBaseColor;
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      colorFragmentLogic
    );

    // 2. Smoothness & Roughness calculation (SG_EbalStudiosSmoothness)
    const roughnessFragmentLogic = `
      float smoothnessClean = metallicSmoothness.a;
      float smoothnessDim = clamp(logoChannel + sootMask + darkenMask * 0.5, 0.0, 1.0);
      float finalSmoothness = smoothnessClean * (1.0 - smoothnessDim);
      float roughnessFactor = clamp(1.0 - finalSmoothness, 0.04, 1.0);
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      roughnessFragmentLogic
    );

    // 3. Metallic calculation (SG_EbalStudiosMetallic)
    const metalnessFragmentLogic = `
      vec3 metallicClean = metallicSmoothness.rgb;
      float metallicDim = clamp(logoChannel + sootMask + darkenMask + peelMask * 0.5, 0.0, 1.0);
      vec3 finalMetallic = metallicClean * (1.0 - metallicDim);
      float metalnessFactor = clamp(finalMetallic.r, 0.0, 1.0);
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <metalnessmap_fragment>',
      metalnessFragmentLogic
    );

    // 4. Multi-channel Emission calculation (SG_EbalStudiosTriColorAddMultSplit)
    const emissiveFragmentLogic = `
      #include <emissivemap_fragment>
      // Cockpit mask separates ship hull engines from cockpit canopy
      float cockpitMask = logosCockpit.b;
      vec3 hullEmission = (uEmission1 * emissionSample.r + uEmission2 * emissionSample.g + uEmission3 * emissionSample.b) * (1.0 - cockpitMask) * uEmissionMultiplier;
      vec3 cockpitEmission = (uCockpit1 * emissionSample.r + uCockpit2 * emissionSample.g + uCockpit3 * emissionSample.b) * cockpitMask * uCockpitMultiplier;
      totalEmissiveRadiance += (hullEmission + cockpitEmission);
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      emissiveFragmentLogic
    );
  };

  // Helper controls attached to material instance
  material.userData = {
    uniforms,
    currentThemeKey: themeKey,
    baseEmissionMultiplier: uniforms.uEmissionMultiplier.value
  };

  material.setTheme = (newKey) => {
    const t = SPARROW_THEMES[newKey];
    if (!t) return;
    material.userData.currentThemeKey = newKey;
    uniforms.uColor1.value.set(...t.color1);
    uniforms.uColor2.value.set(...t.color2);
    uniforms.uColor3.value.set(...t.color3);
    uniforms.uLogosColor.value.set(...t.logosColor);
    uniforms.uEmission1.value.set(...t.emission1);
    uniforms.uEmission2.value.set(...t.emission2);
    uniforms.uEmission3.value.set(...t.emission3);
    uniforms.uCockpit1.value.set(...t.cockpit1);
    uniforms.uCockpit2.value.set(...t.cockpit2);
    uniforms.uCockpit3.value.set(...t.cockpit3);
  };

  material.setDirty = (val) => {
    uniforms.uDirty.value = THREE.MathUtils.clamp(val, 0, 1);
  };

  material.setDarken = (val) => {
    uniforms.uDarken.value = THREE.MathUtils.clamp(val, 0, 2);
  };

  material.setEmissionMultiplier = (val) => {
    uniforms.uEmissionMultiplier.value = Math.max(0, val);
  };

  // Dynamic animation update (e.g. engine pulse during boost & throttle)
  material.updateFlightVFX = (dt, isBoosting, throttle = 1.0) => {
    const baseMult = material.userData.baseEmissionMultiplier;
    const targetMult = isBoosting
      ? baseMult * 2.8
      : (throttle > 0.1 ? baseMult * (1.0 + throttle * 0.4) : baseMult * 0.7);

    // Smooth lerp
    uniforms.uEmissionMultiplier.value = THREE.MathUtils.lerp(
      uniforms.uEmissionMultiplier.value,
      targetMult,
      Math.min(1.0, dt * 10.0)
    );
  };

  return material;
}
