import type { Category, Item, Step } from './types'

const fold = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['‘’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

export function searchItems(pool: Item[], query: string, limit = 20): Item[] {
  const q = fold(query)
  if (!q) return []
  const starts: Item[] = []
  const contains: Item[] = []
  for (const item of pool) {
    const name = fold(item.name)
    if (name.startsWith(q)) starts.push(item)
    else if (name.includes(q)) contains.push(item)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}

export interface UiFilters {
  hideCompleted: boolean
  categories: Set<Category> | null // null = all
}

export function stepVisible(
  step: Step,
  item: Item | undefined,
  filters: UiFilters,
  isChecked: (id: string) => boolean,
): boolean {
  if (step.type === 'direction') return true
  const id = step.type === 'item' ? step.itemId : step.id
  if (filters.hideCompleted && isChecked(id)) return false
  if (step.type === 'item' && filters.categories && item && !filters.categories.has(item.category)) return false
  return true
}
