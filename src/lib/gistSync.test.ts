import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildGistPayload,
  createDebouncer,
  createGistSync,
  extractGistContent,
  isGistNewer,
  parseConfig,
  serializeConfig,
} from './gistSync'

function fakeStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  }
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

describe('parseConfig', () => {
  it('returns null for null/empty storage value', () => {
    expect(parseConfig(null)).toBeNull()
    expect(parseConfig('')).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    expect(parseConfig('not-json')).toBeNull()
  })

  it('returns null if required fields are missing', () => {
    expect(parseConfig(JSON.stringify({ token: 'tok' }))).toBeNull()
    expect(parseConfig(JSON.stringify({ gistId: 'abc', lastSyncedAt: null }))).toBeNull()
  })

  it('returns parsed config for valid stored value', () => {
    const raw = JSON.stringify({ token: 'gho_xxx', gistId: 'abc123', lastSyncedAt: '2024-01-01T00:00:00Z' })
    expect(parseConfig(raw)).toEqual({ token: 'gho_xxx', gistId: 'abc123', lastSyncedAt: '2024-01-01T00:00:00Z' })
  })

  it('allows lastSyncedAt to be null', () => {
    const raw = JSON.stringify({ token: 'gho_xxx', gistId: 'abc123', lastSyncedAt: null })
    expect(parseConfig(raw)).toEqual({ token: 'gho_xxx', gistId: 'abc123', lastSyncedAt: null })
  })
})

describe('serializeConfig', () => {
  it('round-trips through parseConfig', () => {
    const cfg = { token: 'tok', gistId: 'g1', lastSyncedAt: '2024-06-01T00:00:00Z' }
    expect(parseConfig(serializeConfig(cfg))).toEqual(cfg)
  })
})

describe('isGistNewer', () => {
  it('returns false when lastSyncedAt is null (never synced)', () => {
    expect(isGistNewer('2024-06-01T00:00:00Z', null)).toBe(false)
  })

  it('returns true when gist updated_at is strictly after lastSyncedAt', () => {
    expect(isGistNewer('2024-06-02T00:00:00Z', '2024-06-01T00:00:00Z')).toBe(true)
  })

  it('returns false when gist updated_at equals lastSyncedAt', () => {
    expect(isGistNewer('2024-06-01T00:00:00Z', '2024-06-01T00:00:00Z')).toBe(false)
  })

  it('returns false when gist updated_at is older than lastSyncedAt', () => {
    expect(isGistNewer('2024-05-31T00:00:00Z', '2024-06-01T00:00:00Z')).toBe(false)
  })
})

// ── GitHub API response helpers ───────────────────────────────────────────────

describe('extractGistContent', () => {
  it('returns file content from a valid gist response', () => {
    const gistResponse = {
      id: 'abc',
      updated_at: '2024-06-01T00:00:00Z',
      files: {
        'er-guide-progress.json': { content: '{"schemaVersion":1}' },
      },
    }
    expect(extractGistContent(gistResponse)).toEqual({
      content: '{"schemaVersion":1}',
      updatedAt: '2024-06-01T00:00:00Z',
    })
  })

  it('returns null when the expected file is absent', () => {
    const gistResponse = { id: 'abc', updated_at: '2024-06-01T00:00:00Z', files: {} }
    expect(extractGistContent(gistResponse)).toBeNull()
  })

  it('returns null for a null/undefined response body', () => {
    expect(extractGistContent(null)).toBeNull()
    expect(extractGistContent(undefined)).toBeNull()
  })
})

describe('buildGistPayload', () => {
  it('builds a create payload (secret gist, with description)', () => {
    const payload = buildGistPayload('{"content":"x"}', false)
    expect(payload).toEqual({
      description: 'Elden Ring 100% guide progress — synced by er-guide',
      public: false,
      files: { 'er-guide-progress.json': { content: '{"content":"x"}' } },
    })
  })

  it('builds an update payload (no description/public)', () => {
    const payload = buildGistPayload('{"content":"y"}', true)
    expect(payload).toEqual({
      files: { 'er-guide-progress.json': { content: '{"content":"y"}' } },
    })
  })
})

