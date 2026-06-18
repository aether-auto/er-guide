import { items, regions } from '../lib/data'
import TopBar from '../components/TopBar'
import { DiamondRule } from '../components/ui/DiamondRule'

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
      <main className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-6 py-8">
        {/* Page header */}
        <div className="er-reveal mb-6">
          <h1 className="font-display mb-3 text-3xl text-gold">Data Coverage</h1>
          <DiamondRule className="mb-3" />
          <p className="text-sm text-ink-dim">
            Data-quality report. Everything here is checkable in the guide already — these lists are the polish
            backlog for contributors.
          </p>
        </div>

        {/* Staggered content sections */}
        <div className="er-stagger space-y-4">
          {/* Unrouted items by region */}
          <section className="er-card p-5">
            <p className="er-eyebrow mb-3">Route coverage</p>
            <h2 className="font-display mb-3 text-lg text-gold-dim">Items not yet routed into a leg</h2>
            {cleanupTotals.length === 0 ? (
              <p className="text-sm text-done">All items are routed. ✦</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {cleanupTotals.map(({ region, count }) => (
                  <li key={region.id} className="flex items-baseline justify-between border-b border-edge/40 pb-1.5 last:border-0 last:pb-0">
                    <span className="text-ink">{region.name}</span>
                    <span className="er-num text-xs text-gold-dim">
                      <span className="er-num text-gold">{count}</span>
                      {' '}in sweep
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Unsorted items */}
          <section className="er-card p-5">
            <p className="er-eyebrow mb-3">Triage needed</p>
            <h2 className="font-display mb-1 text-lg text-gold-dim">
              Unsorted items{' '}
              <span className="er-num text-gold">({unsorted?.cleanup.length ?? 0})</span>
            </h2>
            <p className="text-xs text-ink-dim">
              Bucketing couldn't place these in a region — triage them in <code className="text-gold-dim">data/regions/</code>.
            </p>
          </section>

          {/* Items without map markers */}
          <section className="er-card p-5">
            <p className="er-eyebrow mb-3">Map markers</p>
            <h2 className="font-display mb-3 text-lg text-gold-dim">
              Items without a map marker{' '}
              <span className="er-num text-gold">({noMap.length})</span>
            </h2>
            <ul className="max-h-96 columns-2 gap-x-6 overflow-y-auto text-sm">
              {noMap.map((i) => (
                <li key={i.id} className="truncate py-0.5 text-ink-dim">
                  {i.name}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
