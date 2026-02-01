# CLAUDE.md

This file provides guidance to Claude Code when working with this repository. Read this carefully before making changes.

## Project Overview

**Realm** is a 2D browser MMO inspired by RuneScape (OSRS), built with TypeScript. Players spawn in **Thornwick**, a medieval market town, and can explore, train skills, fight NPCs, and interact with other players in real-time.

### Current State
- **Phases 1-7 complete**: Movement, multiplayer, skills, inventory, banking, combat, 3D terrain, town system
- **First town**: Thornwick (48x48 tiles) - fully decorated with marketplace, fountain, stalls, torches, props
- **Next up**: Equipment slots, mining/smithing, more towns

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| 3D Rendering | Babylon.js | v8.6 | NOT PixiJS - we migrated to 3D |
| UI | React | v19 | Overlays on top of Babylon canvas |
| Multiplayer | Colyseus | v0.17.8 | Room-based, schema sync |
| Database | PostgreSQL | v16 | Via Docker |
| ORM | Drizzle | v0.45.1 | Type-safe queries |
| Build | Vite | v6 | Fast HMR |
| Language | TypeScript | v5.9 | Strict mode |

## Commands

```bash
pnpm install          # Install dependencies
docker-compose up -d  # Start PostgreSQL
pnpm dev              # Start client + server
pnpm dev:client       # Client only (localhost:5173)
pnpm dev:server       # Server only (ws://localhost:2567)
pnpm build            # Build all packages
pnpm typecheck        # Type check all packages
pnpm lint             # ESLint check
pnpm lint:fix         # Auto-fix lint issues
pnpm format           # Prettier format
```

## Architecture

### Monorepo Structure

```
packages/
├── client/           # Babylon.js + React game client
├── server/           # Colyseus multiplayer server
└── shared/           # Types, constants, game data (used by both)
```

### Package Dependencies
- `shared` has no dependencies on other packages
- `client` imports from `@realm/shared`
- `server` imports from `@realm/shared`
- Changes to `shared` affect both client and server

---

## Client (`packages/client`)

### Core Files

| File | Purpose |
|------|---------|
| `src/Game.ts` | Main game controller. Manages Babylon.js scene, camera, input, game loop. Exposes callbacks for network layer. |
| `src/App.tsx` | React root. Renders UI panels, manages state from NetworkManager callbacks. |
| `src/systems/NetworkManager.ts` | Colyseus client. Syncs state between server and Game, fires callbacks to React. |
| `src/systems/TilemapRenderer.ts` | Renders 3D terrain with height levels, cliff faces, instanced meshes. |
| `src/systems/Camera.ts` | OSRS-style ArcRotateCamera, screen-to-world picking. |
| `src/systems/Pathfinding.ts` | A* pathfinding via EasyStar.js, height-aware. |

### Entities

| File | Purpose |
|------|---------|
| `entities/Player.ts` | Local player with movement, animations, action states. |
| `entities/RemotePlayer.ts` | Other players with interpolation. |
| `entities/WorldObjectEntity.ts` | Trees, fishing spots, bank booths - 3D meshes. |
| `entities/NpcEntity.ts` | NPCs with health bars, hit splats, death states. |

### UI Components (`src/ui/`)

| Component | Purpose |
|-----------|---------|
| `SkillsPanel.tsx` | 23-skill grid with XP bars, tooltips |
| `InventoryPanel.tsx` | 28-slot grid, right-click menu (drop/eat) |
| `BankPanel.tsx` | Deposit/withdraw interface |
| `ChatPanel.tsx` | Message log + input |
| `HealthBar.tsx` | HP display |
| `ActionProgress.tsx` | Skilling/combat progress bar |

### Camera Controls
- **Middle mouse drag**: Rotate camera
- **Scroll wheel**: Zoom in/out
- **Q/E keys**: Snap rotate 45°
- **Arrow keys**: Smooth rotate/pitch

---

## Server (`packages/server`)

### Core Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Server entry, Colyseus setup |
| `src/rooms/WorldRoom.ts` | Main game room (~1500 lines). Handles ALL game logic. |
| `src/world/WorldGenerator.ts` | Procedural terrain + town integration |

### Schemas (`src/schemas/`)

Colyseus schemas for state sync:

| Schema | Fields |
|--------|--------|
| `WorldState.ts` | `players: MapSchema<Player>`, `npcs: MapSchema<NPC>` |
| `Player.ts` | position, direction, skills (MapSchema), inventory (ArraySchema), currentHp, etc. |
| `NPC.ts` | position, npcType, currentHp, maxHp, isDead, targetId |
| `WorldObject.ts` | position, objectType, depleted, respawnAt |

### WorldRoom Message Handlers

| Message | Purpose |
|---------|---------|
| `move` | Player movement request |
| `chat` | Chat message |
| `startAction` | Begin skilling action on object |
| `cancelAction` | Stop current action |
| `dropItem` | Drop inventory item |
| `attackNpc` | Initiate combat |
| `bankDeposit` / `bankWithdraw` | Banking |
| `eatFood` | Consume food to heal |

### Database (`src/database/`)

