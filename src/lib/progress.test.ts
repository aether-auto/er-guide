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

  it('notifies subscribers with a fresh snapshot reference', () => {
    const store = createProgressStore(fakeStorage())
    const before = store.getSnapshot()
    let calls = 0
    store.subscribe(() => calls++)
    store.toggle('x')
    expect(calls).toBe(1)
    expect(store.getSnapshot()).not.toBe(before)
  })
})
