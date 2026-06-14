/**
 * itemDetails.ts — helpers for rendering ItemDetails stat blocks.
 *
 * Two entry points:
 *  • buildDetailsHtml(details, category)  — returns an HTML string for
 *    use in Leaflet popup's innerHTML (imperative DOM, no React).
 *  • detailsHtmlForPanel(details, category) — same content, panel variant
 *    CSS class so spacing is tighter.
 */

import type { ItemDetails, Category, StatPair, ScalingPair } from './types'

// ── HTML escape ────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Scaling grade → CSS class ─────────────────────────────────────────────

function scalingClass(grade: string): string {
  const g = grade.trim().toUpperCase()
  if (g === 'S') return 'er-scaling-s'
  if (g === 'A') return 'er-scaling-a'
  if (g === 'B') return 'er-scaling-b'
  if (g === 'C') return 'er-scaling-c'
  if (g === 'D') return 'er-scaling-d'
  return 'er-scaling-e'
}

// ── Inner HTML builder (shared; outer wrapper added by caller) ─────────────

function buildInner(details: ItemDetails, _category: Category): string {
  const parts: string[] = []

  // 1. Description (italic)
  if (details.description) {
    parts.push(`<p class="er-item-details__desc">${esc(details.description)}</p>`)
  }

  const statsRows: string[] = []

  // Helper: emit a section label + stat rows
  const section = (label: string, rows: string[]) => {
    if (rows.length === 0) return
    statsRows.push(`<div class="er-item-details__section-label">${esc(label)}</div>`)
    statsRows.push(...rows)
  }

  const statRow = (name: string, val: string): string =>
    `<div class="er-item-details__stat">` +
    `<span class="er-item-details__stat-name">${esc(name)}</span>` +
    `<span class="er-item-details__stat-val">${esc(val)}</span>` +
    `</div>`

  // 2. Attack
  if (details.attack && details.attack.length > 0) {
    section('Attack', details.attack.map((s: StatPair) => statRow(s.name, String(s.amount))))
  }

  // 3. Scaling
  if (details.scalesWith && details.scalesWith.length > 0) {
    section(
      'Scaling',
      details.scalesWith.map((s: ScalingPair) =>
        `<div class="er-item-details__stat">` +
        `<span class="er-item-details__stat-name">${esc(s.name)}</span>` +
        `<span class="er-item-details__stat-val ${scalingClass(s.scaling)}">${esc(s.scaling)}</span>` +
        `</div>`,
      ),
    )
  }

  // 4. Required attributes
  if (details.requiredAttributes && details.requiredAttributes.length > 0) {
    section('Requires', details.requiredAttributes.map((s: StatPair) => statRow(s.name, String(s.amount))))
  }

  // 5. Armor damage negation
  if (details.dmgNegation && details.dmgNegation.length > 0) {
    section('Dmg Negation', details.dmgNegation.map((s: StatPair) => statRow(s.name, s.amount.toFixed(1))))
  }

  // 6. Armor resistance
  if (details.resistance && details.resistance.length > 0) {
    section('Resistance', details.resistance.map((s: StatPair) => statRow(s.name, String(s.amount))))
  }

  // 7. Spell attributes: cost / slots / requires
  if (details.cost != null || details.slots != null) {
    const spellRows: string[] = []
    if (details.cost != null) spellRows.push(statRow('FP Cost', String(details.cost)))
    if (details.slots != null) spellRows.push(statRow('Slots', String(details.slots)))
    section('Spell', spellRows)
  }
  if (details.requires && details.requires.length > 0) {
    section('Requires', details.requires.map((s: StatPair) => statRow(s.name, String(s.amount))))
  }

  // 8. Spirit-ash FP / HP
  if (details.fpCost != null || details.hpCost != null) {
    const ashRows: string[] = []
    if (details.fpCost != null) ashRows.push(statRow('FP Cost', String(details.fpCost)))
    if (details.hpCost != null) ashRows.push(statRow('HP Cost', String(details.hpCost)))
    section('Summon', ashRows)
  }

  // 9. Ash-of-War affinity / skill
  if (details.affinity || details.skill) {
    const aowRows: string[] = []
    if (details.affinity) aowRows.push(statRow('Affinity', details.affinity))
    if (details.skill) aowRows.push(statRow('Skill', details.skill))
    section('Ash of War', aowRows)
  }

  // Effect (talismans, spirit ashes, generic)
  if (details.effect) {
    parts.push(
      `<p class="er-item-details__meta-row">${esc(details.effect)}</p>`,
    )
  }

  // Emit stats grid if any
  if (statsRows.length > 0) {
    parts.push(`<div class="er-item-details__stats">${statsRows.join('')}</div>`)
  }

  // Weight / meta
  if (details.weight != null) {
    parts.push(
      `<p class="er-item-details__meta-row">Weight: <span>${details.weight}</span></p>`,
    )
  }

  return parts.join('')
}

// ── Public API ─────────────────────────────────────────────────────────────

/** HTML string for the Leaflet popup (full-size card). */
export function buildDetailsHtml(details: ItemDetails, category: Category): string {
  const inner = buildInner(details, category)
  if (!inner) return ''
  return `<div class="er-item-details">${inner}</div>`
}

/** HTML string for the RoutePanel item row (compact variant). */
export function buildDetailsPanelHtml(details: ItemDetails, category: Category): string {
  const inner = buildInner(details, category)
  if (!inner) return ''
  return `<div class="er-item-details er-panel-details">${inner}</div>`
}
