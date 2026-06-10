import { items, regions } from '../lib/data'
import TopBar from '../components/TopBar'

export default function CoveragePage() {
  const noMap = items.filter((i) => i.map == null)
  const unsorted = regions.find((r) => r.id === 'unsorted')
  const cleanupTotals = regions
    .filter((r) => r.id !== 'unsorted')
    .map((r) => ({ region: r, count: r.cleanup.length }))
    .filter((x) => x.count > 0)

  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-6 py-6">
        <h1 className="font-display mb-2 text-3xl text-gold">Data coverage</h1>
        <p className="mb-6 text-sm text-ink-dim">
          Data-quality report. Everything here is checkable in the guide already — these lists are the polish
          backlog for contributors.
        </p>

        <section className="mb-6">
          <h2 className="font-display text-lg text-gold-dim">Items not yet routed into a leg</h2>
          <ul className="mt-2 text-sm text-ink-dim">
            {cleanupTotals.map(({ region, count }) => (
              <li key={region.id}>{region.name}: {count} in region sweep</li>
            ))}
            {cleanupTotals.length === 0 && <li className="text-done">All items are routed. ✦</li>}
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-display text-lg text-gold-dim">
            Unsorted items ({unsorted?.cleanup.length ?? 0})
          </h2>
          <p className="text-xs text-ink-dim">Bucketing couldn't place these in a region — triage them in data/regions/.</p>
        </section>

        <section className="mb-6">
          <h2 className="font-display text-lg text-gold-dim">Items without a map marker ({noMap.length})</h2>
          <ul className="mt-2 max-h-96 columns-2 overflow-y-auto text-sm text-ink-dim">
            {noMap.map((i) => (
              <li key={i.id}>{i.name}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
