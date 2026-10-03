/**
 * Spaceship Fleet Configuration
 * 
 * Defines full declarative configs for all 40 spaceships in the fleet:
 * - Model path & scale
 * - Texture paths (BaseColor masks, Logos/Cockpit, Wearout, Metallic/Smoothness, Emission, Normal map)
 * - Color channels matching Unity's EbalStudios_ColorizeSparrow shader
 * - Surface wearout properties (dirt, darken, logos, emission multipliers)
 * - Thrusters array: arbitrary thruster count, sizes, colors, and 3D offset positions from center (automatically calculated via mesh geometry detection)
 * - Shooting points array: weapon hardpoints, nozzle offsets, projectile colors, sizes, and types (automatically calculated via mesh geometry detection)
 * - Flight handling and physics dynamics (speed, acceleration, turn rates, boost energy)
 */

export const DEFAULT_SPARROW_TEXTURES = {
  "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
  "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
  "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
  "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
  "emission": "/models/textures/StarSparrow_Masks_E.png",
  "normal": "/models/textures/StarSparrow_Normal.png"
};

export const SPACESHIP_CONFIGS = [
  {
    "id": "starsparrow_1",
    "name": "StarSparrow 1",
    "title": "StarSparrow 1 \"Red Fury\"",
    "class": "Assault Fighter",
    "description": "High-agility StarSparrow variant configured for assault fighter operations with twin propulsion system.",
    "model": "/models/StarSparrow1.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.396078,
        0.098039,
        0.098039
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.22,
      "darken": 0.23,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.082,
          "z": 1.6
        },
        "size": {
          "radius": 0.183,
          "length": 0.73
        },
        "color": "#ff4422",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -1.311,
          "y": -0.271,
          "z": 1.46
        },
        "size": {
          "radius": 0.073,
          "length": 0.65
        },
        "color": "#ff4422",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 1.311,
          "y": -0.271,
          "z": 1.46
        },
        "size": {
          "radius": 0.073,
          "length": 0.65
        },
        "color": "#ff4422",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.019,
          "z": -1.653
        },
        "color": "#ff2244",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.708,
          "y": -0.14,
          "z": -0.161
        },
        "color": "#ff2244",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.708,
          "y": -0.14,
          "z": -0.161
        },
        "color": "#ff2244",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 55,
      "boostSpeed": 121,
      "reverseSpeed": -16,
      "acceleration": 31,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.95,
      "yawSpeed": 0.88,
      "rollSpeed": 1.37,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_2",
    "name": "StarSparrow 2",
    "title": "StarSparrow 2 \"Cobalt Falcon\"",
    "class": "Interceptor",
    "description": "High-agility StarSparrow variant configured for interceptor operations with triple delta propulsion system.",
    "model": "/models/StarSparrow2.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.05098,
        0.239216,
        0.486275
      ],
      "color2": [
        0.254902,
        0.270588,
        0.282353
      ],
      "color3": [
        0.819608,
        0.819608,
        0.819608
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.29,
      "darken": 0.11,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.177,
          "z": 1.86
        },
        "size": {
          "radius": 0.214,
          "length": 0.86
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -1.341,
          "y": -0.18,
          "z": 1.3
        },
        "size": {
          "radius": 0.241,
          "length": 0.96
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 1.341,
          "y": -0.18,
          "z": 1.3
        },
        "size": {
          "radius": 0.241,
          "length": 0.96
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.104,
          "z": -1.914
        },
        "color": "#00e5ff",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.602,
          "y": -0.249,
          "z": -0.338
        },
        "color": "#00e5ff",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.602,
          "y": -0.249,
          "z": -0.338
        },
        "color": "#00e5ff",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 51,
      "boostSpeed": 112.2,
      "reverseSpeed": -16,
      "acceleration": 34,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1,
      "yawSpeed": 0.91,
      "rollSpeed": 1.44,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_3",
    "name": "StarSparrow 3",
    "title": "StarSparrow 3 \"Cyan Interceptor\"",
    "class": "Recon Skiff",
    "description": "High-agility StarSparrow variant configured for recon skiff operations with single heavy propulsion system.",
    "model": "/models/StarSparrow3.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.062745,
        0.627451,
        0.72549
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.36,
      "darken": 0.24,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.245,
          "z": 2
        },
        "size": {
          "radius": 0.227,
          "length": 0.91
        },
        "color": "#00f5ff",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -1.168,
          "y": -0.054,
          "z": 1.82
        },
        "size": {
          "radius": 0.113,
          "length": 0.65
        },
        "color": "#00f5ff",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 1.168,
          "y": -0.054,
          "z": 1.82
        },
        "size": {
          "radius": 0.113,
          "length": 0.65
        },
        "color": "#00f5ff",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.167,
          "z": -2.05
        },
        "color": "#ff2255",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.541,
          "y": -0.44,
          "z": -0.34
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.541,
          "y": -0.44,
          "z": -0.34
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 47,
      "boostSpeed": 103.4,
      "reverseSpeed": -16,
      "acceleration": 37,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1.05,
      "yawSpeed": 0.94,
      "rollSpeed": 1.51,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_4",
    "name": "StarSparrow 4",
    "title": "StarSparrow 4 \"Blaze Solar\"",
    "class": "Heavy Gunship",
    "description": "High-agility StarSparrow variant configured for heavy gunship operations with quad propulsion system.",
    "model": "/models/StarSparrow4.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.6,
        0.376471,
        0.027451
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.43,
      "darken": 0.12,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.052,
          "z": 1.78
        },
        "size": {
          "radius": 0.201,
          "length": 0.8
        },
        "color": "#f97316",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -1.384,
          "y": -0.089,
          "z": 1.52
        },
        "size": {
          "radius": 0.098,
          "length": 0.65
        },
        "color": "#f97316",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 1.384,
          "y": -0.089,
          "z": 1.52
        },
        "size": {
          "radius": 0.098,
          "length": 0.65
        },
        "color": "#f97316",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.018,
          "z": -1.823
        },
        "color": "#ffaa00",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.606,
          "y": -0.185,
          "z": -0.561
        },
        "color": "#ffaa00",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.606,
          "y": -0.185,
          "z": -0.561
        },
        "color": "#ffaa00",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 58,
      "boostSpeed": 127.6,
      "reverseSpeed": -16,
      "acceleration": 28,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.9,
      "yawSpeed": 0.97,
      "rollSpeed": 1.33,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_5",
    "name": "StarSparrow 5",
    "title": "StarSparrow 5 \"Emerald Viper\"",
    "class": "Strike Fighter",
    "description": "High-agility StarSparrow variant configured for strike fighter operations with hex propulsion system.",
    "model": "/models/StarSparrow5.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.094118,
        0.270588,
        0.160784
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.486275,
        0.345098,
        0.321569
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.5,
      "darken": 0.25,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.172,
          "z": 1.94
        },
        "size": {
          "radius": 0.22,
          "length": 0.88
        },
        "color": "#10b981",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.327,
          "y": -0.322,
          "z": 1.1
        },
        "size": {
          "radius": 0.079,
          "length": 0.65
        },
        "color": "#10b981",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.327,
          "y": -0.322,
          "z": 1.1
        },
        "size": {
          "radius": 0.079,
          "length": 0.65
        },
        "color": "#10b981",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.096,
          "z": -1.996
        },
        "color": "#00ff88",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -1.592,
          "y": 0.198,
          "z": -1.632
        },
        "color": "#00ff88",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 1.592,
          "y": 0.198,
          "z": -1.632
        },
        "color": "#00ff88",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 54,
      "boostSpeed": 118.8,
      "reverseSpeed": -16,
      "acceleration": 31,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.95,
      "yawSpeed": 0.85,
      "rollSpeed": 1.4,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_6",
    "name": "StarSparrow 6",
    "title": "StarSparrow 6 \"Void Phantom\"",
    "class": "Stealth Bomber",
    "description": "High-agility StarSparrow variant configured for stealth bomber operations with twin propulsion system.",
    "model": "/models/StarSparrow6.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.184314,
        0.098039,
        0.34902
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.57,
      "darken": 0.13,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": 0.038,
          "z": 1.68
        },
        "size": {
          "radius": 0.079,
          "length": 0.65
        },
        "color": "#c084fc",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.147,
          "z": -2.05
        },
        "color": "#d946ef",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.5,
          "y": 0.053,
          "z": -0.785
        },
        "color": "#d946ef",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.5,
          "y": 0.053,
          "z": -0.785
        },
        "color": "#d946ef",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 50,
      "boostSpeed": 110,
      "reverseSpeed": -16,
      "acceleration": 34,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1,
      "yawSpeed": 0.88,
      "rollSpeed": 1.47,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_7",
    "name": "StarSparrow 7",
    "title": "StarSparrow 7 \"Gold Hornet\"",
    "class": "Racing Speeder",
    "description": "High-agility StarSparrow variant configured for racing speeder operations with triple delta propulsion system.",
    "model": "/models/StarSparrow7.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.807843,
        0.670588,
        0.12549
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.64,
      "darken": 0.26,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.068,
          "z": 1.72
        },
        "size": {
          "radius": 0.12,
          "length": 0.65
        },
        "color": "#facc15",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.646,
          "y": 0,
          "z": 2
        },
        "size": {
          "radius": 0.234,
          "length": 0.94
        },
        "color": "#facc15",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.646,
          "y": 0,
          "z": 2
        },
        "size": {
          "radius": 0.234,
          "length": 0.94
        },
        "color": "#facc15",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.061,
          "z": -2.05
        },
        "color": "#ffd700",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.479,
          "y": 0.031,
          "z": -1.369
        },
        "color": "#ffd700",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.479,
          "y": 0.031,
          "z": -1.369
        },
        "color": "#ffd700",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 46,
      "boostSpeed": 101.2,
      "reverseSpeed": -16,
      "acceleration": 37,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1.05,
      "yawSpeed": 0.91,
      "rollSpeed": 1.54,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_8",
    "name": "StarSparrow 8",
    "title": "StarSparrow 8 \"Arctic Specter\"",
    "class": "Orbital Scout",
    "description": "High-agility StarSparrow variant configured for orbital scout operations with single heavy propulsion system.",
    "model": "/models/StarSparrow8.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.701961,
        0.701961,
        0.701961
      ],
      "color2": [
        0.258824,
        0.258824,
        0.258824
      ],
      "color3": [
        0.584314,
        0.584314,
        0.584314
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.21,
      "darken": 0.14,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.084,
          "z": 1.96
        },
        "size": {
          "radius": 0.201,
          "length": 0.8
        },
        "color": "#67e8f9",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.624,
          "y": -0.005,
          "z": 1.4
        },
        "size": {
          "radius": 0.068,
          "length": 0.65
        },
        "color": "#67e8f9",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.624,
          "y": -0.005,
          "z": 1.4
        },
        "size": {
          "radius": 0.068,
          "length": 0.65
        },
        "color": "#67e8f9",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.033,
          "z": -2.05
        },
        "color": "#ff2255",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.553,
          "y": 0.012,
          "z": -0.28
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.553,
          "y": 0.012,
          "z": -0.28
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 57,
      "boostSpeed": 125.4,
      "reverseSpeed": -16,
      "acceleration": 28,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.9,
      "yawSpeed": 0.94,
      "rollSpeed": 1.36,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_9",
    "name": "StarSparrow 9",
    "title": "StarSparrow 9 \"Obsidian Shadow\"",
    "class": "Covert Infiltrator",
    "description": "High-agility StarSparrow variant configured for covert infiltrator operations with quad propulsion system.",
    "model": "/models/StarSparrow9.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.14902,
        0.14902,
        0.14902
      ],
      "color2": [
        0.14902,
        0.14902,
        0.14902
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.28,
      "darken": 0.27,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.031,
          "z": 1.64
        },
        "size": {
          "radius": 0.204,
          "length": 0.82
        },
        "color": "#f43f5e",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.102,
          "y": -0.235,
          "z": 1.2
        },
        "size": {
          "radius": 0.097,
          "length": 0.65
        },
        "color": "#f43f5e",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.102,
          "y": -0.235,
          "z": 1.2
        },
        "size": {
          "radius": 0.097,
          "length": 0.65
        },
        "color": "#f43f5e",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.048,
          "z": -2.05
        },
        "color": "#f43f5e",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.982,
          "y": -0.076,
          "z": -0.109
        },
        "color": "#f43f5e",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.982,
          "y": -0.076,
          "z": -0.109
        },
        "color": "#f43f5e",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 53,
      "boostSpeed": 116.6,
      "reverseSpeed": -16,
      "acceleration": 31,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.95,
      "yawSpeed": 0.97,
      "rollSpeed": 1.43,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_10",
    "name": "StarSparrow 10",
    "title": "StarSparrow 10 \"Titanium Dread\"",
    "class": "Dreadnought Escort",
    "description": "High-agility StarSparrow variant configured for dreadnought escort operations with hex propulsion system.",
    "model": "/models/StarSparrow10.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.270588,
        0.270588,
        0.270588
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.537255,
        0.537255,
        0.537255
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.35,
      "darken": 0.15,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.165,
          "z": 1.82
        },
        "size": {
          "radius": 0.22,
          "length": 0.88
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -1.126,
          "y": 0.36,
          "z": 1.94
        },
        "size": {
          "radius": 0.102,
          "length": 0.65
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 1.126,
          "y": 0.36,
          "z": 1.94
        },
        "size": {
          "radius": 0.102,
          "length": 0.65
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.087,
          "z": -2.05
        },
        "color": "#00f0ff",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.874,
          "y": 0.066,
          "z": 0.219
        },
        "color": "#00f0ff",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.874,
          "y": 0.066,
          "z": 0.219
        },
        "color": "#00f0ff",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 49,
      "boostSpeed": 107.8,
      "reverseSpeed": -16,
      "acceleration": 34,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1,
      "yawSpeed": 0.85,
      "rollSpeed": 1.5,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_11",
    "name": "StarSparrow 11",
    "title": "StarSparrow 11 \"Red Fury\"",
    "class": "Assault Fighter",
    "description": "High-agility StarSparrow variant configured for assault fighter operations with twin propulsion system.",
    "model": "/models/StarSparrow11.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.396078,
        0.098039,
        0.098039
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.42,
      "darken": 0.28,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.02,
          "z": 1.78
        },
        "size": {
          "radius": 0.194,
          "length": 0.78
        },
        "color": "#ff4422",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -1.609,
          "y": 0.007,
          "z": 1.32
        },
        "size": {
          "radius": 0.185,
          "length": 0.74
        },
        "color": "#ff4422",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 1.609,
          "y": 0.007,
          "z": 1.32
        },
        "size": {
          "radius": 0.185,
          "length": 0.74
        },
        "color": "#ff4422",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.073,
          "z": -2.05
        },
        "color": "#ff2244",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.861,
          "y": 0.023,
          "z": -0.936
        },
        "color": "#ff2244",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.861,
          "y": 0.023,
          "z": -0.936
        },
        "color": "#ff2244",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 45,
      "boostSpeed": 99,
      "reverseSpeed": -16,
      "acceleration": 37,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1.05,
      "yawSpeed": 0.88,
      "rollSpeed": 1.32,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_12",
    "name": "StarSparrow 12",
    "title": "StarSparrow 12 \"Cobalt Falcon\"",
    "class": "Interceptor",
    "description": "High-agility StarSparrow variant configured for interceptor operations with triple delta propulsion system.",
    "model": "/models/StarSparrow12.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.05098,
        0.239216,
        0.486275
      ],
      "color2": [
        0.254902,
        0.270588,
        0.282353
      ],
      "color3": [
        0.819608,
        0.819608,
        0.819608
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.49,
      "darken": 0.16,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.013,
          "z": 2
        },
        "size": {
          "radius": 0.222,
          "length": 0.89
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.231,
          "y": -0.089,
          "z": 1.14
        },
        "size": {
          "radius": 0.14,
          "length": 0.65
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.231,
          "y": -0.089,
          "z": 1.14
        },
        "size": {
          "radius": 0.14,
          "length": 0.65
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.078,
          "z": -2.05
        },
        "color": "#00e5ff",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.419,
          "y": -0.042,
          "z": -0.592
        },
        "color": "#00e5ff",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.419,
          "y": -0.042,
          "z": -0.592
        },
        "color": "#00e5ff",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 56,
      "boostSpeed": 123.2,
      "reverseSpeed": -16,
      "acceleration": 28,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.9,
      "yawSpeed": 0.91,
      "rollSpeed": 1.39,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_13",
    "name": "StarSparrow 13",
    "title": "StarSparrow 13 \"Cyan Interceptor\"",
    "class": "Recon Skiff",
    "description": "High-agility StarSparrow variant configured for recon skiff operations with single heavy propulsion system.",
    "model": "/models/StarSparrow13.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.062745,
        0.627451,
        0.72549
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.56,
      "darken": 0.29,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": 0.061,
          "z": 2
        },
        "size": {
          "radius": 0.213,
          "length": 0.85
        },
        "color": "#00f5ff",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.243,
          "y": -0.089,
          "z": 1.38
        },
        "size": {
          "radius": 0.085,
          "length": 0.65
        },
        "color": "#00f5ff",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.243,
          "y": -0.089,
          "z": 1.38
        },
        "size": {
          "radius": 0.085,
          "length": 0.65
        },
        "color": "#00f5ff",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.139,
          "z": -2.05
        },
        "color": "#ff2255",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.967,
          "y": -0.486,
          "z": -0.977
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.967,
          "y": -0.486,
          "z": -0.977
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 52,
      "boostSpeed": 114.4,
      "reverseSpeed": -16,
      "acceleration": 31,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.95,
      "yawSpeed": 0.94,
      "rollSpeed": 1.46,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_14",
    "name": "StarSparrow 14",
    "title": "StarSparrow 14 \"Blaze Solar\"",
    "class": "Heavy Gunship",
    "description": "High-agility StarSparrow variant configured for heavy gunship operations with quad propulsion system.",
    "model": "/models/StarSparrow14.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.6,
        0.376471,
        0.027451
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.63,
      "darken": 0.17,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.109,
          "z": 2
        },
        "size": {
          "radius": 0.206,
          "length": 0.82
        },
        "color": "#f97316",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -1.229,
          "y": -0.017,
          "z": 1.02
        },
        "size": {
          "radius": 0.13,
          "length": 0.65
        },
        "color": "#f97316",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 1.229,
          "y": -0.017,
          "z": 1.02
        },
        "size": {
          "radius": 0.13,
          "length": 0.65
        },
        "color": "#f97316",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.003,
          "z": -2.05
        },
        "color": "#ffaa00",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.46,
          "y": -0.067,
          "z": -0.502
        },
        "color": "#ffaa00",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.46,
          "y": -0.067,
          "z": -0.502
        },
        "color": "#ffaa00",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 48,
      "boostSpeed": 105.6,
      "reverseSpeed": -16,
      "acceleration": 34,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1,
      "yawSpeed": 0.97,
      "rollSpeed": 1.53,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_15",
    "name": "StarSparrow 15",
    "title": "StarSparrow 15 \"Emerald Viper\"",
    "class": "Strike Fighter",
    "description": "High-agility StarSparrow variant configured for strike fighter operations with hex propulsion system.",
    "model": "/models/StarSparrow15.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.094118,
        0.270588,
        0.160784
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.486275,
        0.345098,
        0.321569
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.2,
      "darken": 0.3,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.018,
          "z": 2
        },
        "size": {
          "radius": 0.198,
          "length": 0.79
        },
        "color": "#10b981",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -1.269,
          "y": 0.015,
          "z": 1.66
        },
        "size": {
          "radius": 0.095,
          "length": 0.65
        },
        "color": "#10b981",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 1.269,
          "y": 0.015,
          "z": 1.66
        },
        "size": {
          "radius": 0.095,
          "length": 0.65
        },
        "color": "#10b981",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.073,
          "z": -2.05
        },
        "color": "#00ff88",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.436,
          "y": 0.024,
          "z": 0.198
        },
        "color": "#00ff88",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.436,
          "y": 0.024,
          "z": 0.198
        },
        "color": "#00ff88",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 44,
      "boostSpeed": 96.8,
      "reverseSpeed": -16,
      "acceleration": 37,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1.05,
      "yawSpeed": 0.85,
      "rollSpeed": 1.35,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_16",
    "name": "StarSparrow 16",
    "title": "StarSparrow 16 \"Void Phantom\"",
    "class": "Stealth Bomber",
    "description": "High-agility StarSparrow variant configured for stealth bomber operations with twin propulsion system.",
    "model": "/models/StarSparrow16.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.184314,
        0.098039,
        0.34902
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.27,
      "darken": 0.18,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": 0.257,
          "z": 2
        },
        "size": {
          "radius": 0.192,
          "length": 0.77
        },
        "color": "#c084fc",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -1.137,
          "y": -0.435,
          "z": 1.14
        },
        "size": {
          "radius": 0.084,
          "length": 0.65
        },
        "color": "#c084fc",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 1.137,
          "y": -0.435,
          "z": 1.14
        },
        "size": {
          "radius": 0.084,
          "length": 0.65
        },
        "color": "#c084fc",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.325,
          "z": -2.05
        },
        "color": "#d946ef",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -1.085,
          "y": -0.37,
          "z": -0.702
        },
        "color": "#d946ef",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 1.085,
          "y": -0.37,
          "z": -0.702
        },
        "color": "#d946ef",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 55,
      "boostSpeed": 121,
      "reverseSpeed": -16,
      "acceleration": 28,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.9,
      "yawSpeed": 0.88,
      "rollSpeed": 1.42,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_17",
    "name": "StarSparrow 17",
    "title": "StarSparrow 17 \"Gold Hornet\"",
    "class": "Racing Speeder",
    "description": "High-agility StarSparrow variant configured for racing speeder operations with triple delta propulsion system.",
    "model": "/models/StarSparrow17.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.807843,
        0.670588,
        0.12549
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.34,
      "darken": 0.31,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.072,
          "z": 1.88
        },
        "size": {
          "radius": 0.079,
          "length": 0.65
        },
        "color": "#facc15",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -1.305,
          "y": -0.111,
          "z": 1.68
        },
        "size": {
          "radius": 0.291,
          "length": 1.16
        },
        "color": "#facc15",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 1.305,
          "y": -0.111,
          "z": 1.68
        },
        "size": {
          "radius": 0.291,
          "length": 1.16
        },
        "color": "#facc15",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.068,
          "z": -2.05
        },
        "color": "#ffd700",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.529,
          "y": -0.112,
          "z": -0.768
        },
        "color": "#ffd700",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.529,
          "y": -0.112,
          "z": -0.768
        },
        "color": "#ffd700",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 51,
      "boostSpeed": 112.2,
      "reverseSpeed": -16,
      "acceleration": 31,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.95,
      "yawSpeed": 0.91,
      "rollSpeed": 1.49,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_18",
    "name": "StarSparrow 18",
    "title": "StarSparrow 18 \"Arctic Specter\"",
    "class": "Orbital Scout",
    "description": "High-agility StarSparrow variant configured for orbital scout operations with single heavy propulsion system.",
    "model": "/models/StarSparrow18.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.701961,
        0.701961,
        0.701961
      ],
      "color2": [
        0.258824,
        0.258824,
        0.258824
      ],
      "color3": [
        0.584314,
        0.584314,
        0.584314
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.41,
      "darken": 0.19,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.124,
          "z": 2
        },
        "size": {
          "radius": 0.199,
          "length": 0.8
        },
        "color": "#67e8f9",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.177,
          "y": 0.127,
          "z": 1.1
        },
        "size": {
          "radius": 0.087,
          "length": 0.65
        },
        "color": "#67e8f9",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.177,
          "y": 0.127,
          "z": 1.1
        },
        "size": {
          "radius": 0.087,
          "length": 0.65
        },
        "color": "#67e8f9",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.067,
          "z": -2.05
        },
        "color": "#ff2255",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.414,
          "y": -0.002,
          "z": -1.145
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.414,
          "y": -0.002,
          "z": -1.145
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 47,
      "boostSpeed": 103.4,
      "reverseSpeed": -16,
      "acceleration": 34,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1,
      "yawSpeed": 0.94,
      "rollSpeed": 1.31,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_19",
    "name": "StarSparrow 19",
    "title": "StarSparrow 19 \"Obsidian Shadow\"",
    "class": "Covert Infiltrator",
    "description": "High-agility StarSparrow variant configured for covert infiltrator operations with quad propulsion system.",
    "model": "/models/StarSparrow19.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.14902,
        0.14902,
        0.14902
      ],
      "color2": [
        0.14902,
        0.14902,
        0.14902
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.48,
      "darken": 0.32,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.323,
          "z": 1.52
        },
        "size": {
          "radius": 0.306,
          "length": 1.22
        },
        "color": "#f43f5e",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.27,
          "y": -0.602,
          "z": 1.38
        },
        "size": {
          "radius": 0.123,
          "length": 0.65
        },
        "color": "#f43f5e",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.27,
          "y": -0.602,
          "z": 1.38
        },
        "size": {
          "radius": 0.123,
          "length": 0.65
        },
        "color": "#f43f5e",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.277,
          "z": -2.05
        },
        "color": "#f43f5e",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.83,
          "y": -0.083,
          "z": -0.015
        },
        "color": "#f43f5e",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.83,
          "y": -0.083,
          "z": -0.015
        },
        "color": "#f43f5e",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 58,
      "boostSpeed": 127.6,
      "reverseSpeed": -16,
      "acceleration": 37,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1.05,
      "yawSpeed": 0.97,
      "rollSpeed": 1.38,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_20",
    "name": "StarSparrow 20",
    "title": "StarSparrow 20 \"Titanium Dread\"",
    "class": "Dreadnought Escort",
    "description": "High-agility StarSparrow variant configured for dreadnought escort operations with hex propulsion system.",
    "model": "/models/StarSparrow20.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.270588,
        0.270588,
        0.270588
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.537255,
        0.537255,
        0.537255
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.55,
      "darken": 0.2,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.001,
          "z": 1.46
        },
        "size": {
          "radius": 0.2,
          "length": 0.8
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.508,
          "y": -0.135,
          "z": 1.74
        },
        "size": {
          "radius": 0.207,
          "length": 0.83
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.508,
          "y": -0.135,
          "z": 1.74
        },
        "size": {
          "radius": 0.207,
          "length": 0.83
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.054,
          "z": -2.05
        },
        "color": "#00f0ff",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.461,
          "y": -0.005,
          "z": -0.009
        },
        "color": "#00f0ff",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.461,
          "y": -0.005,
          "z": -0.009
        },
        "color": "#00f0ff",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 54,
      "boostSpeed": 118.8,
      "reverseSpeed": -16,
      "acceleration": 28,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.9,
      "yawSpeed": 0.85,
      "rollSpeed": 1.45,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_21",
    "name": "StarSparrow 21",
    "title": "StarSparrow 21 \"Red Fury\"",
    "class": "Assault Fighter",
    "description": "High-agility StarSparrow variant configured for assault fighter operations with twin propulsion system.",
    "model": "/models/StarSparrow21.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.396078,
        0.098039,
        0.098039
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.62,
      "darken": 0.33,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": 0.046,
          "z": 1.98
        },
        "size": {
          "radius": 0.148,
          "length": 0.65
        },
        "color": "#ff4422",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -1.629,
          "y": -0.812,
          "z": 1.64
        },
        "size": {
          "radius": 0.138,
          "length": 0.65
        },
        "color": "#ff4422",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 1.629,
          "y": -0.812,
          "z": 1.64
        },
        "size": {
          "radius": 0.138,
          "length": 0.65
        },
        "color": "#ff4422",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.017,
          "z": -2.05
        },
        "color": "#ff2244",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.548,
          "y": -0.322,
          "z": -0.419
        },
        "color": "#ff2244",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.548,
          "y": -0.322,
          "z": -0.419
        },
        "color": "#ff2244",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 50,
      "boostSpeed": 110,
      "reverseSpeed": -16,
      "acceleration": 31,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.95,
      "yawSpeed": 0.88,
      "rollSpeed": 1.52,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_22",
    "name": "StarSparrow 22",
    "title": "StarSparrow 22 \"Cobalt Falcon\"",
    "class": "Interceptor",
    "description": "High-agility StarSparrow variant configured for interceptor operations with triple delta propulsion system.",
    "model": "/models/StarSparrow22.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.05098,
        0.239216,
        0.486275
      ],
      "color2": [
        0.254902,
        0.270588,
        0.282353
      ],
      "color3": [
        0.819608,
        0.819608,
        0.819608
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.19,
      "darken": 0.21,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.23,
          "z": 1.64
        },
        "size": {
          "radius": 0.29,
          "length": 1.16
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.621,
          "y": -0.389,
          "z": 2
        },
        "size": {
          "radius": 0.237,
          "length": 0.95
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.621,
          "y": -0.389,
          "z": 2
        },
        "size": {
          "radius": 0.237,
          "length": 0.95
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.188,
          "z": -2.05
        },
        "color": "#00e5ff",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.621,
          "y": -0.214,
          "z": 0.004
        },
        "color": "#00e5ff",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.621,
          "y": -0.214,
          "z": 0.004
        },
        "color": "#00e5ff",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 46,
      "boostSpeed": 101.2,
      "reverseSpeed": -16,
      "acceleration": 34,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1,
      "yawSpeed": 0.91,
      "rollSpeed": 1.34,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_23",
    "name": "StarSparrow 23",
    "title": "StarSparrow 23 \"Cyan Interceptor\"",
    "class": "Recon Skiff",
    "description": "High-agility StarSparrow variant configured for recon skiff operations with single heavy propulsion system.",
    "model": "/models/StarSparrow23.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.062745,
        0.627451,
        0.72549
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.26,
      "darken": 0.34,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.193,
          "z": 2
        },
        "size": {
          "radius": 0.21,
          "length": 0.84
        },
        "color": "#00f5ff",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.144,
          "z": -2.031
        },
        "color": "#ff2255",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.504,
          "y": -0.139,
          "z": -1.141
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.504,
          "y": -0.139,
          "z": -1.141
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 57,
      "boostSpeed": 125.4,
      "reverseSpeed": -16,
      "acceleration": 37,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1.05,
      "yawSpeed": 0.94,
      "rollSpeed": 1.41,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_24",
    "name": "StarSparrow 24",
    "title": "StarSparrow 24 \"Blaze Solar\"",
    "class": "Heavy Gunship",
    "description": "High-agility StarSparrow variant configured for heavy gunship operations with quad propulsion system.",
    "model": "/models/StarSparrow24.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.6,
        0.376471,
        0.027451
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.33,
      "darken": 0.22,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.186,
          "z": 2
        },
        "size": {
          "radius": 0.184,
          "length": 0.74
        },
        "color": "#f97316",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.128,
          "z": -2.05
        },
        "color": "#ffaa00",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.597,
          "y": -0.043,
          "z": -0.986
        },
        "color": "#ffaa00",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.597,
          "y": -0.043,
          "z": -0.986
        },
        "color": "#ffaa00",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 53,
      "boostSpeed": 116.6,
      "reverseSpeed": -16,
      "acceleration": 28,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.9,
      "yawSpeed": 0.97,
      "rollSpeed": 1.48,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_25",
    "name": "StarSparrow 25",
    "title": "StarSparrow 25 \"Emerald Viper\"",
    "class": "Strike Fighter",
    "description": "High-agility StarSparrow variant configured for strike fighter operations with hex propulsion system.",
    "model": "/models/StarSparrow25.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.094118,
        0.270588,
        0.160784
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.486275,
        0.345098,
        0.321569
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.4,
      "darken": 0.1,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.182,
          "z": 1.9
        },
        "size": {
          "radius": 0.313,
          "length": 1.25
        },
        "color": "#10b981",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.612,
          "y": -0.239,
          "z": 2
        },
        "size": {
          "radius": 0.183,
          "length": 0.73
        },
        "color": "#10b981",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.612,
          "y": -0.239,
          "z": 2
        },
        "size": {
          "radius": 0.183,
          "length": 0.73
        },
        "color": "#10b981",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.143,
          "z": -2.05
        },
        "color": "#00ff88",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.504,
          "y": -0.337,
          "z": 0.424
        },
        "color": "#00ff88",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.504,
          "y": -0.337,
          "z": 0.424
        },
        "color": "#00ff88",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 49,
      "boostSpeed": 107.8,
      "reverseSpeed": -16,
      "acceleration": 31,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.95,
      "yawSpeed": 0.85,
      "rollSpeed": 1.3,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_26",
    "name": "StarSparrow 26",
    "title": "StarSparrow 26 \"Void Phantom\"",
    "class": "Stealth Bomber",
    "description": "High-agility StarSparrow variant configured for stealth bomber operations with twin propulsion system.",
    "model": "/models/StarSparrow26.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.184314,
        0.098039,
        0.34902
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.47,
      "darken": 0.23,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.191,
          "z": 1.82
        },
        "size": {
          "radius": 0.256,
          "length": 1.02
        },
        "color": "#c084fc",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -1.462,
          "y": -0.514,
          "z": 2
        },
        "size": {
          "radius": 0.216,
          "length": 0.86
        },
        "color": "#c084fc",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 1.462,
          "y": -0.514,
          "z": 2
        },
        "size": {
          "radius": 0.216,
          "length": 0.86
        },
        "color": "#c084fc",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.106,
          "z": -1.789
        },
        "color": "#d946ef",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.795,
          "y": -0.063,
          "z": -2.05
        },
        "color": "#d946ef",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.795,
          "y": -0.063,
          "z": -2.05
        },
        "color": "#d946ef",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 45,
      "boostSpeed": 99,
      "reverseSpeed": -16,
      "acceleration": 34,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1,
      "yawSpeed": 0.88,
      "rollSpeed": 1.37,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_27",
    "name": "StarSparrow 27",
    "title": "StarSparrow 27 \"Gold Hornet\"",
    "class": "Racing Speeder",
    "description": "High-agility StarSparrow variant configured for racing speeder operations with triple delta propulsion system.",
    "model": "/models/StarSparrow27.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.807843,
        0.670588,
        0.12549
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.54,
      "darken": 0.11,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.349,
          "z": 1.9
        },
        "size": {
          "radius": 0.088,
          "length": 0.65
        },
        "color": "#facc15",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -1.167,
          "y": -0.015,
          "z": 1.48
        },
        "size": {
          "radius": 0.067,
          "length": 0.65
        },
        "color": "#facc15",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 1.167,
          "y": -0.015,
          "z": 1.48
        },
        "size": {
          "radius": 0.067,
          "length": 0.65
        },
        "color": "#facc15",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.073,
          "z": -2.05
        },
        "color": "#ffd700",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.425,
          "y": -0.132,
          "z": 0.061
        },
        "color": "#ffd700",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.425,
          "y": -0.132,
          "z": 0.061
        },
        "color": "#ffd700",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 56,
      "boostSpeed": 123.2,
      "reverseSpeed": -16,
      "acceleration": 37,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1.05,
      "yawSpeed": 0.91,
      "rollSpeed": 1.44,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_28",
    "name": "StarSparrow 28",
    "title": "StarSparrow 28 \"Arctic Specter\"",
    "class": "Orbital Scout",
    "description": "High-agility StarSparrow variant configured for orbital scout operations with single heavy propulsion system.",
    "model": "/models/StarSparrow28.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.701961,
        0.701961,
        0.701961
      ],
      "color2": [
        0.258824,
        0.258824,
        0.258824
      ],
      "color3": [
        0.584314,
        0.584314,
        0.584314
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.61,
      "darken": 0.24,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": 0.234,
          "z": 1.76
        },
        "size": {
          "radius": 0.216,
          "length": 0.86
        },
        "color": "#67e8f9",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.586,
          "y": 0.158,
          "z": 1.04
        },
        "size": {
          "radius": 0.21,
          "length": 0.84
        },
        "color": "#67e8f9",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.586,
          "y": 0.158,
          "z": 1.04
        },
        "size": {
          "radius": 0.21,
          "length": 0.84
        },
        "color": "#67e8f9",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.32,
          "z": -2.05
        },
        "color": "#ff2255",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.513,
          "y": 0.289,
          "z": -0.391
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.513,
          "y": 0.289,
          "z": -0.391
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 52,
      "boostSpeed": 114.4,
      "reverseSpeed": -16,
      "acceleration": 28,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.9,
      "yawSpeed": 0.94,
      "rollSpeed": 1.51,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_29",
    "name": "StarSparrow 29",
    "title": "StarSparrow 29 \"Obsidian Shadow\"",
    "class": "Covert Infiltrator",
    "description": "High-agility StarSparrow variant configured for covert infiltrator operations with quad propulsion system.",
    "model": "/models/StarSparrow29.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.14902,
        0.14902,
        0.14902
      ],
      "color2": [
        0.14902,
        0.14902,
        0.14902
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.18,
      "darken": 0.12,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.105,
          "z": 1.88
        },
        "size": {
          "radius": 0.164,
          "length": 0.66
        },
        "color": "#f43f5e",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.721,
          "y": -0.188,
          "z": 2
        },
        "size": {
          "radius": 0.187,
          "length": 0.75
        },
        "color": "#f43f5e",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.721,
          "y": -0.188,
          "z": 2
        },
        "size": {
          "radius": 0.187,
          "length": 0.75
        },
        "color": "#f43f5e",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.116,
          "z": -2.05
        },
        "color": "#f43f5e",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.524,
          "y": -0.305,
          "z": 0.303
        },
        "color": "#f43f5e",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.524,
          "y": -0.305,
          "z": 0.303
        },
        "color": "#f43f5e",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 48,
      "boostSpeed": 105.6,
      "reverseSpeed": -16,
      "acceleration": 31,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.95,
      "yawSpeed": 0.97,
      "rollSpeed": 1.33,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_30",
    "name": "StarSparrow 30",
    "title": "StarSparrow 30 \"Titanium Dread\"",
    "class": "Dreadnought Escort",
    "description": "High-agility StarSparrow variant configured for dreadnought escort operations with hex propulsion system.",
    "model": "/models/StarSparrow30.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.270588,
        0.270588,
        0.270588
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.537255,
        0.537255,
        0.537255
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.25,
      "darken": 0.25,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": 0.05,
          "z": 2
        },
        "size": {
          "radius": 0.201,
          "length": 0.8
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.78,
          "y": -0.253,
          "z": 1.16
        },
        "size": {
          "radius": 0.227,
          "length": 0.91
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.78,
          "y": -0.253,
          "z": 1.16
        },
        "size": {
          "radius": 0.227,
          "length": 0.91
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.213,
          "z": -2.05
        },
        "color": "#00f0ff",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.451,
          "y": -0.185,
          "z": -1.758
        },
        "color": "#00f0ff",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.451,
          "y": -0.185,
          "z": -1.758
        },
        "color": "#00f0ff",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 44,
      "boostSpeed": 96.8,
      "reverseSpeed": -16,
      "acceleration": 34,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1,
      "yawSpeed": 0.85,
      "rollSpeed": 1.4,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_31",
    "name": "StarSparrow 31",
    "title": "StarSparrow 31 \"Red Fury\"",
    "class": "Assault Fighter",
    "description": "High-agility StarSparrow variant configured for assault fighter operations with twin propulsion system.",
    "model": "/models/StarSparrow31.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.396078,
        0.098039,
        0.098039
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.32,
      "darken": 0.13,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.14,
          "z": 2
        },
        "size": {
          "radius": 0.192,
          "length": 0.77
        },
        "color": "#ff4422",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.986,
          "y": -0.623,
          "z": 1.48
        },
        "size": {
          "radius": 0.064,
          "length": 0.65
        },
        "color": "#ff4422",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.986,
          "y": -0.623,
          "z": 1.48
        },
        "size": {
          "radius": 0.064,
          "length": 0.65
        },
        "color": "#ff4422",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.07,
          "z": -2.05
        },
        "color": "#ff2244",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.77,
          "y": -0.319,
          "z": -0.863
        },
        "color": "#ff2244",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.77,
          "y": -0.319,
          "z": -0.863
        },
        "color": "#ff2244",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 55,
      "boostSpeed": 121,
      "reverseSpeed": -16,
      "acceleration": 37,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1.05,
      "yawSpeed": 0.88,
      "rollSpeed": 1.47,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_32",
    "name": "StarSparrow 32",
    "title": "StarSparrow 32 \"Cobalt Falcon\"",
    "class": "Interceptor",
    "description": "High-agility StarSparrow variant configured for interceptor operations with triple delta propulsion system.",
    "model": "/models/StarSparrow32.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.05098,
        0.239216,
        0.486275
      ],
      "color2": [
        0.254902,
        0.270588,
        0.282353
      ],
      "color3": [
        0.819608,
        0.819608,
        0.819608
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.39,
      "darken": 0.26,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.328,
          "z": 2
        },
        "size": {
          "radius": 0.218,
          "length": 0.87
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.74,
          "y": -0.323,
          "z": 1.52
        },
        "size": {
          "radius": 0.278,
          "length": 1.11
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.74,
          "y": -0.323,
          "z": 1.52
        },
        "size": {
          "radius": 0.278,
          "length": 1.11
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.25,
          "z": -2.05
        },
        "color": "#00e5ff",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.446,
          "y": -0.192,
          "z": -0.738
        },
        "color": "#00e5ff",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.446,
          "y": -0.192,
          "z": -0.738
        },
        "color": "#00e5ff",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 51,
      "boostSpeed": 112.2,
      "reverseSpeed": -16,
      "acceleration": 28,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.9,
      "yawSpeed": 0.91,
      "rollSpeed": 1.54,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_33",
    "name": "StarSparrow 33",
    "title": "StarSparrow 33 \"Cyan Interceptor\"",
    "class": "Recon Skiff",
    "description": "High-agility StarSparrow variant configured for recon skiff operations with single heavy propulsion system.",
    "model": "/models/StarSparrow33.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.062745,
        0.627451,
        0.72549
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.46,
      "darken": 0.14,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.376,
          "z": 2
        },
        "size": {
          "radius": 0.193,
          "length": 0.77
        },
        "color": "#00f5ff",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.516,
          "y": -0.301,
          "z": 1.74
        },
        "size": {
          "radius": 0.233,
          "length": 0.93
        },
        "color": "#00f5ff",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.516,
          "y": -0.301,
          "z": 1.74
        },
        "size": {
          "radius": 0.233,
          "length": 0.93
        },
        "color": "#00f5ff",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.168,
          "z": -2.05
        },
        "color": "#ff2255",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.6,
          "y": -0.105,
          "z": 0.177
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.6,
          "y": -0.105,
          "z": 0.177
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 47,
      "boostSpeed": 103.4,
      "reverseSpeed": -16,
      "acceleration": 31,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.95,
      "yawSpeed": 0.94,
      "rollSpeed": 1.36,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_34",
    "name": "StarSparrow 34",
    "title": "StarSparrow 34 \"Blaze Solar\"",
    "class": "Heavy Gunship",
    "description": "High-agility StarSparrow variant configured for heavy gunship operations with quad propulsion system.",
    "model": "/models/StarSparrow34.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.6,
        0.376471,
        0.027451
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.53,
      "darken": 0.27,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.311,
          "z": 1.86
        },
        "size": {
          "radius": 0.31,
          "length": 1.24
        },
        "color": "#f97316",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.516,
          "y": -0.456,
          "z": 1.98
        },
        "size": {
          "radius": 0.186,
          "length": 0.74
        },
        "color": "#f97316",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.516,
          "y": -0.456,
          "z": 1.98
        },
        "size": {
          "radius": 0.186,
          "length": 0.74
        },
        "color": "#f97316",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.272,
          "z": -2.05
        },
        "color": "#ffaa00",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.508,
          "y": -0.289,
          "z": -0.499
        },
        "color": "#ffaa00",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.508,
          "y": -0.289,
          "z": -0.499
        },
        "color": "#ffaa00",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 58,
      "boostSpeed": 127.6,
      "reverseSpeed": -16,
      "acceleration": 34,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1,
      "yawSpeed": 0.97,
      "rollSpeed": 1.43,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_35",
    "name": "StarSparrow 35",
    "title": "StarSparrow 35 \"Emerald Viper\"",
    "class": "Strike Fighter",
    "description": "High-agility StarSparrow variant configured for strike fighter operations with hex propulsion system.",
    "model": "/models/StarSparrow35.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.094118,
        0.270588,
        0.160784
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.486275,
        0.345098,
        0.321569
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.6,
      "darken": 0.15,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": -0.03,
          "z": 2
        },
        "size": {
          "radius": 0.22,
          "length": 0.88
        },
        "color": "#10b981",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.554,
          "y": 0.003,
          "z": 1.32
        },
        "size": {
          "radius": 0.319,
          "length": 1.28
        },
        "color": "#10b981",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.554,
          "y": 0.003,
          "z": 1.32
        },
        "size": {
          "radius": 0.319,
          "length": 1.28
        },
        "color": "#10b981",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.052,
          "z": -2.05
        },
        "color": "#00ff88",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.614,
          "y": 0.282,
          "z": -0.985
        },
        "color": "#00ff88",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.614,
          "y": 0.282,
          "z": -0.985
        },
        "color": "#00ff88",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 54,
      "boostSpeed": 118.8,
      "reverseSpeed": -16,
      "acceleration": 37,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1.05,
      "yawSpeed": 0.85,
      "rollSpeed": 1.5,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_36",
    "name": "StarSparrow 36",
    "title": "StarSparrow 36 \"Void Phantom\"",
    "class": "Stealth Bomber",
    "description": "High-agility StarSparrow variant configured for stealth bomber operations with twin propulsion system.",
    "model": "/models/StarSparrow36.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.184314,
        0.098039,
        0.34902
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.17,
      "darken": 0.28,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": 0.444,
          "z": 2
        },
        "size": {
          "radius": 0.185,
          "length": 0.74
        },
        "color": "#c084fc",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.844,
          "y": 0.313,
          "z": 1.9
        },
        "size": {
          "radius": 0.078,
          "length": 0.65
        },
        "color": "#c084fc",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.844,
          "y": 0.313,
          "z": 1.9
        },
        "size": {
          "radius": 0.078,
          "length": 0.65
        },
        "color": "#c084fc",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.481,
          "z": -2.05
        },
        "color": "#d946ef",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.769,
          "y": 0.335,
          "z": 0.179
        },
        "color": "#d946ef",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.769,
          "y": 0.335,
          "z": 0.179
        },
        "color": "#d946ef",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 50,
      "boostSpeed": 110,
      "reverseSpeed": -16,
      "acceleration": 28,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.9,
      "yawSpeed": 0.88,
      "rollSpeed": 1.32,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_37",
    "name": "StarSparrow 37",
    "title": "StarSparrow 37 \"Gold Hornet\"",
    "class": "Racing Speeder",
    "description": "High-agility StarSparrow variant configured for racing speeder operations with triple delta propulsion system.",
    "model": "/models/StarSparrow37.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.807843,
        0.670588,
        0.12549
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.24,
      "darken": 0.16,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": 0.049,
          "z": 2
        },
        "size": {
          "radius": 0.2,
          "length": 0.8
        },
        "color": "#facc15",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.496,
          "y": 0.095,
          "z": 1.64
        },
        "size": {
          "radius": 0.144,
          "length": 0.65
        },
        "color": "#facc15",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.496,
          "y": 0.095,
          "z": 1.64
        },
        "size": {
          "radius": 0.144,
          "length": 0.65
        },
        "color": "#facc15",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.141,
          "z": -2.05
        },
        "color": "#ffd700",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.442,
          "y": 0.199,
          "z": 0.502
        },
        "color": "#ffd700",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.442,
          "y": 0.199,
          "z": 0.502
        },
        "color": "#ffd700",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 46,
      "boostSpeed": 101.2,
      "reverseSpeed": -16,
      "acceleration": 31,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.95,
      "yawSpeed": 0.91,
      "rollSpeed": 1.39,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_38",
    "name": "StarSparrow 38",
    "title": "StarSparrow 38 \"Arctic Specter\"",
    "class": "Orbital Scout",
    "description": "High-agility StarSparrow variant configured for orbital scout operations with single heavy propulsion system.",
    "model": "/models/StarSparrow38.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.701961,
        0.701961,
        0.701961
      ],
      "color2": [
        0.258824,
        0.258824,
        0.258824
      ],
      "color3": [
        0.584314,
        0.584314,
        0.584314
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.31,
      "darken": 0.29,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": 0.207,
          "z": 2
        },
        "size": {
          "radius": 0.21,
          "length": 0.84
        },
        "color": "#67e8f9",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -0.601,
          "y": -0.26,
          "z": 1.9
        },
        "size": {
          "radius": 0.227,
          "length": 0.91
        },
        "color": "#67e8f9",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.601,
          "y": -0.26,
          "z": 1.9
        },
        "size": {
          "radius": 0.227,
          "length": 0.91
        },
        "color": "#67e8f9",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.179,
          "z": -2.05
        },
        "color": "#ff2255",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.996,
          "y": -0.254,
          "z": -0.603
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.996,
          "y": -0.254,
          "z": -0.603
        },
        "color": "#ff2255",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 57,
      "boostSpeed": 125.4,
      "reverseSpeed": -16,
      "acceleration": 34,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1,
      "yawSpeed": 0.94,
      "rollSpeed": 1.46,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_39",
    "name": "StarSparrow 39",
    "title": "StarSparrow 39 \"Obsidian Shadow\"",
    "class": "Covert Infiltrator",
    "description": "High-agility StarSparrow variant configured for covert infiltrator operations with quad propulsion system.",
    "model": "/models/StarSparrow39.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.14902,
        0.14902,
        0.14902
      ],
      "color2": [
        0.14902,
        0.14902,
        0.14902
      ],
      "color3": [
        0.454902,
        0.454902,
        0.454902
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.38,
      "darken": 0.17,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "center",
        "position": {
          "x": 0,
          "y": 0.211,
          "z": 2
        },
        "size": {
          "radius": 0.186,
          "length": 0.74
        },
        "color": "#f43f5e",
        "coreColor": "#ffffff",
        "lightIntensity": 2.5
      },
      {
        "id": "port",
        "position": {
          "x": -1.183,
          "y": 0.774,
          "z": 1.82
        },
        "size": {
          "radius": 0.193,
          "length": 0.77
        },
        "color": "#f43f5e",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 1.183,
          "y": 0.774,
          "z": 1.82
        },
        "size": {
          "radius": 0.193,
          "length": 0.77
        },
        "color": "#f43f5e",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": 0.144,
          "z": -2.05
        },
        "color": "#f43f5e",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.575,
          "y": 0.111,
          "z": -1.373
        },
        "color": "#f43f5e",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.575,
          "y": 0.111,
          "z": -1.373
        },
        "color": "#f43f5e",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 53,
      "boostSpeed": 116.6,
      "reverseSpeed": -16,
      "acceleration": 37,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 1.05,
      "yawSpeed": 0.97,
      "rollSpeed": 1.53,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  },
  {
    "id": "starsparrow_40",
    "name": "StarSparrow 40",
    "title": "StarSparrow 40 \"Titanium Dread\"",
    "class": "Dreadnought Escort",
    "description": "High-agility StarSparrow variant configured for dreadnought escort operations with hex propulsion system.",
    "model": "/models/StarSparrow40.fbx",
    "scale": 4,
    "textures": {
      "masksBC": "/models/textures/StarSparrow_Masks_BC.png",
      "logosCockpit": "/models/textures/StarSparrow_Masks_LogosCockpit.png",
      "wearout": "/models/textures/StarSparrow_Masks_Wearout.png",
      "metallicSmoothness": "/models/textures/StarSparrow_MetallicSmoothness.png",
      "emission": "/models/textures/StarSparrow_Masks_E.png",
      "normal": "/models/textures/StarSparrow_Normal.png"
    },
    "colors": {
      "color1": [
        0.270588,
        0.270588,
        0.270588
      ],
      "color2": [
        0.152941,
        0.152941,
        0.152941
      ],
      "color3": [
        0.537255,
        0.537255,
        0.537255
      ],
      "logosColor": [
        0.964706,
        0.772549,
        0.058824
      ],
      "emission1": [
        0,
        0.062745,
        0.247059
      ],
      "emission2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "emission3": [
        0.509804,
        0.952941,
        0.952941
      ],
      "cockpit1": [
        0,
        0.062745,
        0.247059
      ],
      "cockpit2": [
        0.121569,
        0.572549,
        0.854902
      ],
      "cockpit3": [
        0.509804,
        0.952941,
        0.952941
      ]
    },
    "wearout": {
      "dirty": 0.45,
      "darken": 0.3,
      "logos": 1,
      "emissionMultiplier": 1.25,
      "cockpitMultiplier": 1.35
    },
    "thrusters": [
      {
        "id": "port",
        "position": {
          "x": -0.565,
          "y": -0.396,
          "z": 1.4
        },
        "size": {
          "radius": 0.344,
          "length": 1.38
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      },
      {
        "id": "starboard",
        "position": {
          "x": 0.565,
          "y": -0.396,
          "z": 1.4
        },
        "size": {
          "radius": 0.344,
          "length": 1.38
        },
        "color": "#38bdf8",
        "coreColor": "#ffffff",
        "lightIntensity": 2.2
      }
    ],
    "shootingPoints": [
      {
        "id": "gun_nose",
        "name": "Nose Cannon",
        "position": {
          "x": 0,
          "y": -0.2,
          "z": -2.05
        },
        "color": "#00f0ff",
        "size": 0.14,
        "type": "laser"
      },
      {
        "id": "gun_port",
        "name": "Port Wing Cannon",
        "position": {
          "x": -0.53,
          "y": -0.226,
          "z": -1.218
        },
        "color": "#00f0ff",
        "size": 0.12,
        "type": "laser"
      },
      {
        "id": "gun_starboard",
        "name": "Starboard Wing Cannon",
        "position": {
          "x": 0.53,
          "y": -0.226,
          "z": -1.218
        },
        "color": "#00f0ff",
        "size": 0.12,
        "type": "laser"
      }
    ],
    "handling": {
      "maxSpeed": 49,
      "boostSpeed": 107.8,
      "reverseSpeed": -16,
      "acceleration": 28,
      "deceleration": 16,
      "boostAcceleration": 65,
      "pitchSpeed": 0.9,
      "yawSpeed": 0.85,
      "rollSpeed": 1.35,
      "boostEnergy": 100,
      "boostCostPerSecond": 35,
      "boostRechargeRate": 22
    }
  }
];

/**
 * Retrieves spaceship configuration by index or ID
 * @param {number|string} indexOrId 
 * @returns {object}
 */
export function getSpaceshipConfig(indexOrId) {
  if (typeof indexOrId === 'number') {
    return SPACESHIP_CONFIGS[indexOrId] || SPACESHIP_CONFIGS[0];
  }
  return SPACESHIP_CONFIGS.find((c) => c.id === indexOrId) || SPACESHIP_CONFIGS[0];
}

/**
 * Returns summary list of all available spaceships
 * @returns {Array<{index: number, id: string, name: string, title: string, class: string, description: string}>}
 */
export function getSpaceshipList() {
  return SPACESHIP_CONFIGS.map((c, idx) => ({
    index: idx,
    id: c.id,
    name: c.name,
    title: c.title,
    class: c.class,
    description: c.description
  }));
}
