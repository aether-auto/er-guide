import { useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  regions,
  itemsById,
  itemPosition,
  legCheckables,
  regionCheckables,
  countChecked,
  countIgnored,
  checkableId,
  displaySteps,
  allRegionSteps,
  firstUncheckedId,
  sweepSteps,
  SWEEP_LEG_ID,
} from '../lib/data'
import { CATEGORY_META } from '../lib/types'
import type { Item, Leg, Region, Step } from '../lib/types'
import { useProgress } from '../lib/useProgress'
import { useUi } from '../App'
import { buildDetailsPanelHtml } from '../lib/itemDetails'

// ── Item details panel (fan-API stat block, compact) ─────────────────────

function ItemDetailsPanel({ item }: { item: Item }) {
  if (!item.details) return null
  const html = buildDetailsPanelHtml(item.details, item.category)
  if (!html) return null
  // eslint-disable-next-line react/no-danger
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

// ── Progress bar ──────────────────────────────────────────────────────────

function ProgressBar({
  done,
  total,
  label,
  ignoredCount = 0,
}: {
  done: number
  total: number
  label: string
  ignoredCount?: number
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <span className="er-eyebrow w-10 shrink-0 !text-[9px]">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="er-num text-[10px] whitespace-nowrap text-ink-dim">
        {done}/{total}
        {ignoredCount > 0 && <span className="ml-1 opacity-60">({ignoredCount} ignored)</span>}
      </span>
    </div>
  )
}

// ── Step row inside RoutePanel ────────────────────────────────────────────

function PanelStepRow({
  step,
  isNextUp,
  onCheck,
  onIgnore,
  onLocate,
}: {
  step: Step
  isNextUp: boolean
  onCheck: (id: string) => void
  onIgnore: (id: string) => void
  onLocate?: () => void
}) {
  const { snapshot } = useProgress()

  if (step.type === 'direction') {
    return <li className="py-1 pl-6 text-xs text-ink-dim italic">{step.text}</li>
  }

  const id = checkableId(step)
  const checked = id != null && snapshot.checked[id] != null
  const ignored = id != null && snapshot.ignored[id] != null
  const item = step.type === 'item' ? itemsById.get(step.itemId) : undefined
  const missable = step.type === 'quest' ? step.missable : item?.missable
  const name = step.type === 'item' ? (item?.name ?? step.itemId) : step.text

  return (
    <li
      className={`group flex items-start gap-2 rounded px-2 py-1.5 transition-colors hover:bg-panel2 ${
        checked
          ? 'opacity-40'
          : ignored
            ? 'opacity-30'
            : isNextUp
              ? 'border border-gold-dim/50 bg-panel2 shadow-[inset_2px_0_0_var(--color-gold)]'
              : ''
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
          className={`${checked ? 'text-ink-dim line-through' : ignored ? 'text-ink-dim' : ''} ${isNextUp ? 'font-medium text-gold' : ''}`}
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
        {step.type === 'item' && !checked && !ignored && (
          <>
            {item && <ItemDetailsPanel item={item} />}
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
        {missable && !checked && !ignored && (
          <p className="mt-0.5 text-[11px] font-semibold leading-relaxed text-missable">
            ⚠ MISSABLE — {missable.lockedBy}
          </p>
        )}
      </div>
      {id != null && (
        <button
          onClick={() => onIgnore(id)}
          className={`shrink-0 text-sm leading-none transition-colors ${
            ignored ? 'text-ink hover:text-gold' : 'text-ink-dim/40 hover:text-ink-dim'
          }`}
          aria-label={ignored ? 'Restore' : 'Ignore for now'}
          title={ignored ? 'Restore' : 'Ignore for now'}
        >
          ⊘
        </button>
      )}
      {item?.map && onLocate && (
        <button
          onClick={onLocate}
          className="shrink-0 text-sm leading-none text-gold transition-transform hover:scale-125"
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
    <div className="er-card er-reveal mx-3 my-3 shrink-0 border-gold/30 p-3">
      <div className="er-eyebrow mb-1 flex items-center gap-1.5">
        <span className="inline-block size-1 rotate-45 bg-gold" aria-hidden="true" />
        Next up{leg ? ` · ${leg.from} → ${leg.to}` : ''}
      </div>
      <div className="mb-1 font-display text-sm font-semibold tracking-wide text-gold">{name}</div>
      {note && <p className="mb-2 text-xs leading-relaxed text-ink-dim">{note}</p>}
      {item?.missable && (
        <p className="mb-2 text-[10px] font-semibold text-missable">
          ⚠ MISSABLE — {item.missable.lockedBy}: {item.missable.note}
        </p>
      )}
      <div className="flex gap-2">
        {id != null && (
          <button onClick={() => onCheck(id)} className="er-btn-gold flex-1 rounded py-1.5 text-xs font-semibold">
            ✦ Mark done
          </button>
        )}
        {item?.map && onLocate && (
          <button
            onClick={onLocate}
            className="rounded border border-edge px-3 py-1 text-xs text-ink-dim transition-colors hover:border-gold-dim hover:text-gold"
          >
            ⌖ Locate
          </button>
        )}
      </div>
    </div>
  )
}

// ── Region / leg accordion (the default picker, inline in the panel body) ──

function RegionAccordion({
  currentRegionId,
  currentLegId,
  openId,
  onToggle,
  onPick,
}: {
  currentRegionId: string
  currentLegId: string | undefined
  openId: string
  onToggle: (regionId: string) => void
  onPick: () => void
}) {
  const { snapshot } = useProgress()

  function legRow(label: string, to: string, done: number, total: number, active: boolean, gem = false) {
    return (
      <NavLink
        key={to}
        to={to}
        onClick={onPick}
        className={`flex items-center gap-2 rounded py-1.5 pr-2 pl-3 text-xs transition-colors hover:bg-panel2 ${
          active
            ? 'bg-panel2 text-gold shadow-[inset_2px_0_0_var(--color-gold)]'
            : 'text-ink-dim hover:text-ink'
        }`}
      >
        {gem && <span className="inline-block size-1.5 shrink-0 rotate-45 bg-gold-dim" aria-hidden="true" />}
        <span className="flex-1 truncate">{label}</span>
        <span className="er-num text-[9px] text-ink-dim">
          {done}/{total}
        </span>
      </NavLink>
    )
  }

  return (
    <div className="er-stagger px-2 py-2">
      {regions.map((region) => {
        const ids = regionCheckables(region).filter((id) => snapshot.ignored[id] == null)
        const done = countChecked(ids, snapshot.checked)
        const pct = ids.length === 0 ? 0 : Math.round((done / ids.length) * 100)
        const expanded = region.id === openId
        const isCurrent = region.id === currentRegionId
        return (
          <div key={region.id} className="mb-0.5">
            <button
              onClick={() => onToggle(region.id)}
              className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left transition-colors hover:bg-panel2 ${
                isCurrent ? 'text-gold' : 'text-ink'
              }`}
              aria-expanded={expanded}
            >
              <span
                className={`text-[9px] text-gold-dim transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`}
                aria-hidden="true"
              >
                ▾
              </span>
              <span className="flex-1 truncate font-display text-sm tracking-wide">{region.name}</span>
              {region.dlc && (
                <span className="rounded border border-gold-dim/40 px-1 text-[8px] text-gold-dim">DLC</span>
              )}
              <span className="er-num text-[10px] text-ink-dim">{pct}%</span>
              <span className="h-1 w-8 shrink-0 overflow-hidden rounded-full bg-edge">
                <span className="block h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
              </span>
            </button>
            {expanded && (
              <div className="mb-1 ml-2 border-l border-edge pl-1">
                {region.legs.map((leg) => {
                  const legIds = legCheckables(leg).filter((id) => snapshot.ignored[id] == null)
                  const legDone = countChecked(legIds, snapshot.checked)
                  const active = isCurrent && leg.id === currentLegId
                  return legRow(`${leg.from} → ${leg.to}`, `/region/${region.id}/${leg.id}`, legDone, legIds.length, active)
                })}
                {region.cleanup.length > 0 &&
                  (() => {
                    const sweepIds = sweepSteps(region)
                      .map(checkableId)
                      .filter((id): id is string => id != null && snapshot.ignored[id] == null)
                    const sweepDone = countChecked(sweepIds, snapshot.checked)
                    const active = isCurrent && currentLegId === SWEEP_LEG_ID
                    return legRow('Region sweep', `/region/${region.id}/${SWEEP_LEG_ID}`, sweepDone, sweepIds.length, active, true)
                  })()}
                {region.legs.length === 0 && region.cleanup.length === 0 && (
                  <p className="px-3 py-1.5 text-[11px] text-ink-dim italic">No route authored yet.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main RoutePanel ───────────────────────────────────────────────────────

/** Persisted collapsed state for the desktop sidebar. */
function storedCollapsed(): boolean {
  try {
    return sessionStorage.getItem('er-panel-collapsed') === 'true'
  } catch {
    return false
  }
}

export default function RoutePanel() {
  const { regionId, legId } = useParams()
  const navigate = useNavigate()
  const { snapshot, store } = useProgress()
  const { focus } = useUi()
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const [collapsed, setCollapsed] = useState(storedCollapsed)
  // Which region is expanded in the picker. `undefined` = default to current.
  const [openRegion, setOpenRegion] = useState<string | null | undefined>(undefined)

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v
      try {
        sessionStorage.setItem('er-panel-collapsed', next ? 'true' : 'false')
      } catch {
        /* private mode */
      }
      return next
    })
  }

  const region = regions.find((r) => r.id === regionId)
  if (!region) {
    return <div className="er-route-panel p-4 text-sm text-ink-dim">Region not found.</div>
  }

  // View mode: a leg or the sweep is selected → step view; otherwise the picker.
  const isSweep = legId === SWEEP_LEG_ID
  const currentLeg = isSweep ? null : legId ? (region.legs.find((l) => l.id === legId) ?? null) : null
  const showingSteps = isSweep || currentLeg != null
  const currentLegIndex = currentLeg ? region.legs.indexOf(currentLeg) : -1
  const prevLeg = currentLegIndex > 0 ? region.legs[currentLegIndex - 1] : null
  const nextLeg =
    currentLegIndex >= 0 && currentLegIndex < region.legs.length - 1
      ? region.legs[currentLegIndex + 1]
      : null

  // Steps + next up. In the picker, the callout uses the region-wide next-up.
  const steps = showingSteps ? displaySteps(region, legId) : allRegionSteps(region)
  const nextUpId = firstUncheckedId(steps, snapshot.checked, snapshot.ignored)
  const nextUpStep = nextUpId != null ? (steps.find((s) => checkableId(s) === nextUpId) ?? null) : null
  // The leg label for the picker's region-wide next-up callout.
  const nextUpLeg =
    !showingSteps && nextUpId != null
      ? (region.legs.find((l) => l.id === itemPosition.get(nextUpId)?.legId) ?? null)
      : currentLeg

  // Checking advances to the new next-up and pans the map to it.
  function handleCheck(id: string) {
    store.toggle(id)
    const snap = store.getSnapshot()
    const newNextUpId = firstUncheckedId(steps, snap.checked, snap.ignored)
    if (newNextUpId == null) return
    const item = itemsById.get(newNextUpId)
    if (item?.map) focus(item.map, item.id)
  }

  function handleIgnore(id: string) {
    store.toggleIgnore(id)
  }

  function locateStep(step: Step) {
    if (step.type !== 'item') return
    const item = itemsById.get(step.itemId)
    if (item?.map) focus(item.map, item.id)
  }

  // Progress — ignored items are excluded from totals
  const regionIds = regionCheckables(region)
  const regionIgnoredCount = countIgnored(regionIds, snapshot.ignored)
  const regionActiveIds = regionIds.filter((id) => snapshot.ignored[id] == null)
  const regionDone = countChecked(regionActiveIds, snapshot.checked)
  const legIds = showingSteps ? steps.map(checkableId).filter((id): id is string => id != null) : []
  const legIgnoredCount = countIgnored(legIds, snapshot.ignored)
  const legActiveIds = legIds.filter((id) => snapshot.ignored[id] == null)
  const legDone = countChecked(legActiveIds, snapshot.checked)

  // Collapsed (desktop): the panel slides off-screen, leaving a slim reopen tab.
  if (collapsed) {
    return (
      <button
        onClick={toggleCollapsed}
        className="er-route-reopen hidden sm:flex"
        title="Show route panel"
        aria-label="Show route panel"
      >
        <span className="er-route-reopen__icon">›</span>
        <span className="er-route-reopen__label">Route</span>
      </button>
    )
  }

  const stepTitle = isSweep ? 'Region sweep' : currentLeg ? `${currentLeg.from} → ${currentLeg.to}` : ''

  return (
    <div className={`er-route-panel ${mobileExpanded ? 'er-route-panel--expanded' : ''}`}>
      {/* Drag handle (mobile bottom sheet) */}
      <div
        className="er-drag-handle sm:hidden"
        onClick={() => setMobileExpanded((v) => !v)}
        title="Toggle panel"
      />

      {/* Header */}
      <div className="z-[1] shrink-0 border-b border-edge bg-panel/80 px-3 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {showingSteps ? (
            <button
              onClick={() => navigate(`/region/${region.id}`)}
              className="rounded border border-edge px-1.5 py-0.5 text-[10px] text-ink-dim transition-colors hover:border-gold-dim hover:text-gold"
              title="Back to region list"
              aria-label="Back to region list"
            >
              ‹ Regions
            </button>
          ) : (
            <span className="er-eyebrow">Regions</span>
          )}
          <h1 className="flex-1 truncate font-display text-sm tracking-wide text-gold">{region.name}</h1>
          {region.dlc && (
            <span className="rounded border border-gold-dim/40 px-1 text-[9px] text-gold-dim">DLC</span>
          )}
          {/* Collapse the sidebar (desktop only) */}
          <button
            onClick={toggleCollapsed}
            className="hidden rounded border border-edge px-1.5 py-0.5 text-[10px] text-ink-dim transition-colors hover:border-gold-dim hover:text-gold sm:block"
            title="Hide route panel"
            aria-label="Hide route panel"
          >
            ‹
          </button>
        </div>

        {/* Leg navigator (step view, real legs only) */}
        {showingSteps && (
          <div className="mt-2 flex items-center gap-1 text-[10px]">
            <button
              disabled={!prevLeg}
              onClick={() => prevLeg && navigate(`/region/${region.id}/${prevLeg.id}`)}
              className="rounded border border-edge px-1.5 py-0.5 text-ink-dim transition-colors hover:border-gold-dim hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous leg"
            >
              ‹
            </button>
            <span className="flex-1 truncate text-center font-display tracking-wide text-ink-dim">
              {stepTitle}
            </span>
            <button
              disabled={!nextLeg}
              onClick={() => nextLeg && navigate(`/region/${region.id}/${nextLeg.id}`)}
              className="rounded border border-edge px-1.5 py-0.5 text-ink-dim transition-colors hover:border-gold-dim hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next leg"
            >
              ›
            </button>
          </div>
        )}

        <div className="mt-2 space-y-1">
          {showingSteps && (
            <ProgressBar
              done={legDone}
              total={legActiveIds.length}
              label={isSweep ? 'Sweep' : 'Leg'}
              ignoredCount={legIgnoredCount}
            />
          )}
          <ProgressBar
            done={regionDone}
            total={regionActiveIds.length}
            label="Region"
            ignoredCount={regionIgnoredCount}
          />
        </div>
      </div>

      {/* Next up callout (step view, or region-wide in the picker) */}
      {nextUpStep && (
        <NextUpCallout
          step={nextUpStep}
          leg={nextUpLeg}
          onCheck={handleCheck}
          onLocate={() => locateStep(nextUpStep)}
        />
      )}

      {/* Body: either the running step list, or the region/leg picker */}
      {showingSteps ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-4">
          {currentLeg?.summary && (
            <p className="border-b border-edge/50 px-3 py-2 text-[11px] leading-relaxed text-ink-dim italic">
              {currentLeg.summary}
            </p>
          )}
          {isSweep && (
            <p className="border-b border-edge/50 px-3 py-2 text-[11px] leading-relaxed text-ink-dim italic">
              Cleanup items not yet woven into a leg — collect these to finish the region.
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
                  onIgnore={handleIgnore}
                  onLocate={item?.map ? () => locateStep(step) : undefined}
                />
              )
            })}
          </ul>
          {steps.length === 0 && (
            <p className="px-3 py-4 text-xs text-ink-dim">No steps authored yet here.</p>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <RegionAccordion
            currentRegionId={region.id}
            currentLegId={legId}
            openId={openRegion === undefined ? region.id : (openRegion ?? '')}
            onToggle={(id) =>
              setOpenRegion((cur) => {
                const effective = cur === undefined ? region.id : cur
                return effective === id ? null : id
              })
            }
            onPick={() => setMobileExpanded(false)}
          />
        </div>
      )}
    </div>
  )
}
