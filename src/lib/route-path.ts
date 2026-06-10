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

/**
 * The immediate-direction cue: a two-point segment from the current "next up"
 * item's marker to the next mapped item step after it in the same leg, on the
 * given layer. Returns null when the next-up item isn't in the leg, has no
 * marker on this layer, or is the last mapped step.
 *
 * Pure function — rendered as a dashed polyline by MapView.
 */
export function nextUpSegment(
  leg: Leg,
  itemsById: Map<string, Item>,
  code: MapCode,
  nextUpId: string,
): [[number, number], [number, number]] | null {
  const startIndex = leg.steps.findIndex((s) => s.type === 'item' && s.itemId === nextUpId)
  if (startIndex === -1) return null
  const startStep = leg.steps[startIndex]
  if (startStep.type !== 'item') return null
  const startItem = itemsById.get(startStep.itemId)
  if (!startItem?.map || startItem.map.code !== code) return null

  for (let i = startIndex + 1; i < leg.steps.length; i++) {
    const step = leg.steps[i]
    if (step.type !== 'item') continue
    const item = itemsById.get(step.itemId)
    if (!item?.map || item.map.code !== code) continue
    return [
      [startItem.map.lat, startItem.map.lng],
      [item.map.lat, item.map.lng],
    ]
  }
  return null
}
