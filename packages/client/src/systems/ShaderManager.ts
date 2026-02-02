import {
  Scene,
  ShaderMaterial,
  Effect,
  Color3,
  Vector3
} from '@babylonjs/core'

// Register custom shaders with Babylon.js
Effect.ShadersStore['celShadeVertexShader'] = `
  precision highp float;

  // Attributes
  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;

  // Uniforms
  uniform mat4 worldViewProjection;
  uniform mat4 world;
  uniform mat4 worldView;

  // Varyings
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUV;
  varying vec3 vViewPos;

  void main() {
    vec4 worldPos = world * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize((world * vec4(normal, 0.0)).xyz);
    vUV = uv;
    vViewPos = (worldView * vec4(position, 1.0)).xyz;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`

Effect.ShadersStore['celShadeFragmentShader'] = `
  precision highp float;

  // Uniforms
  uniform vec3 baseColor;
  uniform vec3 lightDirection;
  uniform float bands;
  uniform float ambientIntensity;
  uniform vec3 highlightColor;
  uniform vec3 shadowColor;
  uniform float time;

  // Varyings
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUV;
  varying vec3 vViewPos;

  void main() {
    // Normalize the normal
    vec3 normal = normalize(vNormal);

    // Calculate diffuse lighting
    float NdotL = dot(normal, normalize(lightDirection));

    // Remap from -1,1 to 0,1
    float lightIntensity = NdotL * 0.5 + 0.5;

    // Quantize to discrete bands for cel-shading effect
    float quantized = floor(lightIntensity * bands) / bands;

    // Apply ambient minimum
    quantized = max(quantized, ambientIntensity);

    // Mix between shadow and highlight colors
    vec3 shadedColor = mix(shadowColor, highlightColor, quantized) * baseColor;

    // Simple rim lighting for edge pop
    vec3 viewDir = normalize(-vViewPos);
    float rim = 1.0 - max(dot(normal, viewDir), 0.0);
    rim = pow(rim, 3.0) * 0.25;
    shadedColor += baseColor * rim;

    gl_FragColor = vec4(shadedColor, 1.0);
  }
`

// Outline shader for second pass
Effect.ShadersStore['outlineVertexShader'] = `
  precision highp float;

  attribute vec3 position;
  attribute vec3 normal;

  uniform mat4 worldViewProjection;
  uniform mat4 world;
  uniform float outlineWidth;

  void main() {
    // Expand vertices along normals for outline effect
    vec3 expandedPosition = position + normal * outlineWidth;
    gl_Position = worldViewProjection * vec4(expandedPosition, 1.0);
  }
`

Effect.ShadersStore['outlineFragmentShader'] = `
  precision highp float;

  uniform vec3 outlineColor;

  void main() {
    gl_FragColor = vec4(outlineColor, 1.0);
  }
`

// Glow shader for Veil objects
Effect.ShadersStore['glowVertexShader'] = `
  precision highp float;

  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;

  uniform mat4 worldViewProjection;
  uniform mat4 world;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUV;

  void main() {
    vec4 worldPos = world * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize((world * vec4(normal, 0.0)).xyz);
    vUV = uv;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`

Effect.ShadersStore['glowFragmentShader'] = `
  precision highp float;

  uniform vec3 baseColor;
  uniform vec3 glowColor;
  uniform float glowIntensity;
  uniform float pulseSpeed;
  uniform float time;
  uniform vec3 lightDirection;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUV;

  void main() {
    vec3 normal = normalize(vNormal);

    // Basic lighting
    float NdotL = dot(normal, normalize(lightDirection)) * 0.5 + 0.5;

    // Pulsing glow effect
    float pulse = sin(time * pulseSpeed) * 0.5 + 0.5;
    float glow = glowIntensity * (0.7 + 0.3 * pulse);

    // Fresnel effect for edge glow
    vec3 viewDir = normalize(-vWorldPos);
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);

    // Combine base color with glow
    vec3 litBase = baseColor * NdotL;
    vec3 glowContribution = glowColor * glow * (0.5 + fresnel * 0.5);

    vec3 finalColor = litBase + glowContribution;

    // HDR-style bloom preparation (values > 1 will bloom with post-processing)
    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// Crystal shader for Veil crystals
Effect.ShadersStore['crystalVertexShader'] = `
  precision highp float;

  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;

  uniform mat4 worldViewProjection;
  uniform mat4 world;
  uniform mat4 view;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewPos;
  varying vec2 vUV;

  void main() {
    vec4 worldPos = world * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize((world * vec4(normal, 0.0)).xyz);
    vViewPos = (view * worldPos).xyz;
    vUV = uv;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`

Effect.ShadersStore['crystalFragmentShader'] = `
  precision highp float;

  uniform vec3 crystalColor;
  uniform float transparency;
  uniform float refractStrength;
  uniform float time;
  uniform vec3 lightDirection;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewPos;
  varying vec2 vUV;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vViewPos);

    // Fresnel for edge highlighting
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);

    // Internal refraction-like effect
    float internalGlow = sin(vWorldPos.y * 10.0 + time * 2.0) * 0.5 + 0.5;

    // Specular highlight
    vec3 halfVec = normalize(lightDirection + viewDir);
    float spec = pow(max(dot(normal, halfVec), 0.0), 32.0);

    // Combine effects
    vec3 color = crystalColor * (0.5 + internalGlow * 0.3);
    color += crystalColor * fresnel * 0.5;
    color += vec3(1.0) * spec * 0.8;

    // Alpha based on fresnel (more opaque at edges)
    float alpha = mix(transparency, 1.0, fresnel * 0.5);

    gl_FragColor = vec4(color, alpha);
  }
