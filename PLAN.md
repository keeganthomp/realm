# Project Codename: REALM

A modern 2D browser MMO inspired by RuneScape, built for 2026.

---

## Executive Summary

Build a medieval fantasy 2D MMO with click-to-action gameplay, skill progression, equipment systems, and multiplayer support. RuneScape is the north star, but rebuilt with a hyper-modern stack optimized for performance, scalability, and developer experience.

---

## Tech Stack (Current Versions)

| Category | Technology | Version |
|----------|------------|---------|
| Rendering | Babylon.js | v8.6.0 |
| UI Framework | React | v19.0.0 |
| Multiplayer | Colyseus | v0.17.8 |
| State Schema | @colyseus/schema | v4.0.7 |
| Database | PostgreSQL | v16 (Alpine) |
| ORM | Drizzle | v0.45.1 |
| Build Tool | Vite | v6.0.0 |
| Language | TypeScript | v5.9.3 |
| Package Manager | pnpm | v9.12.2 |
| Linting | ESLint | v9.39.2 |
| Formatting | Prettier | v3.8.1 |
| 3D Modeling | Blender | (latest) |
| 3D Export | glTF/GLB | Native Babylon.js |

### Rendering: **Babylon.js**
- Full 3D engine with perspective camera
- OSRS-style isometric view with Q/E rotation
- Height-based terrain with cliff faces
- Mesh instancing for terrain tiles
- GUI system for health bars and labels

### Backend: **Colyseus 0.17**
- Node.js-based multiplayer framework
- Built-in room management, state sync, WebSocket handling
- Message-based sync for reliable initial state
- TypeScript throughout for shared types client/server

### Graphics: **Neo-Pixel Sprites**
- 32x32 or 48x48 pixel art sprites
- Modern enhancements: expanded palettes, subtle lighting
- Spritesheet atlases for performance
- Aseprite for asset creation

### World Building: **Data-Driven Town System**
- Towns defined as TypeScript data files in `shared/src/towns/`
- Each town specifies bounds, buildings, NPCs, objects, tile overrides
- WorldGenerator applies town data during chunk generation
- Hybrid approach: structured towns within procedural wilderness
- Agentic design - AI assists in creating town layouts from high-level descriptions

### Database: **PostgreSQL + Drizzle ORM**
- PostgreSQL for persistent player data, items, skills
- Drizzle ORM for type-safe database operations
- Auto-save every 30 seconds + save on disconnect

### Build & Dev: **Vite + TypeScript + pnpm**
- Fast HMR for rapid iteration
- Monorepo structure (client/server/shared)
- ESLint + Prettier with format-on-save
- Easy local development with single command

---

## Skill System (Inspired by OSRS)

### Combat Skills (7)
| Skill | Description |
|-------|-------------|
| Attack | Melee accuracy, unlocks better swords |
| Strength | Melee damage output |
| Defence | Damage reduction, unlocks better armor |
| Ranged | Bow/crossbow proficiency |
| Magic | Spellcasting, runes, teleportation |
| Prayer | Buffs and protection prayers |
| Hitpoints | Total health pool |

### Gathering Skills (5)
| Skill | Description |
|-------|-------------|
| Mining | Extract ores from rocks |
| Fishing | Catch fish from water |
| Woodcutting | Chop trees for logs |
| Farming | Grow herbs and crops |
| Hunter | Trap creatures |

### Production Skills (7)
| Skill | Description |
|-------|-------------|
| Smithing | Forge weapons and armor from bars |
| Cooking | Prepare food for healing |
| Crafting | Create jewelry, leather armor |
| Fletching | Make bows and arrows |
| Herblore | Brew potions from herbs |
| Runecrafting | Create magic runes |
| Construction | Build player-owned structures |

### Support Skills (4)
| Skill | Description |
|-------|-------------|
| Agility | Faster movement, shortcuts |
| Thieving | Pickpocket NPCs, lockpicking |
| Slayer | Kill assigned monsters for XP |
| Firemaking | Light fires for cooking/warmth |

**Total: 23 Skills** (can trim or add as needed)

