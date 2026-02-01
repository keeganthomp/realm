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
  Mesh
} from '@babylonjs/core'
import { AdvancedDynamicTexture, TextBlock, Rectangle, Control } from '@babylonjs/gui'

// Singleton instance
let instance: SharedResources | null = null

export class SharedResources {
  private scene: Scene
  private guiTexture: AdvancedDynamicTexture
  private materials: Map<string, StandardMaterial> = new Map()
  private meshTemplates: Map<string, Mesh> = new Map()

  private constructor(scene: Scene) {
    this.scene = scene
    // Single GUI texture for ALL entity labels
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('sharedUI', true, scene)
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

  getMaterial(name: string, color: Color3, options?: { emissive?: Color3; alpha?: number }): StandardMaterial {
    const key = `${name}_${color.toHexString()}_${options?.alpha ?? 1}`

    let mat = this.materials.get(key)
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
      mat.freeze() // Freeze material for performance
      this.materials.set(key, mat)
    }
    return mat
  }

  // Common materials (pre-cached)
  get trunkMaterial(): StandardMaterial {
    return this.getMaterial('trunk', new Color3(0.36, 0.25, 0.2))
  }

  get greenCanopyMaterial(): StandardMaterial {
    return this.getMaterial('canopyGreen', new Color3(0.13, 0.55, 0.13))
  }

  get oakCanopyMaterial(): StandardMaterial {
    return this.getMaterial('canopyOak', new Color3(0.18, 0.55, 0.34))
  }

  get willowCanopyMaterial(): StandardMaterial {
    return this.getMaterial('canopyWillow', new Color3(0.42, 0.56, 0.14))
  }

  get stumpMaterial(): StandardMaterial {
    return this.getMaterial('stump', new Color3(0.36, 0.25, 0.2))
  }

  get stumpTopMaterial(): StandardMaterial {
    return this.getMaterial('stumpTop', new Color3(0.55, 0.45, 0.33))
  }

  get waterMaterial(): StandardMaterial {
    return this.getMaterial('water', new Color3(0.29, 0.56, 0.85), { alpha: 0.7 })
  }

  get woodMaterial(): StandardMaterial {
    return this.getMaterial('wood', new Color3(0.55, 0.35, 0.2))
  }

  get darkWoodMaterial(): StandardMaterial {
    return this.getMaterial('darkWood', new Color3(0.4, 0.25, 0.15))
  }

  get goldMaterial(): StandardMaterial {
    return this.getMaterial('gold', new Color3(0.72, 0.53, 0.04), { emissive: new Color3(0.3, 0.22, 0.02) })
  }

  get flameMaterial(): StandardMaterial {
    return this.getMaterial('flame', new Color3(1, 0.27, 0), { emissive: new Color3(1, 0.4, 0.1), alpha: 0.9 })
  }

  get innerFlameMaterial(): StandardMaterial {
    return this.getMaterial('innerFlame', new Color3(1, 0.8, 0), { emissive: new Color3(1, 0.9, 0.3) })
  }

  // NPC materials
  get chickenMaterial(): StandardMaterial {
    return this.getMaterial('chicken', new Color3(1, 1, 0.9))
  }

  get chickenBeakMaterial(): StandardMaterial {
    return this.getMaterial('chickenBeak', new Color3(1, 0.6, 0))
  }

  get chickenCombMaterial(): StandardMaterial {
    return this.getMaterial('chickenComb', new Color3(0.9, 0.1, 0.1))
  }

  get cowMaterial(): StandardMaterial {
    return this.getMaterial('cow', new Color3(0.3, 0.2, 0.1))
  }

  get cowHeadMaterial(): StandardMaterial {
    return this.getMaterial('cowHead', new Color3(0.35, 0.25, 0.15))
  }

  get cowSpotMaterial(): StandardMaterial {
    return this.getMaterial('cowSpot', new Color3(1, 1, 1))
  }

  get goblinMaterial(): StandardMaterial {
    return this.getMaterial('goblin', new Color3(0.2, 0.7, 0.2))
  }

  get goblinDarkMaterial(): StandardMaterial {
    return this.getMaterial('goblinDark', new Color3(0.15, 0.5, 0.15))
  }

  get ratMaterial(): StandardMaterial {
    return this.getMaterial('rat', new Color3(0.4, 0.35, 0.3))
  }

  get ratTailMaterial(): StandardMaterial {
    return this.getMaterial('ratTail', new Color3(0.7, 0.6, 0.5))
  }

  get guardArmorMaterial(): StandardMaterial {
    return this.getMaterial('guardArmor', new Color3(0.6, 0.6, 0.65))
  }

  get guardChainmailMaterial(): StandardMaterial {
    return this.getMaterial('guardChainmail', new Color3(0.5, 0.5, 0.55))
  }

  get guardHelmetMaterial(): StandardMaterial {
    return this.getMaterial('guardHelmet', new Color3(0.55, 0.55, 0.6))
  }

  get defaultNpcMaterial(): StandardMaterial {
    return this.getMaterial('defaultNpc', new Color3(0.5, 0.5, 0.5))
  }

  // Player materials
  get playerBodyMaterial(): StandardMaterial {
    return this.getMaterial('playerBody', new Color3(0.15, 0.15, 0.16))
  }

  get playerSkinMaterial(): StandardMaterial {
    return this.getMaterial('playerSkin', new Color3(0.96, 0.82, 0.66))
  }

  get actionIndicatorMaterial(): StandardMaterial {
    return this.getMaterial('actionIndicator', new Color3(0.72, 0.53, 0.04), { alpha: 0.8 })
  }

  // Market stall awning materials
  get redAwningMaterial(): StandardMaterial {
    return this.getMaterial('redAwning', new Color3(0.8, 0.15, 0.15))
  }

  get blueAwningMaterial(): StandardMaterial {
    return this.getMaterial('blueAwning', new Color3(0.15, 0.35, 0.8))
  }

  get greenAwningMaterial(): StandardMaterial {
    return this.getMaterial('greenAwning', new Color3(0.15, 0.6, 0.2))
  }

  get yellowAwningMaterial(): StandardMaterial {
    return this.getMaterial('yellowAwning', new Color3(0.9, 0.75, 0.1))
  }

  // Building materials
  get stoneMaterial(): StandardMaterial {
    return this.getMaterial('stone', new Color3(0.5, 0.5, 0.52))
  }

  get darkStoneMaterial(): StandardMaterial {
    return this.getMaterial('darkStone', new Color3(0.35, 0.35, 0.37))
  }

  get ironMaterial(): StandardMaterial {
    return this.getMaterial('iron', new Color3(0.45, 0.45, 0.5))
  }

  get hayMaterial(): StandardMaterial {
    return this.getMaterial('hay', new Color3(0.85, 0.75, 0.4))
  }

  // Flower materials
  get flowerRedMaterial(): StandardMaterial {
    return this.getMaterial('flowerRed', new Color3(0.9, 0.2, 0.25))
  }

  get flowerYellowMaterial(): StandardMaterial {
    return this.getMaterial('flowerYellow', new Color3(1, 0.85, 0.2))
  }

  get flowerPinkMaterial(): StandardMaterial {
    return this.getMaterial('flowerPink', new Color3(1, 0.5, 0.7))
  }

  // Nature materials
  get bushMaterial(): StandardMaterial {
    return this.getMaterial('bush', new Color3(0.2, 0.45, 0.15))
  }

  get rockMaterial(): StandardMaterial {
    return this.getMaterial('rock', new Color3(0.55, 0.52, 0.48))
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
