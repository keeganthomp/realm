/**
 * EnvironmentEffects - Atmospheric effects for the game world
 *
 * Handles ambient particles, fog, and other environmental visuals
 * that make the world feel alive.
 */

import {
  Scene,
  ParticleSystem,
  Texture,
  Vector3,
  Color4,
  Color3,
  MeshBuilder,
  Mesh,
  Effect,
  ShaderMaterial
} from '@babylonjs/core'

// Register water shader
Effect.ShadersStore['waterVertexShader'] = `
  precision highp float;

  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;

  uniform mat4 worldViewProjection;
  uniform mat4 world;
  uniform float time;
  uniform float waveAmplitude;
  uniform float waveFrequency;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUV;
  varying float vWaveHeight;

  void main() {
    // Animate water surface with waves
    float wave1 = sin(position.x * waveFrequency + time * 2.0) * waveAmplitude;
    float wave2 = sin(position.z * waveFrequency * 0.8 + time * 1.5) * waveAmplitude * 0.7;
    float wave3 = sin((position.x + position.z) * waveFrequency * 0.5 + time * 2.5) * waveAmplitude * 0.5;

    float totalWave = wave1 + wave2 + wave3;
    vec3 animatedPosition = position + vec3(0.0, totalWave, 0.0);

    vWaveHeight = totalWave;
    vWorldPos = (world * vec4(animatedPosition, 1.0)).xyz;
    vNormal = normalize((world * vec4(normal, 0.0)).xyz);
    vUV = uv;

    gl_Position = worldViewProjection * vec4(animatedPosition, 1.0);
  }
`

Effect.ShadersStore['waterFragmentShader'] = `
  precision highp float;

  uniform vec3 shallowColor;
  uniform vec3 deepColor;
  uniform vec3 foamColor;
  uniform float time;
  uniform float transparency;
  uniform vec3 lightDirection;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUV;
  varying float vWaveHeight;

  void main() {
    vec3 normal = normalize(vNormal);

    // Basic lighting
    float NdotL = dot(normal, normalize(lightDirection)) * 0.5 + 0.5;

    // Depth-based color mixing (simulated)
    float depthFactor = 0.5 + vWaveHeight * 2.0;
    vec3 waterColor = mix(deepColor, shallowColor, clamp(depthFactor, 0.0, 1.0));

    // Foam on wave peaks
    float foam = smoothstep(0.02, 0.04, vWaveHeight);
    waterColor = mix(waterColor, foamColor, foam * 0.3);

    // Specular highlight
    vec3 viewDir = normalize(-vWorldPos);
    vec3 halfVec = normalize(lightDirection + viewDir);
    float spec = pow(max(dot(normal, halfVec), 0.0), 64.0);

    // Cel-shade the water (2 bands)
    float quantized = floor(NdotL * 2.0 + 0.5) / 2.0;
    vec3 finalColor = waterColor * (0.6 + quantized * 0.4) + vec3(1.0) * spec * 0.5;

    gl_FragColor = vec4(finalColor, transparency);
  }
`

export type DimensionMode = 'surface' | 'veil'

export interface EnvironmentConfig {
  // Fog
  fogEnabled: boolean
  fogDensity: number
  fogColor: Color3

  // Particles
  particlesEnabled: boolean
  particleColor: Color4
  particleCount: number

  // Water
  waterColor: Color3
  waterDeepColor: Color3
}

const SURFACE_CONFIG: EnvironmentConfig = {
  fogEnabled: true,
  fogDensity: 0.002,  // Very light fog - barely visible
  fogColor: new Color3(0.75, 0.82, 0.9),  // Light blue sky color
  particlesEnabled: true,
  particleColor: new Color4(1, 0.95, 0.8, 0.3),
  particleCount: 100,
  waterColor: new Color3(0.29, 0.56, 0.85),
  waterDeepColor: new Color3(0.15, 0.35, 0.65)
}

const VEIL_CONFIG: EnvironmentConfig = {
  fogEnabled: true,
  fogDensity: 0.025,
  fogColor: new Color3(0.05, 0.02, 0.1),
  particlesEnabled: true,
  particleColor: new Color4(0.3, 0.8, 1, 0.5),
  particleCount: 200,
  waterColor: new Color3(0.2, 0.6, 0.8),
  waterDeepColor: new Color3(0.1, 0.2, 0.5)
}

export class EnvironmentEffects {
  private static instance: EnvironmentEffects
  private scene: Scene
  private mode: DimensionMode = 'surface'

  // Particle systems
  private dustParticles: ParticleSystem | null = null
  private glowParticles: ParticleSystem | null = null

