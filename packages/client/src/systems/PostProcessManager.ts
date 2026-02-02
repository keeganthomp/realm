import {
  Scene,
  Camera,
  PostProcess,
  Effect,
  GlowLayer,
  Vector2
} from '@babylonjs/core'

// Register custom post-process shaders
Effect.ShadersStore['vignetteFragmentShader'] = `
  precision highp float;

  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float vignetteWeight;
  uniform vec2 resolution;

  void main() {
    vec4 color = texture2D(textureSampler, vUV);

    // Calculate distance from center
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUV, center);

    // Smooth vignette falloff
    float vignette = smoothstep(0.8, 0.2, dist * vignetteWeight);

    color.rgb *= vignette;
    gl_FragColor = color;
  }
`

Effect.ShadersStore['chromaticAberrationFragmentShader'] = `
  precision highp float;

  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float intensity;
  uniform vec2 resolution;

  void main() {
    vec2 dir = vUV - vec2(0.5);
    float dist = length(dir);

    // Chromatic aberration offset based on distance from center
    float offset = intensity * dist * 0.01;

    float r = texture2D(textureSampler, vUV + dir * offset).r;
    float g = texture2D(textureSampler, vUV).g;
    float b = texture2D(textureSampler, vUV - dir * offset).b;

    gl_FragColor = vec4(r, g, b, 1.0);
  }
`

Effect.ShadersStore['veilTransitionFragmentShader'] = `
  precision highp float;

  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float progress;      // 0 to 1
  uniform float entering;      // 1.0 = entering veil, 0.0 = exiting
  uniform vec2 resolution;

  void main() {
    vec4 color = texture2D(textureSampler, vUV);

    // Distance from center for ripple effect
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUV, center);

    // Ripple distortion
    float ripple = sin(dist * 30.0 - progress * 10.0) * 0.02 * progress * (1.0 - progress) * 4.0;
    vec2 distortedUV = vUV + normalize(vUV - center) * ripple;

    // Re-sample with distortion
    color = texture2D(textureSampler, distortedUV);

    // Color shift: warm (surface) to cool (veil)
    vec3 warmTint = vec3(1.1, 1.0, 0.9);   // Surface: warm
    vec3 coolTint = vec3(0.7, 0.8, 1.2);    // Veil: cool purple/blue

    float t = entering > 0.5 ? progress : 1.0 - progress;
    vec3 tint = mix(warmTint, coolTint, t);
    color.rgb *= tint;

    // Vignette that intensifies during transition
    float vignette = 1.0 - dist * progress * 0.8;
    color.rgb *= vignette;

    // Brightness pulse at midpoint
    float pulse = 1.0 + sin(progress * 3.14159) * 0.3;
    color.rgb *= pulse;

    gl_FragColor = color;
  }
`

Effect.ShadersStore['screenDistortionFragmentShader'] = `
  precision highp float;

  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float waveAmplitude;
  uniform float time;
  uniform vec2 resolution;

  void main() {
    // Subtle wavy distortion for Veil atmosphere
    float wave = sin(vUV.y * 20.0 + time * 2.0) * waveAmplitude;
    wave += sin(vUV.x * 15.0 + time * 1.5) * waveAmplitude * 0.5;

    vec2 distortedUV = vUV + vec2(wave, wave * 0.5);

    vec4 color = texture2D(textureSampler, distortedUV);
    gl_FragColor = color;
  }
`

export interface PostProcessConfig {
  bloomEnabled?: boolean
  bloomThreshold?: number
  bloomIntensity?: number
  vignetteEnabled?: boolean
  vignetteWeight?: number
  glowLayerEnabled?: boolean
  glowIntensity?: number
}

export class PostProcessManager {
  private static instance: PostProcessManager
  private scene: Scene
  private camera: Camera

  // Effects
  private glowLayer: GlowLayer | null = null
  private vignetteEffect: PostProcess | null = null
  private chromaticEffect: PostProcess | null = null
  private distortionEffect: PostProcess | null = null
  private transitionEffect: PostProcess | null = null

  // State
  private time: number = 0
  private transitionProgress: number = 0
  private isTransitioning: boolean = false
  private transitionResolve: (() => void) | null = null

  private constructor(scene: Scene, camera: Camera) {
    this.scene = scene
    this.camera = camera
  }

  static init(scene: Scene, camera: Camera): PostProcessManager {
    if (!PostProcessManager.instance) {
      PostProcessManager.instance = new PostProcessManager(scene, camera)
      console.log('[PostProcessManager] ✓ Initialized - post-processing system ready')
    }
    return PostProcessManager.instance
  }

  static getInstance(): PostProcessManager {
    if (!PostProcessManager.instance) {
      throw new Error('PostProcessManager not initialized. Call init() first.')
    }
    return PostProcessManager.instance
  }

  /**
   * Apply default configuration for surface world
   */
  applySurfaceConfig(): void {
    this.disableChromaticAberration()
    this.disableScreenDistortion()
    this.setVignetteWeight(1.2)

    if (this.glowLayer) {
      this.glowLayer.intensity = 0.3
    }
  }

  /**
   * Apply configuration for Veil dimension
   */
  applyVeilConfig(): void {
    this.enableChromaticAberration(0.5)
    this.enableScreenDistortion(0.002)
    this.setVignetteWeight(1.5)

    if (this.glowLayer) {
      this.glowLayer.intensity = 1.0
    }
  }

