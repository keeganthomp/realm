# Project Codename: REALM

A modern 2D browser MMO inspired by RuneScape, built for 2026.

---

## Executive Summary

Build a medieval fantasy 2D MMO with click-to-action gameplay, skill progression, equipment systems, and multiplayer support. RuneScape is the north star, but rebuilt with a hyper-modern stack optimized for performance, scalability, and developer experience.

---

## Tech Stack (Current Versions)

| Category | Technology | Version |
|----------|------------|---------|
| Rendering | PixiJS | v8.6.0 |
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

### Rendering: **PixiJS v8**
- 3x smaller bundle than Phaser (450KB vs 1.2MB)
- 2x faster pure rendering performance
- WebGL2 with Canvas fallback
- Maximum control for custom MMO systems
- Perfect for sprite batching (100s of players on screen)

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

### World Generation: **Tiled + Procedural Hybrid**
- Hand-crafted zones via Tiled Map Editor (exports JSON)
- Procedural elements using Perlin noise (resource spawns, weather)
- Chunk-based loading for large worlds

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
- [x] Tilemap loader (procedural generation)
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

### Phase 4: Inventory & Items (In Progress)
**Goal**: Full item management

- [x] Inventory grid UI (28 slots like RS)
- [x] Item definitions (shared/items.ts)
- [x] Items granted from skilling (logs, fish)
- [x] Inventory persistence to database
- [ ] Pick up / drop items
- [ ] Item stacking (coins, arrows)
- [ ] Use item on object (cook fish on fire)
- [ ] Bank storage

**Deliverable**: Players can collect and store items

---

### Phase 5: Combat System
**Goal**: PvE combat loop

- [ ] Combat stats (Attack, Strength, Defence, Hitpoints)
- [ ] NPC spawning and AI
- [ ] Click-to-attack targeting
- [ ] Damage calculation formulas
- [ ] Death and respawning
- [ ] Loot drops
- [ ] Combat XP gains

**Deliverable**: Players can fight monsters

---

### Phase 6: Equipment & Crafting
**Goal**: Gear progression

- [ ] Equipment slots and UI
- [ ] Stat bonuses from gear
- [ ] Smithing skill (ore → bar → item)
- [ ] Mining skill (rocks → ore)
- [ ] Crafting skill basics
- [ ] Equipment requirements (level locks)

**Deliverable**: Players can craft and equip gear

---

### Phase 7: World Expansion
**Goal**: Full explorable world

- [ ] Multiple connected zones
- [ ] Zone transitions
- [ ] NPC shops
- [ ] Quest framework (basic)
- [ ] World bosses
- [ ] Resource respawn timers

**Deliverable**: Rich world to explore

---

### Phase 8: Magic & Prayer
**Goal**: Complete combat triangle

- [ ] Magic skill and spellbook
- [ ] Rune system
- [ ] Ranged skill
- [ ] Prayer skill and prayer book
- [ ] Combat styles (melee/range/mage)

**Deliverable**: All combat styles functional

---

### Phase 9: Social & Economy
**Goal**: Player interaction systems

- [ ] Trading between players
- [ ] Grand Exchange (auction house)
- [ ] Friends list
- [ ] Clans/guilds
- [ ] Private messaging

**Deliverable**: Full social features

---

### Phase 10: Polish & Scale
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
│   ├── client/                 # PixiJS + React game client
│   │   ├── src/
│   │   │   ├── main.tsx        # Entry point
│   │   │   ├── App.tsx         # React app with UI overlays
│   │   │   ├── Game.ts         # Main game controller
│   │   │   ├── entities/       # Player, RemotePlayer, WorldObjectEntity
│   │   │   ├── systems/        # Camera, Pathfinding, NetworkManager, TilemapRenderer
│   │   │   └── ui/             # React components (SkillsPanel, InventoryPanel, Chat, etc.)
│   │   ├── index.html
│   │   └── package.json
│   │
│   ├── server/                 # Colyseus game server
│   │   ├── src/
│   │   │   ├── index.ts        # Server entry point
│   │   │   ├── rooms/          # WorldRoom (main game room)
│   │   │   ├── schemas/        # Player, WorldState, WorldObject schemas
│   │   │   └── database/       # Drizzle ORM schema and queries
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   └── shared/                 # Shared types and game data
│       └── src/
│           ├── index.ts        # Core types, tile constants, coordinate utils
│           ├── skills.ts       # 23 skill definitions, XP formulas
│           ├── items.ts        # Item definitions (logs, fish, etc.)
│           └── worldObjects.ts # World object definitions (trees, fishing spots)
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
| Renderer | PixiJS v8 | Fastest 2D WebGL, tiny bundle |
| UI Layer | React 19 | Modern, declarative UI overlays |
| Multiplayer | Colyseus 0.17 | Best Node.js MMO framework |
| Language | TypeScript 5.9 | Shared types client/server |
| State sync | Messages + Schemas | Reliable initial state via messages |
| Pathfinding | EasyStar.js | A* implementation for tilemaps |
| Database | PostgreSQL + Drizzle | Type-safe ORM, reliable persistence |
| Build | Vite 6 | Fast HMR, modern bundling |
| Linting | ESLint 9 + Prettier | Consistent code style |
| Package manager | pnpm | Fast, efficient, workspaces |

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

**Phases 1-3 Complete** - Core engine, multiplayer, and skill system MVP are working.

**Phase 4 In Progress** - Inventory UI exists, items are granted from skills, but need:
- Drop items
- Use items on objects (cooking)
- Item stacking

## Next Steps

1. Fix remaining skill sync issues (UI should update in real-time)
2. Implement "use item on object" for cooking
3. Add drop item functionality
4. Begin Phase 5: Combat System