  // Water meshes tracked for shader updates
  private waterMeshes: Map<string, Mesh> = new Map()
  private time: number = 0

  private constructor(scene: Scene) {
    this.scene = scene
  }

  static init(scene: Scene): EnvironmentEffects {
    if (!EnvironmentEffects.instance) {
      EnvironmentEffects.instance = new EnvironmentEffects(scene)
      console.log('[EnvironmentEffects] ✓ Initialized - fog and particles ready')
    }
    return EnvironmentEffects.instance
  }

  static getInstance(): EnvironmentEffects {
    if (!EnvironmentEffects.instance) {
      throw new Error('EnvironmentEffects not initialized')
    }
    return EnvironmentEffects.instance
  }

  /**
   * Setup environment for the current dimension
   */
  setup(): void {
    const config = this.mode === 'surface' ? SURFACE_CONFIG : VEIL_CONFIG
    console.log(`[EnvironmentEffects] Setting up ${this.mode} environment (fog density: ${config.fogDensity}, particles: ${config.particleCount})`)

    this.setupFog(config)
    this.setupParticles(config)
  }

  /**
   * Switch to a different dimension's environment
   */
  setMode(mode: DimensionMode): void {
    this.mode = mode
    this.setup()
  }

  /**
   * Setup fog for depth
   */
  private setupFog(config: EnvironmentConfig): void {
    if (config.fogEnabled) {
      this.scene.fogMode = 2 // Exponential fog
      this.scene.fogDensity = config.fogDensity
      this.scene.fogColor = config.fogColor
    } else {
      this.scene.fogMode = 0
    }
  }

  /**
   * Setup ambient particles
   */
  private setupParticles(config: EnvironmentConfig): void {
    // Dispose existing
    this.dustParticles?.dispose()
    this.glowParticles?.dispose()

    if (!config.particlesEnabled) return

    if (this.mode === 'surface') {
      this.createDustParticles(config)
    } else {
      this.createVeilParticles(config)
    }
  }

  /**
   * Create floating dust motes for surface world
   */
  private createDustParticles(config: EnvironmentConfig): void {
    // Create a dummy emitter mesh (invisible)
    const emitter = MeshBuilder.CreateBox('dustEmitter', { size: 0.1 }, this.scene)
    emitter.isVisible = false

    this.dustParticles = new ParticleSystem('dust', config.particleCount, this.scene)

    // Use a simple white texture (will be tinted)
    this.dustParticles.particleTexture = new Texture(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGklEQVQYV2P8////fwYGBgZGRkZGEGZgYGAAAA1OAgF+vMtUAAAAAElFTkSuQmCC',
      this.scene
    )

    this.dustParticles.emitter = emitter
    this.dustParticles.minEmitBox = new Vector3(-15, 0.5, -15)
    this.dustParticles.maxEmitBox = new Vector3(15, 4, 15)

    this.dustParticles.color1 = config.particleColor
    this.dustParticles.color2 = new Color4(
      config.particleColor.r * 0.8,
      config.particleColor.g * 0.8,
      config.particleColor.b * 0.7,
      config.particleColor.a * 0.5
    )
    this.dustParticles.colorDead = new Color4(0.9, 0.85, 0.7, 0)

    this.dustParticles.minSize = 0.02
    this.dustParticles.maxSize = 0.06

    this.dustParticles.minLifeTime = 4
    this.dustParticles.maxLifeTime = 8

    this.dustParticles.emitRate = config.particleCount / 5

    this.dustParticles.direction1 = new Vector3(-0.1, 0.05, -0.1)
    this.dustParticles.direction2 = new Vector3(0.1, 0.15, 0.1)

    this.dustParticles.minEmitPower = 0.01
    this.dustParticles.maxEmitPower = 0.05

    this.dustParticles.gravity = new Vector3(0, -0.01, 0)

    this.dustParticles.blendMode = ParticleSystem.BLENDMODE_ADD

    this.dustParticles.start()
  }

