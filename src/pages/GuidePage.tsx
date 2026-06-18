import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { allRegionSteps, displaySteps, firstUncheckedId, regions } from '../lib/data'
import type { MapCode } from '../lib/types'
import { useProgress } from '../lib/useProgress'
import { useUi } from '../App'
import TopBar from '../components/TopBar'
import MapView from '../components/MapView'
import RoutePanel from '../components/RoutePanel'

export default function GuidePage() {
  const { regionId, legId } = useParams()
  const { snapshot } = useProgress()
  const { focus, consumePendingFocus } = useUi()
  const region = regions.find((r) => r.id === regionId)

  // DLC regions auto-show the DLC layer.
  const initialLayer: MapCode = region?.dlc ? 'dlc' : 'overworld'
  // Route emphasis for the map: highlighted leg + pulsing next-up pin.
  // Ignored items are skipped — they never get the pulsing pin.
  // Leg/sweep selected → next-up within it; no leg → region-wide next-up so the
  // map still pulses the right pin while the panel shows the leg picker.
  const nextUpId = region
    ? firstUncheckedId(
        legId ? displaySteps(region, legId) : allRegionSteps(region),
        snapshot.checked,
        snapshot.ignored,
      )
    : null

  // Consume any pending cross-region focus once per region change.
  // We delay by one tick after mount so MapView has had a chance to register
  // its focus handler and build its pin markers (the useEffect ordering
  // guarantee: children effects run before parents, so MapView's mount effect
  // that calls registerFocus() fires before this parent effect — but the
  // marker render on the Leaflet side is synchronous inside that effect, so
  // by the time this useEffect runs the markers are already in markerMapRef).
  const regionRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (regionRef.current === regionId) return // same region, leg navigation only
    regionRef.current = regionId
    const pending = consumePendingFocus()
    if (!pending) return
    // Small delay so flyTo fires after Leaflet has settled the new tile layer.
    const t = setTimeout(() => focus(pending.map, pending.itemId), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId])

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
