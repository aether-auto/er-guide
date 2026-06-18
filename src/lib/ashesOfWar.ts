// Ash of War (weapon-art) dataset for the build optimizer. GENERATED.
//
// Provenance: skill metadata (category, FP, element, status, AR-scaling,
// transferability) from EldenRingDatabase/erdb (SwordArtsParam + EquipParamGem,
// v1.10.0) cross-checked with the fan wikis; affinity / DLC / where-to-find merged
// from data/items.json; MOTION VALUES from the community "Elden Ring weapon
// motion value" datamine sheet (main-hit %, 100 = 1.0x the weapon's AR of that
// damage type). 98 skills, 57 with motion values.
//
// Weapon-art DAMAGE ~= host weapon AR x (motionValue / 100) for scaling:'weapon-ar'
// skills (single main hit; many skills hit multiple times). scaling:'flat' skills
// (Carian Greatsword, Hoarfrost Stomp, Glintblade Phalanx, ...) deal innate
// spell-like damage that does NOT scale from the weapon's AR (they scale with
// stats + weapon upgrade), so they carry no motionValue and are never multiplied
// by weapon AR. All damage is intrinsic / pre-Scadutree, consistent with the rest
// of the optimizer.

export type AowCategory =
  | 'Projectile' | 'AoE' | 'Melee/Burst' | 'Charge' | 'Dash/Evasion' | 'Stance/Counter' | 'Buff/Utility'
export type AowScaling = 'weapon-ar' | 'flat' | 'none'
export type AowElement = 'physical' | 'magic' | 'fire' | 'lightning' | 'holy' | 'mixed' | 'none'

export interface AshOfWar {
  skill: string
  category: AowCategory
  dealsDamage: boolean
  /** How the skill's damage scales (see file header). */
  scaling: AowScaling
  element: AowElement
  /** FP cost (string — a few skills list per-stage costs like '0/2/2'). */
  fp: string
  /** Main-hit motion value % (100 = 1.0x AR), where datamined; else undefined. */
  motionValue?: number
  status?: string
  transferable: boolean
  dlc: boolean
  /** Default affinity granted (from items.json). */
  affinity?: string
  /** Matching "Ash of War: …" item name, for where-to-find linking. */
  itemName?: string
  note?: string
}

