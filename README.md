# REALM

A 2D browser MMO inspired by RuneScape, featuring a dual-dimension system where players explore the surface world and venture into **The Veil** - a mysterious parallel dimension filled with danger and rare treasures.

## The Story

### The World of Aethermoor

For centuries, the realm of Aethermoor flourished under the protection of the Veil Wardens - an ancient order who guarded the boundary between the mortal world and a parallel dimension known as **The Veil**. This shadowy realm, visible only as shimmering distortions in reality, was said to be a mirror of our world twisted by chaotic energies.

### The Sundering

Fifty years ago, during the event known as **The Sundering**, the barriers weakened. Rifts began appearing across Aethermoor - tears in reality that pulse with otherworldly energy. The Veil Wardens disappeared, leaving behind only their knowledge encoded in the ancient skill of **Veilwalking**.

### The Veil

The Veil is not merely dangerous - it is alive with possibility. Strange creatures roam its twisted landscapes, guarding resources that don't exist in the mortal realm. Brave adventurers who master Veilwalking can enter through rifts, but must manage their **Veil Stability** - the measure of how long their mortal form can withstand the dimension's corrupting influence.

Those who linger too long find their stability depleting, forcing an emergency extraction and the loss of any unsecured treasures. But those who learn to navigate its depths return with riches beyond imagination.

### Thornwick

The market town of **Thornwick** serves as the last bastion of civilization near the largest concentration of rifts. Once a prosperous trading hub, it now attracts adventurers from across Aethermoor seeking fortune in The Veil. The town's bank, smithy, and general store cater to these brave souls, while guards patrol the walls against creatures that occasionally slip through unstable rifts.

A shimmering rift pulses near the town fountain - a constant reminder that The Veil is never far away.

---

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
│   │   │   ├── systems/          # Camera, Pathfinding, Network, Environment
│   │   │   ├── character/        # Procedural character system
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
│           ├── types.ts          # Base types (TileType, Position, etc.)
│           ├── skills.ts         # 24 skill definitions (including Veilwalking)
│           ├── items.ts          # Item definitions
│           ├── npcs.ts           # NPC definitions
│           ├── worldObjects.ts   # World object definitions
│           ├── expeditions.ts    # Veil expedition system
│           ├── achievements.ts   # Achievement definitions
│           ├── challenges.ts     # Daily challenge system
│           └── towns/            # Town definitions
│               └── thornwick.ts  # First town - Thornwick
│
├── docker-compose.yml   # PostgreSQL for local dev
└── CLAUDE.md            # AI assistant instructions
```

## Game Features

### Core Systems
- **Click-to-move pathfinding** (A* algorithm with height awareness)
- **Real-time multiplayer** via Colyseus WebSocket sync
- **3D terrain** with height levels, cliff faces, and water
- **OSRS-style camera** (Q/E rotate, scroll zoom, arrow keys)
- **Procedural characters** - joint-based with walk/idle animations

### Skills (24 Total)
| Category | Skills |
|----------|--------|
| Combat | Attack, Strength, Defence, Hitpoints, Ranged, Prayer, Magic |
| Gathering | Mining, Fishing, Woodcutting, Farming, Hunter |
| Production | Smithing, Cooking, Crafting, Fletching, Herblore, Runecrafting, Construction |
| Support | Agility, Thieving, Slayer, Firemaking |
| **Veil** | **Veilwalking** |

### The Veil System

Enter rifts scattered across the world to begin **Expeditions** into The Veil:

- **Veil Stability** - Your lifeline in the dimension. Drains over time and when taking damage.
- **Timed Expeditions** - Each tier has a maximum duration (10 min for Shallow Veil)
- **Risk vs Reward** - Deeper expeditions offer better loot but faster stability drain
- **Extraction** - Leave voluntarily to keep all loot, or get forced out and lose unsecured items
- **Veilwalking XP** - Gain experience for time spent and depth reached

**Expedition Tiers:**
| Tier | Name | Level Req | Duration | Danger |
|------|------|-----------|----------|--------|
| 1 | Shallow Veil | 1 | 10 min | Low |
| 2 | Deep Veil | 25 | 8 min | Medium |
| 3 | Abyssal Veil | 50 | 6 min | High |
| 4 | Void Depths | 75 | 5 min | Extreme |
| 5 | The Unnamed Dark | 90 | 4 min | ??? |

**Visual Transformation:**
When entering The Veil, the world shifts:
- Dark purple fog envelops the landscape
- Glowing cyan/magenta particles float through the air
- Post-processing effects create an otherworldly atmosphere

### Combat
- Full OSRS-style combat with Attack, Strength, Defence
- Combat styles: Accurate, Aggressive, Defensive
- NPCs with AI, aggro ranges, loot tables, respawning
- Hit splats, health bars, death animations

### Equipment
- **7 slots**: Head, Body, Legs, Feet, Hands, Weapon, Offhand
- **Visual gear**: Equipment visible on character models
- **Tiers**: Bronze (Lv1), Iron (Lv10), Steel (Lv20)
- **NPC drops**: Goblins drop bronze, Guards drop iron

### Economy
- **Inventory**: 28 slots
- **Banking**: Secure storage
- **Shops**: Buy/sell equipment and supplies
- **Coins**: Universal currency

### Engagement Systems
- **Daily Challenges**: 3 rotating objectives with XP/coin rewards
- **Achievements**: Milestone tracking with titles and badges
- **XP Tracker**: Real-time XP/hour display

### Towns
**Thornwick** - The starting town (48x48 tiles)
- Thornwick Keep (northern castle)
- Bank, General Store, Blacksmith, The Rusty Sword Inn
- Central marketplace with fountain and market stalls
- Perimeter walls with guarded south gate
- **Veil Rift** near the fountain - portal to expeditions
- Fishing pond, trees, cooking facilities

## Available Scripts

```bash
# Development
pnpm dev              # Start client + server
pnpm dev:client       # Client only (localhost:5173)
pnpm dev:server       # Server only (ws://localhost:2567)

