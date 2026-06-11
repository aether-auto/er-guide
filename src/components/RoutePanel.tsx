import { useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  regions,
  itemsById,
  legCheckables,
  regionCheckables,
  countChecked,
  checkableId,
  displaySteps,
  firstUncheckedId,
} from '../lib/data'
import { CATEGORY_META } from '../lib/types'
import type { Leg, Step } from '../lib/types'
import { useProgress } from '../lib/useProgress'
import { useUi } from '../App'

// ── Progress bar ──────────────────────────────────────────────────────────

function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-[10px] whitespace-nowrap text-ink-dim">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded bg-edge">
        <span className="block h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[10px] whitespace-nowrap text-ink-dim">
        {done}/{total}
      </span>
    </div>
  )
}

// ── Step row inside RoutePanel ────────────────────────────────────────────

function PanelStepRow({
  step,
  isNextUp,
  onCheck,
  onLocate,
}: {
  step: Step
  isNextUp: boolean
  onCheck: (id: string) => void
  onLocate?: () => void
}) {
  const { snapshot } = useProgress()

  if (step.type === 'direction') {
    return <li className="py-1 pl-6 text-xs text-ink-dim italic">{step.text}</li>
  }

  const id = checkableId(step)
  const checked = id != null && snapshot.checked[id] != null
  const item = step.type === 'item' ? itemsById.get(step.itemId) : undefined
  const missable = step.type === 'quest' ? step.missable : item?.missable
  const name = step.type === 'item' ? (item?.name ?? step.itemId) : step.text

  return (
    <li
      className={`flex items-start gap-2 rounded px-2 py-1.5 transition-colors hover:bg-panel2 ${
        checked ? 'opacity-40' : isNextUp ? 'border border-edge bg-panel2' : ''
      }`}
    >
      {id != null && (
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onCheck(id)}
          className="mt-0.5 size-3.5 shrink-0 accent-gold"
          aria-label={name}
        />
      )}
      <div className="min-w-0 flex-1 text-xs">
        <span
          className={`${checked ? 'text-ink-dim line-through' : ''} ${isNextUp ? 'font-medium text-gold' : ''}`}
        >
          {step.type === 'boss' && '⚔ '}
          {step.type === 'quest' && (
            <strong className="text-gold-dim">{step.questline}: </strong>
          )}
          {name}
          {step.type === 'boss' && step.optional && <em className="text-ink-dim"> (optional)</em>}
        </span>
        {item && (
          <span className="ml-1.5 rounded border border-edge px-1 py-px text-[9px] text-ink-dim">
            {CATEGORY_META[item.category].label}
          </span>
        )}
        {item?.dlc && <span className="ml-1 text-[9px] text-gold-dim">DLC</span>}
        {step.type === 'item' && !checked && (
          <>
            {step.note && (
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-dim">{step.note}</p>
            )}
            {item?.acquisition && item.acquisition !== step.note && (
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-dim/80">
                {item.acquisition}
              </p>
            )}
            {item?.quest && (
              <p className="mt-0.5 text-[11px] leading-relaxed text-gold-dim">❖ {item.quest}</p>
            )}
          </>
        )}
        {missable && !checked && (
          <p className="mt-0.5 text-[11px] font-semibold leading-relaxed text-missable">
            ⚠ MISSABLE — {missable.lockedBy}
          </p>
        )}
      </div>
      {item?.map && onLocate && (
        <button
          onClick={onLocate}
          className="shrink-0 text-sm leading-none text-gold hover:scale-125"
          aria-label={`Locate ${name} on map`}
          title="Locate on map"
        >
          ⌖
        </button>
      )}
    </li>
  )
}

// ── "Next up" callout ────────────────────────────────────────────────────