export const ashesOfWar: AshOfWar[] = [
  { skill: 'Aspects of the Crucible: Wings', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '22', transferable: true, dlc: true, motionValue: 283, note: 'Sacred affinity; piercing thrust or spin (twinblades); DLC' },
  { skill: 'Assassin\'s Gambit', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '5', transferable: false, dlc: false, affinity: 'Occult', itemName: 'Ash of War: Assassin\'s Gambit', note: 'Near-invisibility + footstep silence; self-bleed HP cost' },
  { skill: 'Barbaric Roar', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '16', transferable: true, dlc: false, motionValue: 220, affinity: 'Heavy', itemName: 'Ash of War: Barbaric Roar', note: 'ATK buff; alters strong attacks to savages' },
  { skill: 'Barrage', category: 'Projectile', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '0/2/2', transferable: false, dlc: false, affinity: 'Standard', itemName: 'Ash of War: Barrage', note: 'Rapid consecutive bow shots; bows only' },
  { skill: 'Barricade Shield', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '12', transferable: false, dlc: false, affinity: 'Standard', itemName: 'Ash of War: Barricade Shield', note: 'Temporarily boosts guard stability' },
  { skill: 'Beast\'s Roar', category: 'AoE', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '10', transferable: true, dlc: false, affinity: 'Keen', itemName: 'Ash of War: Beast\'s Roar', note: 'AoE shockwave blast; no added element' },
  { skill: 'Black Flame Tornado', category: 'AoE', dealsDamage: true, scaling: 'flat', element: 'fire', fp: '30', transferable: false, dlc: false, affinity: 'Flame Art', itemName: 'Ash of War: Black Flame Tornado', note: 'Spinning black flame AoE; flat fire+DoT; scales faith+wep level' },
  { skill: 'Blinkbolt', category: 'Dash/Evasion', dealsDamage: true, scaling: 'weapon-ar', element: 'lightning', fp: '8', transferable: true, dlc: true, note: 'Lightning teleport dash; minimal dmg; i-frames; all melee; DLC' },
  { skill: 'Blood Blade', category: 'Projectile', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '3/3', transferable: true, dlc: false, motionValue: 55, status: 'blood', affinity: 'Blood', itemName: 'Ash of War: Blood Blade', note: 'Blood arc projectile; applies bleed' },
  { skill: 'Blood Tax', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '14', transferable: true, dlc: false, motionValue: 110, status: 'blood', affinity: 'Blood', itemName: 'Ash of War: Blood Tax', note: 'Multi-hit grab lifesteal; bleed buildup' },
  { skill: 'Bloodhound\'s Step', category: 'Dash/Evasion', dealsDamage: false, scaling: 'none', element: 'none', fp: '5', transferable: true, dlc: false, affinity: 'Keen', itemName: 'Ash of War: Bloodhound\'s Step', note: 'Long i-frame ghost dash' },
  { skill: 'Bloody Slash', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '6', transferable: true, dlc: false, status: 'blood', affinity: 'Blood', itemName: 'Ash of War: Bloody Slash', note: 'Downward slash+wave; self-chip 11% HP; bleed buildup' },
  { skill: 'Braggart\'s Roar', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '16', transferable: true, dlc: false, affinity: 'Heavy', itemName: 'Ash of War: Braggart\'s Roar', note: 'ATK buff roar; stacks with other buffs' },
  { skill: 'Carian Grandeur', category: 'Melee/Burst', dealsDamage: true, scaling: 'flat', element: 'magic', fp: '26', transferable: true, dlc: false, affinity: 'Magic', itemName: 'Ash of War: Carian Grandeur', note: 'Charged INT magic slam; uncharged/1-charge/2-charge; scales INT' },
  { skill: 'Carian Greatsword', category: 'Melee/Burst', dealsDamage: true, scaling: 'flat', element: 'magic', fp: '16', transferable: true, dlc: false, affinity: 'Magic', itemName: 'Ash of War: Carian Greatsword', note: 'INT magic sword swing; scales INT+wep level' },
  { skill: 'Carian Retaliation', category: 'Stance/Counter', dealsDamage: false, scaling: 'none', element: 'none', fp: '8', transferable: false, dlc: false, affinity: 'Magic', itemName: 'Ash of War: Carian Retaliation', note: 'Parries magic projectiles; creates glintblades' },
  { skill: 'Carian Sovereignty', category: 'AoE', dealsDamage: true, scaling: 'flat', element: 'magic', fp: '30/12', transferable: true, dlc: true, note: 'Large INT magic AoE; scales INT; DLC' },
  { skill: 'Charge Forth', category: 'Charge', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '16', transferable: false, dlc: false, motionValue: 145, affinity: 'Quality', itemName: 'Ash of War: Charge Forth', note: 'Running charge thrust' },
  { skill: 'Chilling Mist', category: 'AoE', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '14', transferable: true, dlc: false, motionValue: 170, status: 'frost', affinity: 'Cold', itemName: 'Ash of War: Chilling Mist', note: 'AoE frost mist; frost buildup' },
  { skill: 'Cragblade', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '16', transferable: true, dlc: false, motionValue: 100, affinity: 'Heavy', itemName: 'Ash of War: Cragblade', note: '+20% physical dmg bonus; no direct dmg; weapon slam anim' },
  { skill: 'Determination', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '10', transferable: true, dlc: false, affinity: 'Quality', itemName: 'Ash of War: Determination', note: '+60% next attack power' },
  { skill: 'Divine Beast Frost Stomp', category: 'AoE', dealsDamage: true, scaling: 'flat', element: 'magic', fp: '15', transferable: true, dlc: true, status: 'frost', note: 'Frost stomp similar to Hoarfrost; flat magic+frost; DLC' },
  { skill: 'Double Slash', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '6/3', transferable: true, dlc: false, motionValue: 145, affinity: 'Keen', itemName: 'Ash of War: Double Slash', note: 'Two quick slashes; chainable' },
  { skill: 'Dryleaf Whirlwind', category: 'AoE', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '9', transferable: true, dlc: true, motionValue: 140, note: 'Spinning fist AoE; hand-to-hand; DLC' },
  { skill: 'Earthshaker', category: 'AoE', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '10/5', transferable: false, dlc: false, motionValue: 140, affinity: 'Heavy', itemName: 'Ash of War: Earthshaker', note: 'Ground slam shockwave; hammers/colossal' },
  { skill: 'Enchanted Shot', category: 'Projectile', dealsDamage: true, scaling: 'flat', element: 'magic', fp: '0/8/8', transferable: false, dlc: false, affinity: 'Standard', itemName: 'Ash of War: Enchanted Shot', note: 'Magic-infused bow shot; scales INT' },
  { skill: 'Endure', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '9', transferable: true, dlc: false, affinity: 'Heavy', itemName: 'Ash of War: Endure', note: 'Hyper armor + temp damage reduction' },
  { skill: 'Eruption', category: 'AoE', dealsDamage: true, scaling: 'weapon-ar', element: 'fire', fp: '14', transferable: true, dlc: false, motionValue: 105, affinity: 'Fire', itemName: 'Ash of War: Eruption', note: 'Upward slam + fire geyser AoE' },
  { skill: 'Flame Skewer', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'fire', fp: '18/8', transferable: true, dlc: true, motionValue: 151, note: 'Chargeable fire thrusting attack; DLC' },
  { skill: 'Flame Spear', category: 'Projectile', dealsDamage: true, scaling: 'weapon-ar', element: 'fire', fp: '19', transferable: true, dlc: true, motionValue: 120, note: 'Chargeable fire spear thrust/projectile; DLC' },
  { skill: 'Flame of the Redmanes', category: 'AoE', dealsDamage: true, scaling: 'weapon-ar', element: 'fire', fp: '14', transferable: true, dlc: false, affinity: 'Fire', itemName: 'Ash of War: Flame of the Redmanes', note: 'Ground fire wave; excellent poise damage' },
  { skill: 'Flaming Strike', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'fire', fp: '4/10', transferable: true, dlc: false, motionValue: 178, affinity: 'Fire', itemName: 'Ash of War: Flaming Strike', note: 'Slash+fire follow-up; adds fire element' },
  { skill: 'Ghostflame Call', category: 'AoE', dealsDamage: true, scaling: 'flat', element: 'magic', fp: '15/10/10', transferable: true, dlc: true, motionValue: 80, status: 'frost', note: 'Cold ghostflame AoE wave; flat magic; DLC' },
  { skill: 'Giant Hunt', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '16', transferable: true, dlc: false, motionValue: 220, affinity: 'Quality', itemName: 'Ash of War: Giant Hunt', note: 'Upward slam; launches enemies; huge poise damage' },
  { skill: 'Glintblade Phalanx', category: 'Projectile', dealsDamage: true, scaling: 'flat', element: 'magic', fp: '10/4', transferable: true, dlc: false, motionValue: 160, affinity: 'Magic', itemName: 'Ash of War: Glintblade Phalanx', note: 'Orbiting magic blades auto-fire; flat magic dmg; scales INT' },
  { skill: 'Glintstone Pebble Skill', category: 'Projectile', dealsDamage: true, scaling: 'flat', element: 'magic', fp: '8/4', transferable: true, dlc: false, motionValue: 160, affinity: 'Magic', itemName: 'Ash of War: Glintstone Pebble', note: 'Magic projectile; scales INT; same as Glintstone Pebble sorcery' },
  { skill: 'Golden Land', category: 'AoE', dealsDamage: true, scaling: 'flat', element: 'holy', fp: '16/5', transferable: false, dlc: false, motionValue: 140, affinity: 'Sacred', itemName: 'Ash of War: Golden Land', note: 'Holy projectile rain; flat holy; scales faith' },
  { skill: 'Golden Parry', category: 'Stance/Counter', dealsDamage: false, scaling: 'none', element: 'none', fp: '4', transferable: false, dlc: false, affinity: 'Sacred', itemName: 'Ash of War: Golden Parry', note: 'Ranged golden flash parry' },
  { skill: 'Golden Vow', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '40', transferable: true, dlc: false, note: 'AoE ATK+DEF buff for self and allies' },
  { skill: 'Gravitas', category: 'AoE', dealsDamage: true, scaling: 'flat', element: 'magic', fp: '13', transferable: true, dlc: false, motionValue: 100, affinity: 'Magic', itemName: 'Ash of War: Gravitas', note: 'Gravity pull + 3 overlapping magic AoE hits; flat magic' },
  { skill: 'Ground Slam', category: 'AoE', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '14', transferable: true, dlc: false, affinity: 'Heavy', itemName: 'Ash of War: Ground Slam', note: 'Hammer ground slam + outer shockwave ~132' },
  { skill: 'Hoarfrost Stomp', category: 'AoE', dealsDamage: true, scaling: 'flat', element: 'magic', fp: '10', transferable: true, dlc: false, status: 'frost', affinity: 'Cold', itemName: 'Ash of War: Hoarfrost Stomp', note: 'Frost mist stomp; flat magic+frost; scales INT/DEX+wep level; nerfed 1.03' },
  { skill: 'Holy Ground', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '30', transferable: false, dlc: false, affinity: 'Sacred', itemName: 'Ash of War: Holy Ground', note: 'AoE golden regen field on ground' },
  { skill: 'Ice Spear', category: 'Projectile', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '15', transferable: false, dlc: false, motionValue: 80, status: 'frost', affinity: 'Cold', itemName: 'Ash of War: Ice Spear', note: 'Frost-coated spear; frost buildup on hit' },
  { skill: 'Igon\'s Drake Hunt', category: 'Projectile', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '0', transferable: true, dlc: true, note: 'Anti-dragon ranged; DLC' },
  { skill: 'Impaling Thrust', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '9', transferable: true, dlc: false, motionValue: 187, affinity: 'Keen', itemName: 'Ash of War: Impaling Thrust', note: 'Shield-piercing thrust; good poise damage' },
  { skill: 'Kick', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '0', transferable: true, dlc: false, motionValue: 30, affinity: 'Heavy', itemName: 'Ash of War: Kick', note: 'Basic kick; low dmg; staggers; 0 FP' },
  { skill: 'Lifesteal Fist', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '14', transferable: false, dlc: false, affinity: 'Occult', itemName: 'Ash of War: Lifesteal Fist', note: 'Grab attack; drains HP from enemy' },
  { skill: 'Lightning Ram', category: 'Charge', dealsDamage: true, scaling: 'weapon-ar', element: 'lightning', fp: '5/5', transferable: true, dlc: false, affinity: 'Lightning', itemName: 'Ash of War: Lightning Ram', note: 'Lightning-charged rolling body slam; lightning element' },
  { skill: 'Lion\'s Claw', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '20', transferable: true, dlc: false, motionValue: 240, affinity: 'Heavy', itemName: 'Ash of War: Lion\'s Claw', note: 'Backflip slam; hyper armor; posture break; top-tier AoW' },
  { skill: 'Loretta\'s Slash', category: 'Melee/Burst', dealsDamage: true, scaling: 'flat', element: 'magic', fp: '14', transferable: false, dlc: false, motionValue: 172, affinity: 'Magic', itemName: 'Ash of War: Loretta\'s Slash', note: 'Magic slash + crystal burst; flat magic component' },
  { skill: 'Mighty Shot', category: 'Projectile', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '0/6/6', transferable: false, dlc: false, affinity: 'Standard', itemName: 'Ash of War: Mighty Shot', note: 'Charged heavy bow shot; bows only' },
  { skill: 'Moonlight Greatsword', category: 'Buff/Utility', dealsDamage: true, scaling: 'weapon-ar', element: 'magic', fp: '32', transferable: false, dlc: false, motionValue: 53, note: 'Adds magic to weapon + fires waves; unique to Dark Moon GS' },
  { skill: 'Palm Blast', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '14', transferable: true, dlc: true, motionValue: 460, note: 'Chargeable point-blank palm strike; DLC' },
  { skill: 'Phantom Slash', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '8/8', transferable: false, dlc: false, motionValue: 137, affinity: 'Quality', itemName: 'Ash of War: Phantom Slash', note: 'Teleport + combo slashes' },
  { skill: 'Piercing Fang', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '16', transferable: true, dlc: false, motionValue: 212, affinity: 'Keen', itemName: 'Ash of War: Piercing Fang', note: 'Thrusting strike ignoring shields/guard' },
  { skill: 'Piercing Throw', category: 'Projectile', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '6', transferable: true, dlc: true, motionValue: 175, note: 'Thrown spear projectile; thrusting spears; DLC' },
  { skill: 'Poison Moth Flight', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '7', transferable: false, dlc: false, motionValue: 125, status: 'poison', affinity: 'Poison', itemName: 'Ash of War: Poison Moth Flight', note: 'Leaping downward slash; poison buildup' },
  { skill: 'Prelate\'s Charge', category: 'Charge', dealsDamage: true, scaling: 'weapon-ar', element: 'fire', fp: '7/7', transferable: false, dlc: false, motionValue: 100, affinity: 'Flame', itemName: 'Ash of War: Prelate\'s Charge', note: 'Fire-charged hammer running slam; fire element' },
  { skill: 'Quickstep', category: 'Dash/Evasion', dealsDamage: false, scaling: 'none', element: 'none', fp: '3', transferable: true, dlc: false, affinity: 'Keen', itemName: 'Ash of War: Quickstep', note: 'Quick i-frame dash step' },
  { skill: 'Raging Beast', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '7/7', transferable: true, dlc: true, motionValue: 160, note: 'Beast rush + claw combo; DLC' },
  { skill: 'Raptor of the Mists', category: 'Stance/Counter', dealsDamage: false, scaling: 'none', element: 'none', fp: '6', transferable: true, dlc: false, affinity: 'Keen', itemName: 'Ash of War: Raptor of the Mists', note: 'Upward dodge stance; counter attack follows' },
  { skill: 'Repeating Thrust', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '7', transferable: true, dlc: false, motionValue: 115, affinity: 'Keen', itemName: 'Ash of War: Repeating Thrust', note: 'Rapid repeated thrusts; chainable' },
  { skill: 'Rolling Sparks', category: 'AoE', dealsDamage: true, scaling: 'weapon-ar', element: 'lightning', fp: '14', transferable: true, dlc: true, motionValue: 82, note: 'Rolling lightning ball; DLC' },
  { skill: 'Royal Knight\'s Resolve', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '15', transferable: true, dlc: false, affinity: 'Quality', itemName: 'Ash of War: Royal Knight\'s Resolve', note: '+80% next attack power (higher than Determination)' },
  { skill: 'Sacred Blade', category: 'Projectile', dealsDamage: true, scaling: 'weapon-ar', element: 'holy', fp: '19', transferable: true, dlc: false, motionValue: 65, affinity: 'Sacred', itemName: 'Ash of War: Sacred Blade', note: 'Launches holy wave projectile from blade' },
  { skill: 'Sacred Order', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '18', transferable: true, dlc: false, affinity: 'Sacred', itemName: 'Ash of War: Sacred Order', note: 'Adds temporary holy to weapon' },
  { skill: 'Sacred Ring of Light', category: 'Projectile', dealsDamage: true, scaling: 'flat', element: 'holy', fp: '9/9', transferable: false, dlc: false, motionValue: 65, affinity: 'Sacred', itemName: 'Ash of War: Sacred Ring of Light', note: 'Two holy ring projectiles; flat holy; scales faith' },
  { skill: 'Savage Claws', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '13', transferable: true, dlc: true, motionValue: 102, note: 'Claw swipe combo; DLC' },
  { skill: 'Savage Lion\'s Claw', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '20/10', transferable: true, dlc: true, motionValue: 195, note: '3-hit rolling slam; Heavy affinity; swords/axes/hammers; DLC' },
  { skill: 'Scattershot Throw', category: 'Projectile', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '11', transferable: true, dlc: true, motionValue: 88, note: 'Multi-projectile scatter throw; DLC' },
  { skill: 'Seppuku', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '4', transferable: true, dlc: false, status: 'blood', affinity: 'Blood', itemName: 'Ash of War: Seppuku', note: 'Self-impale: +blood buildup, +ATK; no actual weapon-to-enemy dmg' },
  { skill: 'Shared Order', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '20', transferable: true, dlc: false, note: 'AoE holy buff; shares buffs to allies' },
  { skill: 'Shield Bash', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '10', transferable: false, dlc: false, motionValue: 150, affinity: 'Standard', itemName: 'Ash of War: Shield Bash', note: 'Shield slam; stagger' },
  { skill: 'Shriek of Sorrow', category: 'AoE', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '19', transferable: true, dlc: true, note: 'Shockwave scream burst; DLC' },
  { skill: 'Spectral Lance', category: 'Projectile', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '9', transferable: false, dlc: false, affinity: 'Occult', itemName: 'Ash of War: Spectral Lance', note: 'Thrown spectral spear projectile; Occult affinity' },
  { skill: 'Spinning Gravity Thrust', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '26/12', transferable: true, dlc: true, motionValue: 125, note: 'Spinning gravity thrust; Heavy; DLC' },
  { skill: 'Square Off', category: 'Stance/Counter', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '0/6/8', transferable: false, dlc: false, motionValue: 240, affinity: 'Quality', itemName: 'Ash of War: Square Off', note: 'Stance: L=horizontal slash, H=heavy thrust; straight swords' },
  { skill: 'Stamp (Sweep)', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '5/8', transferable: true, dlc: false, motionValue: 112, affinity: 'Heavy', itemName: 'Ash of War: Stamp (Sweep)', note: 'Stomp into wide horizontal sweep' },
  { skill: 'Stamp (Upward Cut)', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '5/8', transferable: true, dlc: false, motionValue: 215, affinity: 'Heavy', itemName: 'Ash of War: Stamp (Upward Cut)', note: 'Stomp into rising upward slash' },
  { skill: 'Storm Assault', category: 'Charge', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '22', transferable: false, dlc: false, motionValue: 200, affinity: 'Quality', itemName: 'Ash of War: Storm Assault', note: 'Rush forward with wind slashes; physical wind dmg' },
  { skill: 'Storm Blade', category: 'Projectile', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '10/6', transferable: true, dlc: false, motionValue: 67, affinity: 'Quality', itemName: 'Ash of War: Storm Blade', note: 'Fires vacuum blade projectile; physical wind' },
  { skill: 'Storm Stomp', category: 'AoE', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '6', transferable: true, dlc: false, affinity: 'Quality', itemName: 'Ash of War: Storm Stomp', note: 'Stomp shockwave; AoE around player' },
  { skill: 'Stormcaller', category: 'AoE', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '9/11', transferable: true, dlc: false, motionValue: 115, affinity: 'Quality', itemName: 'Ash of War: Stormcaller', note: 'Spinning wind cyclone AoE' },
  { skill: 'Swift Slash', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '16', transferable: false, dlc: true, motionValue: 160, note: 'Quick vacuum slash; Keen; backhand blades only; DLC' },
  { skill: 'The Poison Flower Blooms Twice', category: 'AoE', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '14', transferable: true, dlc: true, status: 'poison', note: 'Poison + rot AoE slam; DLC' },
  { skill: 'Thops\'s Barrier', category: 'Stance/Counter', dealsDamage: false, scaling: 'none', element: 'none', fp: '0', transferable: false, dlc: false, affinity: 'Magic', itemName: 'Ash of War: Thops\'s Barrier', note: 'Parries sorceries' },
  { skill: 'Thunderbolt', category: 'AoE', dealsDamage: true, scaling: 'weapon-ar', element: 'lightning', fp: '10/10', transferable: true, dlc: false, affinity: 'Lightning', itemName: 'Ash of War: Thunderbolt', note: 'Calls lightning strike from sky' },
  { skill: 'Transient Moonlight', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'magic', fp: '0/15/20', transferable: false, dlc: false, motionValue: 55, note: 'Stance: L=magic arc, H=long magic wave; unique to Moonveil katana' },
  { skill: 'Unsheathe', category: 'Stance/Counter', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '0/10/15', transferable: false, dlc: false, motionValue: 245, affinity: 'Keen', itemName: 'Ash of War: Unsheathe', note: 'Iaijutsu stance: L=fast slash, H=heavy slash; katanas only' },
  { skill: 'Vow of the Indomitable', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '20', transferable: false, dlc: false, affinity: 'Sacred', itemName: 'Ash of War: Vow of the Indomitable', note: 'Hyper armor + damage reduction sphere' },
  { skill: 'Wall of Sparks', category: 'AoE', dealsDamage: true, scaling: 'weapon-ar', element: 'lightning', fp: '16', transferable: true, dlc: true, motionValue: 55, note: 'Chargeable lightning wall; DLC' },
  { skill: 'War Cry', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '16', transferable: true, dlc: false, motionValue: 215, affinity: 'Heavy', itemName: 'Ash of War: War Cry', note: 'ATK buff; alters strong attacks' },
  { skill: 'Waterfowl Dance', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '12/9', transferable: false, dlc: false, motionValue: 150, status: 'blood', note: '10-hit flurry; 3 flurry sequences; unique to Hand of Malenia' },
  { skill: 'Waves of Darkness', category: 'AoE', dealsDamage: true, scaling: 'weapon-ar', element: 'magic', fp: '16/5', transferable: false, dlc: false, motionValue: 140, affinity: 'Magic', itemName: 'Ash of War: Waves of Darkness', note: 'Magic wave AoE burst; colossal swords' },
  { skill: 'White Shadow\'s Lure', category: 'Buff/Utility', dealsDamage: false, scaling: 'none', element: 'none', fp: '15', transferable: true, dlc: false, affinity: 'Occult', itemName: 'Ash of War: White Shadow\'s Lure', note: 'Decoy distraction; enemies chase lure' },
  { skill: 'Wild Strikes', category: 'Melee/Burst', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '2/10/15', transferable: true, dlc: false, motionValue: 243, affinity: 'Heavy', itemName: 'Ash of War: Wild Strikes', note: 'Rapid 6-hit rampage; low per-hit MV but fast' },
  { skill: 'Wing Stance', category: 'Stance/Counter', dealsDamage: true, scaling: 'weapon-ar', element: 'physical', fp: '0/8/10', transferable: false, dlc: true, motionValue: 251, note: 'Stance L=slash H=sweep; Quality; light greatswords only; DLC' },
]
