import { createContext, useContext, useMemo, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { Category, MapRef } from './lib/types'
import { mapUrl } from './lib/maplink'
import type { UiFilters } from './lib/search'
import { regions } from './lib/data'
import GuidePage from './pages/GuidePage'
import ProgressPage from './pages/ProgressPage'
import CoveragePage from './pages/CoveragePage'

interface UiState {
  filters: UiFilters
  setHideCompleted: (v: boolean) => void
  setCategories: (v: Set<Category> | null) => void
  showOnMap: (ref: MapRef) => void
}

// One persistent companion window, re-navigated pin-to-pin on every "map" click.
// Fextralife blocks embedding (X-Frame-Options: sameorigin), so item deep links
// cannot load in the in-app iframe panel.
function showOnMap(ref: MapRef) {
  window.open(mapUrl(ref), 'er-guide-map')
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

  const ui = useMemo<UiState>(
    () => ({
      filters: { hideCompleted, categories },
      setHideCompleted,
      setCategories,
      showOnMap,
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
