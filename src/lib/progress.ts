export interface SaveData {
  schemaVersion: 1
  activeProfile: string
  profiles: Record<string, { checked: Record<string, number> }>
}

export interface ProgressSnapshot {
  activeProfile: string
  profiles: string[]
  checked: Record<string, number>
  hasBackup: boolean
}

const KEY = 'er-guide-progress-v1'
const BACKUP_KEY = 'er-guide-progress-backup'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function fresh(): SaveData {
  return { schemaVersion: 1, activeProfile: 'default', profiles: { default: { checked: {} } } }
}

function parseSave(text: string): SaveData {
  const parsed = JSON.parse(text) as SaveData
  const valid =
    parsed != null &&
    parsed.schemaVersion === 1 &&
    typeof parsed.activeProfile === 'string' &&
    typeof parsed.profiles === 'object' &&
    parsed.profiles[parsed.activeProfile] != null &&
    typeof parsed.profiles[parsed.activeProfile].checked === 'object'
  if (!valid) throw new Error('Not a valid er-guide save')
  return parsed
}

export function createProgressStore(storage: StorageLike) {
  let data: SaveData
  const raw = storage.getItem(KEY)
  if (raw == null) {
    data = fresh()
  } else {
    try {
      data = parseSave(raw)
    } catch {
      storage.setItem(BACKUP_KEY, raw) // never silently wipe (spec §9)
      data = fresh()
    }
  }

  const listeners = new Set<() => void>()
  let snapshot = makeSnapshot()

  function makeSnapshot(): ProgressSnapshot {
    return {
      activeProfile: data.activeProfile,
      profiles: Object.keys(data.profiles),
      checked: { ...data.profiles[data.activeProfile].checked },
      hasBackup: storage.getItem(BACKUP_KEY) != null,
    }
  }

  function persist() {
    try {
      storage.setItem(KEY, JSON.stringify(data))
    } catch {
      // quota exceeded / private mode: keep in-memory state consistent, don't crash
    }
    snapshot = makeSnapshot()
    listeners.forEach((fn) => fn())
  }

  return {
    subscribe(fn: () => void) {
      listeners.add(fn)
      return () => void listeners.delete(fn)
    },
    getSnapshot: () => snapshot,
    isChecked: (id: string) => snapshot.checked[id] != null,
    toggle(id: string) {
      const checked = data.profiles[data.activeProfile].checked
      if (checked[id] != null) delete checked[id]
      else checked[id] = Date.now()
      persist()
    },
    switchProfile(name: string) {
      if (!data.profiles[name]) data.profiles[name] = { checked: {} }
      data.activeProfile = name
      persist()
    },
    exportJson: () => JSON.stringify(data, null, 2),
    importJson(text: string) {
      data = parseSave(text) // throws before mutating on bad input
      persist()
    },
  }
}

export type ProgressStore = ReturnType<typeof createProgressStore>
