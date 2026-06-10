import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { items, itemPosition } from '../lib/data'
import { searchItems } from '../lib/search'
import { CATEGORY_META, type Category } from '../lib/types'
import { useUi } from '../App'

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as Category[]

export default function TopBar() {
  const [query, setQuery] = useState('')
  const { filters, setHideCompleted, setCategories } = useUi()
  const navigate = useNavigate()
  const results = searchItems(items, query)

  function jumpTo(itemId: string) {
    const pos = itemPosition.get(itemId)
    setQuery('')
    if (!pos) return
    navigate(pos.legId ? `/region/${pos.regionId}/${pos.legId}` : `/region/${pos.regionId}`)
  }

  function toggleCategory(cat: Category) {
    const next = new Set(filters.categories ?? [])
    if (next.has(cat)) next.delete(cat)
    else next.add(cat)
    setCategories(next.size === 0 ? null : next)
  }

  return (
    <header className="relative z-10 flex items-center gap-3 border-b border-edge bg-panel px-4 py-2">
      <NavLink to="/" className="font-display whitespace-nowrap text-lg text-gold">
        ER 100%
      </NavLink>
      <div className="relative max-w-md flex-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items…"
          className="w-full rounded border border-edge bg-bg px-3 py-1 text-sm outline-none focus:border-gold-dim"
        />
        {results.length > 0 && (
          <ul className="absolute top-full right-0 left-0 mt-1 max-h-80 overflow-y-auto rounded border border-edge bg-panel2 shadow-xl">
            {results.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => jumpTo(item.id)}
                  className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm hover:bg-panel"
                >
                  {item.name}
                  <span className="text-[10px] text-ink-dim">{CATEGORY_META[item.category].label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <details className="relative">
        <summary className="cursor-pointer list-none rounded border border-edge px-2 py-1 text-xs text-ink-dim hover:text-ink">
          Filter{filters.categories ? ` (${filters.categories.size})` : ''}
        </summary>
        <div className="absolute right-0 mt-1 grid w-64 grid-cols-2 gap-1 rounded border border-edge bg-panel2 p-2 shadow-xl">
          {ALL_CATEGORIES.map((cat) => (
            <label key={cat} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={filters.categories?.has(cat) ?? false}
                onChange={() => toggleCategory(cat)}
                className="accent-gold"
              />
              {CATEGORY_META[cat].plural}
            </label>
          ))}
          <button onClick={() => setCategories(null)} className="col-span-2 mt-1 text-xs text-gold hover:underline">
            clear filters
          </button>
        </div>
      </details>
      <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-ink-dim">
        <input
          type="checkbox"
          checked={filters.hideCompleted}
          onChange={(e) => setHideCompleted(e.target.checked)}
          className="accent-gold"
        />
        hide done
      </label>
      <NavLink to="/progress" className="text-xs text-ink-dim hover:text-gold">
        Progress
      </NavLink>
      <NavLink to="/coverage" className="text-xs text-ink-dim hover:text-gold">
        Coverage
      </NavLink>
    </header>
  )
}