`

export interface CelShadeOptions {
  bands?: number
  ambientIntensity?: number
  highlightColor?: Color3
  shadowColor?: Color3
}

export interface GlowOptions {
  pulseSpeed?: number
  fresnelPower?: number
}

export interface CrystalOptions {
  transparency?: number
  refractStrength?: number
}

export class ShaderManager {
  private static instance: ShaderManager
  private scene: Scene
  private shaderStore: Map<string, ShaderMaterial> = new Map()
  private time: number = 0
  private lightDirection: Vector3 = new Vector3(0.8, 0.6, 0.5).normalize()  // More angled light for visible shadows

  private constructor(scene: Scene) {
    this.scene = scene
  }

  static init(scene: Scene): ShaderManager {
    if (!ShaderManager.instance) {
      ShaderManager.instance = new ShaderManager(scene)
      console.log('[ShaderManager] ✓ Initialized - cel-shading system ready')
    }
    return ShaderManager.instance
  }

  static getInstance(): ShaderManager {
    if (!ShaderManager.instance) {
      throw new Error('ShaderManager not initialized. Call init() first.')
    }
    return ShaderManager.instance
  }

  /**
   * Create a cel-shaded material
   */
  createCelShadeMaterial(
    name: string,
    baseColor: Color3,
    options: CelShadeOptions = {}
  ): ShaderMaterial {
    const cacheKey = `celShade_${name}`

    // Check cache
    const cached = this.shaderStore.get(cacheKey)
    if (cached) {
      return cached
    }

    const {
      bands = 3,
      ambientIntensity = 0.15,  // Lower for more dramatic shadows
      highlightColor = new Color3(1.3, 1.25, 1.1),  // Warmer, brighter highlights
      shadowColor = new Color3(0.25, 0.2, 0.35)     // Cooler, darker shadows
    } = options

    const material = new ShaderMaterial(
      cacheKey,
      this.scene,
      {
        vertex: 'celShade',
        fragment: 'celShade'
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: [
          'worldViewProjection',
          'world',
          'worldView',
          'baseColor',
          'lightDirection',
          'bands',
          'ambientIntensity',
          'highlightColor',
          'shadowColor',
          'time'
        ]
      }
    )

    material.setColor3('baseColor', baseColor)
    material.setVector3('lightDirection', this.lightDirection)
    material.setFloat('bands', bands)
    material.setFloat('ambientIntensity', ambientIntensity)
    material.setColor3('highlightColor', highlightColor)
    material.setColor3('shadowColor', shadowColor)
    material.setFloat('time', 0)

    material.backFaceCulling = true

    // Check for shader compilation errors
    material.onCompiled = () => {
      console.log(`[ShaderManager] ✓ Shader compiled successfully: ${cacheKey}`)
    }
    material.onError = (effect, errors) => {
      console.error(`[ShaderManager] ✗ Shader compilation FAILED for ${cacheKey}:`, errors)
    }

    this.shaderStore.set(cacheKey, material)
    console.log(`[ShaderManager] ✓ Created cel-shade material: ${cacheKey}`)
    return material
  }

  /**
   * Create an outline material for second-pass rendering
   */
  createOutlineMaterial(
    name: string,
    outlineColor: Color3 = new Color3(0.1, 0.08, 0.05),
    outlineWidth: number = 0.02
  ): ShaderMaterial {
    const cacheKey = `outline_${name}`

    const cached = this.shaderStore.get(cacheKey)
    if (cached) {
      return cached
    }

    const material = new ShaderMaterial(
      cacheKey,
      this.scene,
      {
        vertex: 'outline',
        fragment: 'outline'
      },
      {
        attributes: ['position', 'normal'],
        uniforms: ['worldViewProjection', 'world', 'outlineWidth', 'outlineColor']
      }
    )

    material.setFloat('outlineWidth', outlineWidth)
    material.setColor3('outlineColor', outlineColor)

    // Render back faces only for outline
    material.backFaceCulling = false
    material.sideOrientation = Mesh.BACKSIDE

    this.shaderStore.set(cacheKey, material)
    return material
  }

  /**
   * Create a glowing material for Veil objects
   */
  createGlowMaterial(
    name: string,
    baseColor: Color3,
    glowColor: Color3,
    glowIntensity: number = 1.0,
    options: GlowOptions = {}
  ): ShaderMaterial {
    const cacheKey = `glow_${name}`

    const cached = this.shaderStore.get(cacheKey)
    if (cached) {
      return cached
    }

    const { pulseSpeed = 2.0 } = options

    const material = new ShaderMaterial(
      cacheKey,
      this.scene,
      {
        vertex: 'glow',
        fragment: 'glow'
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: [
          'worldViewProjection',
          'world',
          'baseColor',
          'glowColor',
          'glowIntensity',
          'pulseSpeed',
          'time',
          'lightDirection'
        ]
      }
    )

    material.setColor3('baseColor', baseColor)
    material.setColor3('glowColor', glowColor)
    material.setFloat('glowIntensity', glowIntensity)
    material.setFloat('pulseSpeed', pulseSpeed)
    material.setFloat('time', 0)
    material.setVector3('lightDirection', this.lightDirection)

    material.backFaceCulling = true

    this.shaderStore.set(cacheKey, material)
    return material
  }

  /**
   * Create a crystal material for Veil crystals
   */
  createCrystalMaterial(
    name: string,
    crystalColor: Color3,
    options: CrystalOptions = {}
  ): ShaderMaterial {
    const cacheKey = `crystal_${name}`

    const cached = this.shaderStore.get(cacheKey)
    if (cached) {
      return cached
    }

    const { transparency = 0.6, refractStrength = 0.1 } = options

    const material = new ShaderMaterial(
      cacheKey,
      this.scene,
      {
        vertex: 'crystal',
        fragment: 'crystal'
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: [
          'worldViewProjection',
          'world',
          'view',
          'crystalColor',
          'transparency',
          'refractStrength',
          'time',
          'lightDirection'
        ],
        needAlphaBlending: true
      }
    )

    material.setColor3('crystalColor', crystalColor)
    material.setFloat('transparency', transparency)
    material.setFloat('refractStrength', refractStrength)
    material.setFloat('time', 0)
    material.setVector3('lightDirection', this.lightDirection)

    material.backFaceCulling = false
    material.alphaMode = 2 // ALPHA_COMBINE

    this.shaderStore.set(cacheKey, material)
    return material
  }

  /**
   * Update time uniform for all animated shaders
   */
  update(deltaTime: number): void {
    this.time += deltaTime

    // Update time for all materials that use it
    this.shaderStore.forEach((material) => {
      if (material.getEffect()?.getUniform('time') !== undefined) {
        material.setFloat('time', this.time)
      }
    })
  }

  /**
   * Set the global light direction
   */
  setLightDirection(direction: Vector3): void {
    this.lightDirection = direction.normalize()

    this.shaderStore.forEach((material) => {
      if (material.getEffect()?.getUniform('lightDirection') !== undefined) {
        material.setVector3('lightDirection', this.lightDirection)
      }
    })
  }

  /**
   * Get a cached material by name
   */
  getMaterial(name: string): ShaderMaterial | undefined {
    return this.shaderStore.get(name)
  }

  /**
   * Clear a specific cached material
   */
  clearMaterial(name: string): void {
    const material = this.shaderStore.get(name)
    if (material) {
      material.dispose()
      this.shaderStore.delete(name)
    }
  }

  /**
   * Clear all cached materials
   */
  dispose(): void {
    this.shaderStore.forEach((material) => material.dispose())
    this.shaderStore.clear()
  }
}

// Re-export Mesh for sideOrientation constant
import { Mesh } from '@babylonjs/core'
