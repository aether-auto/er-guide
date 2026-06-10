import { createContext, useContext, useMemo, useRef, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { Category, MapRef } from './lib/types'
import type { UiFilters } from './lib/search'
import { regions } from './lib/data'
import GuidePage from './pages/GuidePage'
import ProgressPage from './pages/ProgressPage'
import CoveragePage from './pages/CoveragePage'

interface UiState {
  filters: UiFilters
  setHideCompleted: (v: boolean) => void
  setCategories: (v: Set<Category> | null) => void
  /** Pan map to ref, switch layer, and open popup for itemId (if provided). */
  focus: (ref: MapRef, itemId?: string) => void
  /** Called by MapView on mount to register its focus handler. */
  registerFocus: (fn: (ref: MapRef, itemId?: string) => void) => void
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

  // MapView registers its focus handler here on mount; any component (StepRow,
  // RoutePanel) requests a map focus action through ui.focus().
  const focusFnRef = useRef<((ref: MapRef, itemId?: string) => void) | null>(null)

  const ui = useMemo<UiState>(
    () => ({
      filters: { hideCompleted, categories },
      setHideCompleted,
      setCategories,
      focus: (ref, itemId) => focusFnRef.current?.(ref, itemId),
      registerFocus: (fn) => {
        focusFnRef.current = fn
      },
    }),
    [hideCompleted, categories],
  )

  const firstRegion = regions[0]?.id ?? 'limgrave'

  return (
    <UiContext.Provider value={ui}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Navigate to={`/region/${firstRegion}`} replace />} />
          <Route path="/region/:regionId" element={<GuidePage />} />
          <Route path="/region/:regionId/:legId" element={<GuidePage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/coverage" element={<CoveragePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </UiContext.Provider>
  )
}