  /**
   * Add glow layer for emissive materials
   */
  addGlowLayer(intensity: number = 0.5): GlowLayer {
    if (this.glowLayer) {
      this.glowLayer.intensity = intensity
      return this.glowLayer
    }

    this.glowLayer = new GlowLayer('glowLayer', this.scene, {
      mainTextureFixedSize: 512,
      blurKernelSize: 64
    })
    this.glowLayer.intensity = intensity

    return this.glowLayer
  }

  /**
   * Add vignette effect
   */
  addVignette(weight: number = 1.2): PostProcess {
    if (this.vignetteEffect) {
      this.vignetteEffect.dispose()
    }

    this.vignetteEffect = new PostProcess(
      'vignette',
      'vignette',
      ['vignetteWeight', 'resolution'],
      null,
      1.0,
      this.camera
    )

    this.vignetteEffect.onApply = (effect) => {
      effect.setFloat('vignetteWeight', weight)
      effect.setVector2(
        'resolution',
        new Vector2(this.scene.getEngine().getRenderWidth(), this.scene.getEngine().getRenderHeight())
      )
    }

    return this.vignetteEffect
  }

  /**
   * Set vignette weight
   */
  setVignetteWeight(weight: number): void {
    if (this.vignetteEffect) {
      this.vignetteEffect.onApply = (effect) => {
        effect.setFloat('vignetteWeight', weight)
        effect.setVector2(
          'resolution',
          new Vector2(this.scene.getEngine().getRenderWidth(), this.scene.getEngine().getRenderHeight())
        )
      }
    }
  }

  /**
   * Enable chromatic aberration (Veil effect)
   */
  enableChromaticAberration(intensity: number = 0.5): PostProcess {
    if (this.chromaticEffect) {
      this.chromaticEffect.dispose()
    }

    this.chromaticEffect = new PostProcess(
      'chromaticAberration',
      'chromaticAberration',
      ['intensity', 'resolution'],
      null,
      1.0,
      this.camera
    )

    this.chromaticEffect.onApply = (effect) => {
      effect.setFloat('intensity', intensity)
      effect.setVector2(
        'resolution',
        new Vector2(this.scene.getEngine().getRenderWidth(), this.scene.getEngine().getRenderHeight())
      )
    }

    return this.chromaticEffect
  }

  /**
   * Disable chromatic aberration
   */
  disableChromaticAberration(): void {
    if (this.chromaticEffect) {
      this.chromaticEffect.dispose()
      this.chromaticEffect = null
    }
  }

  /**
   * Enable screen distortion (Veil atmosphere)
   */
  enableScreenDistortion(waveAmplitude: number = 0.005): PostProcess {
    if (this.distortionEffect) {
      this.distortionEffect.dispose()
    }

    this.distortionEffect = new PostProcess(
      'screenDistortion',
      'screenDistortion',
      ['waveAmplitude', 'time', 'resolution'],
      null,
      1.0,
      this.camera
    )

    this.distortionEffect.onApply = (effect) => {
      effect.setFloat('waveAmplitude', waveAmplitude)
      effect.setFloat('time', this.time)
      effect.setVector2(
        'resolution',
        new Vector2(this.scene.getEngine().getRenderWidth(), this.scene.getEngine().getRenderHeight())
      )
    }

    return this.distortionEffect
  }

  /**
   * Disable screen distortion
   */
  disableScreenDistortion(): void {
    if (this.distortionEffect) {
      this.distortionEffect.dispose()
      this.distortionEffect = null
    }
  }

  /**
   * Play Veil dimension transition effect
   */
  async playVeilTransition(entering: boolean, durationMs: number = 2000): Promise<void> {
    if (this.isTransitioning) {
      return
    }

    this.isTransitioning = true
    this.transitionProgress = 0

    // Create transition effect
    this.transitionEffect = new PostProcess(
      'veilTransition',
      'veilTransition',
      ['progress', 'entering', 'resolution'],
      null,
      1.0,
      this.camera
    )

    this.transitionEffect.onApply = (effect) => {
      effect.setFloat('progress', this.transitionProgress)
      effect.setFloat('entering', entering ? 1.0 : 0.0)
      effect.setVector2(
        'resolution',
        new Vector2(this.scene.getEngine().getRenderWidth(), this.scene.getEngine().getRenderHeight())
      )
    }

    // Animate transition
    const startTime = window.performance.now()

    return new Promise((resolve) => {
      this.transitionResolve = resolve

      const animate = () => {
        const elapsed = window.performance.now() - startTime
        this.transitionProgress = Math.min(elapsed / durationMs, 1.0)

        if (this.transitionProgress < 1.0) {
          requestAnimationFrame(animate)
        } else {
          // Cleanup
          if (this.transitionEffect) {
            this.transitionEffect.dispose()
            this.transitionEffect = null
          }
          this.isTransitioning = false
          this.transitionProgress = 0

          if (this.transitionResolve) {
            this.transitionResolve()
            this.transitionResolve = null
          }
        }
      }

      requestAnimationFrame(animate)
    })
  }

  /**
   * Update time-based effects
   */
  update(deltaTime: number): void {
    this.time += deltaTime
  }

  /**
   * Get the glow layer for adding meshes
   */
  getGlowLayer(): GlowLayer | null {
    return this.glowLayer
  }

  /**
   * Check if currently in Veil transition
   */
  isInTransition(): boolean {
    return this.isTransitioning
  }

  /**
   * Dispose all effects
   */
  dispose(): void {
    this.glowLayer?.dispose()
    this.vignetteEffect?.dispose()
    this.chromaticEffect?.dispose()
    this.distortionEffect?.dispose()
    this.transitionEffect?.dispose()

    this.glowLayer = null
    this.vignetteEffect = null
    this.chromaticEffect = null
    this.distortionEffect = null
    this.transitionEffect = null
  }
}
