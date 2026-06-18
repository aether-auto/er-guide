import { useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { items, itemPosition, itemsById } from '../lib/data'
import { searchItems } from '../lib/search'
import { CATEGORY_META, type Category } from '../lib/types'
import { useUi } from '../App'

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as Category[]

export default function TopBar() {
  const [query, setQuery] = useState('')
  const { filters, setHideCompleted, setCategories, focus, setPendingFocus } = useUi()
  const navigate = useNavigate()
  const { regionId: currentRegionId } = useParams<{ regionId?: string }>()
  const results = searchItems(items, query)

  function jumpTo(itemId: string) {
    const pos = itemPosition.get(itemId)
    setQuery('')
    if (!pos) return

    const item = itemsById.get(itemId)
    const targetUrl = pos.legId ? `/region/${pos.regionId}/${pos.legId}` : `/region/${pos.regionId}`

    // If item has no map coords, fall back to navigate-only.
    if (!item?.map) {
      navigate(targetUrl)
      return
    }

    if (pos.regionId === currentRegionId) {
      // Same region — MapView is already mounted; call focus() directly.
      navigate(targetUrl)
      focus(item.map, itemId)
    } else {
      // Different region — set a pending focus that GuidePage will consume
      // once the new MapView has mounted and built its pins.
      setPendingFocus({ itemId, map: item.map })
      navigate(targetUrl)
    }
  }

  function toggleCategory(cat: Category) {
    const next = new Set(filters.categories ?? [])
    if (next.has(cat)) next.delete(cat)
    else next.add(cat)
    setCategories(next.size === 0 ? null : next)
  }

  return (
    <header className="relative z-[1100] flex items-center gap-3 border-b border-edge bg-panel px-4 py-2">
      <NavLink
        to="/"
        className="font-display flex items-center gap-2 whitespace-nowrap text-lg tracking-[0.12em] text-gold"
      >
        <span
          className="inline-block size-1.5 rotate-45 bg-gold shadow-[0_0_6px_1px_rgba(200,165,90,0.45)]"
          aria-hidden="true"
        />
        ER 100%
      </NavLink>
      <div className="relative max-w-md flex-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => setTimeout(() => setQuery(''), 150)}
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
          placeholder="Search items…"
          className="w-full rounded border border-edge bg-bg/60 px-3 py-1.5 text-sm outline-none transition-colors focus:border-gold-dim focus:bg-bg focus:shadow-[0_0_0_3px_rgba(200,165,90,0.07)]"
        />
        {results.length > 0 && (
          <ul className="absolute top-full right-0 left-0 z-[1100] mt-1 max-h-80 overflow-y-auto rounded border border-edge bg-panel2 shadow-xl">
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
          Filter list{filters.categories ? ` (${filters.categories.size})` : ''}
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
      {[
        { to: '/how-to', label: 'How to use' },
        { to: '/questlines', label: 'Questlines' },
        { to: '/build', label: 'Build' },
        { to: '/progress', label: 'Progress' },
        { to: '/coverage', label: 'Coverage' },
      ].map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) =>
            `er-link whitespace-nowrap text-xs tracking-wide transition-colors hover:text-gold ${
              isActive ? 'text-gold' : 'text-ink-dim'
            }`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </header>
  )
}