  /**
   * Create glowing particles for Veil dimension
   */
  private createVeilParticles(config: EnvironmentConfig): void {
    const emitter = MeshBuilder.CreateBox('veilEmitter', { size: 0.1 }, this.scene)
    emitter.isVisible = false

    this.glowParticles = new ParticleSystem('veilGlow', config.particleCount, this.scene)

    // Simple circular glow texture (base64 encoded)
    this.glowParticles.particleTexture = new Texture(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAxklEQVQ4T6WTwQ3CMAxFvxMxAYxQNmCEjsAIjMAobMAGsAEjsAEjsAkdgQ1ggoraRm5iJ3VD1VOl5Pn72wmSJGnOvSNpiOSS5BnJJJA8A7gC2AHYhGT+vIbkpwFATXKI5ArApYEkOTa4hgBOHHwKN8dOJiJbAHcAt07iFMm5TfKWZNQB2kMkkw6QXpPsmC6mPmCfE8AlUj8wdz6o97EATj5gr+ILtF5gLwBVYz/D0xuwNVYmsHtOzM0kVo+ZGYi1jvEC9wPUlyQZQxTDUAAAAABJRU5ErkJggg==',
      this.scene
    )

    this.glowParticles.emitter = emitter
    this.glowParticles.minEmitBox = new Vector3(-20, 0.2, -20)
    this.glowParticles.maxEmitBox = new Vector3(20, 5, 20)

    // Cyan-magenta color variation
    this.glowParticles.color1 = new Color4(0, 1, 1, 0.6)
    this.glowParticles.color2 = new Color4(1, 0, 1, 0.4)
    this.glowParticles.colorDead = new Color4(0.5, 0, 0.5, 0)

    this.glowParticles.minSize = 0.05
    this.glowParticles.maxSize = 0.15

    this.glowParticles.minLifeTime = 3
    this.glowParticles.maxLifeTime = 6

    this.glowParticles.emitRate = config.particleCount / 3

    // Slow floating motion
    this.glowParticles.direction1 = new Vector3(-0.05, 0.1, -0.05)
    this.glowParticles.direction2 = new Vector3(0.05, 0.2, 0.05)

    this.glowParticles.minEmitPower = 0.02
    this.glowParticles.maxEmitPower = 0.08

    this.glowParticles.gravity = new Vector3(0, 0.02, 0) // Float upward

    this.glowParticles.blendMode = ParticleSystem.BLENDMODE_ADD

    this.glowParticles.start()
  }

  /**
   * Update particle emitter position to follow camera/player
   */
  updateParticlePosition(center: Vector3): void {
    if (this.dustParticles?.emitter && this.dustParticles.emitter instanceof Mesh) {
      this.dustParticles.emitter.position = center
    }
    if (this.glowParticles?.emitter && this.glowParticles.emitter instanceof Mesh) {
      this.glowParticles.emitter.position = center
    }
  }

  /**
   * Create an animated water surface mesh
   */
  createWaterMesh(
    id: string,
    width: number,
    depth: number,
    position: Vector3
  ): Mesh {
    const config = this.mode === 'surface' ? SURFACE_CONFIG : VEIL_CONFIG

    const water = MeshBuilder.CreateGround(
      `water_${id}`,
      { width, height: depth, subdivisions: 16 },
      this.scene
    )
    water.position = position

    // Create water shader material
    const waterMaterial = new ShaderMaterial(
      `waterMat_${id}`,
      this.scene,
      {
        vertex: 'water',
        fragment: 'water'
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: [
          'worldViewProjection',
          'world',
          'time',
          'waveAmplitude',
          'waveFrequency',
          'shallowColor',
          'deepColor',
          'foamColor',
          'transparency',
          'lightDirection'
        ],
        needAlphaBlending: true
      }
    )

    waterMaterial.setFloat('time', 0)
    waterMaterial.setFloat('waveAmplitude', 0.02)
    waterMaterial.setFloat('waveFrequency', 3.0)
    waterMaterial.setColor3('shallowColor', config.waterColor)
    waterMaterial.setColor3('deepColor', config.waterDeepColor)
    waterMaterial.setColor3('foamColor', new Color3(0.9, 0.95, 1.0))
    waterMaterial.setFloat('transparency', 0.75)
    waterMaterial.setVector3('lightDirection', new Vector3(0.5, 1, 0.3).normalize())

    waterMaterial.backFaceCulling = false
    waterMaterial.alphaMode = 2 // ALPHA_COMBINE

    water.material = waterMaterial

    this.waterMeshes.set(id, water)

    return water
  }

  /**
   * Remove a water mesh
   */
  removeWaterMesh(id: string): void {
    const mesh = this.waterMeshes.get(id)
    if (mesh) {
      mesh.dispose()
      this.waterMeshes.delete(id)
    }
  }

  /**
   * Update time-based effects (call each frame)
   */
  update(deltaTime: number): void {
    this.time += deltaTime

    // Update water shader time
    this.waterMeshes.forEach((mesh) => {
      const mat = mesh.material as any
      if (mat?.setFloat) {
        mat.setFloat('time', this.time)
      }
    })
  }

  /**
   * Dispose all effects
   */
  dispose(): void {
    this.dustParticles?.dispose()
    this.glowParticles?.dispose()
    this.waterMeshes.forEach((mesh) => mesh.dispose())
    this.waterMeshes.clear()
  }
}
