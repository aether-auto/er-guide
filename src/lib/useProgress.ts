import { useSyncExternalStore } from 'react'
import { createProgressStore } from './progress'

export const progressStore = createProgressStore(window.localStorage)

export function useProgress() {
  const snapshot = useSyncExternalStore(progressStore.subscribe, progressStore.getSnapshot)
  return { snapshot, store: progressStore }
}
