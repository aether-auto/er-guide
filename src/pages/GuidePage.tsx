import { useParams } from 'react-router-dom'
import { displaySteps, firstUncheckedId, regions } from '../lib/data'
import type { MapCode } from '../lib/types'
import { useProgress } from '../lib/useProgress'
import TopBar from '../components/TopBar'
import MapView from '../components/MapView'
import RoutePanel from '../components/RoutePanel'

export default function GuidePage() {
  const { regionId, legId } = useParams()
  const { snapshot } = useProgress()
  const region = regions.find((r) => r.id === regionId)

  // DLC regions auto-show the DLC layer.
  const initialLayer: MapCode = region?.dlc ? 'dlc' : 'overworld'
  // Route emphasis for the map: highlighted leg + pulsing next-up pin.
  const nextUpId = region ? firstUncheckedId(displaySteps(region, legId), snapshot.checked) : null

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar />
      <div className="relative flex-1 overflow-hidden">
        {/* The map IS the page — full-viewport canvas */}
        <MapView initialLayer={initialLayer} activeLegId={legId ?? null} nextUpId={nextUpId} />
        {/* The running guide list, overlaid left (bottom sheet on mobile) */}
        <RoutePanel />
      </div>
    </div>
  )
}
