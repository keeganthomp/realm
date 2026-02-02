/**
 * Veil Items - Resources and equipment from the Veil dimension
 *
 * These items are obtained exclusively from the Veil and used
 * for Crystallurgy crafting, Binding, and Veil equipment.
 */

export enum VeilItemType {
  // ============ Raw Materials ============
  // Dropped by creatures or gathered in the Veil

  RAW_CRYSTAL = 'raw_crystal',           // Common crystal, gathered or dropped
  LUMINOUS_SHARD = 'luminous_shard',     // Glowing fragment, various uses
  VOID_ESSENCE = 'void_essence',         // Dark energy from shades
  WISP_DUST = 'wisp_dust',               // Dust from wisps
  SHADE_CLOTH = 'shade_cloth',           // Ethereal fabric from shades
  VEIL_FANG = 'veil_fang',               // From stalkers
  LUMINARCH_ESSENCE = 'luminarch_essence', // Boss drop
  VOID_HEART = 'void_heart',             // Final boss drop
  VOID_TENDRIL = 'void_tendril',         // Rare boss drop

  // ============ Refined Materials ============
  // Created through Crystallurgy skill

  REFINED_CRYSTAL = 'refined_crystal',   // Processed raw crystal
  VEIL_INGOT = 'veil_ingot',             // Metal infused with veil energy
  LUMINOUS_THREAD = 'luminous_thread',   // For crafting veil cloth
  CRYSTAL_CORE = 'crystal_core',         // For veil weapons
  VOID_GEM = 'void_gem',                 // High-tier crafting component

  // ============ Consumables ============

  STABILITY_POTION = 'stability_potion',       // Restores Veil Stability
  GREATER_STABILITY_POTION = 'greater_stability_potion',
  VEIL_ANCHOR_SHARD = 'veil_anchor_shard',     // Creates temporary anchor
  LIGHT_FLASK = 'light_flask',                 // Temporary illumination
  VOID_WARD = 'void_ward',                     // Reduces stability drain

  // ============ Equipment - Veil-touched (Tier 7) ============

  VEIL_SWORD = 'veil_sword',
  VEIL_SHIELD = 'veil_shield',
  VEIL_HELMET = 'veil_helmet',
  VEIL_BODY = 'veil_body',
  VEIL_LEGS = 'veil_legs',

  // ============ Equipment - Crystalline (Tier 8) ============

  CRYSTAL_BLADE = 'crystal_blade',
  CRYSTAL_AEGIS = 'crystal_aegis',
  CRYSTAL_CROWN = 'crystal_crown',
  CRYSTAL_PLATE = 'crystal_plate',
  CRYSTAL_GREAVES = 'crystal_greaves',

  // ============ Equipment - Void-forged (Tier 9) ============

  VOID_EDGE = 'void_edge',
  VOID_BULWARK = 'void_bulwark',
  VOID_VISAGE = 'void_visage',
  VOID_CUIRASS = 'void_cuirass',
  VOID_TASSETS = 'void_tassets',

  // ============ Equipment - Luminarch (Tier 10) ============

  LUMINARCH_BLADE = 'luminarch_blade',
  LUMINARCH_CROWN = 'luminarch_crown',  // Boss drop
  LUMINARCH_RAIMENT = 'luminarch_raiment'
}

export interface VeilItemDefinition {
  type: VeilItemType
  name: string
  description: string
  stackable: boolean
  tradeable: boolean

  // For consumables
  consumable?: boolean
  stabilityRestore?: number
  effectDuration?: number  // ms

  // For equipment
  equipSlot?: 'weapon' | 'offhand' | 'head' | 'body' | 'legs'
  attackBonus?: number
  strengthBonus?: number
  defenceBonus?: number
  stabilityBonus?: number  // % reduction in stability drain
  levelRequired?: number

  // Crafting
  crystallurgyLevel?: number  // Level to craft
  craftingRecipe?: { itemType: VeilItemType | string; quantity: number }[]
}

