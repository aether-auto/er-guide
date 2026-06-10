import type { Leg } from '../lib/types'
import { itemsById } from '../lib/data'
import { stepVisible } from '../lib/search'
import { useProgress } from '../lib/useProgress'
import { useUi } from '../App'
import StepRow from './StepRow'

export default function LegView({ leg }: { leg: Leg }) {
  const { filters } = useUi()
  const { store } = useProgress()
  return (
    <section className="mb-8" id={leg.id}>
      <h2 className="font-display text-xl text-gold">
        {leg.from} <span className="text-ink-dim">→</span> {leg.to}
      </h2>
      {leg.summary && <p className="mt-1 mb-3 text-sm text-ink-dim">{leg.summary}</p>}
      <ul className="space-y-0.5">
        {leg.steps.map((step, i) => {
          const item = step.type === 'item' ? itemsById.get(step.itemId) : undefined
          if (!stepVisible(step, item, filters, store.isChecked)) return null
          return <StepRow key={i} step={step} item={item} />
        })}
      </ul>
    </section>
  )
}
