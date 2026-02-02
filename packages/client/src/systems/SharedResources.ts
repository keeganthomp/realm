/**
 * SharedResources - Centralized resource management for performance
 *
 * Key optimizations:
 * 1. Single GUI texture for all entity labels/health bars
 * 2. Cached materials to avoid duplicates
 * 3. Shared mesh templates for instancing
 */

import {
  Scene,
  StandardMaterial,
  Color3,
  Mesh,
  MeshBuilder,
  InstancedMesh,
  TransformNode,
  Material
} from '@babylonjs/core'
import { AdvancedDynamicTexture, TextBlock, Rectangle, Control } from '@babylonjs/gui'
import { ShaderManager } from './ShaderManager'

// Singleton instance
let instance: SharedResources | null = null

export class SharedResources {
  private scene: Scene
  private guiTexture: AdvancedDynamicTexture
  private materials: Map<string, Material> = new Map()
  private meshTemplates: Map<string, Mesh> = new Map()
  private useCelShading: boolean = true

  private constructor(scene: Scene) {
    this.scene = scene
    // Single GUI texture for ALL entity labels
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('sharedUI', true, scene)
  }

  /**
   * Enable or disable cel-shading for all new materials
   */
  setCelShading(enabled: boolean): void {
    this.useCelShading = enabled
  }

  static init(scene: Scene): SharedResources {
    if (instance) {
      instance.dispose()
    }
    instance = new SharedResources(scene)
    return instance
  }

  static get(): SharedResources {
    if (!instance) {
      throw new Error('SharedResources not initialized. Call SharedResources.init(scene) first.')
    }
    return instance
  }

  // ============ GUI Management ============

  createLabel(id: string, text: string, color: string = 'white'): TextBlock {
    const label = new TextBlock('label_' + id, text)
    label.color = color
    label.fontSize = 12
    label.fontFamily = 'Inter, sans-serif'
    label.outlineWidth = 2
    label.outlineColor = 'black'
    label.isVisible = false
    this.guiTexture.addControl(label)
    return label
  }

  createHealthBar(id: string): { container: Rectangle; fill: Rectangle } {
    const container = new Rectangle('hpContainer_' + id)
    container.width = '40px'
    container.height = '6px'
    container.background = 'rgba(0, 0, 0, 0.7)'
    container.thickness = 1
    container.color = 'black'
    this.guiTexture.addControl(container)

    const fill = new Rectangle('hpFill_' + id)
    fill.width = '100%'
    fill.height = '100%'
    fill.background = '#22c55e'
    fill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
    fill.thickness = 0
    container.addControl(fill)

    return { container, fill }
  }

  removeControl(control: Control | null) {
    if (control) {
      this.guiTexture.removeControl(control)
      control.dispose()
    }
  }

  // ============ Material Management ============

  getMaterial(name: string, color: Color3, options?: { emissive?: Color3; alpha?: number }): Material {
    const celPrefix = this.useCelShading ? 'cel_' : ''
    const key = `${celPrefix}${name}_${color.toHexString()}_${options?.alpha ?? 1}`

    let mat = this.materials.get(key)
    if (!mat) {
      // Try to use cel-shading if enabled
      if (this.useCelShading && !options?.emissive && (options?.alpha ?? 1) >= 1) {
        try {
          const shaderManager = ShaderManager.getInstance()
          console.log('[SharedResources] ✓ Creating cel-shade material:', key)
          mat = shaderManager.createCelShadeMaterial(key, color, {
            bands: 3,  // 3 bands for visible stepping
            ambientIntensity: 0.1,  // Low ambient for dramatic shadows
            highlightColor: new Color3(1.5, 1.4, 1.2),  // Warm bright highlights
            shadowColor: new Color3(0.2, 0.15, 0.3)     // Cool dark shadows
          })
          this.materials.set(key, mat)
          return mat
        } catch (e) {
          console.warn('[SharedResources] ShaderManager not available, using standard material', e)
        }
      }

      // Fallback to standard material
      const stdMat = new StandardMaterial(key, this.scene)
      stdMat.diffuseColor = color
      stdMat.specularColor = Color3.Black()
      if (options?.emissive) {
        stdMat.emissiveColor = options.emissive
      }
      if (options?.alpha !== undefined) {
        stdMat.alpha = options.alpha
      }
      stdMat.freeze() // Freeze material for performance
      mat = stdMat
      this.materials.set(key, mat)
    }
    return mat
  }

