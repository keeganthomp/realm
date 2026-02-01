# Equipment Slots Implementation Plan

## Overview
Add a 7-slot equipment system (head, body, legs, feet, hands, weapon, offhand) with combat bonuses, following OSRS patterns.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Schema type | Individual typed properties | Fixed slots, better type safety, simpler 2H logic |
| Bonus formula | Additive bonuses → OSRS formulas | Matches OSRS, simple to balance |
| Database | Separate `player_equipment` table | Matches existing patterns, cleaner queries |
| Sync strategy | Schema + explicit messages | Automatic visual sync + immediate UI feedback |
| Performance | Cache bonuses, invalidate on change | O(1) combat tick lookups |

---

## Phase 1: Shared Types ✅ COMPLETE

### 1.1 Created `packages/shared/src/equipment.ts`
- `EquipmentSlot` enum (head, body, legs, feet, hands, weapon, offhand)
- `EquipmentBonuses` interface
- `EquipmentDefinition` interface with bonuses, requirements, twoHanded flag
- `EQUIPMENT_DEFINITIONS` lookup table for bronze/iron/steel tiers
- Helper functions: `isEquippable`, `getEquipmentDefinition`, `calculateTotalBonuses`, `getEquipmentSlot`, `isTwoHanded`, `getEquipmentRequirements`

### 1.2 Updated `packages/shared/src/items.ts`
- Added 18 equipment ItemTypes:
  - Bronze: sword, shield, helmet, chestplate, legs
  - Iron: sword, shield, helmet, chestplate, legs
  - Steel: sword, 2H sword, shield, helmet, chestplate, legs
  - Basic: wooden shield, leather body
- Added ITEM_DEFINITIONS for all equipment

### 1.3 Updated `packages/shared/src/combat.ts`
- `calculateHitChance(attackLevel, attackBonus, defenceLevel, defenceBonus)` - now uses equipment bonuses
- `calculateMaxHit(strengthLevel, strengthBonus)` - OSRS-style formula with equipment bonus

### 1.4 Updated `packages/shared/src/index.ts`
- Exported equipment module

---

## Phase 2: Server Schema & Database ✅ COMPLETE

### 2.1 Updated `packages/server/src/schemas/Player.ts`
- Added `EquippedItem` schema class
- Added 7 equipment slot properties: `equipHead`, `equipBody`, `equipLegs`, `equipFeet`, `equipHands`, `equipWeapon`, `equipOffhand`
- Added cached bonus fields (server-only, not synced): `cachedAttackBonus`, `cachedStrengthBonus`, `cachedDefenceBonus`, `bonusesDirty`

### 2.2 Updated `packages/server/src/database/schema.ts`
- Added `playerEquipment` table with playerId, slot, itemType

### 2.3 Updated `packages/server/src/database/index.ts`
- Added equipment to `PlayerData` interface
- Added `playerEquipment` table creation in `initDatabase`
- Added `loadPlayerEquipment` and `savePlayerEquipment` functions
- New players receive starter equipment (bronze sword, wooden shield, leather body)

---

## Phase 3: Server Logic ✅ COMPLETE

### 3.1 Updated `packages/server/src/rooms/WorldRoom.ts`

**Message Handlers:**
- `equipItem` - equip item from inventory
- `unequipItem` - unequip item to inventory

**Equipment Logic:**
- `handleEquipItem` - validates requirements, handles 2H logic, swaps with existing
- `handleUnequipItem` - moves equipped item to inventory
- `getEquippedItem` / `setEquippedItem` - slot accessors
- `getPlayerEquipmentMap` - converts equipment to map for bonus calculation
- `getPlayerBonuses` - cached bonus lookup with dirty flag
- `sendEquipmentUpdate` - sends equipment + bonuses to client

**Combat Integration:**
- Player attacks use `attackBonus` and `strengthBonus` from equipment
- NPC attacks factor in player's `defenceBonus`
- Bonuses cached and invalidated on equipment change

**Persistence:**
- Equipment saved/loaded with player data
- Auto-save includes equipment

**Shop:**
- Weapons stall now sells bronze/iron equipment

---

## Phase 4: Client Integration ✅ COMPLETE

### 4.1 Updated `packages/client/src/systems/NetworkManager.ts`
- Added `onEquipmentChanged` callback
- Added `equipItem(inventoryIndex)` method
- Added `unequipItem(slot)` method
- Added `equipmentUpdate` message listener

### 4.2 Updated `packages/client/src/ui/InventoryPanel.tsx`
- Added `onEquipItem` prop
- Added "Equip" button in context menu for equippable items
- Added equipment item icons
- Exported `getItemIcon` for use in EquipmentPanel

### 4.3 Created `packages/client/src/ui/EquipmentPanel.tsx`
- Character silhouette layout with 7 equipment slots
- Click equipped item to unequip
- Displays equipment bonuses (attack, strength, defence)
- Medieval/fantasy themed styling matching other panels

### 4.4 Updated `packages/client/src/ui/Sidebar.tsx`
- Added `'equipment'` to `PanelType`
- Added equipment button with sword icon

### 4.5 Updated `packages/client/src/App.tsx`
- Added `equipment` and `equipmentBonuses` state
- Added `onEquipmentChanged` callback
- Added `handleEquipItem` and `handleUnequipItem` handlers
- Rendered `EquipmentPanel` in Sidebar

---

## Phase 5: Visual Equipment on Character 🔜 PLANNED

### Overview
Display equipped items visually on the player's 3D character model in-game. When a player equips a sword, shield, or armor, other players should see it.

