import { describe, expect, it } from 'vitest'
import { createProgressStore } from './progress'

function fakeStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  }
}

describe('progress store', () => {
  it('starts empty and toggles items', () => {
    const store = createProgressStore(fakeStorage())
    expect(store.isChecked('x')).toBe(false)
    store.toggle('x')
    expect(store.isChecked('x')).toBe(true)
    store.toggle('x')
    expect(store.isChecked('x')).toBe(false)
  })

  it('persists across reloads', () => {
    const storage = fakeStorage()
    createProgressStore(storage).toggle('talisman-foo')
    const reloaded = createProgressStore(storage)
    expect(reloaded.isChecked('talisman-foo')).toBe(true)
  })

  it('backs up corrupt data instead of silently wiping', () => {
    const storage = fakeStorage({ 'er-guide-progress-v1': '{not json' })
    const store = createProgressStore(storage)
    expect(store.isChecked('x')).toBe(false)
    expect(store.getSnapshot().hasBackup).toBe(true)
    expect(storage.dump()['er-guide-progress-backup']).toBe('{not json')
  })

  it('profiles are independent and switching creates missing ones', () => {
    const store = createProgressStore(fakeStorage())
    store.toggle('x')
    store.switchProfile('ng-plus')
    expect(store.isChecked('x')).toBe(false)
    store.toggle('y')
    store.switchProfile('default')
    expect(store.isChecked('x')).toBe(true)
    expect(store.isChecked('y')).toBe(false)
    expect(store.getSnapshot().profiles.sort()).toEqual(['default', 'ng-plus'])
  })

  it('export/import round-trips', () => {
    const a = createProgressStore(fakeStorage())
    a.toggle('x')
    a.switchProfile('alt')
    a.toggle('y')
    const b = createProgressStore(fakeStorage())
    b.importJson(a.exportJson())
    expect(b.getSnapshot().activeProfile).toBe('alt')
    expect(b.isChecked('y')).toBe(true)
  })

  it('rejects invalid imports without changing state', () => {
    const store = createProgressStore(fakeStorage())
    store.toggle('x')
    expect(() => store.importJson('{"schemaVersion":99}')).toThrow()
    expect(() => store.importJson('garbage')).toThrow()
    expect(store.isChecked('x')).toBe(true)
  })

  it('snapshots are immutable: toggling does not mutate a previously captured snapshot', () => {
    const store = createProgressStore(fakeStorage())
    const snap = store.getSnapshot()
    store.toggle('x')
    expect(snap.checked['x']).toBeUndefined()
  })

  it('notifies subscribers with a fresh snapshot reference', () => {
    const store = createProgressStore(fakeStorage())
    const before = store.getSnapshot()
    let calls = 0
    store.subscribe(() => calls++)
    store.toggle('x')
    expect(calls).toBe(1)
    expect(store.getSnapshot()).not.toBe(before)
  })

  it('toggleIgnore marks item ignored and toggles back', () => {
    const store = createProgressStore(fakeStorage())
    expect(store.isIgnored('x')).toBe(false)
    store.toggleIgnore('x')
    expect(store.isIgnored('x')).toBe(true)
    store.toggleIgnore('x')
    expect(store.isIgnored('x')).toBe(false)
  })

  it('ignoring an item unchecks it; checking an item un-ignores it', () => {
    const store = createProgressStore(fakeStorage())
    store.toggle('x')
    expect(store.isChecked('x')).toBe(true)
    store.toggleIgnore('x') // ignore it
    expect(store.isChecked('x')).toBe(false) // unchecked
    expect(store.isIgnored('x')).toBe(true)

    store.toggle('x') // check it again
    expect(store.isChecked('x')).toBe(true)
    expect(store.isIgnored('x')).toBe(false) // un-ignored
  })

  it('loads old saves without ignored field — defaults to {}', () => {
    const oldSave = JSON.stringify({
      schemaVersion: 1,
      activeProfile: 'default',
      profiles: { default: { checked: { 'talisman-foo': 12345 } } },
    })
    const storage = fakeStorage({ 'er-guide-progress-v1': oldSave })
    const store = createProgressStore(storage)
    expect(store.isChecked('talisman-foo')).toBe(true)
    expect(store.isIgnored('any-id')).toBe(false)
    expect(store.getSnapshot().ignored).toEqual({})
    expect(store.getSnapshot().hasBackup).toBe(false) // old save loaded fine, no backup
  })

  it('importing old saves without ignored field works (parseSave accepts both)', () => {
    const store = createProgressStore(fakeStorage())
    const oldSave = JSON.stringify({
      schemaVersion: 1,
      activeProfile: 'alt',
      profiles: {
        default: { checked: {} },
        alt: { checked: { 'weapon-q': 7 } },
      },
    })
    store.importJson(oldSave)
    expect(store.getSnapshot().activeProfile).toBe('alt')
    expect(store.isChecked('weapon-q')).toBe(true)
    expect(store.getSnapshot().ignored).toEqual({})
  })

  it('ignored persists in export/import round-trip and across reloads', () => {
    const storageA = fakeStorage()
    const a = createProgressStore(storageA)
    a.toggleIgnore('weapon-foo')
    a.toggle('weapon-bar')
    // export → import into a fresh store
    const b = createProgressStore(fakeStorage())
    b.importJson(a.exportJson())
    expect(b.isIgnored('weapon-foo')).toBe(true)
    expect(b.isChecked('weapon-bar')).toBe(true)
    expect(b.isIgnored('weapon-bar')).toBe(false)
    // reload from the same storage
    const reloaded = createProgressStore(storageA)
    expect(reloaded.isIgnored('weapon-foo')).toBe(true)
  })

  it('ignored is per-profile', () => {
    const store = createProgressStore(fakeStorage())
    store.toggleIgnore('x')
    store.switchProfile('ng-plus')
    expect(store.isIgnored('x')).toBe(false)
    store.switchProfile('default')
    expect(store.isIgnored('x')).toBe(true)
  })
})
