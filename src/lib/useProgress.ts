import { useSyncExternalStore } from 'react'
import { createProgressStore } from './progress'

// window.localStorage can throw at access time (SecurityError when cookies/storage
// are blocked, or in sandboxed iframes) — fall back to a noop store rather than
// crashing at module load.
function getStorage() {
  try {
    return window.localStorage
  } catch {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  }
}

export const progressStore = createProgressStore(getStorage())

export function useProgress() {
  const snapshot = useSyncExternalStore(progressStore.subscribe, progressStore.getSnapshot)
  return { snapshot, store: progressStore }
}
