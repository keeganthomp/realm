# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Realm is a 2D browser MMO inspired by RuneScape, built with a modern TypeScript stack. The game features click-to-move navigation, skill progression (23 skills modeled after OSRS), equipment systems, and real-time multiplayer.

## Tech Stack

| Technology | Version |
|------------|---------|
| PixiJS | v8.6.0 |
| React | v19.0.0 |
| Colyseus | v0.17.8 |
| @colyseus/schema | v4.0.7 |
| PostgreSQL | v16 |
| Drizzle ORM | v0.45.1 |
| Vite | v6.0.0 |
| TypeScript | v5.9.3 |
| ESLint | v9.39.2 |
| Prettier | v3.8.1 |

## Commands

```bash
# Install dependencies
pnpm install

# Start PostgreSQL (required for persistence)
docker-compose up -d

# Start both client and server in dev mode
pnpm dev

# Start only client (Vite at localhost:5173)
pnpm dev:client

# Start only server (Colyseus at ws://localhost:2567)
pnpm dev:server

# Build all packages (builds shared first, then client/server)
pnpm build

# Type checking
pnpm typecheck

# Linting and formatting
pnpm lint             # Check for ESLint issues
pnpm lint:fix         # Auto-fix ESLint issues
pnpm format           # Format all files with Prettier
pnpm format:check     # Check formatting without writing
```

## Architecture

### Monorepo Structure (pnpm workspaces)

- **`packages/client`** - PixiJS v8 game client with React UI, bundled by Vite
- **`packages/server`** - Colyseus multiplayer server with TypeScript schemas
- **`packages/shared`** - Common types, constants, and formulas used by both client and server

### Client Architecture (`packages/client`)

The client uses a hybrid approach: **PixiJS for game rendering** and **React for UI overlays**.

**Core classes:**
- `Game.ts` - Main game controller. Manages PixiJS Application, container hierarchy, input handling, and game loop. Exposes callbacks (`onLocalPlayerMove`, `onWorldObjectClick`) for network layer.
- `NetworkManager.ts` - Colyseus client wrapper. Syncs state between server and Game, exposes callbacks for React UI updates.

**Entity system:**
- `entities/Player.ts` - Local player with A* pathfinding movement
- `entities/RemotePlayer.ts` - Interpolated remote players
- `entities/WorldObjectEntity.ts` - Trees, fishing spots, fires

**Rendering systems:**
- `systems/TilemapRenderer.ts` - Procedural tilemap with collision grid
- `systems/Camera.ts` - Viewport management with world bounds clamping
- `systems/Pathfinding.ts` - EasyStar.js A* wrapper

### Server Architecture (`packages/server`)

**Colyseus room-based architecture:**
- `rooms/WorldRoom.ts` - Main game room handling movement, actions, chat, and respawn logic

**Schemas (Colyseus state sync):**
- `schemas/WorldState.ts` - Root state containing players and world objects
- `schemas/Player.ts` - Player state including position, skills (MapSchema), inventory (ArraySchema), and current action
- `schemas/WorldObject.ts` - Trees, fishing spots with depletion/respawn

### Shared Package (`packages/shared`)

- `index.ts` - Core types (Position, Direction, TilePosition), tile constants (TILE_SIZE=32), coordinate conversion functions
- `skills.ts` - 23 skill definitions, OSRS-style XP formulas (`getXpForLevel`, `getLevelFromXp`)
- `items.ts` - ItemType enum and item definitions
- `worldObjects.ts` - WorldObjectType enum, action definitions (xp, duration, yields), cooking recipes

## Game Systems

### Movement
Click-to-move with A* pathfinding. Server is authoritative - client sends movement messages, server validates and broadcasts.

### Skill Actions
1. Player clicks world object (tree, fishing spot)
2. Client finds adjacent walkable tile via pathfinding
3. Player walks to object, then sends `startAction` message
4. Server validates level requirements, starts timer, grants XP/items on completion
5. Actions auto-repeat until object depletes or inventory fills

### State Synchronization
- **Initial state via messages**: Player data (`playerData` message) and world objects (`worldObjects` message) are sent directly via WebSocket messages on join for reliability
- **Real-time updates via Colyseus schemas**: Position updates, action states use schema sync with delta compression
- **Object updates via messages**: `objectUpdate` messages for depletion/respawn
- Server runs at 20 ticks/second
- Client interpolates remote player positions
- Auto-save to database every 30 seconds + on disconnect

## Key Patterns

- **Callbacks over events**: Game and NetworkManager communicate via function callbacks, not event emitters
- **MapSchema for skills**: Player skills stored as `MapSchema<SkillData>` keyed by SkillType string
- **Depleted objects**: WorldObjects have `depleted` boolean and `respawnAt` timestamp; server respawn tick checks these
- **Loading screen**: HTML-based initial loader in index.html, replaced by React LoadingScreen, hidden when game is ready

## Database

PostgreSQL with Drizzle ORM for persistence. Tables:
- `players` - Player accounts (id, username, timestamps)
- `player_skills` - XP per skill per player
- `player_inventory` - Items in player inventory

Schema defined in `packages/server/src/database/schema.ts`. Data is loaded on player join and saved on player leave.

Server runs without database if unavailable (falls back to non-persistent mode).

## Assets

- `assets/sprites/` - Pixel art sprites (32x32 or 48x48)
- `assets/tilemaps/` - Tiled editor JSON exports (not yet implemented, using procedural)
- `assets/audio/` - Sound effects and music
