import { useParams } from 'react-router-dom'
import { regions } from '../lib/data'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import RegionView from '../components/RegionView'
import MapPanel from '../components/MapPanel'

export default function GuidePage() {
  const { regionId, legId } = useParams()
  const region = regions.find((r) => r.id === regionId)
  const dlc = region?.dlc ?? false
  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 md:block">
          <Sidebar />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto">
          {region ? <RegionView region={region} legId={legId} /> : <p className="p-8">Region not found.</p>}
        </main>
        <aside className="hidden w-[38%] shrink-0 border-l border-edge lg:block">
          <MapPanel dlc={dlc} />
        </aside>
      </div>
      <div className="h-72 border-t border-edge lg:hidden">
        <MapPanel dlc={dlc} />
      </div>
    </div>
  )
}
