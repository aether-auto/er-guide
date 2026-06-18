import { describe, expect, it } from 'vitest'
import { decodeSyncCode, encodeSyncCode, _encodeSyncCodeRaw } from './syncCode'

const sampleSave = JSON.stringify({
  schemaVersion: 1,
  activeProfile: 'default',
  profiles: {
    default: { checked: { 'talisman-foo': 12345, 'weapon-bar': 67890 }, ignored: { 'note-baz': 1 } },
    'ng-plus': { checked: {}, ignored: {} },
  },
})

describe('syncCode', () => {
  it('round-trips encode → decode (gzip path)', async () => {
    const code = await encodeSyncCode(sampleSave)
    expect(code).not.toContain('+')
    expect(code).not.toContain('/')
    expect(code).not.toContain('=')
    expect(await decodeSyncCode(code)).toBe(sampleSave)
  })

  it('round-trips via the forced raw (no-compression) path', async () => {
    const code = _encodeSyncCodeRaw(sampleSave)
    expect(await decodeSyncCode(code)).toBe(sampleSave)
  })

  it('rejects malformed input', async () => {
    await expect(decodeSyncCode('not valid base64!!!')).rejects.toThrow()
    await expect(decodeSyncCode('')).rejects.toThrow()
    await expect(decodeSyncCode('A')).rejects.toThrow() // too short to hold a prefix + body
  })

  it('rejects a gzip-prefixed code with corrupt body', async () => {
    const valid = await encodeSyncCode(sampleSave)
    // Corrupt by truncating the middle while keeping the (gzip) prefix byte.
    const corrupt = valid.slice(0, Math.max(4, Math.floor(valid.length / 2)))
    await expect(decodeSyncCode(corrupt)).rejects.toThrow()
  })

  it('round-trips a realistic large save (hundreds of ids)', async () => {
    const checked: Record<string, number> = {}
    const ignored: Record<string, number> = {}
    for (let i = 0; i < 400; i++) checked[`item-region-${i % 12}-${i}`] = 1_700_000_000_000 + i
    for (let i = 0; i < 60; i++) ignored[`ignored-item-${i}`] = 1_700_000_000_000 + i
    const big = JSON.stringify({
      schemaVersion: 1,
      activeProfile: 'default',
      profiles: { default: { checked, ignored } },
    })
    const code = await encodeSyncCode(big)
    expect(await decodeSyncCode(code)).toBe(big)
    // gzip should keep a few-hundred-id save well under the raw size.
    expect(code.length).toBeLessThan(big.length)
  })
})