// ── Debounce with injectable timer ────────────────────────────────────────────

describe('createDebouncer', () => {
  it('calls fn only after the delay when no more calls arrive', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounce = createDebouncer(fn, 3000)

    debounce()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(3000)
    expect(fn).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('resets timer on each call — only last triggers the fn', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounce = createDebouncer(fn, 3000)

    debounce()
    vi.advanceTimersByTime(1000)
    debounce()
    vi.advanceTimersByTime(1000)
    debounce()
    vi.advanceTimersByTime(2999)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('cancel() prevents the pending call', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounce = createDebouncer(fn, 3000)

    debounce()
    debounce.cancel()
    vi.advanceTimersByTime(3000)
    expect(fn).not.toHaveBeenCalled()

    vi.useRealTimers()
  })
})

// ── Factory: connect / disconnect / status ────────────────────────────────────

const VALID_GIST_LIST_RESPONSE = [
  {
    id: 'existing123',
    description: 'Elden Ring 100% guide progress — synced by er-guide',
    files: { 'er-guide-progress.json': { filename: 'er-guide-progress.json' } },
    updated_at: '2024-06-01T00:00:00Z',
  },
]

describe('createGistSync — connect', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('starts disconnected with no stored config', () => {
    const sync = createGistSync(fakeStorage())
    expect(sync.getStatus()).toEqual({ type: 'disconnected' })
  })

  it('restores idle status from stored config', () => {
    const storage = fakeStorage({
      'er-guide-gist-sync': JSON.stringify({ token: 'gho_tok', gistId: 'g1', lastSyncedAt: '2024-06-01T00:00:00Z' }),
    })
    const sync = createGistSync(storage)
    expect(sync.getStatus()).toEqual({ type: 'idle', gistId: 'g1', lastSyncedAt: '2024-06-01T00:00:00Z' })
  })

  it('connect(): finds existing er-guide gist and transitions to idle', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => VALID_GIST_LIST_RESPONSE,
    } as Response)

    const storage = fakeStorage()
    const sync = createGistSync(storage)
    const status = await sync.connect('gho_testtoken')

    expect(status.type).toBe('idle')
    if (status.type === 'idle') expect(status.gistId).toBe('existing123')
    // config persisted
    expect(parseConfig(storage.getItem('er-guide-gist-sync'))).toEqual({
      token: 'gho_testtoken',
      gistId: 'existing123',
      lastSyncedAt: null,
    })
  })

  it('connect(): creates a new secret gist when none exists', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response) // list → empty
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'new456',
          updated_at: '2024-06-01T00:00:00Z',
          files: { 'er-guide-progress.json': { content: '{}' } },
        }),
      } as Response) // create

    const sync = createGistSync(fakeStorage())
    const status = await sync.connect('gho_testtoken')

    expect(status.type).toBe('idle')
    if (status.type === 'idle') expect(status.gistId).toBe('new456')

    // second fetch call was a POST to /gists with a secret-gist payload
    const [url, init] = vi.mocked(fetch).mock.calls[1]
    expect(String(url)).toBe('https://api.github.com/gists')
    expect(init?.method).toBe('POST')
    const body = JSON.parse(String(init?.body))
    expect(body.public).toBe(false)
    expect(body.description).toBe('Elden Ring 100% guide progress — synced by er-guide')
  })

  it('connect(): returns error status on fetch rejection (offline)', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const sync = createGistSync(fakeStorage())
    const status = await sync.connect('gho_testtoken')

    expect(status.type).toBe('error')
    if (status.type === 'error') expect(status.message).toMatch(/Network error/)
  })

  it('connect(): returns error status on non-ok response (bad token)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    } as Response)

    const sync = createGistSync(fakeStorage())
    const status = await sync.connect('gho_badtoken')
    expect(status.type).toBe('error')
  })
})