# Build & Quality
pnpm build            # Build all packages
pnpm typecheck        # TypeScript checking
pnpm lint             # ESLint
pnpm format           # Prettier
```

## Architecture

### State Synchronization
- Initial data via WebSocket messages (`playerData`, `worldObjects`)
- Real-time updates via Colyseus schema sync
- Expedition state managed server-side with client callbacks

### World Generation
- **Towns**: Data-driven, hand-designed areas
- **Wilderness**: Procedural terrain with noise-based biomes
- **Veil Rifts**: Entry points to expedition instances

### Dimension System
The game supports two visual modes:
- **Surface**: Normal world with light fog, dust particles
- **Veil**: Dark dimension with purple fog, glowing particles, post-processing

## Database

PostgreSQL with Drizzle ORM:
- `players` - Account data
- `player_skills` - XP per skill
- `player_inventory` - Items
- `player_bank` - Banked items
- `player_equipment` - Equipped gear
- `player_stats` - Lifetime statistics
- `player_achievements` - Earned achievements
- `player_daily_challenges` - Challenge progress

Server runs in non-persistent mode if database unavailable.

## Development Roadmap

### Completed
- [x] Core movement and multiplayer
- [x] Skill system (24 skills)
- [x] Combat system
- [x] Equipment with visual display
- [x] Towns and procedural world
- [x] Banking and shops
- [x] Daily challenges and achievements
- [x] **Veil expedition system**
- [x] **Dimension visual transitions**

### In Progress
- [ ] Veil creatures and combat
- [ ] Veil-specific loot and resources
- [ ] Veil Anchors for securing loot mid-expedition

### Planned
- [ ] Additional towns and wilderness zones
- [ ] Mining and Smithing skills
- [ ] Quest system
- [ ] Player trading
- [ ] Guilds/clans

## License

Private - All rights reserved
