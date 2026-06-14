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
export function smithingStoneHtml(name: string, somber: boolean): string {
  const cls = somber ? 'er-smith er-smith--somber' : 'er-smith'
  return `<div class="${cls}"><span class="er-smith-label">${escapeHtml(name)}</span></div>`
}
