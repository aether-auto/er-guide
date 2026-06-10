import type { Item, Step } from '../lib/types'
import { CATEGORY_META } from '../lib/types'
import { useProgress } from '../lib/useProgress'
import { useUi } from '../App'

export default function StepRow({ step, item }: { step: Step; item?: Item }) {
  const { snapshot, store } = useProgress()
  const { focus } = useUi()

  if (step.type === 'direction') {
    return <li className="py-1.5 pl-7 text-sm text-ink-dim italic">{step.text}</li>
  }

  const id = step.type === 'item' ? step.itemId : step.id
  const checked = snapshot.checked[id] != null
  const missable = step.type === 'quest' ? step.missable : item?.missable

  return (
    <li className={`flex items-start gap-2 rounded px-2 py-1.5 ${checked ? 'opacity-50' : ''} hover:bg-panel2`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => store.toggle(id)}
        className="mt-1 size-4 accent-gold"
        aria-label={item?.name ?? (step.type === 'item' ? step.itemId : step.text)}
      />
      <div className="min-w-0 flex-1 text-sm">
        {step.type === 'item' && item && (
          <>
            <span className={checked ? 'line-through' : ''}>{item.name}</span>
            <span className="ml-2 rounded border border-edge px-1 py-px text-[10px] text-ink-dim">
              {CATEGORY_META[item.category].label}
            </span>
            {item.dlc && <span className="ml-1 text-[10px] text-gold-dim">DLC</span>}
            {(step.note || item.acquisition) && (
              <p className="text-xs text-ink-dim">{step.note ?? item.acquisition}</p>
            )}
          </>
        )}
        {step.type === 'boss' && (
          <span className={checked ? 'line-through' : ''}>
            ⚔ {step.text} {step.optional && <em className="text-ink-dim">(optional)</em>}
          </span>
        )}
        {step.type === 'quest' && (
          <span className={checked ? 'line-through' : ''}>
            ❖ <strong className="text-gold-dim">{step.questline}:</strong> {step.text}
          </span>
        )}
        {missable && (
          <p className="mt-0.5 text-xs font-semibold text-missable">
            ⚠ MISSABLE — {missable.lockedBy}: {missable.note}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2 text-xs">
        {item?.map ? (
          <button
            onClick={() => focus(item.map!, item.id)}
            aria-label={`Show ${item.name} on map`}
            className="text-gold hover:underline"
          >
            map
          </button>
        ) : step.type === 'item' ? (
          <span className="cursor-help text-ink-dim/50" title="No marker yet — see wiki link">
            map
          </span>
        ) : null}
        {item?.wikiUrl && (
          <a href={item.wikiUrl} target="_blank" rel="noreferrer" className="text-ink-dim hover:text-gold">
            wiki
          </a>
        )}
      </div>
    </li>
  )
}