### XP Formula
```
XP to next level = floor(level^2 * 100)
Level 1→2: 100 XP
Level 50→51: 250,000 XP
Level 99 cap (or 120 for endgame)
```

---

## Equipment System

### Tiers (Bronze → Dragon)
1. Bronze (Level 1)
2. Iron (Level 10)
3. Steel (Level 20)
4. Mithril (Level 30)
5. Adamant (Level 40)
6. Rune (Level 50)
7. Dragon (Level 60)
8. Barrows (Level 70) - Set effects
9. Godwars (Level 75) - Boss drops
10. Elder (Level 80+) - Endgame

### Equipment Slots
- Head (Helmet)
- Body (Chestplate)
- Legs (Platelegs)
- Hands (Gloves)
- Feet (Boots)
- Cape
- Neck (Amulet)
- Ring
- Main hand (Weapon)
- Off hand (Shield/secondary)
- Ammo (Arrows/bolts)

### Enchantments
- Applied via Magic skill
- Permanent stat bonuses
- Examples: +5% accuracy, +10 HP, fire resistance

### Potions (Herblore)
| Potion | Effect |
|--------|--------|
| Attack | +10% attack for 5 min |
| Strength | +10% damage for 5 min |
| Defence | +10% armor for 5 min |
| Prayer | Restore prayer points |
| Super variants | +15% effects |
| Antifire | Dragon breath immunity |

---

## World Design

### Biomes
1. **Lumbridge-style Starting Zone** - Grasslands, farms, tutorial area
2. **Varrock-style City** - Commerce hub, bank, grand exchange
3. **Wilderness** - PvP zone, high-risk high-reward
4. **Desert** - Heat mechanics, unique monsters
5. **Swamp** - Poison hazards, herblore ingredients
6. **Mountains** - Mining hotspots, dwarven caves
7. **Forest** - Woodcutting, elven territory
8. **Coastal** - Fishing, pirate quests
9. **Dungeon Network** - Underground, boss lairs

### Movement
- Click-to-move pathfinding (A* algorithm)
- Smooth interpolated movement (not tile-snapping)
- Run/walk toggle (run drains stamina)
- Agility shortcuts between zones

### Interactions
- Click object → character walks to it → action begins
- Progress bar for skilling actions
- Interruptible by combat or movement

---

## Multiplayer Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Colyseus   │────▶│    Redis    │
│  (PixiJS)   │◀────│   Server    │◀────│   Cluster   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ PostgreSQL  │
                    │  (Players,  │
                    │   Items)    │
                    └─────────────┘
