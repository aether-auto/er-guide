import { describe, expect, it } from 'vitest'
import { escapeHtml, smithingStoneHtml } from './markersUtil'

// Pure helpers — no DOM or Leaflet required, so the node environment is fine.

describe('escapeHtml', () => {
  it('escapes & < > "', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
    expect(escapeHtml('"quote"')).toBe('&quot;quote&quot;')
  })
  it('leaves safe strings unchanged', () => {
    expect(escapeHtml('Smithing Stone [1]')).toBe('Smithing Stone [1]')
  })
})

describe('smithingStoneHtml', () => {
  it('regular stone: has er-smith class, no --somber modifier', () => {
    const html = smithingStoneHtml('Smithing Stone [1]', false)
    expect(html).toContain('class="er-smith"')
    expect(html).not.toContain('er-smith--somber')
  })

  it('somber stone: has both er-smith and er-smith--somber', () => {
    const html = smithingStoneHtml('Somber Smithing Stone [1]', true)
    expect(html).toContain('class="er-smith er-smith--somber"')
  })

  it('includes the stone name in the label span', () => {
    const html = smithingStoneHtml('Ancient Dragon Smithing Stone', false)
    expect(html).toContain('<span class="er-smith-label">Ancient Dragon Smithing Stone</span>')
  })

  it('escapes special characters in the name', () => {
    const html = smithingStoneHtml('<test> & "stuff"', false)
    expect(html).not.toContain('<test>')
    expect(html).toContain('&lt;test&gt; &amp; &quot;stuff&quot;')
  })

  it('produces valid HTML structure', () => {
    const html = smithingStoneHtml('Stone', false)
    expect(html).toMatch(/^<div class="er-smith"><span class="er-smith-label">.*<\/span><\/div>$/)
  })
})
