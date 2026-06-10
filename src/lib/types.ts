export type Category =
  | 'weapon' | 'shield' | 'ammo' | 'armor' | 'talisman'
  | 'sorcery' | 'incantation' | 'ash-of-war' | 'spirit-ash'
  | 'key-item' | 'golden-seed' | 'sacred-tear' | 'crystal-tear'
  | 'memory-stone' | 'larval-tear' | 'whetblade' | 'stonesword-key'
  | 'bell-bearing' | 'cookbook' | 'map-fragment' | 'great-rune'
  | 'remembrance' | 'scadutree-fragment' | 'revered-spirit-ash' | 'tool'

export const CATEGORY_META: Record<Category, { label: string; plural: string }> = {
  weapon: { label: 'Weapon', plural: 'Weapons' },
  shield: { label: 'Shield', plural: 'Shields' },
  ammo: { label: 'Ammo', plural: 'Ammunition' },
  armor: { label: 'Armor', plural: 'Armor' },
  talisman: { label: 'Talisman', plural: 'Talismans' },
  sorcery: { label: 'Sorcery', plural: 'Sorceries' },
  incantation: { label: 'Incantation', plural: 'Incantations' },
  'ash-of-war': { label: 'Ash of War', plural: 'Ashes of War' },
  'spirit-ash': { label: 'Spirit Ash', plural: 'Spirit Ashes' },
  'key-item': { label: 'Key Item', plural: 'Key Items' },
  'golden-seed': { label: 'Golden Seed', plural: 'Golden Seeds' },
  'sacred-tear': { label: 'Sacred Tear', plural: 'Sacred Tears' },
  'crystal-tear': { label: 'Crystal Tear', plural: 'Crystal Tears' },
  'memory-stone': { label: 'Memory Stone', plural: 'Memory Stones' },
  'larval-tear': { label: 'Larval Tear', plural: 'Larval Tears' },
  whetblade: { label: 'Whetblade', plural: 'Whetblades' },
  'stonesword-key': { label: 'Stonesword Key', plural: 'Stonesword Keys' },
  'bell-bearing': { label: 'Bell Bearing', plural: 'Bell Bearings' },
  cookbook: { label: 'Cookbook', plural: 'Cookbooks' },
  'map-fragment': { label: 'Map Fragment', plural: 'Map Fragments' },
  'great-rune': { label: 'Great Rune', plural: 'Great Runes' },
  remembrance: { label: 'Remembrance', plural: 'Remembrances' },
  'scadutree-fragment': { label: 'Scadutree Fragment', plural: 'Scadutree Fragments' },
  'revered-spirit-ash': { label: 'Revered Spirit Ash', plural: 'Revered Spirit Ashes' },
  tool: { label: 'Tool', plural: 'Tools' },
}

export type MapCode = 'overworld' | 'underground' | 'dlc'

export interface MapRef {
  code: MapCode
  markerId: number | null
  lat: number
  lng: number
}

export interface Missable {
  lockedBy: string
  note: string
}

export interface Item {
  id: string
  name: string
  category: Category
  dlc: boolean
  acquisition: string
  missable: Missable | null
  quest: string | null
  map: MapRef | null
  wikiUrl: string | null
}

export type Step =
  | { type: 'item'; itemId: string; note?: string }
  | { type: 'direction'; text: string }
  | { type: 'boss'; id: string; text: string; optional?: boolean }
  | { type: 'quest'; id: string; questline: string; text: string; missable?: Missable }

export interface Leg {
  id: string
  from: string
  to: string
  summary: string
  steps: Step[]
}

export interface Region {
  id: string
  name: string
  order: number
  dlc?: boolean
  legs: Leg[]
  cleanup: string[]
}