function NextUpCallout({
  step,
  leg,
  onCheck,
  onLocate,
}: {
  step: Step
  leg: Leg | null
  onCheck: (id: string) => void
  onLocate?: () => void
}) {
  const id = checkableId(step)
  const item = step.type === 'item' ? itemsById.get(step.itemId) : undefined
  const name = step.type === 'item' ? (item?.name ?? step.itemId) : step.text
  const note =
    step.type === 'item'
      ? (step.note ?? item?.acquisition ?? '')
      : step.type === 'quest'
        ? `${step.questline} questline`
        : ''

  return (
    <div className="mx-3 my-3 shrink-0 rounded-lg border border-gold/40 bg-panel2 p-3">
      <div className="mb-1 text-[9px] font-semibold tracking-widest text-gold-dim uppercase">
        Next up{leg ? ` · ${leg.from} → ${leg.to}` : ''}
      </div>
      <div className="mb-1 text-sm font-semibold text-gold">{name}</div>
      {note && <p className="mb-2 text-xs leading-relaxed text-ink-dim">{note}</p>}
      {item?.missable && (
        <p className="mb-2 text-[10px] font-semibold text-missable">
          ⚠ MISSABLE — {item.missable.lockedBy}: {item.missable.note}
        </p>
      )}
      <div className="flex gap-2">
        {id != null && (
          <button
            onClick={() => onCheck(id)}
            className="flex-1 rounded border border-gold/60 bg-gold/10 py-1 text-xs font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            ✓ Mark done
          </button>
        )}
        {item?.map && onLocate && (
          <button
            onClick={onLocate}
            className="rounded border border-edge px-3 py-1 text-xs text-ink-dim transition-colors hover:text-gold"
          >
            ⌖ Locate
          </button>
        )}
      </div>
    </div>
  )
}

// ── Region tree drawer ────────────────────────────────────────────────────

function RegionTree({ activeRegionId, onClose }: { activeRegionId: string; onClose: () => void }) {
  const { snapshot } = useProgress()
  return (
    <div className="absolute inset-0 z-10 flex flex-col overflow-y-auto bg-panel/98 backdrop-blur-sm">
      <div className="sticky top-0 flex items-center justify-between border-b border-edge bg-panel px-3 py-2">
        <span className="font-display text-sm text-gold">Regions</span>
        <button onClick={onClose} className="text-sm text-ink-dim hover:text-ink" aria-label="Close region list">
          ✕
        </button>
      </div>
      {regions.map((region) => {
        const ids = regionCheckables(region)
        const done = countChecked(ids, snapshot.checked)
        const pct = ids.length === 0 ? 0 : Math.round((done / ids.length) * 100)
        return (
          <div key={region.id} className="border-b border-edge/50">
            <NavLink
              to={`/region/${region.id}`}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-sm hover:bg-panel2 ${isActive ? 'text-gold' : 'text-ink'}`
              }
            >
              <span className="flex-1 font-display">{region.name}</span>
              <span className="text-[10px] text-ink-dim">
                {done}/{ids.length}
              </span>
              <span className="h-1 w-8 overflow-hidden rounded bg-edge">
                <span className="block h-full bg-gold" style={{ width: `${pct}%` }} />
              </span>
            </NavLink>
            {region.id === activeRegionId &&
              region.legs.map((leg) => {
                const legIds = legCheckables(leg)
                const legDone = countChecked(legIds, snapshot.checked)
                return (
                  <NavLink
                    key={leg.id}
                    to={`/region/${region.id}/${leg.id}`}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2 py-1.5 pr-3 pl-7 text-xs hover:bg-panel2 ${
                        isActive ? 'text-gold' : 'text-ink-dim'
                      }`
                    }
                  >
                    <span className="flex-1 truncate">
                      {leg.from} → {leg.to}
                    </span>
                    <span className="text-[9px] text-ink-dim">
                      {legDone}/{legIds.length}
                    </span>
                  </NavLink>
                )
              })}
          </div>
        )
      })}
    </div>
  )
}

// ── Main RoutePanel ───────────────────────────────────────────────────────