export const VEIL_ITEM_DEFINITIONS: Record<VeilItemType, VeilItemDefinition> = {
  // ============ Raw Materials ============

  [VeilItemType.RAW_CRYSTAL]: {
    type: VeilItemType.RAW_CRYSTAL,
    name: 'Raw Crystal',
    description: 'A rough crystal fragment from the Veil. Can be refined.',
    stackable: true,
    tradeable: true
  },

  [VeilItemType.LUMINOUS_SHARD]: {
    type: VeilItemType.LUMINOUS_SHARD,
    name: 'Luminous Shard',
    description: 'A glowing fragment that pulses with inner light.',
    stackable: true,
    tradeable: true
  },

  [VeilItemType.VOID_ESSENCE]: {
    type: VeilItemType.VOID_ESSENCE,
    name: 'Void Essence',
    description: 'Dark energy extracted from creatures of shadow.',
    stackable: true,
    tradeable: true
  },

  [VeilItemType.WISP_DUST]: {
    type: VeilItemType.WISP_DUST,
    name: 'Wisp Dust',
    description: 'Sparkling particles left behind by wisps.',
    stackable: true,
    tradeable: true
  },

  [VeilItemType.SHADE_CLOTH]: {
    type: VeilItemType.SHADE_CLOTH,
    name: 'Shade Cloth',
    description: 'Ethereal fabric woven from shadow.',
    stackable: true,
    tradeable: true
  },

  [VeilItemType.VEIL_FANG]: {
    type: VeilItemType.VEIL_FANG,
    name: 'Veil Fang',
    description: 'A razor-sharp fang from a Veil Stalker.',
    stackable: true,
    tradeable: true
  },

  [VeilItemType.LUMINARCH_ESSENCE]: {
    type: VeilItemType.LUMINARCH_ESSENCE,
    name: 'Luminarch Essence',
    description: 'Pure light essence from the Luminarch. Extremely valuable.',
    stackable: true,
    tradeable: true
  },

  [VeilItemType.VOID_HEART]: {
    type: VeilItemType.VOID_HEART,
    name: 'Void Heart',
    description: 'The still-pulsing heart of the Void Horror.',
    stackable: false,
    tradeable: true
  },

  [VeilItemType.VOID_TENDRIL]: {
    type: VeilItemType.VOID_TENDRIL,
    name: 'Void Tendril',
    description: 'A writhing appendage that defies natural law.',
    stackable: false,
    tradeable: true
  },

  // ============ Refined Materials ============

  [VeilItemType.REFINED_CRYSTAL]: {
    type: VeilItemType.REFINED_CRYSTAL,
    name: 'Refined Crystal',
    description: 'A purified crystal ready for crafting.',
    stackable: true,
    tradeable: true,
    crystallurgyLevel: 10,
    craftingRecipe: [{ itemType: VeilItemType.RAW_CRYSTAL, quantity: 3 }]
  },

  [VeilItemType.VEIL_INGOT]: {
    type: VeilItemType.VEIL_INGOT,
    name: 'Veil Ingot',
    description: 'Metal infused with crystalline energy.',
    stackable: true,
    tradeable: true,
    crystallurgyLevel: 30,
    craftingRecipe: [
      { itemType: VeilItemType.REFINED_CRYSTAL, quantity: 2 },
      { itemType: 'steel_bar', quantity: 1 }
    ]
  },

  [VeilItemType.LUMINOUS_THREAD]: {
    type: VeilItemType.LUMINOUS_THREAD,
    name: 'Luminous Thread',
    description: 'Glowing thread for crafting veil-touched armor.',
    stackable: true,
    tradeable: true,
    crystallurgyLevel: 25,
    craftingRecipe: [
      { itemType: VeilItemType.LUMINOUS_SHARD, quantity: 3 },
      { itemType: VeilItemType.SHADE_CLOTH, quantity: 1 }
    ]
  },

  [VeilItemType.CRYSTAL_CORE]: {
    type: VeilItemType.CRYSTAL_CORE,
    name: 'Crystal Core',
    description: 'A concentrated crystal essence for powerful weapons.',
    stackable: true,
    tradeable: true,
    crystallurgyLevel: 50,
    craftingRecipe: [
      { itemType: VeilItemType.REFINED_CRYSTAL, quantity: 5 },
      { itemType: VeilItemType.VOID_ESSENCE, quantity: 2 }
    ]
  },

  [VeilItemType.VOID_GEM]: {
    type: VeilItemType.VOID_GEM,
    name: 'Void Gem',
    description: 'A gem of pure void energy. Extremely rare.',
    stackable: true,
    tradeable: true
  },

  // ============ Consumables ============

  [VeilItemType.STABILITY_POTION]: {
    type: VeilItemType.STABILITY_POTION,
    name: 'Stability Potion',
    description: 'Restores 25% Veil Stability.',
    stackable: true,
    tradeable: true,
    consumable: true,
    stabilityRestore: 25,
    crystallurgyLevel: 15,
    craftingRecipe: [
      { itemType: VeilItemType.WISP_DUST, quantity: 3 },
      { itemType: VeilItemType.RAW_CRYSTAL, quantity: 1 }
    ]
  },

  [VeilItemType.GREATER_STABILITY_POTION]: {
    type: VeilItemType.GREATER_STABILITY_POTION,
    name: 'Greater Stability Potion',
    description: 'Restores 50% Veil Stability.',
    stackable: true,
    tradeable: true,
    consumable: true,
    stabilityRestore: 50,
    crystallurgyLevel: 45,
    craftingRecipe: [
      { itemType: VeilItemType.STABILITY_POTION, quantity: 2 },
      { itemType: VeilItemType.LUMINOUS_SHARD, quantity: 2 }
    ]
  },

  [VeilItemType.VEIL_ANCHOR_SHARD]: {
    type: VeilItemType.VEIL_ANCHOR_SHARD,
    name: 'Veil Anchor Shard',
    description: 'Creates a temporary anchor point in the Veil.',
    stackable: true,
    tradeable: true,
    consumable: true,
    crystallurgyLevel: 35,
    craftingRecipe: [
      { itemType: VeilItemType.REFINED_CRYSTAL, quantity: 3 },
      { itemType: VeilItemType.VOID_ESSENCE, quantity: 1 }
    ]
  },

  [VeilItemType.LIGHT_FLASK]: {
    type: VeilItemType.LIGHT_FLASK,
    name: 'Light Flask',
    description: 'Provides illumination in dark areas for 5 minutes.',
    stackable: true,
    tradeable: true,
    consumable: true,
    effectDuration: 300000,
    crystallurgyLevel: 5,
    craftingRecipe: [
      { itemType: VeilItemType.WISP_DUST, quantity: 5 }
    ]
  },

  [VeilItemType.VOID_WARD]: {
    type: VeilItemType.VOID_WARD,
    name: 'Void Ward',
    description: 'Reduces stability drain by 50% for 3 minutes.',
    stackable: true,
    tradeable: true,
    consumable: true,
    effectDuration: 180000,
    crystallurgyLevel: 55,
    craftingRecipe: [
      { itemType: VeilItemType.VOID_ESSENCE, quantity: 3 },
      { itemType: VeilItemType.LUMINOUS_THREAD, quantity: 1 }
    ]
  },

  // ============ Equipment - Veil-touched (Tier 7, Level 60) ============

  [VeilItemType.VEIL_SWORD]: {
    type: VeilItemType.VEIL_SWORD,
    name: 'Veil-touched Sword',
    description: 'A blade infused with the essence of the Veil.',
    stackable: false,
    tradeable: true,
    equipSlot: 'weapon',
    attackBonus: 55,
    strengthBonus: 50,
    stabilityBonus: 5,
    levelRequired: 60,
    crystallurgyLevel: 60,
    craftingRecipe: [
      { itemType: VeilItemType.VEIL_INGOT, quantity: 3 },
      { itemType: VeilItemType.CRYSTAL_CORE, quantity: 1 }
    ]
  },

  [VeilItemType.VEIL_SHIELD]: {
    type: VeilItemType.VEIL_SHIELD,
    name: 'Veil-touched Shield',
    description: 'A shield that glimmers with inner light.',
    stackable: false,
    tradeable: true,
    equipSlot: 'offhand',
    defenceBonus: 45,
    stabilityBonus: 5,
    levelRequired: 60,
    crystallurgyLevel: 60,
    craftingRecipe: [
      { itemType: VeilItemType.VEIL_INGOT, quantity: 2 },
      { itemType: VeilItemType.LUMINOUS_THREAD, quantity: 2 }
    ]
  },

  [VeilItemType.VEIL_HELMET]: {
    type: VeilItemType.VEIL_HELMET,
    name: 'Veil-touched Helm',
    description: 'A helmet that protects against the Veil\'s influence.',
    stackable: false,
    tradeable: true,
    equipSlot: 'head',
    defenceBonus: 35,
    stabilityBonus: 5,
    levelRequired: 60,
    crystallurgyLevel: 58,
    craftingRecipe: [
      { itemType: VeilItemType.VEIL_INGOT, quantity: 2 },
      { itemType: VeilItemType.LUMINOUS_SHARD, quantity: 3 }
    ]
  },

  [VeilItemType.VEIL_BODY]: {
    type: VeilItemType.VEIL_BODY,
    name: 'Veil-touched Plate',
    description: 'Armor that resonates with the Veil.',
    stackable: false,
    tradeable: true,
    equipSlot: 'body',
    defenceBonus: 55,
    stabilityBonus: 5,
    levelRequired: 60,
    crystallurgyLevel: 62,
    craftingRecipe: [
      { itemType: VeilItemType.VEIL_INGOT, quantity: 4 },
      { itemType: VeilItemType.LUMINOUS_THREAD, quantity: 3 }
    ]
  },

  [VeilItemType.VEIL_LEGS]: {
    type: VeilItemType.VEIL_LEGS,
    name: 'Veil-touched Legs',
    description: 'Leg armor infused with crystalline energy.',
    stackable: false,
    tradeable: true,
    equipSlot: 'legs',
    defenceBonus: 45,
    stabilityBonus: 5,
    levelRequired: 60,
    crystallurgyLevel: 60,
    craftingRecipe: [
      { itemType: VeilItemType.VEIL_INGOT, quantity: 3 },
      { itemType: VeilItemType.LUMINOUS_THREAD, quantity: 2 }
    ]
  },

  // ============ Equipment - Crystalline (Tier 8, Level 70) ============

  [VeilItemType.CRYSTAL_BLADE]: {
    type: VeilItemType.CRYSTAL_BLADE,
    name: 'Crystalline Blade',
    description: 'A sword of pure, transparent crystal.',
    stackable: false,
    tradeable: true,
    equipSlot: 'weapon',
    attackBonus: 70,
    strengthBonus: 65,
    stabilityBonus: 10,
    levelRequired: 70,
    crystallurgyLevel: 75,
    craftingRecipe: [
      { itemType: VeilItemType.REFINED_CRYSTAL, quantity: 10 },
      { itemType: VeilItemType.CRYSTAL_CORE, quantity: 2 },
      { itemType: VeilItemType.VOID_GEM, quantity: 1 }
    ]
  },

  [VeilItemType.CRYSTAL_AEGIS]: {
    type: VeilItemType.CRYSTAL_AEGIS,
    name: 'Crystalline Aegis',
    description: 'A shield of living crystal.',
    stackable: false,
    tradeable: true,
    equipSlot: 'offhand',
    defenceBonus: 60,
    stabilityBonus: 10,
    levelRequired: 70,
    crystallurgyLevel: 75
  },

  [VeilItemType.CRYSTAL_CROWN]: {
    type: VeilItemType.CRYSTAL_CROWN,
    name: 'Crystalline Crown',
    description: 'A crown that marks mastery of Crystallurgy.',
    stackable: false,
    tradeable: true,
    equipSlot: 'head',
    defenceBonus: 45,
    stabilityBonus: 10,
    levelRequired: 70,
    crystallurgyLevel: 73
  },

  [VeilItemType.CRYSTAL_PLATE]: {
    type: VeilItemType.CRYSTAL_PLATE,
    name: 'Crystalline Plate',
    description: 'Armor grown from pure crystal.',
    stackable: false,
    tradeable: true,
    equipSlot: 'body',
    defenceBonus: 70,
    stabilityBonus: 10,
    levelRequired: 70,
    crystallurgyLevel: 78
  },

  [VeilItemType.CRYSTAL_GREAVES]: {
    type: VeilItemType.CRYSTAL_GREAVES,
    name: 'Crystalline Greaves',
    description: 'Leg armor of flawless crystal.',
    stackable: false,
    tradeable: true,
    equipSlot: 'legs',
    defenceBonus: 55,
    stabilityBonus: 10,
    levelRequired: 70,
    crystallurgyLevel: 75
  },

  // ============ Equipment - Void-forged (Tier 9, Level 80) ============

  [VeilItemType.VOID_EDGE]: {
    type: VeilItemType.VOID_EDGE,
    name: 'Void Edge',
    description: 'A blade that cuts through reality itself.',
    stackable: false,
    tradeable: true,
    equipSlot: 'weapon',
    attackBonus: 85,
    strengthBonus: 80,
    stabilityBonus: 15,
    levelRequired: 80
  },

  [VeilItemType.VOID_BULWARK]: {
    type: VeilItemType.VOID_BULWARK,
    name: 'Void Bulwark',
    description: 'A shield that absorbs attacks into nothingness.',
    stackable: false,
    tradeable: true,
    equipSlot: 'offhand',
    defenceBonus: 75,
    stabilityBonus: 15,
    levelRequired: 80
  },

  [VeilItemType.VOID_VISAGE]: {
    type: VeilItemType.VOID_VISAGE,
    name: 'Void Visage',
    description: 'A helm that sees beyond the Veil.',
    stackable: false,
    tradeable: true,
    equipSlot: 'head',
    defenceBonus: 55,
    stabilityBonus: 15,
    levelRequired: 80
  },

  [VeilItemType.VOID_CUIRASS]: {
    type: VeilItemType.VOID_CUIRASS,
    name: 'Void Cuirass',
    description: 'Armor forged in the heart of the void.',
    stackable: false,
    tradeable: true,
    equipSlot: 'body',
    defenceBonus: 85,
    stabilityBonus: 15,
    levelRequired: 80
  },

  [VeilItemType.VOID_TASSETS]: {
    type: VeilItemType.VOID_TASSETS,
    name: 'Void Tassets',
    description: 'Leg armor that phases between dimensions.',
    stackable: false,
    tradeable: true,
    equipSlot: 'legs',
    defenceBonus: 70,
    stabilityBonus: 15,
    levelRequired: 80
  },

  // ============ Equipment - Luminarch (Tier 10, Level 90) ============

  [VeilItemType.LUMINARCH_BLADE]: {
    type: VeilItemType.LUMINARCH_BLADE,
    name: 'Luminarch Blade',
    description: 'A sword of pure light, once wielded by the Luminarch.',
    stackable: false,
    tradeable: true,
    equipSlot: 'weapon',
    attackBonus: 100,
    strengthBonus: 95,
    stabilityBonus: 25,
    levelRequired: 90
  },

  [VeilItemType.LUMINARCH_CROWN]: {
    type: VeilItemType.LUMINARCH_CROWN,
    name: 'Luminarch\'s Crown',
    description: 'The crown of the Luminarch. Radiates overwhelming power.',
    stackable: false,
    tradeable: true,
    equipSlot: 'head',
    defenceBonus: 70,
    stabilityBonus: 30,
    levelRequired: 90
  },

  [VeilItemType.LUMINARCH_RAIMENT]: {
    type: VeilItemType.LUMINARCH_RAIMENT,
    name: 'Luminarch\'s Raiment',
    description: 'Robes woven from pure light.',
    stackable: false,
    tradeable: true,
    equipSlot: 'body',
    defenceBonus: 100,
    stabilityBonus: 25,
    levelRequired: 90
  }
}

/**
 * Get a Veil item definition by type
 */
export function getVeilItemDefinition(type: VeilItemType): VeilItemDefinition {
  return VEIL_ITEM_DEFINITIONS[type]
}

/**
 * Check if an item is a Veil item
 */
export function isVeilItem(itemType: string): boolean {
  return Object.values(VeilItemType).includes(itemType as VeilItemType)
}
