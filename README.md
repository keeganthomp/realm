# REALM

A modern 2D browser MMO inspired by RuneScape, built with TypeScript.

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Rendering | Babylon.js | v8.6 |
| Multiplayer | Colyseus | v0.17 |
| UI | React | v19 |
| Database | PostgreSQL | v16 |
| ORM | Drizzle | v0.45 |
| Build | Vite | v6 |
| Package Manager | pnpm | v9 |

## Quick Start

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker-compose up -d

# Start dev servers (client + server)
pnpm dev

# Open http://localhost:5173
```

## Project Structure

```
realm/
├── packages/
│   ├── client/          # Babylon.js + React game client
│   │   ├── src/
│   │   │   ├── Game.ts           # Main game controller
│   │   │   ├── entities/         # Player, RemotePlayer, WorldObject, NPC
│   │   │   ├── systems/          # Camera, Pathfinding, Network, Tilemap
│   │   │   └── ui/               # React UI components
│   │   └── package.json
│   │
│   ├── server/          # Colyseus game server
│   │   ├── src/
│   │   │   ├── rooms/            # WorldRoom (main game room)
│   │   │   ├── schemas/          # Colyseus state schemas
│   │   │   ├── world/            # WorldGenerator (procedural + towns)
│   │   │   └── database/         # Drizzle ORM + PostgreSQL
│   │   └── package.json
│   │
│   └── shared/          # Shared types and game data
│       └── src/
│           ├── index.ts          # Core types, tile constants
│           ├── types.ts          # Base types (TileType, Position, etc.)
│           ├── skills.ts         # 23 skill definitions, XP formulas
│           ├── items.ts          # Item definitions
│           ├── npcs.ts           # NPC definitions
│           ├── worldObjects.ts   # World object definitions
│           └── towns/            # Town definitions (data-driven)
│               ├── index.ts      # Town system, registry
│               └── thornwick.ts  # First town - Thornwick
│
├── docker-compose.yml   # PostgreSQL for local dev
├── eslint.config.mjs    # ESLint flat config
├── .prettierrc          # Prettier config
└── PLAN.md              # Development roadmap
```

## Available Scripts

```bash
# Development
pnpm dev              # Start client + server
pnpm dev:client       # Start only client (localhost:5173)
pnpm dev:server       # Start only server (ws://localhost:2567)

# Build
pnpm build            # Build all packages

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues
pnpm format           # Format with Prettier
pnpm format:check     # Check formatting
pnpm typecheck        # TypeScript type checking
```

## Game Features (Current)

### Implemented
- Click-to-move pathfinding (A* algorithm)
- Multiplayer with real-time sync
- 3D terrain with height levels and cliff faces
- OSRS-style camera (Q/E to rotate, scroll to zoom)
- 3 working skills: Woodcutting, Fishing, Cooking
- 23 skill definitions (OSRS-style XP curve)
- Full combat system (Attack, Strength, Defence, Hitpoints)
- NPCs with combat AI, loot drops, respawning (passive and aggressive types)
- **Equipment system** with 7 slots (head, body, legs, feet, hands, weapon, offhand)
- **Visual equipment** on player models (weapons, shields, armor visible in 3D)
- **Equipment drops** from NPCs (goblins drop bronze, guards drop iron)
- Skill panel UI with level/XP display
- Inventory panel (28 slots) with equip option
- Equipment panel with stat bonuses
- Bank system
- Shop system (weapons stall sells equipment)
- Chat system
- Player nameplates
- World objects (trees, fishing spots, fire, bank booths, decorative props)
- Database persistence (skills, inventory, equipment)
- Loading screen
- Auto-save every 30 seconds

### Equipment Tiers
- **Bronze** (Level 1) - Starter gear, dropped by goblins
- **Iron** (Level 10) - Mid-tier, dropped by guards
- **Steel** (Level 20) - Advanced gear

### Towns
- **Thornwick** - First town, inspired by Varrock (48x48 tiles)
  - Thornwick Keep (northern castle)
  - Bank, General Store, Blacksmith, Inn
  - Central marketplace with fountain and 4 colored market stalls
  - Perimeter walls with south gate
  - Guard NPCs (passive, drop iron), chickens, rats
  - Goblins (aggressive, drop bronze)
  - Torches, barrels, crates, benches, tables, flower patches
  - Trees, fishing pond with willow, bank booth
  - Cooking fire in inn, anvil at blacksmith

### Coming Soon
- HP regeneration and damage feedback
- Mining and Smithing skills
- Additional towns and zones
- Quest system

## Town System

Towns are defined as data in `packages/shared/src/towns/`. Each town specifies:

- **Bounds** - Rectangular area in world tile coordinates
- **Buildings** - Walls, floors, doors
- **NPCs** - Spawn points with patrol areas
- **Objects** - Trees, bank booths, etc.
- **Tile overrides** - Roads, paths, water features

The `WorldGenerator` applies town data during chunk generation, creating structured areas within the procedurally generated wilderness.

### Adding a New Town

1. Create `packages/shared/src/towns/mytown.ts`
2. Define `TownDefinition` with bounds, buildings, NPCs, objects
3. Export and register the town in `towns/index.ts`
4. The town will automatically appear in the world at the specified coordinates

## Database

PostgreSQL with Drizzle ORM. Tables:
- `players` - Player accounts
- `player_skills` - XP per skill
- `player_inventory` - Items

Server runs without database if unavailable (non-persistent mode).

## Architecture Notes

### State Sync
Initial player data is sent via WebSocket messages (`playerData`, `worldObjects`) rather than Colyseus schema sync for reliability. Real-time updates (position, actions) use schema sync.

### World Generation
The world uses a hybrid approach:
- **Towns**: Data-driven, hand-designed areas with buildings, NPCs, roads
- **Wilderness**: Procedural terrain with noise-based biomes and random resource spawns

### Skill Actions
1. Click world object → pathfind to adjacent tile
2. Send `startAction` message to server
3. Server validates level requirements
4. Timer completes → grant XP + item
5. Auto-repeat until depleted or inventory full

## Development

### VS Code Setup
The `.vscode/settings.json` enables:
- Format on save (Prettier)
- ESLint auto-fix on save

### Adding a New Skill
1. Add to `SkillType` enum in `shared/src/skills.ts`
2. Add definition to `SKILL_DEFINITIONS`
3. Add world object type in `shared/src/worldObjects.ts`
4. Spawn objects in town definitions or procedural generation
5. Create entity renderer in `client/src/entities/`

## License

Private - All rights reserved