```

### Room Types
- **WorldRoom**: Main game world, zoned by region
- **DungeonRoom**: Instanced party dungeons
- **PvPRoom**: Wilderness/arena combat
- **MinigameRoom**: Isolated minigame instances

### State Sync
- Delta compression for bandwidth efficiency
- 20 ticks/second server authority
- Client-side prediction with server reconciliation

---

## Phase Breakdown

### Phase 1: Foundation (Core Engine) ✅
**Goal**: Runnable local prototype with basic movement

- [x] Project scaffolding (monorepo: client/server/shared)
- [x] PixiJS renderer setup with sprite loading
- [x] Tilemap loader (placeholder terrain)
- [x] Click-to-move pathfinding (A*)
- [x] Basic player sprite with 4-directional animation
- [x] Camera following player
- [x] Dev server with hot reload

**Deliverable**: Single-player walking around a test map

---

### Phase 2: Multiplayer Core ✅
**Goal**: Multiple players visible and moving

- [x] Colyseus server setup
- [x] Player join/leave synchronization
- [x] Position broadcasting
- [x] Interpolation for remote players
- [x] Basic chat system
- [x] Player nameplates

**Deliverable**: 2+ players can connect and see each other

---

### Phase 3: Skill System MVP ✅
**Goal**: Implement 3 core skills end-to-end

- [x] XP/Level data structures
- [x] Woodcutting (click tree → chop → get logs)
- [x] Fishing (click spot → fish → get fish)
- [x] Cooking (use fish on fire → cook)
- [x] Skill panel UI
- [x] Level-up notifications
- [x] Loading screen
- [x] World object rendering and interaction
- [x] Persist skills to database (PostgreSQL + Drizzle ORM)

**Deliverable**: Players can level 3 skills

---

### Phase 4: Inventory & Items ✅
**Goal**: Full item management

- [x] Inventory grid UI (28 slots like RS)
- [x] Item definitions (shared/items.ts)
- [x] Items granted from skilling (logs, fish)
- [x] Inventory persistence to database
- [x] Drop items (right-click context menu)
- [x] Item stacking (coins, feathers, fishing bait)
- [x] Use item on object (select raw fish → click fire → cook)
- [x] Bank storage (click bank booth, deposit/withdraw items)

**Deliverable**: Players can collect and store items

---

### Phase 5: Combat System ✅
**Goal**: PvE combat loop

- [x] Combat stats (Attack, Strength, Defence, Hitpoints)
- [x] NPC spawning (Chicken lvl 1, Cow lvl 2, Goblin lvl 5)
- [x] Click-to-attack targeting (walk to NPC, auto-attack)
- [x] Damage calculation formulas (OSRS-style accuracy/max hit)
- [x] Death and respawning (NPCs respawn after timer, players at spawn)
- [x] Loot drops (bones, raw meat, feathers, coins)
- [x] Combat XP gains (4 XP per damage + 1.33 HP XP)
- [x] Combat styles (Accurate/Aggressive/Defensive)
- [x] NPC health bars (always visible, color-coded)
- [x] Hit splats (damage numbers on hit)
- [x] Aggro system (Goblins attack players within 3 tiles)
- [x] Food eating (right-click food in inventory to heal)

**Deliverable**: Players can fight monsters ✅

---

### Phase 5.5: 3D Terrain ✅
**Goal**: Height-based 3D world

- [x] Babylon.js 3D renderer with perspective camera
- [x] Multi-level terrain with height map
- [x] Cliff faces auto-generated between levels
- [x] Height-aware A* pathfinding (can't climb cliffs > 1 level)
- [x] OSRS-style camera angle (Q/E to rotate 45°)
- [x] Entities positioned at correct Y height
- [x] Mesh instancing for performance

**Deliverable**: 3D explorable world with elevation

---

### Phase 6: Town System Architecture ✅
**Goal**: Data-driven town system for agentic world design

Instead of a manual in-game editor, we use TypeScript data files that define towns declaratively. AI agents can generate and iterate on town designs from high-level descriptions.

#### 6.1 Town Definition System ✅
- [x] TownDefinition interface with bounds, buildings, NPCs, objects
- [x] BuildingDefinition with walls, floors, doors
- [x] NpcSpawnDefinition with patrol areas
- [x] WorldObjectPlacement for static objects
- [x] TileOverride for roads, paths, water features
- [x] Town registry with registration functions

#### 6.2 WorldGenerator Integration ✅
- [x] Apply town tiles during chunk generation
- [x] Building wall/floor rendering
- [x] Town objects placed automatically
- [x] Hybrid approach: towns within procedural wilderness
- [x] Height-aware building placement

#### 6.3 Town Utilities ✅
- [x] isInTownBounds() - Check if tile is in a town
- [x] isBuildingWall() - Check if tile is a wall
- [x] getTownAtTile() - Find town at position
- [x] Path creation helpers
- [x] Area fill helpers

**Deliverable**: Data-driven town system ✅

---

### Phase 7: First Town - Thornwick ✅
**Goal**: Create the first town using the data-driven system

Thornwick is a 48x48 tile medieval market town inspired by Varrock.

#### 7.1 Town Layout ✅
- [x] 48x48 tile area centered around player spawn
- [x] Perimeter walls with south gate
- [x] Central marketplace square
- [x] Stone road network connecting buildings
- [x] Small pond in southwest corner

#### 7.2 Buildings ✅
- [x] Thornwick Keep (northern castle, 16x12)
- [x] Thornwick Bank (east side, 8x6)
- [x] General Store (west side, 7x6)
- [x] Blacksmith (southwest, 8x7)
- [x] The Rusty Sword Inn (southeast, 10x8)

#### 7.3 World Objects ✅
- [x] Bank booth inside bank
- [x] Trees scattered around town
- [x] Oak trees near the keep
- [x] Willow tree by the pond
- [x] Fishing spot in pond

#### 7.4 NPCs ✅
- [x] Guards at south gate (passive, won't attack players)
- [x] Guards at keep entrance (passive)
- [x] Chickens near the inn
- [x] Giant rat in alleys

#### 7.5 Town Decoration & Polish ✅
- [x] Fix guards using passive GUARD NPC type (not aggressive goblins)
- [x] Central marketplace fountain
- [x] 4 colored market stalls (red, blue, green, yellow)
- [x] Torches at key locations (marketplace corners, bank, keep)
- [x] Cooking fire inside the inn
- [x] Blacksmith exterior: anvil, barrel, crate
- [x] Inn exterior: bench, table, barrels, flower patches
- [x] General store: crates, barrel, sign post
- [x] South gate: hay bales
- [x] Corner bushes for visual softening
- [x] Rocks near fishing pond

#### 7.6 Remaining Work
- [ ] Tutorial NPC / guide
- [ ] Shopkeeper NPCs (functional shops)
- [ ] Mining rocks outside town
- [ ] Cow field outside town
- [ ] Goblin camp further out

**Deliverable**: Polished, vibrant starter town ✅

---

### Phase 8: Equipment System ✅ (Partial)
**Goal**: Gear progression

#### 8.1 Equipment Slots & UI ✅
- [x] 7 equipment slots (head, body, legs, feet, hands, weapon, offhand)
- [x] Equipment panel UI with character silhouette
- [x] Right-click inventory item → "Equip" option
- [x] Click equipped item to unequip
- [x] Equipment bonuses (attack, strength, defence)
- [x] Two-handed weapon logic (unequips offhand)
- [x] Level requirements for equipment

#### 8.2 Equipment Tiers ✅
- [x] Bronze tier (level 1): sword, shield, helmet, chestplate, legs
- [x] Iron tier (level 10): sword, shield, helmet, chestplate, legs
- [x] Steel tier (level 20): sword, 2H sword, shield, helmet, chestplate, legs
- [x] Basic gear: wooden shield, leather body (no requirements)

#### 8.3 Visual Equipment ✅
- [x] Equipment meshes visible on player model
- [x] Equipment meshes visible on remote players
- [x] Tier-based materials (bronze/iron/steel colors)
- [x] Attachment points (rightHand, leftHand, head, body)

#### 8.4 Equipment Acquisition ✅
- [x] Weapons stall sells bronze equipment
- [x] Goblins drop bronze equipment (rare)
- [x] Guards drop iron equipment (rare)
- [x] New players start with bronze sword, wooden shield, leather body

#### 8.5 Combat Integration ✅
- [x] Equipment bonuses affect combat calculations
- [x] Attack bonus improves hit chance
- [x] Strength bonus increases max hit
- [x] Defence bonus reduces incoming damage
- [x] Database persistence for equipment

#### 8.7 Mining & Smithing (Planned)
- [ ] Mining skill (rocks → ore)
- [ ] Smithing skill (ore → bar → item)
- [ ] Furnace for smelting
- [ ] Anvil crafting interface
- [ ] Add ore rocks outside town

**Deliverable**: Players can equip and upgrade gear ✅

---

### Phase 8.5: Procedural Character System ✅
**Goal**: Replace GLB models with procedural joint-based characters

- [x] SimpleCharacter class with TransformNode hierarchy
- [x] Joint-based animation system (walk cycle, idle)
- [x] OSRS-style chunky aesthetic (gaps at joints like waist, shoulders)
- [x] Equipment attachment system per joint
- [x] Remote player equipment sync
- [x] Performance optimizations (mesh instancing, freezeWorldMatrix)
- [x] Memory leak fixes in dispose() methods

**Deliverable**: Performant procedural characters ✅

---

### Phase 8.6: Combat Polish (Planned)
**Goal**: Improve combat feedback and balance

- [ ] HP regeneration (1 HP per minute out of combat)
- [ ] Player hit splats (damage numbers when hit)
- [ ] Screen flash effect when taking damage
- [ ] Add Hobgoblin (lvl 28) for steel drops
- [ ] Add Black Knight (lvl 33) for rare steel armor

**Deliverable**: Polished combat experience

---

### Phase 9: Magic & Prayer
**Goal**: Complete combat triangle

- [ ] Magic skill and spellbook
- [ ] Rune system
- [ ] Ranged skill
- [ ] Prayer skill and prayer book
- [ ] Combat styles (melee/range/mage)

**Deliverable**: All combat styles functional

---

### Phase 10: World Expansion
**Goal**: Build additional zones using the editor

- [ ] Second town / city (commerce hub)
- [ ] Zone transitions between areas
- [ ] Quest framework (basic fetch/kill quests)
- [ ] Wilderness / PvP zone
- [ ] Dungeon (instanced or open-world)
- [ ] World bosses

**Deliverable**: Multiple connected zones to explore

---

### Phase 11: Social & Economy
**Goal**: Player interaction systems

- [ ] Trading between players
- [ ] Grand Exchange (auction house)
- [ ] Friends list
- [ ] Clans/guilds
- [ ] Private messaging

**Deliverable**: Full social features

---

### Phase 12: Polish & Scale
**Goal**: Production readiness

- [ ] Performance optimization
- [ ] Load testing (1000+ concurrent)
- [ ] Anti-cheat measures
- [ ] Account security
- [ ] Mobile-responsive UI
- [ ] Sound effects and music
- [ ] Deployment pipeline

**Deliverable**: Launchable game

---

## Project Structure

```
realm/
├── packages/
│   ├── client/                 # Babylon.js + React game client
│   │   ├── src/
│   │   │   ├── main.tsx        # Entry point
│   │   │   ├── App.tsx         # React app with UI overlays
│   │   │   ├── Game.ts         # Main game controller
│   │   │   ├── entities/       # Player, RemotePlayer, WorldObjectEntity, NpcEntity
│   │   │   ├── systems/        # Camera, Pathfinding, NetworkManager, TilemapRenderer
│   │   │   └── ui/             # React components (SkillsPanel, InventoryPanel, Chat, etc.)
│   │   ├── index.html
│   │   └── package.json
│   │
│   ├── server/                 # Colyseus game server
│   │   ├── src/
│   │   │   ├── index.ts        # Server entry point
│   │   │   ├── rooms/          # WorldRoom (main game room)
│   │   │   ├── schemas/        # Player, WorldState, WorldObject, NPC schemas
│   │   │   ├── world/          # WorldGenerator (procedural + town integration)
│   │   │   └── database/       # Drizzle ORM schema and queries
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   └── shared/                 # Shared types and game data
│       └── src/
│           ├── index.ts        # Core types, coordinate utils
│           ├── types.ts        # Base types (TileType, Position, Direction)
│           ├── skills.ts       # 23 skill definitions, XP formulas
│           ├── items.ts        # Item definitions (logs, fish, etc.)
│           ├── npcs.ts         # NPC definitions (combat stats, loot tables)
│           ├── worldObjects.ts # World object definitions (trees, fishing spots)
│           ├── combat.ts       # Combat formulas and calculations
│           ├── chunks/         # Chunk schema, validation
│           └── towns/          # Town definitions (data-driven world design)
│               ├── index.ts    # Town system, registry, utilities
│               └── thornwick.ts # First town - Thornwick
│
├── assets/
│   ├── models/                 # Blender source files (.blend)
│   ├── exported/               # glTF/GLB exports for Babylon.js
│   └── textures/               # Texture atlases
│
├── .vscode/
│   └── settings.json           # Format on save, ESLint config
│
├── docker-compose.yml          # PostgreSQL for local dev
├── eslint.config.mjs           # ESLint 9 flat config
├── .prettierrc                 # Prettier formatting rules
├── package.json                # Root workspace scripts
├── pnpm-workspace.yaml
├── CLAUDE.md                   # AI assistant instructions
├── PLAN.md                     # This file - development roadmap
└── README.md                   # Project documentation
```

---

## Local Development

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker-compose up -d

# Start dev servers (client + server in parallel)
pnpm dev

# Client: http://localhost:5173
# Server: ws://localhost:2567
```