describe('createGistSync — disconnect', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('clears config and reverts to disconnected (never calls DELETE)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => VALID_GIST_LIST_RESPONSE,
    } as Response)

    const storage = fakeStorage()
    const sync = createGistSync(storage)
    await sync.connect('gho_testtoken')
    expect(sync.getStatus().type).toBe('idle')

    sync.disconnect()
    expect(sync.getStatus().type).toBe('disconnected')
    expect(storage.getItem('er-guide-gist-sync')).toBeNull()
    // only the connect-time fetch happened; disconnect makes no API calls
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })
})

// ── Factory: pushNow / pullNow / checkCloudNewer ──────────────────────────────

describe('createGistSync — pushNow / pullNow', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  function connectedSync(lastSyncedAt: string | null = null) {
    const storage = fakeStorage({
      'er-guide-gist-sync': JSON.stringify({ token: 'gho_tok', gistId: 'g1', lastSyncedAt }),
    })
    return { sync: createGistSync(storage), storage }
  }

  it('pushNow(): PATCHes the gist and updates lastSyncedAt on success', async () => {
    const { sync, storage } = connectedSync()
    const saveJson = JSON.stringify({ schemaVersion: 1, activeProfile: 'default', profiles: { default: { checked: {} } } })

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'g1',
        updated_at: '2024-06-05T00:00:00Z',
        files: { 'er-guide-progress.json': { content: saveJson } },
      }),
    } as Response)

    const result = await sync.pushNow(saveJson)
    expect(result.type).toBe('idle')
    if (result.type === 'idle') expect(result.lastSyncedAt).toBe('2024-06-05T00:00:00Z')

    // PATCH to the right URL
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toBe('https://api.github.com/gists/g1')
    expect(init?.method).toBe('PATCH')

    // persisted to storage
    const stored = JSON.parse(storage.getItem('er-guide-gist-sync')!)
    expect(stored.lastSyncedAt).toBe('2024-06-05T00:00:00Z')
  })

  it('pushNow(): returns error status when not connected', async () => {
    const sync = createGistSync(fakeStorage())
    const result = await sync.pushNow('{}')
    expect(result.type).toBe('error')
  })

  it('pushNow(): returns error status on fetch failure, never throws', async () => {
    const { sync } = connectedSync()
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))
    const result = await sync.pushNow('{}')
    expect(result.type).toBe('error')
  })

  it('pullNow(): GETs the gist and calls importFn with its content', async () => {
    const { sync, storage } = connectedSync()
    const saveJson = JSON.stringify({ schemaVersion: 1, activeProfile: 'default', profiles: { default: { checked: { 'item-1': 1234567890 } } } })
    const importFn = vi.fn()

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'g1',
        updated_at: '2024-06-05T00:00:00Z',
        files: { 'er-guide-progress.json': { content: saveJson } },
      }),
    } as Response)

    const result = await sync.pullNow(importFn)
    expect(importFn).toHaveBeenCalledWith(saveJson)
    expect(result.type).toBe('idle')
    if (result.type === 'idle') expect(result.lastSyncedAt).toBe('2024-06-05T00:00:00Z')
    const stored = JSON.parse(storage.getItem('er-guide-gist-sync')!)
    expect(stored.lastSyncedAt).toBe('2024-06-05T00:00:00Z')
  })

  it('pullNow(): returns error when not connected', async () => {
    const sync = createGistSync(fakeStorage())
    const result = await sync.pullNow(vi.fn())
    expect(result.type).toBe('error')
  })

  it('pullNow(): surfaces importFn validation errors as error status', async () => {
    const { sync } = connectedSync()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'g1',
        updated_at: '2024-06-05T00:00:00Z',
        files: { 'er-guide-progress.json': { content: 'garbage' } },
      }),
    } as Response)
    const result = await sync.pullNow(() => { throw new Error('Not a valid er-guide save') })
    expect(result.type).toBe('error')
    if (result.type === 'error') expect(result.message).toMatch(/Not a valid er-guide save/)
  })

  it('pullNow(): does NOT call importFn if gist file is absent', async () => {
    const { sync } = connectedSync()
    const importFn = vi.fn()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'g1', updated_at: '2024-06-05T00:00:00Z', files: {} }),
    } as Response)
    await sync.pullNow(importFn)
    expect(importFn).not.toHaveBeenCalled()
  })
})