  /**
   * Get a standard material (never cel-shaded) - use for special cases like emissives
   */
  getStandardMaterial(name: string, color: Color3, options?: { emissive?: Color3; alpha?: number }): StandardMaterial {
    const key = `std_${name}_${color.toHexString()}_${options?.alpha ?? 1}`

    let mat = this.materials.get(key) as StandardMaterial | undefined
    if (!mat) {
      mat = new StandardMaterial(key, this.scene)
      mat.diffuseColor = color
      mat.specularColor = Color3.Black()
      if (options?.emissive) {
        mat.emissiveColor = options.emissive
      }
      if (options?.alpha !== undefined) {
        mat.alpha = options.alpha
      }
      mat.freeze()
      this.materials.set(key, mat)
    }
    return mat
  }

  // Common materials (pre-cached)
  get trunkMaterial(): Material {
    return this.getMaterial('trunk', new Color3(0.36, 0.25, 0.2))
  }

  get greenCanopyMaterial(): Material {
    return this.getMaterial('canopyGreen', new Color3(0.13, 0.55, 0.13))
  }

  get oakCanopyMaterial(): Material {
    return this.getMaterial('canopyOak', new Color3(0.18, 0.55, 0.34))
  }

  get willowCanopyMaterial(): Material {
    return this.getMaterial('canopyWillow', new Color3(0.42, 0.56, 0.14))
  }

  get stumpMaterial(): Material {
    return this.getMaterial('stump', new Color3(0.36, 0.25, 0.2))
  }

  get stumpTopMaterial(): Material {
    return this.getMaterial('stumpTop', new Color3(0.55, 0.45, 0.33))
  }

  get waterMaterial(): Material {
    return this.getMaterial('water', new Color3(0.29, 0.56, 0.85), { alpha: 0.7 })
  }

  get woodMaterial(): Material {
    return this.getMaterial('wood', new Color3(0.55, 0.35, 0.2))
  }

  get darkWoodMaterial(): Material {
    return this.getMaterial('darkWood', new Color3(0.4, 0.25, 0.15))
  }

  get goldMaterial(): Material {
    return this.getMaterial('gold', new Color3(0.72, 0.53, 0.04), { emissive: new Color3(0.3, 0.22, 0.02) })
  }

  get flameMaterial(): Material {
    return this.getMaterial('flame', new Color3(1, 0.27, 0), { emissive: new Color3(1, 0.4, 0.1), alpha: 0.9 })
  }

  get innerFlameMaterial(): Material {
    return this.getMaterial('innerFlame', new Color3(1, 0.8, 0), { emissive: new Color3(1, 0.9, 0.3) })
  }

  // NPC materials
  get chickenMaterial(): Material {
    return this.getMaterial('chicken', new Color3(1, 1, 0.9))
  }

  get chickenBeakMaterial(): Material {
    return this.getMaterial('chickenBeak', new Color3(1, 0.6, 0))
  }

  get chickenCombMaterial(): Material {
    return this.getMaterial('chickenComb', new Color3(0.9, 0.1, 0.1))
  }

  get cowMaterial(): Material {
    return this.getMaterial('cow', new Color3(0.3, 0.2, 0.1))
  }

  get cowHeadMaterial(): Material {
    return this.getMaterial('cowHead', new Color3(0.35, 0.25, 0.15))
  }

  get cowSpotMaterial(): Material {
    return this.getMaterial('cowSpot', new Color3(1, 1, 1))
  }

  get goblinMaterial(): Material {
    return this.getMaterial('goblin', new Color3(0.2, 0.7, 0.2))
  }

  get goblinDarkMaterial(): Material {
    return this.getMaterial('goblinDark', new Color3(0.15, 0.5, 0.15))
  }

  get ratMaterial(): Material {
    return this.getMaterial('rat', new Color3(0.4, 0.35, 0.3))
  }

  get ratTailMaterial(): Material {
    return this.getMaterial('ratTail', new Color3(0.7, 0.6, 0.5))
  }

  get guardArmorMaterial(): Material {
    return this.getMaterial('guardArmor', new Color3(0.6, 0.6, 0.65))
  }

  get guardChainmailMaterial(): Material {
    return this.getMaterial('guardChainmail', new Color3(0.5, 0.5, 0.55))
  }

  get guardHelmetMaterial(): Material {
    return this.getMaterial('guardHelmet', new Color3(0.55, 0.55, 0.6))
  }

  get defaultNpcMaterial(): Material {
    return this.getMaterial('defaultNpc', new Color3(0.5, 0.5, 0.5))
  }

  // Player materials
  get playerBodyMaterial(): Material {
    return this.getMaterial('playerBody', new Color3(0.15, 0.15, 0.16))
  }

