import type { Item, Leg, Region, Step } from './types'
import itemsJson from '../../data/items.json'

const regionModules = import.meta.glob('../../data/regions/*.json', { eager: true }) as Record<
  string,
  { default: Region }
>

export const items = itemsJson as Item[]
export const itemsById = new Map(items.map((i) => [i.id, i]))

export const regions: Region[] = Object.values(regionModules)
  .map((m) => m.default)
  .sort((a, b) => a.order - b.order)

export interface ItemPosition {
  regionId: string
  legId: string | null // null = region cleanup
}

export const itemPosition = new Map<string, ItemPosition>()
/** Routed step note for an item (first authored note wins) — popup info cards. */
export const stepNoteByItemId = new Map<string, string>()
for (const region of regions) {
  for (const leg of region.legs)
    for (const step of leg.steps)
      if (step.type === 'item') {
        itemPosition.set(step.itemId, { regionId: region.id, legId: leg.id })
        if (step.note && !stepNoteByItemId.has(step.itemId)) stepNoteByItemId.set(step.itemId, step.note)
      }
  for (const id of region.cleanup) itemPosition.set(id, { regionId: region.id, legId: null })
}

export function checkableId(step: Step): string | null {
  if (step.type === 'item') return step.itemId
  if (step.type === 'boss' || step.type === 'quest') return step.id
  return null
}

export function legCheckables(leg: Leg): string[] {
  return leg.steps.map(checkableId).filter((id): id is string => id != null)
}

export function regionCheckables(region: Region): string[] {
  return [...region.legs.flatMap(legCheckables), ...region.cleanup]
}

export function countChecked(ids: string[], checked: Record<string, number>): number {
  return ids.reduce((n, id) => (checked[id] != null ? n + 1 : n), 0)
}

export function countIgnored(ids: string[], ignored: Record<string, number>): number {
  return ids.reduce((n, id) => (ignored[id] != null ? n + 1 : n), 0)
}

/** Sentinel leg id for the "Region sweep" view (the region's cleanup items).
 *  Routed as /region/:id/sweep — a selectable pseudo-leg, so unrouted items
 *  stay checkable in the panel without a "full region" mega-list. */
export const SWEEP_LEG_ID = 'sweep'

/** The region's cleanup items as item steps (the "Region sweep" view). */
export function sweepSteps(region: Region): Step[] {
  return region.cleanup.map((id): Step => ({ type: 'item', itemId: id }))
}

/**
 * Steps shown for the panel: the selected leg's steps, the cleanup sweep
 * (legId === 'sweep'), or [] when no leg is selected (the panel shows the
 * region/leg picker instead — there is no "full region" combined list).
 */
export function displaySteps(region: Region, legId?: string): Step[] {
  if (legId === SWEEP_LEG_ID) return sweepSteps(region)
  const leg = legId ? region.legs.find((l) => l.id === legId) : undefined
  return leg ? leg.steps : []
}

/** Every checkable step in a region in route order, ending with the cleanup
 *  sweep — used only to derive the map's region-wide "next up" pin when no
 *  specific leg is selected. */
export function allRegionSteps(region: Region): Step[] {
  return [...region.legs.flatMap((l) => l.steps), ...sweepSteps(region)]
}

/** First unchecked, non-ignored checkable step's id — the "next up" target. */
export function firstUncheckedId(
  steps: Step[],
  checked: Record<string, number>,
  ignored: Record<string, number> = {},
): string | null {
  for (const step of steps) {
    const id = checkableId(step)
    if (id != null && checked[id] == null && ignored[id] == null) return id
  }
  return null
}

// ── NPC questlines ──────────────────────────────────────────────────────────

/** One quest step, flattened with its region/leg context for the questline view. */
export interface QuestStep {
  id: string
  questline: string
  text: string
  missable: { lockedBy: string; note: string } | null
  regionId: string
  regionName: string
  regionOrder: number
  legId: string
  legFrom: string
  legTo: string
}

export interface Questline {
  /** Canonical display name (collapses minor naming variants). */
  name: string
  steps: QuestStep[]
}

/** Some authored `questline` strings are variants of the same NPC arc.
 *  Map them to one canonical name so the questline tab groups them together. */
const QUESTLINE_ALIASES: Record<string, string> = {
  'Varré': 'White-Faced Varré',
  'Sellen': 'Sorceress Sellen',
  'Millicent': 'Gowry / Millicent',
  'Needle Knight Leda': 'Leda',
  'Needle Knight Leda / Hornsent': 'Leda',
  'Redmane Freyja': 'Freyja',
  'Iron Fist Alexander': 'Alexander',
  'Jerren / Alexander': 'Alexander',
  'Goldmask / Brother Corhyn': 'Corhyn/Goldmask',
  'Thiollier / St. Trina': 'Thiollier',
}

function canonicalQuestline(name: string): string {
  return QUESTLINE_ALIASES[name] ?? name
}

/**
 * All NPC questlines, each a grouped, in-game-order list of its quest steps.
 * Built once at module load from every region's authored `quest` steps.
 * Ordered by the region/leg in which each questline first appears, so the
 * list reads in the order a player naturally encounters NPCs.
 */
export const questlines: Questline[] = (() => {
  const byName = new Map<string, QuestStep[]>()
  // Leg index per step, kept off the public QuestStep objects so it never leaks
  // into serialized/spread output.
  const legIndexOf = new WeakMap<QuestStep, number>()
  for (const region of regions) {
    region.legs.forEach((leg, legIndex) => {
      for (const step of leg.steps) {
        if (step.type !== 'quest') continue
        const name = canonicalQuestline(step.questline)
        const quest: QuestStep = {
          id: step.id,
          questline: name,
          text: step.text,
          missable: step.missable ?? null,
          regionId: region.id,
          regionName: region.name,
          regionOrder: region.order,
          legId: leg.id,
          legFrom: leg.from,
          legTo: leg.to,
        }
        legIndexOf.set(quest, legIndex)
        const list = byName.get(name) ?? []
        list.push(quest)
        byName.set(name, list)
      }
    })
  }
  // Sort each questline's steps by region order, then leg order.
  for (const steps of byName.values()) {
    steps.sort((a, b) => {
      if (a.regionOrder !== b.regionOrder) return a.regionOrder - b.regionOrder
      return (legIndexOf.get(a) ?? 0) - (legIndexOf.get(b) ?? 0)
    })
  }
  // Order questlines by where they first appear in the route.
  const lines = [...byName.entries()].map(([name, steps]) => ({ name, steps }))
  lines.sort((a, b) => {
    const fa = a.steps[0]
    const fb = b.steps[0]
    if (fa.regionOrder !== fb.regionOrder) return fa.regionOrder - fb.regionOrder
    return (legIndexOf.get(fa) ?? 0) - (legIndexOf.get(fb) ?? 0)
  })
  return lines
})()
