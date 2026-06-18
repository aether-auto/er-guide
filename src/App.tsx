import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { Category, MapRef } from './lib/types'
import type { UiFilters } from './lib/search'
import { regions } from './lib/data'
import GuidePage from './pages/GuidePage'
import ProgressPage from './pages/ProgressPage'
import CoveragePage from './pages/CoveragePage'
import QuestlinePage from './pages/QuestlinePage'
import HowToPage from './pages/HowToPage'

// The build optimizer pulls in a ~1 MB regulation dataset + calc engine; lazy
// so it never weighs down the map experience (loaded only when /build opens).
const BuildPage = lazy(() => import('./pages/BuildPage'))

/** A pending cross-region focus: set by TopBar when navigating to a different
 *  region. Consumed exactly once by GuidePage/MapView after markers are built. */
export interface PendingFocus {
  itemId: string
  map: MapRef
}

interface UiState {
  filters: UiFilters
  setHideCompleted: (v: boolean) => void
  setCategories: (v: Set<Category> | null) => void
  /** Pan map to ref, switch layer, and open popup for itemId (if provided). */
  focus: (ref: MapRef, itemId?: string) => void
  /**
   * Called by MapView on mount to register its focus handler.
   * Returns an unregister fn — MapView calls it on unmount so focus() can
   * never reach a removed Leaflet map.
   */
  registerFocus: (fn: (ref: MapRef, itemId?: string) => void) => () => void
  /** Pending cross-region focus — consumed once by GuidePage on mount/change. */
  pendingFocus: PendingFocus | null
  /** Set a pending focus to be consumed after the next region navigation. */
  setPendingFocus: (p: PendingFocus | null) => void
  /** Consume and clear the pending focus (returns it if present). */
  consumePendingFocus: () => PendingFocus | null
}

const UiContext = createContext<UiState | null>(null)

export function useUi(): UiState {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi outside provider')
  return ctx
}

export default function App() {
  const [hideCompleted, setHideCompleted] = useState(false)
  const [categories, setCategories] = useState<Set<Category> | null>(null)
  const [pendingFocus, setPendingFocus] = useState<PendingFocus | null>(null)

  // MapView registers its focus handler here on mount; any component (StepRow,
  // RoutePanel) requests a map focus action through ui.focus().
  const focusFnRef = useRef<((ref: MapRef, itemId?: string) => void) | null>(null)
  // Ref mirror so consumePendingFocus never goes stale inside a useMemo.
  const pendingFocusRef = useRef<PendingFocus | null>(null)
  pendingFocusRef.current = pendingFocus

  const consumePendingFocus = useCallback((): PendingFocus | null => {
    const p = pendingFocusRef.current
    if (p) setPendingFocus(null)
    return p
  }, [])

  const ui = useMemo<UiState>(
    () => ({
      filters: { hideCompleted, categories },
      setHideCompleted,
      setCategories,
      focus: (ref, itemId) => focusFnRef.current?.(ref, itemId),
      registerFocus: (fn) => {
        focusFnRef.current = fn
        return () => {
          if (focusFnRef.current === fn) focusFnRef.current = null
        }
      },
      pendingFocus,
      setPendingFocus,
      consumePendingFocus,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hideCompleted, categories, pendingFocus],
  )

  const firstRegion = regions[0]?.id ?? 'limgrave'

  return (
    <UiContext.Provider value={ui}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to={`/region/${firstRegion}`} replace />} />
          {/* Optional :legId? keeps ONE route match for region and leg views, so
              GuidePage/MapView survive leg navigation (no Leaflet remount). */}
          <Route path="/region/:regionId/:legId?" element={<GuidePage />} />
          <Route path="/questlines" element={<QuestlinePage />} />
          <Route
            path="/build"
            element={
              <Suspense
                fallback={<div className="grid h-screen place-items-center text-sm text-ink-dim">Loading build optimizer…</div>}
              >
                <BuildPage />
              </Suspense>
            }
          />
          <Route path="/how-to" element={<HowToPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/coverage" element={<CoveragePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </UiContext.Provider>
  )
}
