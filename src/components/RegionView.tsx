import type { Region } from '../lib/types'
import { itemsById } from '../lib/data'
import { stepVisible } from '../lib/search'
import { useProgress } from '../lib/useProgress'
import { useUi } from '../App'
import LegView from './LegView'
import StepRow from './StepRow'

export default function RegionView({ region, legId }: { region: Region; legId?: string }) {
  const { filters } = useUi()
  const { store } = useProgress()
  const legs = legId ? region.legs.filter((l) => l.id === legId) : region.legs
  const cleanupSteps = region.cleanup.map((itemId) => ({ type: 'item' as const, itemId }))
  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <h1 className="font-display mb-6 text-3xl text-gold">{region.name}</h1>
      {legs.map((leg) => (
        <LegView key={leg.id} leg={leg} />
      ))}
      {!legId && region.cleanup.length > 0 && (
        <section className="mt-10 border-t border-edge pt-4">
          <h2 className="font-display text-xl text-gold-dim">Region sweep</h2>
          <p className="mt-1 mb-3 text-sm text-ink-dim">
            Items in {region.name} not yet woven into the route above — grab these before moving on.
          </p>
          <ul className="space-y-0.5">
            {cleanupSteps.map((step) => {
              const item = itemsById.get(step.itemId)
              if (!stepVisible(step, item, filters, store.isChecked)) return null
              return <StepRow key={step.itemId} step={step} item={item} />
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