export default function RoutePanel() {
  const { regionId, legId } = useParams()
  const navigate = useNavigate()
  const { snapshot, store } = useProgress()
  const { focus } = useUi()
  const [showTree, setShowTree] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(false)

  const region = regions.find((r) => r.id === regionId)
  if (!region) {
    return <div className="er-route-panel p-4 text-sm text-ink-dim">Region not found.</div>
  }

  // Leg navigation
  const currentLeg = legId ? (region.legs.find((l) => l.id === legId) ?? null) : null
  const currentLegIndex = currentLeg ? region.legs.indexOf(currentLeg) : -1
  const prevLeg = currentLegIndex > 0 ? region.legs[currentLegIndex - 1] : null
  const nextLeg =
    currentLegIndex >= 0 && currentLegIndex < region.legs.length - 1
      ? region.legs[currentLegIndex + 1]
      : null

  // Steps + next up (same derivation GuidePage uses for the map props)
  const steps = displaySteps(region, legId)
  const nextUpId = firstUncheckedId(steps, snapshot.checked)
  const nextUpStep = nextUpId != null ? (steps.find((s) => checkableId(s) === nextUpId) ?? null) : null

  // Checking advances to the new next-up and pans the map to it.
  function handleCheck(id: string) {
    store.toggle(id)
    const newNextUpId = firstUncheckedId(steps, store.getSnapshot().checked)
    if (newNextUpId == null) return
    const item = itemsById.get(newNextUpId)
    if (item?.map) focus(item.map, item.id)
  }

  function locateStep(step: Step) {
    if (step.type !== 'item') return
    const item = itemsById.get(step.itemId)
    if (item?.map) focus(item.map, item.id)
  }

  // Progress
  const regionIds = regionCheckables(region)
  const regionDone = countChecked(regionIds, snapshot.checked)
  const legIds = currentLeg ? legCheckables(currentLeg) : []
  const legDone = currentLeg ? countChecked(legIds, snapshot.checked) : 0

  return (
    <div className={`er-route-panel ${mobileExpanded ? 'er-route-panel--expanded' : ''}`}>
      {/* Drag handle (mobile bottom sheet) */}
      <div
        className="er-drag-handle sm:hidden"
        onClick={() => setMobileExpanded((v) => !v)}
        title="Toggle panel"
      />

      {/* Header */}
      <div className="z-[1] shrink-0 border-b border-edge bg-panel px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTree(true)}
            className="rounded border border-edge px-1.5 py-0.5 text-[10px] text-ink-dim hover:text-gold"
            title="All regions"
            aria-label="Open region list"
          >
            ≡
          </button>
          <h1 className="flex-1 truncate font-display text-sm text-gold">{region.name}</h1>
          {region.dlc && (
            <span className="rounded border border-gold-dim/40 px-1 text-[9px] text-gold-dim">DLC</span>
          )}
        </div>
        {region.legs.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px]">
            <button
              disabled={!prevLeg}
              onClick={() => prevLeg && navigate(`/region/${region.id}/${prevLeg.id}`)}
              className="rounded border border-edge px-1.5 py-0.5 text-ink-dim hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous leg"
            >
              ‹
            </button>
            <span className="flex-1 truncate text-center text-ink-dim">
              {currentLeg ? `${currentLeg.from} → ${currentLeg.to}` : 'Full region route'}
            </span>
            <button
              disabled={currentLeg ? !nextLeg : region.legs.length === 0}
              onClick={() =>
                currentLeg
                  ? nextLeg && navigate(`/region/${region.id}/${nextLeg.id}`)
                  : navigate(`/region/${region.id}/${region.legs[0].id}`)
              }
              className="rounded border border-edge px-1.5 py-0.5 text-ink-dim hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next leg"
            >
              ›
            </button>
          </div>
        )}
        <div className="mt-1.5 space-y-0.5">
          {currentLeg && <ProgressBar done={legDone} total={legIds.length} label="Leg" />}
          <ProgressBar done={regionDone} total={regionIds.length} label="Region" />
        </div>
      </div>

      {/* Next up callout */}
      {nextUpStep && (
        <NextUpCallout
          step={nextUpStep}
          leg={currentLeg}
          onCheck={handleCheck}
          onLocate={() => locateStep(nextUpStep)}
        />
      )}

      {/* Running list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-4">
        {currentLeg?.summary && (
          <p className="border-b border-edge/50 px-3 py-2 text-[11px] leading-relaxed text-ink-dim italic">
            {currentLeg.summary}
          </p>
        )}
        <ul className="space-y-0.5 py-1">
          {steps.map((step, i) => {
            const id = checkableId(step)
            const item = step.type === 'item' ? itemsById.get(step.itemId) : undefined
            return (
              <PanelStepRow
                key={id ?? `dir-${i}`}
                step={step}
                isNextUp={id != null && id === nextUpId}
                onCheck={handleCheck}
                onLocate={item?.map ? () => locateStep(step) : undefined}
              />
            )
          })}
        </ul>
        {steps.length === 0 && (
          <p className="px-3 py-4 text-xs text-ink-dim">No steps authored yet for this region.</p>
        )}
      </div>

      {/* Region tree drawer */}
      {showTree && <RegionTree activeRegionId={region.id} onClose={() => setShowTree(false)} />}
    </div>
  )
}