  get playerSkinMaterial(): Material {
    return this.getMaterial('playerSkin', new Color3(0.96, 0.82, 0.66))
  }

  get actionIndicatorMaterial(): Material {
    return this.getMaterial('actionIndicator', new Color3(0.72, 0.53, 0.04), { alpha: 0.8 })
  }

  // Market stall awning materials
  get redAwningMaterial(): Material {
    return this.getMaterial('redAwning', new Color3(0.8, 0.15, 0.15))
  }

  get blueAwningMaterial(): Material {
    return this.getMaterial('blueAwning', new Color3(0.15, 0.35, 0.8))
  }

  get greenAwningMaterial(): Material {
    return this.getMaterial('greenAwning', new Color3(0.15, 0.6, 0.2))
  }

  get yellowAwningMaterial(): Material {
    return this.getMaterial('yellowAwning', new Color3(0.9, 0.75, 0.1))
  }

  // Building materials
  get stoneMaterial(): Material {
    return this.getMaterial('stone', new Color3(0.5, 0.5, 0.52))
  }

  get darkStoneMaterial(): Material {
    return this.getMaterial('darkStone', new Color3(0.35, 0.35, 0.37))
  }

  get ironMaterial(): Material {
    return this.getMaterial('iron', new Color3(0.45, 0.45, 0.5))
  }

  get hayMaterial(): Material {
    return this.getMaterial('hay', new Color3(0.85, 0.75, 0.4))
  }

  // Flower materials
  get flowerRedMaterial(): Material {
    return this.getMaterial('flowerRed', new Color3(0.9, 0.2, 0.25))
  }

  get flowerYellowMaterial(): Material {
    return this.getMaterial('flowerYellow', new Color3(1, 0.85, 0.2))
  }

  get flowerPinkMaterial(): Material {
    return this.getMaterial('flowerPink', new Color3(1, 0.5, 0.7))
  }

  // Nature materials
  get bushMaterial(): Material {
    return this.getMaterial('bush', new Color3(0.2, 0.45, 0.15))
  }

  get rockMaterial(): Material {
    return this.getMaterial('rock', new Color3(0.55, 0.52, 0.48))
  }

  // Ore vein materials
  get copperVeinMaterial(): Material {
    return this.getMaterial('copperVein', new Color3(0.72, 0.45, 0.2))
  }

  get tinVeinMaterial(): Material {
    return this.getMaterial('tinVein', new Color3(0.75, 0.75, 0.78))
  }

  get ironVeinMaterial(): Material {
    return this.getMaterial('ironVein', new Color3(0.55, 0.35, 0.25))
  }

  get coalVeinMaterial(): Material {
    return this.getMaterial('coalVein', new Color3(0.15, 0.15, 0.18))
  }

  // Fabric/leather materials
  get fabricMaterial(): Material {
    return this.getMaterial('fabric', new Color3(0.85, 0.8, 0.7))
  }

  get leatherMaterial(): Material {
    return this.getMaterial('leather', new Color3(0.55, 0.4, 0.25))
  }

  // Ruins materials
  get oldStoneMaterial(): Material {
    return this.getMaterial('oldStone', new Color3(0.45, 0.43, 0.4))
  }

  // Bone material
  get boneMaterial(): Material {
    return this.getMaterial('bone', new Color3(0.9, 0.88, 0.82))
  }

  // Equipment materials - by tier
  get bronzeEquipmentMaterial(): Material {
    return this.getMaterial('bronzeEquip', new Color3(0.8, 0.5, 0.2))
  }

  get ironEquipmentMaterial(): Material {
    return this.getMaterial('ironEquip', new Color3(0.55, 0.55, 0.6))
  }

  get steelEquipmentMaterial(): Material {
    return this.getMaterial('steelEquip', new Color3(0.7, 0.75, 0.85))
  }

  get woodenEquipmentMaterial(): Material {
    return this.getMaterial('woodenEquip', new Color3(0.6, 0.45, 0.25))
  }

  get leatherEquipmentMaterial(): Material {
    return this.getMaterial('leatherEquip', new Color3(0.5, 0.35, 0.2))
  }

  // Mushroom materials
  get mushroomRedMaterial(): Material {
    return this.getMaterial('mushroomRed', new Color3(0.85, 0.15, 0.1))
  }

  get mushroomBrownMaterial(): Material {
    return this.getMaterial('mushroomBrown', new Color3(0.55, 0.4, 0.25))
  }

  // ============ Mesh Templates for Instancing ============