| File | Purpose |
|------|---------|
| `schema.ts` | Drizzle table definitions |
| `index.ts` | Connection, query functions |

Tables: `players`, `player_skills`, `player_inventory`, `player_bank`

---

## Shared (`packages/shared`)

### Core Types (`src/types.ts`)

```typescript
TILE_SIZE = 32        // Pixels per tile
CHUNK_SIZE = 32       // Tiles per chunk

enum TileType { GRASS, WATER, SAND, STONE, TREE, WALL }
enum Direction { DOWN, LEFT, RIGHT, UP }

interface Position { x: number; y: number }
interface TilePosition { tileX: number; tileY: number }

worldToTile(pos: Position): TilePosition
tileToWorld(tile: TilePosition): Position
```

### Skills (`src/skills.ts`)

23 skills with OSRS-style XP curve:

```typescript
enum SkillType {
  ATTACK, STRENGTH, DEFENCE, HITPOINTS, RANGED, PRAYER, MAGIC,
  MINING, FISHING, WOODCUTTING, FARMING, HUNTER,
  COOKING, SMITHING, CRAFTING, FLETCHING, HERBLORE, RUNECRAFTING, CONSTRUCTION,
  AGILITY, THIEVING, SLAYER, FIREMAKING
}

getXpForLevel(level: number): number      // XP needed for level
getLevelFromXp(xp: number): number        // Level from XP
getLevelProgress(xp: number): number      // 0-1 progress to next level
```

### Items (`src/items.ts`)

```typescript
enum ItemType { LOGS, OAK_LOGS, RAW_SHRIMP, COOKED_SHRIMP, BONES, ... }

interface ItemDefinition {
  type: ItemType
  name: string
  stackable: boolean
  edible: boolean
  healAmount?: number
}
```

### World Objects (`src/worldObjects.ts`)

```typescript
enum WorldObjectType {
  // Functional
  TREE, OAK_TREE, WILLOW_TREE,     // Woodcutting
  FISHING_SPOT_NET, FISHING_SPOT_ROD, // Fishing
  FIRE, COOKING_RANGE,              // Cooking
  BANK_BOOTH,                       // Banking
  ANVIL,                            // Future smithing

  // Decorative
  MARKET_STALL_RED, MARKET_STALL_BLUE, MARKET_STALL_GREEN, MARKET_STALL_YELLOW,
  FOUNTAIN, WELL, TORCH_STAND,
  BARREL, CRATE, BENCH, TABLE,
  FLOWER_PATCH, SIGN_POST, HAY_BALE, BUSH, ROCK
}

interface WorldObjectDefinition {
  type: WorldObjectType
  name: string
  action: string           // "Chop", "Fish", "Cook", "Bank", "Examine"
  skill: SkillType
  levelRequired: number
  xpGain: number
  actionTime: number       // milliseconds
  yields: ItemType
  respawnTime: number      // 0 = never depletes
  depletionChance: number  // 0-1
}
```

### NPCs (`src/npcs.ts`)

```typescript
enum NpcType { CHICKEN, COW, GOBLIN, GIANT_RAT, GUARD }

interface NpcDefinition {
  type: NpcType
  name: string
  combatLevel: number
  hitpoints: number
  maxHit: number
  attackLevel, strengthLevel, defenceLevel: number
  attackSpeed: number      // ticks (4 = 2.4s)
  aggroRange: number       // 0 = passive (GUARD, CHICKEN, COW, RAT)
  respawnTime: number
  drops: LootTableEntry[]
}
```

**Note**: `GUARD` is passive (aggroRange: 0) - town guards don't attack players.

### Combat (`src/combat.ts`)

OSRS-style formulas:
- `calculateMaxHit(strengthLevel, strengthBonus)`
- `calculateAttackRoll(attackLevel, attackBonus)`
- `calculateDefenceRoll(defenceLevel, defenceBonus)`
- `calculateHitChance(attackRoll, defenceRoll)`

---

## Town System (`packages/shared/src/towns/`)

Towns are **data-driven** - defined as TypeScript objects, not edited in-game.

### Town Definition Structure

```typescript
interface TownDefinition {
  id: string
  name: string
  bounds: { x, y, width, height }  // World tile coordinates
  baseTile: TileType
  baseHeight: number
  buildings: BuildingDefinition[]
  npcs: NpcSpawnDefinition[]
  worldObjects: WorldObjectPlacement[]
  tileOverrides: TileOverride[]    // Roads, paths, water
  exits: ExitDefinition[]          // Future: town connections
}
```

### Current Town: Thornwick

Location: Centered around spawn (tiles -14,-14 to 33,33)

**Buildings:**
- Thornwick Keep (16x12, north)
- Bank (8x6, east)
- General Store (7x6, west)
- Blacksmith (8x7, southwest)
- The Rusty Sword Inn (10x8, southeast)

**Features:**
- Perimeter walls with south gate
- Central marketplace with fountain and 4 colored market stalls
- Stone road network connecting all buildings
- Torches at key locations (marketplace, bank, keep entrances)
- Fishing pond (southwest) with willow tree

