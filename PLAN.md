# Project Codename: VEILFALL

A stylized 3D browser MMO featuring dual-world exploration between a cel-shaded surface world and a luminous otherworldly dimension called "The Veil."

---

## Executive Summary

Transform the current OSRS-inspired foundation into a unique, visually striking MMO with a novel dual-world mechanic. Players alternate between a stylized cel-shaded surface world and an ethereal, bioluminescent dimension called "The Veil." The core progression loop (skills, equipment, drops) remains, but wrapped in a fresh aesthetic and gameplay hook that differentiates from existing MMOs.

---

## The Vision

### Core Concept: The Veil
The world exists in two overlapping states:
- **Surface World**: Stylized cel-shaded medieval fantasy (our current Thornwick, expanded)
- **The Veil**: A luminous parallel dimension - same geography but transformed into crystalline, bioluminescent landscapes

Players discover they can "pierce the Veil" and enter this otherworldly realm where:
- Different creatures exist (Veil-touched variants, spectral beings)
- Unique resources spawn (crystals, essences, luminous materials)
- Time flows differently (expedition-based runs with time pressure)
- Risk/reward is amplified (better drops, permadeath of expedition progress)

### Visual Identity
- **Surface**: Cel-shaded with thick outlines, muted earth tones, cozy medieval atmosphere
- **Veil**: Dark environments with vibrant bioluminescence, glowing particles, crystalline structures
- **Transition**: Dramatic visual shift when entering/exiting the Veil (screen distortion, color shift)

### Why This Works
1. **Novelty**: No major MMO does dual-world exploration like this
2. **Viral Potential**: The visual contrast is shareable ("Wait, the world transforms?!")
3. **Replayability**: Same areas have two sets of content
4. **Technical Feasibility**: Achievable with Babylon.js shaders (no new models needed)
5. **Progression Depth**: New skill trees, equipment tiers, and crafting systems

---

## Tech Stack (Unchanged)

| Category | Technology | Version |
|----------|------------|---------|
| Rendering | Babylon.js | v8.6.0 |
| UI Framework | React | v19.0.0 |
| Multiplayer | Colyseus | v0.17.8 |
| Database | PostgreSQL | v16 |
| ORM | Drizzle | v0.45.1 |
| Build Tool | Vite | v6.0.0 |
| Language | TypeScript | v5.9.3 |

### New Technical Focus
- **Custom Shaders**: Cel-shading, glow effects, procedural textures
- **Post-Processing**: Bloom, chromatic aberration, screen-space effects
- **Procedural Generation**: Veil dimension terrain transformation
- **Particle Systems**: Bioluminescence, portal effects, ambient atmosphere

---

## Phase Breakdown

### Phase 0: Shader Infrastructure
**Goal**: Build the foundation for all visual effects

#### 0.1 ShaderManager System
Create a centralized shader management system:

```typescript
// packages/client/src/systems/ShaderManager.ts
class ShaderManager {
  private shaderStore: Map<string, ShaderMaterial>
  private nodeMatStore: Map<string, NodeMaterial>

  // Cel-shading material factory
  createCelShadeMaterial(name: string, baseColor: Color3, options?: CelShadeOptions): ShaderMaterial

  // Glow/emission material for Veil objects
  createGlowMaterial(name: string, glowColor: Color3, intensity: number): ShaderMaterial

  // Shared uniforms (time, camera pos, light dir)
  updateGlobalUniforms(deltaTime: number): void
}
```

**Files to create:**
- `packages/client/src/systems/ShaderManager.ts`
- `packages/client/src/shaders/cel-shade.vertex.glsl`
- `packages/client/src/shaders/cel-shade.fragment.glsl`
- `packages/client/src/shaders/glow.vertex.glsl`
- `packages/client/src/shaders/glow.fragment.glsl`

#### 0.2 Cel-Shading Implementation
Two-pass rendering approach:

