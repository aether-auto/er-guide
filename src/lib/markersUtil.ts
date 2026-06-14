/**
 * Pure HTML-generation helpers for map markers.
 * Split out from markers.ts so they can be unit-tested without a DOM
 * (markers.ts imports Leaflet at module level, which requires window).
 */

/** Escape a marker name for safe interpolation into divIcon HTML. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Generate the inner HTML for a smithing-stone divIcon. Exported for tests. */
export function smithingStoneHtml(name: string, somber: boolean, checked = false): string {
  let cls = somber ? 'er-smith er-smith--somber' : 'er-smith'
  if (checked) cls += ' er-smith--checked'
  return `<div class="${cls}"><span class="er-smith-label">${escapeHtml(name)}</span></div>`
}

// ── Smithing stone attribute parsing (exported for tests) ──────────────────

/** Extract upgrade level [1]-[9] from a stone name, or null for ancient/unknown. */
export function parseSmithLevel(name: string): number | null {
  const m = /\[(\d+)\]/.exec(name)
  return m ? parseInt(m[1], 10) : null
}

/** True for "Ancient Dragon Smithing Stone" (and Somber variant) — level-less top tier. */
export function parseSmithAncient(name: string): boolean {
  return /ancient dragon smithing stone/i.test(name)
}

/** kind field derived from name. */
export function parseSmithKind(name: string): 'somber' | 'regular' {
  return /somber/i.test(name) ? 'somber' : 'regular'
}
