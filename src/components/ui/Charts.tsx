// Hand-rolled, theme-matched SVG charts for the build optimizer. No charting
// dependency — everything renders client-side as SVG/divs, so it works on a
// static GitHub Pages host and stays cohesive with the Gilded Codex aesthetic.

/** Damage-type accent colors — muted to sit on the obsidian palette. */
export const DAMAGE_COLORS: Record<string, string> = {
  Physical: '#b8a98c',
  Magic: '#6f8fd0',
  Fire: '#d2763c',
  Lightning: '#e8c766',
  Holy: '#ece3bf',
}
export function damageColor(label: string): string {
  return DAMAGE_COLORS[label] ?? '#c8a55a'
}

/** A horizontal legend of damage-type swatches. */
export function DamageLegend({ labels }: { labels: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {labels.map((l) => (
        <span key={l} className="flex items-center gap-1.5 text-[10px] tracking-wide text-ink-dim">
          <span className="inline-block size-2 rounded-[1px]" style={{ background: damageColor(l) }} />
          {l}
        </span>
      ))}
    </div>
  )
}

export interface BarSegment {
  label: string
  value: number
}

/** A compact inline stacked bar (damage-type composition) for table rows. */
export function CompositionBar({
  segments,
  total,
  className = '',
}: {
  segments: BarSegment[]
  total: number
  className?: string
}) {
  return (
    <span className={`inline-flex h-1.5 overflow-hidden rounded-[2px] bg-edge/50 ${className}`}>
      {segments.map((s, i) => (
        <span
          key={i}
          className="er-bar-fill"
          style={{
            width: `${(s.value / Math.max(1, total)) * 100}%`,
            background: damageColor(s.label),
            transformOrigin: 'left center',
            animationDelay: `${i * 0.04}s`,
          }}
          title={`${s.label} ${Math.round(s.value)}`}
        />
      ))}
    </span>
  )
}

export interface BarItem {
  name: string
  value: number
  dlc?: boolean
  dim?: boolean
  /** Stacked composition (e.g. damage-type split). Sums to ~value. */
  segments?: BarSegment[]
}

/**
 * Horizontal bar chart. Each row: rank · name · proportional bar · value.
 * When an item has `segments`, the bar is a stacked composition of damage-type
 * colors; otherwise it's a single gold gradient.
 */
export function ArBars({
  items,
  unit = 'AR',
  valueFmt = (n: number) => Math.round(n).toLocaleString(),
}: {
  items: BarItem[]
  unit?: string
  valueFmt?: (n: number) => string
}) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((it, i) => {
        const pct = (it.value / max) * 100
        return (
          <div
            key={it.name}
            className={`group flex items-center gap-2.5 rounded px-1.5 py-1 transition-colors hover:bg-panel2/60 ${it.dim ? 'opacity-50' : ''}`}
          >
            <span className="er-num w-5 shrink-0 text-right text-[10px] text-ink-dim">{i + 1}</span>
            <span className="w-32 shrink-0 truncate text-xs text-ink sm:w-44" title={it.name}>
              {it.name}
              {it.dlc && <span className="ml-1 text-[8px] tracking-wider text-gold-dim">DLC</span>}
            </span>
            <span className="relative h-3.5 flex-1 overflow-hidden rounded-[2px] bg-edge/50">
              {it.segments && it.segments.length > 0 ? (
                <span
                  className="er-bar-fill absolute inset-y-0 left-0 flex transition-[width] duration-500"
                  style={{ width: `${pct}%`, animationDelay: `${i * 0.045}s` }}
                >
                  {it.segments.map((s, si) => (
                    <span
                      key={si}
                      style={{
                        width: `${(s.value / it.value) * 100}%`,
                        background: damageColor(s.label),
                      }}
                      title={`${s.label} ${valueFmt(s.value)}`}
                    />
                  ))}
                </span>
              ) : (
                <span
                  className="er-bar-fill absolute inset-y-0 left-0 rounded-[2px] bg-gradient-to-r from-gold-dim to-gold-bright transition-[width] duration-500"
                  style={{ width: `${pct}%`, animationDelay: `${i * 0.045}s` }}
                />
              )}
            </span>
            <span
              className="er-num er-fade-in w-14 shrink-0 text-right text-xs text-gold-bright"
              style={{ animationDelay: `${i * 0.045}s` }}
            >
              {valueFmt(it.value)}
              <span className="ml-0.5 text-[8px] uppercase tracking-[0.15em] text-gold-dim">{unit}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Pentagon radar of the five damage stats (STR/DEX/INT/FAI/ARC), each 1–99.
 * A compact glance at the build's shape.
 */
export function StatRadar({
  stats,
  max = 99,
  size = 184,
}: {
  stats: { label: string; value: number }[]
  max?: number
  size?: number
}) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 22
  const n = stats.length
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const pt = (i: number, radius: number) => [cx + radius * Math.cos(angle(i)), cy + radius * Math.sin(angle(i))]
  const ring = (frac: number) =>
    stats.map((_, i) => pt(i, r * frac).join(',')).join(' ')
  const dataPts = stats.map((s, i) => pt(i, r * (Math.max(0, Math.min(max, s.value)) / max)).join(',')).join(' ')

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="er-radar-in w-full max-w-[200px]" role="img" aria-label="Stat distribution">
      {/* grid rings */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="#2c261b" strokeWidth={1} />
      ))}
      {/* spokes */}
      {stats.map((_, i) => {
        const [x, y] = pt(i, r)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#2c261b" strokeWidth={1} />
      })}
      {/* data polygon */}
      <polygon points={dataPts} fill="rgba(200,165,90,0.18)" stroke="#c8a55a" strokeWidth={1.5} />
      {stats.map((s, i) => {
        const [x, y] = pt(i, r * (Math.max(0, Math.min(max, s.value)) / max))
        return <circle key={i} cx={x} cy={y} r={2} fill="#e8c766" />
      })}
      {/* axis labels */}
      {stats.map((s, i) => {
        const [x, y] = pt(i, r + 13)
        return (
          <text
            key={s.label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            letterSpacing={1}
            fill="#8a7444"
          >
            {s.label}
            <tspan fill="#d8d2c4" dx={3}>{s.value}</tspan>
          </text>
        )
      })}
    </svg>
  )
}
