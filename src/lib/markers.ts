import L from 'leaflet'
import type { Category } from './types'
import { escapeHtml, smithingStoneHtml } from './markersUtil'

export { escapeHtml, smithingStoneHtml } from './markersUtil'

// ─── Category glyph + ring colour ──────────────────────────────────────────
// Glyphs chosen for quick recognition at 28px; ring color is the CSS value for
// the marker border ring. Checked markers are desaturated via CSS filter.

export const CATEGORY_GLYPH: Record<Category, string> = {
  weapon: '⚔',      // sword — existing monochrome, keep
  shield: '⛨',      // heraldic shield (text/mono, replaces 🛡)
  ammo: '▷',        // arrow head — monochrome triangle
  armor: '▣',       // filled square-in-square (replaces 🦺)
  talisman: '◉',    // already monochrome, keep
  sorcery: '✦',     // already monochrome, keep
  incantation: '✹', // eight-spoked asterisk (replaces 🔥)
  'ash-of-war': '◈', // diamond with dot (replaces 🌀)
  'spirit-ash': '◇', // open diamond (replaces 👻)
  'key-item': '⚿',  // key-like (replaces 🗝)
  'golden-seed': '✿', // flower — monochrome (replaces 🌱)
  'sacred-tear': '▾', // downward triangle (replaces 💧)
  'crystal-tear': '⚗', // already monochrome, keep
  'memory-stone': '▪', // small square (replaces 🧠)
  'larval-tear': '○', // open circle (replaces 🫧)
  whetblade: '▬',   // rectangle / blade shape (replaces 🔧)
  'stonesword-key': '†', // dagger / sword (replaces 🗡)
  'bell-bearing': '◎', // bullseye / bell shape (replaces 🔔)
  cookbook: '≡',    // triple bar / pages (replaces 📖)
  'map-fragment': '⊞', // grid (replaces 🗺)
  'great-rune': '#', // already text, keep
  remembrance: '☽',  // already monochrome, keep
  'scadutree-fragment': '✤', // four-petalled (replaces 🌳)
  'revered-spirit-ash': '❋', // heavy florette — distinct from sorcery's ✦ (replaces ✨)
  tool: '⚙',        // gear — monochrome (replaces 🛠)
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

export type MarkerVariant = 'normal' | 'checked' | 'nextup' | 'ignored'

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
 * Site of Grace marker — soft muted-gold dot with a faint glow. Prominence
 * comes from its pane (above item pins) and its permanent name label, which
 * CSS reveals at zoom ≥5 (MapView toggles an `er-zoom-ge5` class on the map
 * container from its zoomend handler) — not from brightness.
 */
export function graceIcon(name: string): L.DivIcon {
  return L.divIcon({
    html: `<div class="er-grace"><span class="er-grace-label">${escapeHtml(name)}</span></div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

/**
 * Quiet landmark marker (towns, caves, catacombs, forts, churches…) — a small
 * muted diamond with a name label that CSS reveals at zoom ≥4. Deliberately
 * subdued so item pins dominate.
 */
export function locationIcon(name: string): L.DivIcon {
  return L.divIcon({
    html: `<div class="er-loc"><span class="er-loc-label">${escapeHtml(name)}</span></div>`,
    className: '',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

/**
 * Smithing stone marker — a small muted diamond that sits BELOW item pins
 * (in the 'er-smithing' pane). Somber stones get a purple tint vs the grey
 * steel of regular stones. Name label appears at zoom ≥5 (same band as graces).
 * Pass checked=true to render the dimmed + ✓ badge style.
 */
export function smithingStoneIcon(name: string, somber: boolean, checked = false): L.DivIcon {
  return L.divIcon({
    html: smithingStoneHtml(name, somber, checked),
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  })
}
