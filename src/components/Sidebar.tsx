import { NavLink, useParams } from 'react-router-dom'
import { regions, legCheckables, regionCheckables, countChecked } from '../lib/data'
import { useProgress } from '../lib/useProgress'

function Bar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <span className="ml-auto flex items-center gap-1.5 text-[10px] text-ink-dim">
      {done}/{total}
      <span className="h-1 w-10 overflow-hidden rounded bg-edge">
        <span className="block h-full bg-gold" style={{ width: `${pct}%` }} />
      </span>
    </span>
  )
}

export default function Sidebar() {
  const { regionId } = useParams()
  const { snapshot } = useProgress()
  return (
    <nav className="h-full overflow-y-auto border-r border-edge bg-panel">
      {regions.map((region) => {
        const ids = regionCheckables(region)
        const open = region.id === regionId
        return (
          <div key={region.id} className="border-b border-edge/60">
            <NavLink
              to={`/region/${region.id}`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-sm hover:bg-panel2 ${isActive ? 'text-gold' : 'text-ink'}`
              }
            >
              <span className="font-display">{region.name}</span>
              <Bar done={countChecked(ids, snapshot.checked)} total={ids.length} />
            </NavLink>
            {open &&
              region.legs.map((leg) => {
                const legIds = legCheckables(leg)
                return (
                  <NavLink
                    key={leg.id}
                    to={`/region/${region.id}/${leg.id}`}
                    className={({ isActive }) =>
                      `flex items-center gap-2 py-1.5 pr-3 pl-6 text-xs hover:bg-panel2 ${isActive ? 'text-gold' : 'text-ink-dim'}`
                    }
                  >
                    <span className="truncate">{leg.from} → {leg.to}</span>
                    <Bar done={countChecked(legIds, snapshot.checked)} total={legIds.length} />
                  </NavLink>
                )
              })}
          </div>
        )
      })}
    </nav>
  )
}