### 5.1 Equipment Mesh System

**Files to Create/Modify:**
- **NEW** `packages/client/src/entities/EquipmentMeshes.ts` - Equipment mesh definitions and creation
- `packages/client/src/entities/Player.ts` - Attach equipment meshes to local player
- `packages/client/src/entities/RemotePlayer.ts` - Attach equipment meshes to remote players

**Equipment Mesh Registry:**
```typescript
interface EquipmentMeshDefinition {
  itemType: ItemType
  slot: EquipmentSlot
  meshBuilder: (scene: Scene) => Mesh
  attachPoint: 'rightHand' | 'leftHand' | 'head' | 'body' | 'legs' | 'feet'
  offset?: Vector3
  rotation?: Vector3
  scale?: Vector3
}

const EQUIPMENT_MESHES: Record<ItemType, EquipmentMeshDefinition>
```

**Mesh Creation:**
- Swords: Elongated box or custom geometry, metallic material
- Shields: Rounded rectangle, attach to left hand/arm
- Helmets: Cap/dome shape on head
- Chestplate: Overlay on torso
- Legs: Overlay on legs mesh
- Material colors by tier: bronze (orange-brown), iron (gray), steel (silver-blue)

### 5.2 Attachment Points

**Add to Player mesh structure:**
```typescript
interface PlayerAttachPoints {
  rightHand: TransformNode  // Weapons
  leftHand: TransformNode   // Shields, offhand
  head: TransformNode       // Helmets
  torso: TransformNode      // Body armor
  legs: TransformNode       // Leg armor
  feet: TransformNode       // Boots (future)
}
```

**Implementation:**
- Create empty TransformNodes parented to player mesh
- Position relative to player's body parts
- Equipment meshes parent to these nodes
- Nodes animate with player (walk, attack animations)

### 5.3 Equipment Sync for Remote Players

**Server Changes:**
- Equipment already synced via Colyseus schema (`equipWeapon`, `equipBody`, etc.)
- No additional server changes needed

**Client Changes:**
- `RemotePlayer.ts`: Listen for equipment property changes
- Create/destroy equipment meshes when equipment changes
- Cache equipment meshes to avoid recreation on every frame

### 5.4 Equipment Change Handling

```typescript
// In Player.ts and RemotePlayer.ts
private equipmentMeshes: Map<EquipmentSlot, Mesh> = new Map()

updateEquipment(slot: EquipmentSlot, itemType: ItemType | null) {
  // Remove old mesh
  const oldMesh = this.equipmentMeshes.get(slot)
  if (oldMesh) {
    oldMesh.dispose()
    this.equipmentMeshes.delete(slot)
  }

  // Create new mesh if equipped
  if (itemType) {
    const meshDef = EQUIPMENT_MESHES[itemType]
    if (meshDef) {
      const mesh = meshDef.meshBuilder(this.scene)
      mesh.parent = this.attachPoints[meshDef.attachPoint]
      mesh.position = meshDef.offset ?? Vector3.Zero()
      mesh.rotation = meshDef.rotation ?? Vector3.Zero()
      mesh.scaling = meshDef.scale ?? Vector3.One()
      this.equipmentMeshes.set(slot, mesh)
    }
  }
}
```

### 5.5 Animation Integration

**Weapon Animation:**
- Weapons follow hand during walk/idle animations
- Combat stance changes when weapon equipped
- Attack animation swings weapon

**Future Considerations:**
- Different attack animations per weapon type
- Two-handed weapon grip animation
- Shield block animation

### 5.6 Performance Considerations

- **Mesh Instancing:** Use instanced meshes for common equipment types
- **LOD:** Simplify equipment meshes at distance
- **Culling:** Don't render equipment on off-screen players
- **Material Sharing:** Share materials between same-tier equipment

### 5.7 Files Summary

| File | Changes |
|------|---------|
| NEW `EquipmentMeshes.ts` | Mesh definitions for all equipment types |
| `Player.ts` | Add attachment points, equipment mesh management |
| `RemotePlayer.ts` | Sync equipment visuals from server state |
| `NetworkManager.ts` | Pass equipment data to RemotePlayer on updates |

---

## Verification Checklist

### Phases 1-4 (Complete)
- [x] Equipment items appear in inventory
- [x] Right-click shows "Equip" option for equipment
- [x] Equipping moves item from inventory to equipment panel
- [x] Equipment panel shows all 7 slots
- [x] Click equipped item to unequip (returns to inventory)
- [x] Combat uses equipment bonuses (more damage with weapons)
- [x] Defence bonus reduces incoming damage
- [x] Two-handed weapons unequip offhand
- [x] Requirements checked before equipping
- [x] Equipment persists across sessions
- [x] New players start with bronze sword, wooden shield, leather body
- [x] Weapons stall sells equipment

### Phase 5 (Planned)
- [ ] Equipped weapons visible on player model
- [ ] Equipped shields visible on player model
- [ ] Equipped armor changes player appearance
- [ ] Remote players show correct equipment
- [ ] Equipment animates with player
- [ ] Performance acceptable with 50+ equipped players

---

## Future Enhancements

- **Ranged Equipment:** Bows, arrows, crossbows
- **Magic Equipment:** Staves, robes, amulets
- **Ring/Amulet Slots:** Add accessory slots
- **Set Bonuses:** Bonus for wearing full sets
- **Equipment Degradation:** Items wear down over time
- **Special Attacks:** Unique attacks per weapon
- **Equipment Dyes:** Cosmetic color changes