  /**
   * Get or create a mesh template for instancing
   * Template meshes are invisible and used only for creating instances
   */
  getMeshTemplate(name: string, createFn: () => Mesh): Mesh {
    let template = this.meshTemplates.get(name)
    if (!template) {
      template = createFn()
      template.isVisible = false // Template is never rendered directly
      template.setEnabled(false) // Disable to prevent any processing
      this.meshTemplates.set(name, template)
    }
    return template
  }

  /**
   * Create an instance from a mesh template
   * The instance can be parented and positioned independently
   */
  createMeshInstance(templateName: string, instanceId: string, parent: TransformNode): InstancedMesh | null {
    const template = this.meshTemplates.get(templateName)
    if (!template) return null

    const instance = template.createInstance(`${templateName}_${instanceId}`)
    instance.parent = parent
    return instance
  }

  // ============ Pre-built Mesh Templates ============
  // These are common meshes used many times (barrels, crates, etc.)

  /**
   * Get barrel body mesh template
   */
  getBarrelBodyTemplate(): Mesh {
    return this.getMeshTemplate('barrelBody', () => {
      const mesh = MeshBuilder.CreateCylinder('tpl_barrelBody', {
        height: 0.5, diameterTop: 0.35, diameterBottom: 0.35, tessellation: 12
      }, this.scene)
      mesh.material = this.woodMaterial
      return mesh
    })
  }

  getBarrelBulgeTemplate(): Mesh {
    return this.getMeshTemplate('barrelBulge', () => {
      const mesh = MeshBuilder.CreateCylinder('tpl_barrelBulge', {
        height: 0.2, diameter: 0.4, tessellation: 12
      }, this.scene)
      mesh.material = this.woodMaterial
      return mesh
    })
  }

  getBarrelBandTemplate(): Mesh {
    return this.getMeshTemplate('barrelBand', () => {
      const mesh = MeshBuilder.CreateTorus('tpl_barrelBand', {
        diameter: 0.36, thickness: 0.02, tessellation: 12
      }, this.scene)
      mesh.material = this.ironMaterial
      return mesh
    })
  }

  getCrateTemplate(): Mesh {
    return this.getMeshTemplate('crate', () => {
      const mesh = MeshBuilder.CreateBox('tpl_crate', {
        width: 0.45, height: 0.4, depth: 0.45
      }, this.scene)
      mesh.material = this.woodMaterial
      return mesh
    })
  }

  getCrateTopTemplate(): Mesh {
    return this.getMeshTemplate('crateTop', () => {
      const mesh = MeshBuilder.CreateBox('tpl_crateTop', {
        width: 0.48, height: 0.04, depth: 0.48
      }, this.scene)
      mesh.material = this.darkWoodMaterial
      return mesh
    })
  }

  getTreeTrunkTemplate(): Mesh {
    return this.getMeshTemplate('treeTrunk', () => {
      const mesh = MeshBuilder.CreateCylinder('tpl_treeTrunk', {
        height: 0.7, diameterTop: 0.18, diameterBottom: 0.26, tessellation: 6
      }, this.scene)
      mesh.material = this.trunkMaterial
      return mesh
    })
  }

  getTreeCanopyTemplate(): Mesh {
    return this.getMeshTemplate('treeCanopy', () => {
      const mesh = MeshBuilder.CreateCylinder('tpl_treeCanopy', {
        height: 0.7, diameterTop: 0.2, diameterBottom: 1.0, tessellation: 6
      }, this.scene)
      mesh.material = this.greenCanopyMaterial
      return mesh
    })
  }

  getRockTemplate(): Mesh {
    return this.getMeshTemplate('rock', () => {
      const mesh = MeshBuilder.CreateSphere('tpl_rock', {
        diameterX: 0.5, diameterY: 0.35, diameterZ: 0.45, segments: 6
      }, this.scene)
      mesh.material = this.rockMaterial
      return mesh
    })
  }

  getBushTemplate(): Mesh {
    return this.getMeshTemplate('bush', () => {
      const mesh = MeshBuilder.CreateSphere('tpl_bush', {
        diameterX: 0.6, diameterY: 0.4, diameterZ: 0.6, segments: 8
      }, this.scene)
      mesh.material = this.bushMaterial
      return mesh
    })
  }

  // ============ Cleanup ============

  dispose() {
    this.guiTexture.dispose()
    for (const mat of this.materials.values()) {
      mat.dispose()
    }
    this.materials.clear()
    for (const mesh of this.meshTemplates.values()) {
      mesh.dispose()
    }
    this.meshTemplates.clear()
    instance = null
  }
}
