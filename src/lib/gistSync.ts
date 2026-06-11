// GitHub Gist progress sync — framework-free module.
//
// Stores its config (token, gistId, lastSyncedAt) in localStorage under
// `er-guide-gist-sync`, separate from the progress save itself. All GitHub
// calls go through fetch; every failure maps to an 'error' status — this
// module must NEVER throw into the app. Offline = silently stay local.

// ── Config ────────────────────────────────────────────────────────────────────

const SYNC_CONFIG_KEY = 'er-guide-gist-sync'
const GIST_FILENAME = 'er-guide-progress.json'
const GIST_DESCRIPTION = 'Elden Ring 100% guide progress — synced by er-guide'

export interface GistSyncConfig {
  token: string
  gistId: string
  lastSyncedAt: string | null
}

export type SyncStatus =
  | { type: 'disconnected' }
  | { type: 'connecting' }
  | { type: 'idle'; gistId: string; lastSyncedAt: string | null }
  | { type: 'syncing'; gistId: string; lastSyncedAt: string | null }
  | { type: 'cloud-newer'; gistId: string; lastSyncedAt: string | null }
  | { type: 'error'; message: string; gistId?: string; lastSyncedAt?: string | null }

// ── Pure helpers (unit-tested) ────────────────────────────────────────────────

export function parseConfig(raw: string | null): GistSyncConfig | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<GistSyncConfig> | null
    if (
      parsed == null ||
      typeof parsed !== 'object' ||
      typeof parsed.token !== 'string' ||
      typeof parsed.gistId !== 'string'
    ) {
      return null
    }
    return { token: parsed.token, gistId: parsed.gistId, lastSyncedAt: parsed.lastSyncedAt ?? null }
  } catch {
    return null
  }
}

export function serializeConfig(cfg: GistSyncConfig): string {
  return JSON.stringify(cfg)
}

/** True only when the gist was updated strictly after our last sync. Never-synced (null) → false. */
export function isGistNewer(gistUpdatedAt: string, lastSyncedAt: string | null): boolean {
  if (lastSyncedAt === null) return false
  return new Date(gistUpdatedAt).getTime() > new Date(lastSyncedAt).getTime()
}

export interface GistFileContent {
  content: string
  updatedAt: string
}

export function extractGistContent(gistResponse: unknown): GistFileContent | null {
  const gist = gistResponse as { files?: Record<string, { content?: string }>; updated_at?: string } | null
  const file = gist?.files?.[GIST_FILENAME]
  if (!file?.content || typeof gist?.updated_at !== 'string') return null
  return { content: file.content, updatedAt: gist.updated_at }
}

export function buildGistPayload(content: string, isUpdate: boolean): object {
  if (isUpdate) {
    return { files: { [GIST_FILENAME]: { content } } }
  }
  return {
    description: GIST_DESCRIPTION,
    public: false, // secret gist
    files: { [GIST_FILENAME]: { content } },
  }
}

// ── Debounce with injectable timer (unit-tested) ──────────────────────────────

type SetTimeoutFn = (fn: () => void, ms: number) => ReturnType<typeof setTimeout>
type ClearTimeoutFn = (id: ReturnType<typeof setTimeout> | undefined) => void

export function createDebouncer(
  fn: () => void,
  delayMs: number,
  setTimeoutFn: SetTimeoutFn = (f, ms) => setTimeout(f, ms),
  clearTimeoutFn: ClearTimeoutFn = (id) => clearTimeout(id),
) {
  let timer: ReturnType<typeof setTimeout> | undefined

  function debounced() {
    clearTimeoutFn(timer)
    timer = setTimeoutFn(() => {
      timer = undefined
      fn()
    }, delayMs)
  }

  debounced.cancel = () => {
    clearTimeoutFn(timer)
    timer = undefined
  }

  return debounced
}

// ── Factory ───────────────────────────────────────────────────────────────────

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

interface SyncableStore {
  subscribe: (fn: () => void) => () => void
  exportJson: () => string
}

