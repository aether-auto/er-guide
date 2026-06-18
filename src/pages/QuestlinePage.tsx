import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { questlines, type Questline, type QuestStep } from '../lib/data'
import { useProgress } from '../lib/useProgress'
import TopBar from '../components/TopBar'

// ── One quest step row ──────────────────────────────────────────────────────

function QuestStepRow({
  step,
  index,
  checked,
  onToggle,
}: {
  step: QuestStep
  index: number
  checked: boolean
  onToggle: (id: string) => void
}) {
  const legUrl = `/region/${step.regionId}/${step.legId}`
  return (
    <li
      className={`flex items-start gap-3 rounded px-2 py-2 transition-colors hover:bg-panel2 ${
        checked ? 'opacity-50' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(step.id)}
        className="mt-1 size-4 shrink-0 accent-gold"
        aria-label={`${step.questline} step ${index + 1}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[10px] font-semibold text-gold-dim">Step {index + 1}</span>
          <NavLink
            to={legUrl}
            className="text-[10px] text-ink-dim underline-offset-2 hover:text-gold hover:underline"
            title="Open this step in the guide"
          >
            {step.regionName} · {step.legFrom} → {step.legTo}
          </NavLink>
        </div>
        <p className={`mt-0.5 text-sm leading-relaxed ${checked ? 'text-ink-dim line-through' : 'text-ink'}`}>
          {step.text}
        </p>
        {step.missable && (
          <p className="mt-1 text-[11px] font-semibold leading-relaxed text-missable">
            ⚠ MISSABLE — {step.missable.lockedBy}
            {step.missable.note && (
              <span className="block font-normal text-missable/80">{step.missable.note}</span>
            )}
          </p>
        )}
      </div>
    </li>
  )
}

// ── One questline card ──────────────────────────────────────────────────────

function QuestlineCard({
  questline,
  checked,
  onToggle,
}: {
  questline: Questline
  checked: Record<string, number>
  onToggle: (id: string) => void
}) {
  const total = questline.steps.length
  const done = questline.steps.reduce((n, s) => (checked[s.id] != null ? n + 1 : n), 0)
  const complete = done === total && total > 0
  const hasMissable = questline.steps.some((s) => s.missable != null)
  const [open, setOpen] = useState(false)

  return (
    <section className="mb-3 overflow-hidden rounded border border-edge bg-panel">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-panel2"
        aria-expanded={open}
      >
        <span className={`text-xs transition-transform ${open ? 'rotate-90' : ''} text-ink-dim`}>▶</span>
        <h2 className={`font-display flex-1 text-lg ${complete ? 'text-done' : 'text-gold'}`}>
          {questline.name}
          {complete && ' ✦'}
        </h2>
        {hasMissable && (
          <span className="rounded border border-missable/40 px-1.5 py-0.5 text-[9px] font-semibold text-missable">
            MISSABLE
          </span>
        )}
        <span className="text-xs whitespace-nowrap text-ink-dim">
          {done}/{total}
        </span>
        <span className="h-1.5 w-16 overflow-hidden rounded bg-edge">
          <span
            className="block h-full bg-gold transition-all"
            style={{ width: `${total === 0 ? 0 : Math.round((done / total) * 100)}%` }}
          />
        </span>
      </button>
      {open && (
        <ul className="border-t border-edge/50 px-2 py-1">
          {questline.steps.map((step, i) => (
            <QuestStepRow
              key={step.id}
              step={step}
              index={i}
              checked={checked[step.id] != null}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function QuestlinePage() {
  const { snapshot, store } = useProgress()
  const [query, setQuery] = useState('')
  const [hideComplete, setHideComplete] = useState(false)

  const totalSteps = useMemo(() => questlines.reduce((n, q) => n + q.steps.length, 0), [])
  const doneSteps = questlines.reduce(
    (n, q) => n + q.steps.reduce((m, s) => (snapshot.checked[s.id] != null ? m + 1 : m), 0),
    0,
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return questlines.filter((ql) => {
      if (q && !ql.name.toLowerCase().includes(q) && !ql.steps.some((s) => s.text.toLowerCase().includes(q)))
        return false
      if (hideComplete) {
        const total = ql.steps.length
        const done = ql.steps.reduce((n, s) => (snapshot.checked[s.id] != null ? n + 1 : n), 0)
        if (done === total && total > 0) return false
      }
      return true
    })
  }, [query, hideComplete, snapshot.checked])

  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-6 py-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl text-gold">NPC Questlines</h1>
          <span className="text-sm text-ink-dim">
            {doneSteps}/{totalSteps} steps done · {questlines.length} questlines
          </span>
        </div>
        <p className="mb-5 text-sm text-ink-dim">
          Every NPC quest step from the route, grouped by character and ordered as you encounter them.
          Checking a step here syncs with the guide and your saved progress. Click a step's region link to
          jump to it on the map.
        </p>

        <div className="mb-5 flex flex-wrap items-center gap-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questlines or steps…"
            className="min-w-56 flex-1 rounded border border-edge bg-bg px-3 py-1.5 text-sm outline-none focus:border-gold-dim"
          />
          <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-ink-dim">
            <input
              type="checkbox"
              checked={hideComplete}
              onChange={(e) => setHideComplete(e.target.checked)}
              className="accent-gold"
            />
            hide completed
          </label>
        </div>

        {visible.map((ql) => (
          <QuestlineCard key={ql.name} questline={ql} checked={snapshot.checked} onToggle={(id) => store.toggle(id)} />
        ))}
        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-dim">No questlines match your filters.</p>
        )}
      </main>
    </div>
  )
}