### Available Scripts

```bash
pnpm dev              # Start client + server
pnpm dev:client       # Start only client
pnpm dev:server       # Start only server
pnpm build            # Build all packages
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues
pnpm format           # Format with Prettier
pnpm typecheck        # TypeScript type checking
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Renderer | Babylon.js v8 | Full 3D engine, OSRS-style perspective camera |
| UI Layer | React 19 | Modern, declarative UI overlays |
| Multiplayer | Colyseus 0.17 | Best Node.js MMO framework |
| Language | TypeScript 5.9 | Shared types client/server |
| State sync | Messages + Schemas | Reliable initial state via messages |
| Pathfinding | EasyStar.js | A* implementation for tilemaps |
| Database | PostgreSQL + Drizzle | Type-safe ORM, reliable persistence |
| Build | Vite 6 | Fast HMR, modern bundling |
| Linting | ESLint 9 + Prettier | Consistent code style |
| Package manager | pnpm | Fast, efficient, workspaces |
| World building | Data-driven towns | TypeScript definitions, agentic design |
| 3D assets | Blender → glTF | Free, fast iteration, native Babylon.js format |

---

## Research Sources

- [OSRS Skills Wiki](https://oldschool.runescape.wiki/w/Skills)
- [PixiJS vs Phaser Comparison](https://dev.to/ritza/phaser-vs-pixijs-for-making-2d-games-2j8c)
- [Colyseus Framework](https://colyseus.io/)
- [2D Sprite Trends 2025](https://pixelfindr.io/blog/why-2d-isn-t-dead-trending-sprite-styles-to-watch-in-2025-meshy-ai)
- [Procedural World Generation](https://rancic.org/blog/world-proc-gen/)
- [Socket.io + Redis Architecture](https://dev.to/dowerdev/building-a-real-time-multiplayer-game-server-with-socketio-and-redis-architecture-and-583m)

---

## Current Status

**Phases 1-8.5 Complete** - Full combat system, 3D terrain, town system, first town (Thornwick), equipment system, and procedural character system with performance optimizations.

**Next: Phase 8.6 (Combat Polish)** - Add HP regen, player damage feedback, then Phase 8.7 (Mining & Smithing).

### Thornwick Town (Phase 7)
- 48x48 tile medieval market town with perimeter walls
- 5 buildings: Keep, Bank, General Store, Blacksmith, Inn
- Passive GUARD NPCs at gates and keep (won't attack players)
- Central marketplace with fountain and 4 colored market stalls
- Torches throughout for atmospheric lighting
- Decorative props: barrels, crates, benches, tables, hay bales, bushes, rocks, flower patches
- Cooking fire in the inn, anvil at blacksmith
- Fishing pond with willow tree

### Combat System (Phase 5)
- NPCs: Chicken (lvl 1), Cow (lvl 2), Giant Rat (lvl 3), Goblin (lvl 5 aggressive), Guard (lvl 21 passive)
- Click NPC to walk adjacent and auto-attack
- OSRS-style damage formulas (accuracy roll vs defence roll)
- XP: 4 per damage to combat skill + 1.33 HP XP
- Combat styles: Accurate (Attack), Aggressive (Strength), Defensive (Defence)
- NPC health bars always visible
- Hit splats show damage numbers on NPCs
- Loot drops on kill (bones, raw meat, feathers, coins, equipment)
- Right-click food to eat and heal
- Respawn: NPCs after timer, players at spawn point

### Equipment System (Phase 8)
- 7 slots: head, body, legs, feet, hands, weapon, offhand
- Bronze/Iron/Steel tiers with level requirements
- Equipment bonuses affect combat (attack, strength, defence)
- Visual equipment meshes on player models
- Equipment synced to remote players
- Goblins drop bronze gear, Guards drop iron gear
- Weapons stall sells bronze equipment

### Procedural Character System (Phase 8.5)
- SimpleCharacter class using TransformNode hierarchy (no GLB models)
- Joint-based animation system with walk cycle and idle poses
- OSRS-style chunky aesthetic with gaps at joints (waist, shoulders)
- Equipment meshes attach to specific joints (weapon to hand, helmet to head)
- Performance optimizations: mesh instancing, freezeWorldMatrix for static objects
- Memory leak fixes in dispose() methods

### 3D Terrain (Phase 5.5)
- Babylon.js perspective camera (OSRS-style angle)
- Height map with plateaus and cliffs
- Auto-generated cliff faces between levels
- Height-aware pathfinding (can't climb > 1 level)
- Q/E keys rotate camera 45°
- All entities positioned at correct Y height

### NPC Locations (Thornwick)
| NPC | Location | Notes |
|-----|----------|-------|
| Guard x2 | South gate (22,44), (26,44) | Passive, patrol gate area |
| Guard x2 | Keep entrance (22,14), (26,14) | Passive, patrol keep |
| Chicken x2 | Near inn (38,40), (40,42) | Easy combat |
| Giant Rat x1 | Southwest alley (6,40) | Medium combat |

### World Objects (Thornwick)
| Object | Location | Purpose |
|--------|----------|---------|
| Fountain | Central marketplace (24,26) | Decorative centerpiece |
| Market Stalls x4 | Around marketplace | Red, blue, green, yellow awnings |
| Torches x8 | Gates, keep, bank, marketplace | Atmospheric lighting |
| Anvil | Blacksmith exterior (13,33) | Future smithing |
| Cooking Fire | Inside inn (38,34) | Cooking skill |
| Bank Booth | Inside bank (40,20) | Banking |
| Fishing Spot | Pond (6,44) | Fishing skill |

## Next Steps

1. **Phase 8.6: Combat Polish** (Priority)
   - Add HP regeneration (1 HP per minute out of combat)
   - Add player hit splats when taking damage
   - Add screen flash effect on damage
   - Add Hobgoblin NPC (lvl 28) for steel drops
   - Add Black Knight NPC (lvl 33) for rare steel armor

2. **Phase 8.7: Mining & Smithing**
   - Mining skill (rocks → ore)
   - Smithing skill (ore → bar → item at anvil)
   - Add ore rocks outside town walls
   - Implement furnace for smelting
   - Create goblin camp with hobgoblins

3. **Expand Thornwick** (Content)
   - Add tutorial NPC with dialogue
   - Add mining rocks outside town walls
   - Create cow field and goblin camp outside walls
   - Add ambient townsfolk NPCs

4. **Phase 9: Second Town**
   - Design and implement a second town
   - Zone transitions between areas
   - Different biome/theme (coastal port or mountain village)

---

## Asset Pipeline

### World Building Workflow (Data-Driven Towns)
```
1. Design → Describe town layout, buildings, NPCs at high level
2. Define → Create TypeScript town definition file
3. Iterate → Adjust coordinates, add buildings, place objects
4. Test → Load game, verify layout, refine
```

Towns are defined in `packages/shared/src/towns/` as TypeScript data files.
The WorldGenerator applies town data during chunk generation.

### 3D Assets (Blender → Babylon.js)
- Model in Blender (free, fast iteration)
- Export as glTF/GLB (native Babylon.js format)
- OSRS-style chunky low-poly aesthetic
- Modular building kits: walls, corners, roofs, doors, windows
- Snap to tile grid in Blender
- One material style per biome (no mixing PBR with flat low-poly)

### Textures & UI
- Krita or Aseprite depending on style
- Lock consistent palette before production
- AI useful for concept/iteration, then clean up manually

### AI Usage That Saves Time
Use Claude/Codex to generate:
- Drop tables, XP curves, item definitions from templates
- Quest step graphs (tiny DSL) and reward tables
- Town layout drafts as data ("place 12 houses along road, add plaza")
- Deterministic procedural decoration (same seed = same clutter everywhere)

Do NOT use AI to skip the pipeline. Use it to crank content through the pipeline.

### Avoiding "Roblox Feel"
Common problems:
- Inconsistent scale
- Shiny/default materials
- No strong silhouettes/landmarks
- No disciplined palette
- Buildings not modular / not snapped / not readable

Fix by:
1. Greybox first, lock scale
2. Make modular building kit in Blender
3. Replace greyboxes with kit pieces (grid-snapped)
4. One lighting setup + fog + low specular across whole scene