export function createGistSync(storage: StorageLike) {
  let config: GistSyncConfig | null = parseConfig(storage.getItem(SYNC_CONFIG_KEY))
  let status: SyncStatus = config
    ? { type: 'idle', gistId: config.gistId, lastSyncedAt: config.lastSyncedAt }
    : { type: 'disconnected' }
  const listeners = new Set<() => void>()

  function setStatus(s: SyncStatus): SyncStatus {
    status = s
    listeners.forEach((fn) => fn())
    return s
  }

  function saveConfig(cfg: GistSyncConfig) {
    config = cfg
    try {
      storage.setItem(SYNC_CONFIG_KEY, serializeConfig(cfg))
    } catch {
      // quota / private mode: keep in-memory config, don't crash
    }
  }

  async function githubFetch(
    path: string,
    token: string,
    options: RequestInit = {},
  ): Promise<{ ok: boolean; status: number; data: unknown }> {
    const res = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    })
    const data = res.ok ? await res.json() : null
    return { ok: res.ok, status: res.status, data }
  }

  function errorStatus(message: string): SyncStatus {
    return setStatus({
      type: 'error',
      message,
      gistId: config?.gistId,
      lastSyncedAt: config?.lastSyncedAt,
    })
  }

  async function pushNow(saveJson: string): Promise<SyncStatus> {
    if (!config) return errorStatus('Not connected')
    setStatus({ type: 'syncing', gistId: config.gistId, lastSyncedAt: config.lastSyncedAt })
    try {
      const result = await githubFetch(`/gists/${config.gistId}`, config.token, {
        method: 'PATCH',
        body: JSON.stringify(buildGistPayload(saveJson, true)),
      })
      if (!result.ok) return errorStatus(`Push failed (HTTP ${result.status})`)
      const updatedAt = (result.data as { updated_at: string }).updated_at
      saveConfig({ ...config, lastSyncedAt: updatedAt })
      return setStatus({ type: 'idle', gistId: config.gistId, lastSyncedAt: updatedAt })
    } catch (err) {
      return errorStatus(err instanceof Error ? err.message : 'Push failed')
    }
  }

  return {
    subscribe(fn: () => void) {
      listeners.add(fn)
      return () => void listeners.delete(fn)
    },

    getStatus(): SyncStatus {
      return status
    },

    /**
     * Validates the token by listing gists, then finds the existing er-guide
     * gist (by description + filename) or creates a new SECRET one.
     */
    async connect(token: string): Promise<SyncStatus> {
      setStatus({ type: 'connecting' })
      try {
        const listResult = await githubFetch('/gists', token)
        if (!listResult.ok) {
          return setStatus({
            type: 'error',
            message:
              listResult.status === 401
                ? 'Invalid token (HTTP 401) — check the token and its gist permission'
                : `GitHub returned HTTP ${listResult.status} — check your token`,
          })
        }

        const list = listResult.data as Array<{
          id: string
          description: string
          files: Record<string, unknown>
        }>
        let gistId =
          list.find((g) => g.description === GIST_DESCRIPTION && g.files[GIST_FILENAME] != null)?.id ?? null

        if (!gistId) {
          const createResult = await githubFetch('/gists', token, {
            method: 'POST',
            body: JSON.stringify(buildGistPayload('{}', false)),
          })
          if (!createResult.ok) {
            return setStatus({
              type: 'error',
              message: `Failed to create gist (HTTP ${createResult.status}) — does the token have gist write permission?`,
            })
          }
          gistId = (createResult.data as { id: string }).id
        }

        saveConfig({ token, gistId, lastSyncedAt: null })
        return setStatus({ type: 'idle', gistId, lastSyncedAt: null })
      } catch (err) {
        return setStatus({
          type: 'error',
          message: err instanceof Error ? err.message : 'Connection failed',
        })
      }
    },

    /** Clears local config only — never deletes the gist. */
    disconnect() {
      config = null
      try {
        storage.removeItem(SYNC_CONFIG_KEY)
      } catch {
        // ignore
      }
      setStatus({ type: 'disconnected' })
    },

    pushNow,

    /** GETs the gist and feeds its content to importFn (store.importJson — validates, throws on bad input). */
    async pullNow(importFn: (json: string) => void): Promise<SyncStatus> {
      if (!config) return errorStatus('Not connected')
      setStatus({ type: 'syncing', gistId: config.gistId, lastSyncedAt: config.lastSyncedAt })
      try {
        const result = await githubFetch(`/gists/${config.gistId}`, config.token)
        if (!result.ok) return errorStatus(`Pull failed (HTTP ${result.status})`)
        const file = extractGistContent(result.data)
        if (file) {
          importFn(file.content) // throws on invalid save — caught below
          saveConfig({ ...config, lastSyncedAt: file.updatedAt })
        }
        return setStatus({ type: 'idle', gistId: config.gistId, lastSyncedAt: config.lastSyncedAt })
      } catch (err) {
        return errorStatus(err instanceof Error ? err.message : 'Pull failed')
      }
    },

    /**
     * On app load: compares the gist's updated_at against lastSyncedAt.
     * If the cloud copy is newer, does NOT auto-import — sets 'cloud-newer'
     * so the UI can offer [Load cloud copy] / [Overwrite cloud].
     * Offline or any failure: silently stays local.
     */
    async checkCloudNewer(): Promise<SyncStatus> {
      if (!config) return status
      try {
        const result = await githubFetch(`/gists/${config.gistId}`, config.token)
        if (!result.ok) return status
        const file = extractGistContent(result.data)
        if (!file) return status
        if (isGistNewer(file.updatedAt, config.lastSyncedAt)) {
          return setStatus({ type: 'cloud-newer', gistId: config.gistId, lastSyncedAt: config.lastSyncedAt })
        }
        return setStatus({ type: 'idle', gistId: config.gistId, lastSyncedAt: config.lastSyncedAt })
      } catch {
        return status // offline — silently stay local
      }
    },

    /**
     * Subscribes to the progress store and debounce-pushes 3s after the last
     * change. Returns a stop function (cancels pending push + unsubscribes).
     */
    startAutoSync(store: SyncableStore): () => void {
      const debounced = createDebouncer(() => {
        if (!config) return
        void pushNow(store.exportJson()) // errors map to status; never throws
      }, 3000)

      const unsub = store.subscribe(() => {
        if (!config) return
        debounced()
      })

      return () => {
        debounced.cancel()
        unsub()
      }
    },
  }
}

export type GistSync = ReturnType<typeof createGistSync>

// ── Singleton (used by the app; tests use createGistSync directly) ────────────

function getStorage(): StorageLike {
  try {
    return window.localStorage
  } catch {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  }
}

export const gistSync = createGistSync(getStorage())
