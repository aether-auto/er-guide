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
for (const region of regions) {
  for (const leg of region.legs)
    for (const step of leg.steps)
      if (step.type === 'item') itemPosition.set(step.itemId, { regionId: region.id, legId: leg.id })
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
