import type { Item, Leg, MapCode } from './types'

/**
 * Returns ordered [lat, lng] pairs for item steps in `leg` whose item has
 * a map reference on the given `code` layer. Steps without a map ref or on
 * a different layer are silently skipped. Non-item steps (direction, boss,
 * quest) are always skipped.
 *
 * Pure function — no side effects, safe to call in tests and workers.
 */
export function routePathForLayer(
  leg: Leg,
  itemsById: Map<string, Item>,
  code: MapCode,
): [number, number][] {
  const coords: [number, number][] = []
  for (const step of leg.steps) {
    if (step.type !== 'item') continue
    const item = itemsById.get(step.itemId)
    if (!item?.map) continue
    if (item.map.code !== code) continue
    coords.push([item.map.lat, item.map.lng])
  }
  return coords
}