**Pass 1 - Outline:**
```glsl
// Vertex shader: Expand vertices along normals
vec3 expandedPosition = position + normal * outlineWidth;

// Fragment shader: Solid outline color
gl_FragColor = vec4(outlineColor, 1.0);
```

**Pass 2 - Toon shading:**
```glsl
// Fragment shader: Quantize lighting into bands
float NdotL = dot(normalize(vNormal), lightDirection);
float lightIntensity = smoothstep(0.0, 0.01, NdotL) * 0.5 + 0.5;
float quantized = floor(lightIntensity * bands) / bands;
gl_FragColor = vec4(baseColor * quantized, 1.0);
```

#### 0.3 Post-Processing Pipeline
```typescript
// packages/client/src/systems/PostProcessManager.ts
class PostProcessManager {
  private pipeline: PostProcessRenderPipeline

  // Standard effects
  addBloom(threshold: number, intensity: number): void
  addVignette(weight: number): void

  // Veil-specific effects
  addChromaticAberration(intensity: number): void
  addScreenDistortion(waveAmplitude: number): void

  // Dimension transition effect
  playVeilTransition(entering: boolean, duration: number): Promise<void>
}
```

**Deliverable**: Shader system ready for use by all game objects

---

### Phase 1: Surface World Visual Overhaul
**Goal**: Apply cel-shading to existing content

#### 1.1 Terrain Cel-Shading
Modify TilemapRenderer to use cel-shade materials:

```typescript
// In TilemapRenderer.ts
private createTerrainMaterial(tileType: TileType): Material {
  const baseColor = TILE_COLORS[tileType]
  return this.shaderManager.createCelShadeMaterial(
    `terrain_${tileType}`,
    baseColor,
    { bands: 3, outlineWidth: 0.02 }
  )
}
```

**Files to modify:**
- `packages/client/src/systems/TilemapRenderer.ts` - Use cel-shade materials
- `packages/client/src/entities/WorldObjectEntity.ts` - Trees, objects with outlines

#### 1.2 Character Cel-Shading
Update SimpleCharacter to use cel-shaded materials:

```typescript
// In SimpleCharacter.ts
private createLimbMaterial(color: Color3): Material {
  return this.shaderManager.createCelShadeMaterial(
    `limb_${this.id}`,
    color,
    { bands: 2, outlineWidth: 0.015 }
  )
}
```

**Files to modify:**
- `packages/client/src/character/SimpleCharacter.ts`
- `packages/client/src/entities/NpcEntity.ts`

#### 1.3 Environment Polish
- Add ambient particles (dust motes, pollen)
- Add subtle fog with depth
- Add animated water shader for ponds/rivers
- Add wind animation to trees (vertex displacement)

**Deliverable**: Existing game has cohesive cel-shaded aesthetic

---

### Phase 2: The Veil Dimension
**Goal**: Create the parallel luminous world

#### 2.1 Veil Material System
```typescript
// packages/client/src/systems/VeilMaterials.ts
interface VeilMaterialOptions {
  baseColor: Color3
  glowColor: Color3
  glowIntensity: number
  pulseSpeed: number
  crystalline: boolean
}

class VeilMaterials {
  // Bioluminescent terrain
  createVeilTerrainMaterial(tileType: TileType): Material

  // Glowing flora
  createVeilPlantMaterial(options: VeilMaterialOptions): Material

  // Crystal formations
  createCrystalMaterial(color: Color3, transparency: number): Material

  // Veil creature materials (ethereal, semi-transparent)
  createVeilCreatureMaterial(options: VeilMaterialOptions): Material
}
```

#### 2.2 Veil Terrain Transformation
The Veil uses the same tile positions but transforms them:

```typescript
// packages/client/src/systems/VeilRenderer.ts
class VeilRenderer {
  // Transform surface tile to Veil equivalent
  transformTile(surfaceTile: TileType): VeilTileType {
    const mappings = {
      [TileType.GRASS]: VeilTileType.LUMINOUS_MOSS,
      [TileType.WATER]: VeilTileType.LIQUID_LIGHT,
      [TileType.STONE]: VeilTileType.DARK_CRYSTAL,
      [TileType.SAND]: VeilTileType.GLOWING_SAND,
      [TileType.TREE]: VeilTileType.CRYSTAL_SPIRE
    }
    return mappings[surfaceTile]
  }

  // Spawn Veil-specific objects at surface object locations
  transformWorldObjects(surfaceObjects: WorldObject[]): VeilObject[]
}
```

#### 2.3 Veil Visuals
**Color Palette:**
- Background: Deep purples, dark blues (#0a0a1a, #1a0a2e)
- Glow colors: Cyan (#00ffff), Magenta (#ff00ff), Gold (#ffdd00)
- Crystal colors: Ice blue (#aaffff), Violet (#aa00ff), Amber (#ffaa00)

**Effects:**
- Constant ambient particles (floating light motes)
- Pulsing glow on all organic materials
- Crystal formations with internal light refraction
- Luminous fog that reveals movement
- Stars/void visible through gaps in terrain

#### 2.4 Veil Creatures
New enemy types exclusive to the Veil:

```typescript
// packages/shared/src/veilCreatures.ts
enum VeilCreatureType {
  WISP,           // Floating light orb, easy
  SHADE,          // Shadow creature, medium
  CRYSTAL_GOLEM,  // Defensive, medium
  VEIL_STALKER,   // Fast, aggressive, hard
  LUMINARCH,      // Mini-boss, glowing humanoid
  VOID_HORROR     // Boss, massive, tentacles
}

interface VeilCreatureDefinition {
  type: VeilCreatureType
  name: string
  combatLevel: number
  hitpoints: number
  maxHit: number
  attackSpeed: number
  veilOnly: true
  glowColor: string
  drops: VeilLootTableEntry[]
}
```

**Deliverable**: Fully realized Veil dimension with unique visuals

---

### Phase 3: Dual-World Mechanics
**Goal**: Implement the transition and expedition systems

#### 3.1 Veil Rifts
Specific locations where players can enter the Veil:

```typescript
// packages/shared/src/veilRifts.ts
interface VeilRift {
  id: string
  position: TilePosition
  stabilityRequired: number  // Minimum "Veil Stability" stat to enter
  destinationTier: number    // Difficulty tier of that section
}

// Thornwick example: Rift appears near the mysterious fountain at night
const THORNWICK_RIFTS: VeilRift[] = [
  {
    id: 'thornwick_fountain',
    position: { tileX: 24, tileY: 26 },
    stabilityRequired: 0,
    destinationTier: 1
  }
]
```

#### 3.2 Expedition System
Players don't freely roam the Veil - they go on timed expeditions:

```typescript
// packages/shared/src/expeditions.ts
interface Expedition {
  playerId: string
  riftId: string
  startTime: number
  maxDuration: number      // e.g., 10 minutes
  veilStability: number    // Countdown, reaches 0 = forced extraction
  collectedLoot: VeilItem[]
  currentDepth: number     // How far they've progressed
}

// Veil Stability decreases over time, faster when:
// - Taking damage
// - Being in combat
// - Deeper in the Veil

// Ways to restore stability:
// - Consume Veil Crystals (rare resource)
// - Find stability nodes (safe points)
// - Use Veilwalking skill abilities
```

#### 3.3 Dimension Transition
Visual and gameplay transition:

```typescript
// packages/client/src/systems/DimensionManager.ts
class DimensionManager {
  currentDimension: 'surface' | 'veil'

  async enterVeil(riftId: string): Promise<void> {
    // 1. Play screen distortion effect
    await this.postProcess.playVeilTransition(true, 2000)

    // 2. Swap terrain renderer
    this.tilemapRenderer.setMode('veil')

    // 3. Swap creature spawns
    this.entityManager.switchToVeil()

    // 4. Start expedition timer
    this.expedition.start()

    // 5. Play ambient Veil sounds
    this.audio.playVeilAmbience()
  }

  async exitVeil(voluntary: boolean): Promise<void> {
    // If forced (stability = 0), lose uncollected loot
    if (!voluntary) {
      this.expedition.dropUnbankedLoot()
    }

    await this.postProcess.playVeilTransition(false, 2000)
    this.tilemapRenderer.setMode('surface')
    this.entityManager.switchToSurface()
    this.expedition.end()
  }
}
```

#### 3.4 Veil Banking
Players must "secure" loot to keep it:

```typescript
// Veil Anchors: special objects in the Veil that let you bank mid-expedition
// Finding one is like finding a checkpoint

interface VeilAnchor {
  position: TilePosition
  charges: number  // Limited uses before it fades
}

// When using an anchor:
// - Items in "secured" slot are safe even if expedition fails
// - Restores some Veil Stability
// - Creates temporary return point
```

**Deliverable**: Full dual-world gameplay loop

---

### Phase 4: Progression Updates
**Goal**: New skills, items, and equipment tiers for Veil content

#### 4.1 New Skills

**Veilwalking (Support Skill)**
```typescript
// packages/shared/src/skills.ts - Add to SkillType enum
VEILWALKING = 'veilwalking'

// Skill definition
{
  type: SkillType.VEILWALKING,
  name: 'Veilwalking',
  icon: '🌀',
  description: 'Mastery of the Veil dimension',
  // Higher levels grant:
  // - Increased max Veil Stability
  // - Slower stability decay
  // - Ability to see hidden Veil objects
  // - Access to deeper Veil tiers
}
```

**Crystallurgy (Production Skill)**
```typescript
CRYSTALLURGY = 'crystallurgy'

// Skill definition
{
  type: SkillType.CRYSTALLURGY,
  name: 'Crystallurgy',
  icon: '💎',
  description: 'Craft items from Veil crystals',
  // Allows:
  // - Refining raw Veil crystals
  // - Crafting Veil equipment
  // - Creating stability potions
  // - Infusing surface items with Veil power
}
```

**Binding (Production Skill)**
```typescript
BINDING = 'binding'

// Skill definition
{
  type: SkillType.BINDING,
  name: 'Binding',
  icon: '🔗',
  description: 'Capture and bind Veil creatures',
  // Allows:
  // - Trapping Wisps for light sources
  // - Binding creatures as pets/familiars
  // - Creating summons for combat
  // - Harvesting essence from creatures
}
```

#### 4.2 New Item Types

```typescript
// packages/shared/src/veilItems.ts
enum VeilItemType {
  // Raw materials
  RAW_CRYSTAL,
  LUMINOUS_SHARD,
  VOID_ESSENCE,
  WISP_DUST,
  SHADE_CLOTH,

  // Refined materials
  REFINED_CRYSTAL,
  VEIL_INGOT,
  LUMINOUS_THREAD,

  // Consumables
  STABILITY_POTION,    // Restores Veil Stability
  VEIL_ANCHOR_SHARD,   // Creates temporary anchor
  LIGHT_FLASK,         // Temporary illumination

  // Equipment components
  CRYSTAL_CORE,        // For crafting Veil weapons
  LUMINOUS_ESSENCE,    // For infusing armor
  VOID_GEM             // For high-tier enchants
}
```

#### 4.3 Equipment Tiers (Updated)

| Tier | Name | Level | Source | Visual |
|------|------|-------|--------|--------|
| 1 | Bronze | 1 | Craft/Buy | Warm brown |
| 2 | Iron | 10 | Craft/Drop | Dark gray |
| 3 | Steel | 20 | Craft/Drop | Silver |
| 4 | Mithril | 30 | Craft/Drop | Blue tint |
| 5 | Adamant | 40 | Craft/Drop | Green tint |
| 6 | Rune | 50 | Craft/Drop | Cyan glow |
| 7 | **Veil-touched** | 60 | Veil drops | Subtle inner glow |
| 8 | **Crystalline** | 70 | Veil craft | Transparent with glow |
| 9 | **Void-forged** | 80 | Veil boss | Dark with particles |
| 10 | **Luminarch** | 90 | Endgame | Full bioluminescence |

**Veil Equipment Bonuses:**
- Veil-touched: +5% Veil Stability
- Crystalline: +10% Veil Stability, minor glow
- Void-forged: +15% Veil damage, -5% stability decay
- Luminarch: Full set bonus - immune to stability drain for 30s after kill

#### 4.4 Infusion System
Surface equipment can be enhanced with Veil materials:

```typescript
interface InfusionRecipe {
  baseItem: ItemType
  veilMaterial: VeilItemType
  result: ItemType
  crystallurgyLevel: number
}

const INFUSIONS: InfusionRecipe[] = [
  {
    baseItem: ItemType.RUNE_SWORD,
    veilMaterial: VeilItemType.LUMINOUS_ESSENCE,
    result: ItemType.LUMINOUS_RUNE_SWORD,
    crystallurgyLevel: 65
  }
  // Infused items gain:
  // - Visual glow effect
  // - Bonus damage vs Veil creatures
  // - Minor Veil Stability boost when equipped
]
```

**Deliverable**: Complete progression system bridging surface and Veil

---

### Phase 5: UI Overhaul
**Goal**: Cohesive UI that supports dual-world gameplay

#### 5.1 Visual Theme
- **Surface UI**: Warm wood/parchment theme, gold accents
- **Veil UI**: Dark translucent panels, cyan/magenta accents, glowing borders
- UI smoothly transitions when changing dimensions

#### 5.2 New Panels

**Expedition Panel** (`ExpeditionPanel.tsx`)
```typescript
interface ExpeditionPanelProps {
  isInVeil: boolean
  stability: number
  maxStability: number
  elapsedTime: number
  maxTime: number
  securedItems: Item[]
  unsecuredItems: Item[]
  currentDepth: number
}
```
Shows:
- Veil Stability bar (depleting)
- Time remaining
- Current depth/progress
- Secured vs unsecured loot

**Bestiary Panel** (`BestiaryPanel.tsx`)
- Log of discovered creatures (surface + Veil)
- Weaknesses, drop tables (revealed through kills)
- Completion percentage

**Veil Map** (`VeilMapPanel.tsx`)
- Discovered Veil areas
- Known rift locations
- Stability node locations

#### 5.3 HUD Updates
- Dimension indicator (surface/veil icon)
- Stability bar when in Veil (prominent, center-top)
- Visual filter toggle (for accessibility)

**Deliverable**: Polished UI supporting all features

---

### Phase 6: Content Expansion
**Goal**: Fill both worlds with content

#### 6.1 Surface Towns (In Order)
1. **Thornwick** (existing) - Medieval market town, Tier 1 rift
2. **Saltmere** - Coastal fishing port, Tier 2 rift
3. **Ironhold** - Mountain mining settlement, Tier 3 rift
4. **Shadowfen** - Swamp village, Tier 4 rift

#### 6.2 Veil Zones
Each surface area has a Veil counterpart:
- **Thornwick Veil**: Crystal Gardens - Entry level, wisps and crystal formations
- **Saltmere Veil**: Luminous Depths - Underwater feel, jellyfish creatures
- **Ironhold Veil**: Void Caverns - Dark, crystal golems, valuable ore
- **Shadowfen Veil**: The Murk - Dense fog, stalkers, rare herbs

#### 6.3 Boss Encounters
**Surface Bosses:**
- Giant Rat King (Thornwick sewers)
- Sea Serpent (Saltmere coast)
- Stone Giant (Ironhold mines)
- Bog Witch (Shadowfen)

**Veil Bosses:**
- The Luminarch (Thornwick Veil) - Humanoid light being
- Abyssal Leviathan (Saltmere Veil) - Massive bioluminescent fish
- Void Colossus (Ironhold Veil) - Living crystal formation
- The Unnamed (Shadowfen Veil) - Lovecraftian horror, final boss

**Deliverable**: Rich world with exploration incentives

---

### Phase 7: Social & Viral Features
**Goal**: Built-in sharability and social hooks

#### 7.1 Clip Tool
In-game recording for shareable moments:

```typescript
interface ClipSettings {
  duration: 15 | 30 | 60  // seconds
  quality: 'medium' | 'high'
  includeUI: boolean
}

class ClipRecorder {
  // Auto-captures last N seconds in buffer
  private buffer: FrameData[]

  // Triggered by:
  // - Boss kill
  // - Achievement unlock
  // - Rare drop
  // - Manual hotkey

  saveClip(trigger: string): Promise<ClipFile>
  shareToDiscord(clip: ClipFile): Promise<string>
}
```

#### 7.2 Leaderboards
- **Expedition Records**: Fastest runs, deepest dives, most loot
- **Total Levels**: Combined skill levels
- **Boss Kill Counts**: Per-boss rankings
- **Achievement Points**: Total points earned

#### 7.3 Social Expeditions
- Party expeditions (2-4 players)
- Shared Veil Stability pool
- Combo attacks and synergies
- Shared loot (with roll system)

#### 7.4 Pet System
Veil creatures can be bound as pets:

```typescript
interface Pet {
  type: VeilCreatureType
  name: string
  variant: 'normal' | 'shiny' | 'void'
  abilities: PetAbility[]
  bondLevel: number  // Increases with time
}

// Pets provide:
// - Visual flair (follows player)
// - Minor bonuses at high bond
// - Rare shiny variants (1/500)
// - Shareable flex
```

**Deliverable**: Viral-ready social features

---

## Implementation Priority

### Immediate (Phase 0-1)
1. ShaderManager infrastructure
2. Cel-shading on terrain
3. Cel-shading on characters
4. Post-processing setup

### Short-term (Phase 2-3)
1. Veil material system
2. Veil terrain renderer
3. Dimension transition
4. Expedition mechanics
5. Veil creatures (3-5 types)

### Medium-term (Phase 4-5)
1. New skills (Veilwalking, Crystallurgy, Binding)
2. Veil items and equipment
3. UI overhaul
4. Infusion system

### Long-term (Phase 6-7)
1. Additional towns (Saltmere, Ironhold)
2. Boss encounters
3. Clip tool
4. Pet system
5. Leaderboards

---

## File Structure (New/Modified)

### New Files

```
packages/
├── client/src/
│   ├── systems/
│   │   ├── ShaderManager.ts        # Shader factory and management
│   │   ├── PostProcessManager.ts   # Post-processing effects
│   │   ├── VeilRenderer.ts         # Veil dimension rendering
│   │   ├── DimensionManager.ts     # Surface/Veil transitions
│   │   └── ClipRecorder.ts         # Video clip capture
│   │
│   ├── shaders/
│   │   ├── cel-shade.vertex.glsl
│   │   ├── cel-shade.fragment.glsl
│   │   ├── glow.vertex.glsl
│   │   ├── glow.fragment.glsl
│   │   ├── crystal.vertex.glsl
│   │   ├── crystal.fragment.glsl
│   │   ├── transition.fragment.glsl
│   │   └── water.fragment.glsl
│   │
│   ├── ui/
│   │   ├── ExpeditionPanel.tsx     # Veil expedition HUD
│   │   ├── BestiaryPanel.tsx       # Creature log
│   │   ├── VeilMapPanel.tsx        # Discovered Veil areas
│   │   ├── PetPanel.tsx            # Pet management
│   │   └── LeaderboardPanel.tsx    # Rankings
│   │
│   └── entities/
│       └── VeilCreatureEntity.ts   # Veil-specific creature rendering
│
├── server/src/
│   ├── rooms/
│   │   └── ExpeditionRoom.ts       # Veil expedition instance
│   │
│   └── database/
│       └── veilSchema.ts           # Expedition records, pets, etc.
│
└── shared/src/
    ├── veilCreatures.ts            # Veil creature definitions
    ├── veilItems.ts                # Veil item definitions
    ├── veilRifts.ts                # Rift locations
    ├── expeditions.ts              # Expedition mechanics
    ├── pets.ts                     # Pet definitions
    │
    └── towns/
        ├── saltmere.ts             # Coastal town
        ├── ironhold.ts             # Mining town
        └── shadowfen.ts            # Swamp town
```

### Modified Files

| File | Changes |
|------|---------|
| `client/src/Game.ts` | Add ShaderManager, DimensionManager |
| `client/src/systems/TilemapRenderer.ts` | Support dual-world rendering, cel-shade materials |
| `client/src/character/SimpleCharacter.ts` | Cel-shade materials, dimension variants |
| `client/src/entities/NpcEntity.ts` | Cel-shade materials |
| `client/src/entities/WorldObjectEntity.ts` | Cel-shade materials, Veil variants |
| `client/src/App.tsx` | New panels, dimension state |
| `client/src/ui/Sidebar.tsx` | New panel buttons |
| `server/src/rooms/WorldRoom.ts` | Veil rift interactions, expedition triggers |
| `shared/src/skills.ts` | Add Veilwalking, Crystallurgy, Binding |
| `shared/src/items.ts` | Add Veil materials and equipment |
| `shared/src/index.ts` | Export new modules |

---

## Visual Reference

### Surface World Palette
```
Background:  #87CEEB (sky), #228B22 (grass), #8B4513 (wood)
Characters:  Warm flesh tones, earth-toned clothing
Outlines:    Dark brown/black, 2-3px thick
Lighting:    Warm sunlight, 3-band quantization
```

### Veil Dimension Palette
```
Background:  #0a0a1a (void), #1a0a2e (deep purple)
Terrain:     #2a1a4a (dark), #4a2a6a (mid), bioluminescent accents
Glow colors: #00ffff (cyan), #ff00ff (magenta), #ffdd00 (gold)
Crystals:    #aaffff (ice), #aa00ff (violet), #ffaa00 (amber)
Outlines:    Glow-colored or none (ethereal feel)
```

### Transition Effect
```
Duration:    2 seconds
Effect:      Screen ripple from center, color shift (warm→cool)
Audio:       Low rumble, crystalline chime
Particles:   Light motes flowing toward/away from player
```

---

## Success Metrics

1. **Visual Distinctiveness**: Screenshots/clips are immediately recognizable
2. **Gameplay Hook**: Players actively anticipate Veil expeditions
3. **Shareability**: Clip tool used frequently, Discord/social sharing
4. **Retention**: Dual progression (surface + Veil) maintains engagement
5. **Performance**: 60fps on mid-range hardware with effects enabled

---

## Current Status

**Completed (Previous Phases):**
- Core multiplayer infrastructure
- 23-skill system with XP progression
- Inventory and banking
- Combat system with NPCs
- 3D terrain with height levels
- First town (Thornwick)
- Equipment system with visual gear
- Procedural character system
- Engagement features (XP tracker, achievements, daily challenges)

**Next Steps:**
1. Phase 0.1: Create ShaderManager
2. Phase 0.2: Implement cel-shading
3. Phase 0.3: Post-processing pipeline
4. Phase 1.1: Apply to terrain
5. Phase 1.2: Apply to characters

---

## Notes

- All visuals achievable in Babylon.js without external 3D models
- Shaders use GLSL (Babylon.js Effect system) or Node Material
- Performance priority: target 60fps with effects
- Mobile considerations: reduce particle counts, simpler shaders
- Accessibility: option to reduce/disable screen effects
