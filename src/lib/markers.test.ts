import { describe, expect, it } from 'vitest'
import { escapeHtml, smithingStoneHtml, parseSmithLevel, parseSmithAncient, parseSmithKind } from './markersUtil'

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

  it('checked stone: has er-smith--checked class', () => {
    const html = smithingStoneHtml('Smithing Stone [1]', false, true)
    expect(html).toContain('er-smith--checked')
  })

  it('checked somber stone: has all three modifier classes', () => {
    const html = smithingStoneHtml('Somber Smithing Stone [5]', true, true)
    expect(html).toContain('er-smith er-smith--somber er-smith--checked')
  })

  it('unchecked stone: does not have er-smith--checked class', () => {
    const html = smithingStoneHtml('Smithing Stone [1]', false, false)
    expect(html).not.toContain('er-smith--checked')
  })
})

describe('parseSmithLevel', () => {
  it('extracts level 1-9 from bracket notation', () => {
    expect(parseSmithLevel('Smithing Stone [1]')).toBe(1)
    expect(parseSmithLevel('Somber Smithing Stone [7]')).toBe(7)
    expect(parseSmithLevel('Smithing Stone [9]')).toBe(9)
  })

  it('extracts level when followed by location suffix', () => {
    expect(parseSmithLevel('Smithing Stone [2] - Castle Morne')).toBe(2)
    expect(parseSmithLevel('Smithing Stone [1] A - Fort Haight')).toBe(1)
  })

  it('returns null for ancient dragon stones (no bracket)', () => {
    expect(parseSmithLevel('Ancient Dragon Smithing Stone')).toBeNull()
    expect(parseSmithLevel('Somber Ancient Dragon Smithing Stone')).toBeNull()
  })

  it('returns null for names without bracket level', () => {
    expect(parseSmithLevel('Smithing Stone')).toBeNull()
  })
})

describe('parseSmithAncient', () => {
  it('returns true for Ancient Dragon Smithing Stone', () => {
    expect(parseSmithAncient('Ancient Dragon Smithing Stone')).toBe(true)
  })

  it('returns true for Somber Ancient Dragon Smithing Stone', () => {
    expect(parseSmithAncient('Somber Ancient Dragon Smithing Stone')).toBe(true)
  })

  it('returns true case-insensitively', () => {
    expect(parseSmithAncient('ancient dragon smithing stone')).toBe(true)
  })

  it('returns false for regular numbered smithing stones', () => {
    expect(parseSmithAncient('Smithing Stone [5]')).toBe(false)
    expect(parseSmithAncient('Somber Smithing Stone [3]')).toBe(false)
  })
})

describe('parseSmithKind', () => {
  it('returns "somber" for somber stones', () => {
    expect(parseSmithKind('Somber Smithing Stone [1]')).toBe('somber')
    expect(parseSmithKind('Somber Ancient Dragon Smithing Stone')).toBe('somber')
  })

  it('returns "regular" for regular stones', () => {
    expect(parseSmithKind('Smithing Stone [3]')).toBe('regular')
    expect(parseSmithKind('Ancient Dragon Smithing Stone')).toBe('regular')
  })

  it('is case-insensitive for somber check', () => {
    expect(parseSmithKind('SOMBER Smithing Stone [1]')).toBe('somber')
  })
})