**Decorative Props:**
- Blacksmith: Anvil, barrel, crate
- Inn: Cooking fire inside, bench + table outside, barrels, flower patches
- General Store: Crates, barrel, sign post
- South Gate: Hay bales
- Corners: Bushes
- Pond: Rocks

**NPCs:**
- Guards (passive) at south gate and keep entrance
- Chickens near inn
- Giant rat in alleys

### Adding a New Town

1. Create `packages/shared/src/towns/mytown.ts`
2. Define town with bounds, buildings, NPCs, objects
3. Export and register in `towns/index.ts`:
   ```typescript
   import { MYTOWN } from './mytown'
   registerTown(MYTOWN)
   export { MYTOWN } from './mytown'
   ```
4. Town appears automatically in world at specified coordinates

### Town Helpers

```typescript
createPath(x1, y1, x2, y2): TileOverride[]     // Stone path between points
createArea(x, y, w, h, tile, height): TileOverride[]  // Fill rectangle
isInTownBounds(town, tileX, tileY): boolean
isBuildingWall(building, townX, townY, x, y): boolean
```

---

## Common Tasks

### Adding a New Skill Action

1. Add `WorldObjectType` in `shared/src/worldObjects.ts`
2. Add definition to `WORLD_OBJECT_DEFINITIONS`
3. Add item yields to `shared/src/items.ts` if needed
4. Place objects in town definition or WorldGenerator
5. Client renders automatically via `WorldObjectEntity.ts`

### Adding a New NPC

1. Add `NpcType` in `shared/src/npcs.ts`
2. Add definition to `NPC_DEFINITIONS` with stats and loot
3. Add to town's `npcs` array or spawn in `WorldRoom.spawnNpcs()`
4. Add mesh creation in `client/src/entities/NpcEntity.ts`

### Adding a New Item

1. Add `ItemType` in `shared/src/items.ts`
2. Add definition to `ITEM_DEFINITIONS`
3. If food: set `edible: true` and `healAmount`
4. If stackable: set `stackable: true`

### Modifying Town Layout

Edit `packages/shared/src/towns/thornwick.ts`:
- Buildings: Add to `buildings` array
- NPCs: Add to `npcs` array
- Objects: Add to `worldObjects` array
- Roads/terrain: Add to `tileOverrides` array

---

## Patterns to Follow

### State Sync
- Initial data via messages (`playerData`, `worldObjects`)
- Real-time updates via Colyseus schema sync
- Object changes via `objectUpdate` message

### Coordinate Systems
- **World coords**: Pixels (x, y)
- **Tile coords**: Grid positions (tileX, tileY)
- **Chunk coords**: Chunk indices (chunkX, chunkY)
- Always use `worldToTile()` and `tileToWorld()` for conversion

### Callbacks Over Events
Game and NetworkManager communicate via typed callbacks, not event emitters:
```typescript
network.onSkillsChanged = (skills) => setSkills(skills)
game.onLocalPlayerMove = (pos, path) => network.sendMove(pos, path)
```

### Height-Aware Systems
- Terrain has height levels 0-2
- Pathfinding blocks climbs > 1 level
- Entities use `setHeightProvider()` for Y positioning

---

## Things to Avoid

1. **Don't use PixiJS** - We use Babylon.js for 3D
2. **Don't create circular imports** - Use `types.ts` for base types
3. **Don't spawn NPCs client-side** - Server is authoritative
4. **Don't skip type checking** - Run `pnpm typecheck` before committing
5. **Don't hardcode positions** - Use town definitions or TILE_SIZE constants
6. **Don't modify shared types without checking both client and server**
7. **NEVER stack entities on the same tile** - NPCs, world objects, and interactable items must NEVER share the same tile position. This makes objects unclickable/unreachable. When placing items in town definitions, always verify coordinates don't overlap with other placements.

---

## File Quick Reference

| Task | File(s) |
|------|---------|
| Add skill | `shared/src/skills.ts` |
| Add item | `shared/src/items.ts` |
| Add NPC type | `shared/src/npcs.ts` |
| Add world object | `shared/src/worldObjects.ts` |
| Modify town | `shared/src/towns/thornwick.ts` |
| Add new town | `shared/src/towns/` + register in `index.ts` |
| Game logic | `server/src/rooms/WorldRoom.ts` |
| 3D rendering | `client/src/systems/TilemapRenderer.ts` |
| Entity visuals | `client/src/entities/*.ts` |
| UI panels | `client/src/ui/*.tsx` |
| Database | `server/src/database/schema.ts` |

---

## Debugging

### Server not starting
- Check if port 2567 is in use: `lsof -i :2567`
- Kill existing: `lsof -ti :2567 | xargs kill -9`

### Database issues
- Ensure Docker is running: `docker-compose up -d`
- Server runs without DB (non-persistent mode) if unavailable

### Type errors after shared changes
- Rebuild shared: `pnpm --filter shared build`
- Or just run `pnpm typecheck` to check all packages

### Town not appearing
- Verify town is registered in `towns/index.ts`
- Check bounds overlap with player spawn area
- Ensure no circular import issues (check console for errors)