describe('createGistSync — checkCloudNewer', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('stays disconnected when not connected (no fetch)', async () => {
    const sync = createGistSync(fakeStorage())
    const result = await sync.checkCloudNewer()
    expect(result.type).toBe('disconnected')
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it('sets cloud-newer when gist updated_at is newer than lastSyncedAt', async () => {
    const storage = fakeStorage({
      'er-guide-gist-sync': JSON.stringify({ token: 'gho_tok', gistId: 'g1', lastSyncedAt: '2024-06-01T00:00:00Z' }),
    })
    const sync = createGistSync(storage)

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'g1',
        updated_at: '2024-06-10T00:00:00Z',
        files: { 'er-guide-progress.json': { content: '{"schemaVersion":1}' } },
      }),
    } as Response)

    const result = await sync.checkCloudNewer()
    expect(result.type).toBe('cloud-newer')
    expect(sync.getStatus().type).toBe('cloud-newer')
  })

  it('keeps idle when never synced (lastSyncedAt null) even if gist has content', async () => {
    const storage = fakeStorage({
      'er-guide-gist-sync': JSON.stringify({ token: 'gho_tok', gistId: 'g1', lastSyncedAt: null }),
    })
    const sync = createGistSync(storage)

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'g1',
        updated_at: '2024-06-10T00:00:00Z',
        files: { 'er-guide-progress.json': { content: '{"schemaVersion":1}' } },
      }),
    } as Response)

    const result = await sync.checkCloudNewer()
    expect(result.type).toBe('idle')
  })

  it('silently stays local on fetch failure (offline)', async () => {
    const storage = fakeStorage({
      'er-guide-gist-sync': JSON.stringify({ token: 'gho_tok', gistId: 'g1', lastSyncedAt: '2024-06-01T00:00:00Z' }),
    })
    const sync = createGistSync(storage)
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))

    const result = await sync.checkCloudNewer()
    expect(result.type).toBe('idle')
  })
})

// ── startAutoSync ─────────────────────────────────────────────────────────────

describe('createGistSync — startAutoSync', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  function fakeStore() {
    const listeners = new Set<() => void>()
    return {
      subscribe(fn: () => void) {
        listeners.add(fn)
        return () => void listeners.delete(fn)
      },
      exportJson: () => '{"schemaVersion":1,"activeProfile":"default","profiles":{"default":{"checked":{}}}}',
      emit: () => listeners.forEach((fn) => fn()),
    }
  }

  it('debounce-pushes 3s after the last store change', async () => {
    const storage = fakeStorage({
      'er-guide-gist-sync': JSON.stringify({ token: 'gho_tok', gistId: 'g1', lastSyncedAt: null }),
    })
    const sync = createGistSync(storage)
    const store = fakeStore()

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'g1',
        updated_at: '2024-06-05T00:00:00Z',
        files: { 'er-guide-progress.json': { content: '{}' } },
      }),
    } as Response)

    sync.startAutoSync(store)
    store.emit()
    vi.advanceTimersByTime(2000)
    store.emit()
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
    vi.advanceTimersByTime(3000)
    await vi.runAllTimersAsync()
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it('stop function cancels pending pushes and unsubscribes', () => {
    const storage = fakeStorage({
      'er-guide-gist-sync': JSON.stringify({ token: 'gho_tok', gistId: 'g1', lastSyncedAt: null }),
    })
    const sync = createGistSync(storage)
    const store = fakeStore()

    const stop = sync.startAutoSync(store)
    store.emit()
    stop()
    vi.advanceTimersByTime(5000)
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it('does nothing when disconnected', () => {
    const sync = createGistSync(fakeStorage())
    const store = fakeStore()
    sync.startAutoSync(store)
    store.emit()
    vi.advanceTimersByTime(5000)
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })
})
