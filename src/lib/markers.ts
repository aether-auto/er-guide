import L from 'leaflet'
import type { Category } from './types'

// ─── Category glyph + ring colour ──────────────────────────────────────────
// Glyphs chosen for quick recognition at 28px; ring color is the CSS value for
// the marker border ring. Checked markers are desaturated via CSS filter.

export const CATEGORY_GLYPH: Record<Category, string> = {
  weapon: '⚔',
  shield: '🛡',
  ammo: '🏹',
  armor: '🦺',
  talisman: '◉',
  sorcery: '✦',
  incantation: '🔥',
  'ash-of-war': '🌀',
  'spirit-ash': '👻',
  'key-item': '🗝',
  'golden-seed': '🌱',
  'sacred-tear': '💧',
  'crystal-tear': '⚗',
  'memory-stone': '🧠',
  'larval-tear': '🫧',
  whetblade: '🔧',
  'stonesword-key': '🗡',
  'bell-bearing': '🔔',
  cookbook: '📖',
  'map-fragment': '🗺',
  'great-rune': '#',
  remembrance: '☽',
  'scadutree-fragment': '🌳',
  'revered-spirit-ash': '✨',
  tool: '🛠',
}

export const CATEGORY_COLOR: Record<Category, string> = {
  weapon: '#e07b54',
  shield: '#8baacc',
  ammo: '#b0a87c',
  armor: '#8baacc',
  talisman: '#9b7fd4',
  sorcery: '#6fa8dc',
  incantation: '#e8885a',
  'ash-of-war': '#78c89b',
  'spirit-ash': '#b0b0d0',
  'key-item': '#c8a55a', // gold — key items are highlighted
  'golden-seed': '#d4b04a',
  'sacred-tear': '#7ec8e3',
  'crystal-tear': '#a8d8a8',
  'memory-stone': '#cc99cc',
  'larval-tear': '#a0d0a0',
  whetblade: '#b0a87c',
  'stonesword-key': '#b0c8e0',
  'bell-bearing': '#e8c87a',
  cookbook: '#c8a55a',
  'map-fragment': '#88c888',
  'great-rune': '#e8b84b',
  remembrance: '#d4a0d0',
  'scadutree-fragment': '#90cc80',
  'revered-spirit-ash': '#e0d090',
  tool: '#a0a098',
}

// ─── divIcon builders ────────────────────────────────────────────────────────

export type MarkerVariant = 'normal' | 'checked' | 'nextup'

/**
 * Circular 28px category pin, Map-Genie style.
 * Variant styling is pure CSS — the map just swaps the class on the icon element.
 */
export function categoryIcon(category: Category, variant: MarkerVariant = 'normal'): L.DivIcon {
  const glyph = CATEGORY_GLYPH[category]
  const color = CATEGORY_COLOR[category]
  const cls = `er-pin er-pin--${variant}`
  return L.divIcon({
    html: `<div class="${cls}" style="--pin-color:${color}">${glyph}</div>`,
    className: '', // suppress Leaflet's default .leaflet-div-icon white square
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

/**
 * Gold radial-glow grace marker, styled to look like the Fextralife/MapGenie
 * Site of Grace dot.
 */
export function graceIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div class="er-grace"></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}
