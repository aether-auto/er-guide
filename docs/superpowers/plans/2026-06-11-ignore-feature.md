# Ignore Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third per-item state "ignored" that means "skip this for now, revisit later" — distinct from checked (done) and normal (todo).

**Architecture:** `ignored: Record<string, number>` is added per-profile in `SaveData`/`ProgressSnapshot`, backward-compatible with `schemaVersion: 1` (old saves without the field default to `{}`). `toggleIgnore(id)` is mutually exclusive with `toggle(id)`. `firstUncheckedId` in data.ts accepts an optional `ignored` map and skips ignored ids. RoutePanel and MapView receive the ignored set from the snapshot and render grey/dimmed rows and pins respectively.

**Tech Stack:** TypeScript, React 19, Leaflet, Vitest, Playwright, Tailwind CSS v4

---

## File Structure

| File | Change |
|------|--------|
| `src/lib/progress.ts` | Extend `SaveData`, `ProgressSnapshot`, `parseSave`, `createProgressStore` with `ignored`; add `toggleIgnore`, `isIgnored` |
| `src/lib/progress.test.ts` | Add 4 new tests: toggleIgnore basics, mutual exclusivity, old-save compatibility, round-trip export/import |
| `src/lib/data.ts` | Update `firstUncheckedId` signature to accept optional `ignored` map; skip ignored ids |
| `src/lib/data.test.ts` | Add 2 tests: firstUncheckedId skips ignored; countChecked ignores the ignored set |
| `src/lib/markers.ts` | Add `'ignored'` to `MarkerVariant` union; update `categoryIcon` to render grey ring at 35% opacity |
| `src/index.css` | Add `.er-pin--ignored` rule: grey ring, 35% opacity, no glyph color |
| `src/components/RoutePanel.tsx` | Pass `ignored` from snapshot; add ignore toggle button to `PanelStepRow`; grey ignored rows; exclude ignored from progress counters; show "(N ignored)" suffix; pass `ignored` to `firstUncheckedId` calls |
| `src/components/MapView.tsx` | Update variant calculation to include `'ignored'`; update subscriber diffing; add "Ignore for now"/"Restore" button in popup |
| `src/pages/ProgressPage.tsx` | Exclude ignored from category/region totals; show total ignored count |
| `scripts/verify-map.mjs` | Add 3 acceptance checks: ignore from panel greys row + pin + skips next-up; restore works; ignored excluded from leg progress count |

---

## Task 1: Extend progress.ts — store `ignored`, `toggleIgnore`, `isIgnored` (TDD)

**Files:**
- Modify: `src/lib/progress.test.ts`
- Modify: `src/lib/progress.ts`

- [ ] **Step 1.1: Write failing tests for ignore feature**

Add to the bottom of `src/lib/progress.test.ts` (inside the `describe` block):

```typescript
  it('toggleIgnore marks item ignored and stores a timestamp', () => {
    const store = createProgressStore(fakeStorage())
    expect(store.isIgnored('x')).toBe(false)
    store.toggleIgnore('x')
    expect(store.isIgnored('x')).toBe(true)
    store.toggleIgnore('x')
    expect(store.isIgnored('x')).toBe(false)
  })

  it('ignoring an item unchecks it; checking an item un-ignores it', () => {
    const store = createProgressStore(fakeStorage())
    store.toggle('x')
    expect(store.isChecked('x')).toBe(true)
    store.toggleIgnore('x')                        // ignore it
    expect(store.isChecked('x')).toBe(false)        // unchecked
    expect(store.isIgnored('x')).toBe(true)

    store.toggle('x')                              // check it again
    expect(store.isChecked('x')).toBe(true)
    expect(store.isIgnored('x')).toBe(false)        // un-ignored
  })

  it('loads old saves without ignored field — defaults to {}', () => {
    const oldSave = JSON.stringify({
      schemaVersion: 1,
      activeProfile: 'default',
      profiles: { default: { checked: { 'talisman-foo': 12345 } } },
    })
    const storage = fakeStorage({ 'er-guide-progress-v1': oldSave })
    const store = createProgressStore(storage)
    expect(store.isChecked('talisman-foo')).toBe(true)
    expect(store.isIgnored('any-id')).toBe(false)
    expect(store.getSnapshot().ignored).toEqual({})
  })

  it('ignored persists in export/import round-trip', () => {
    const a = createProgressStore(fakeStorage())
    a.toggleIgnore('weapon-foo')
    a.toggle('weapon-bar')
    const b = createProgressStore(fakeStorage())
    b.importJson(a.exportJson())
    expect(b.isIgnored('weapon-foo')).toBe(true)
    expect(b.isChecked('weapon-bar')).toBe(true)
    expect(b.isIgnored('weapon-bar')).toBe(false)
  })
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm test 2>&1 | grep -E "FAIL|pass|fail|isIgnored|toggleIgnore"
```

Expected: 4 failures mentioning `isIgnored` / `toggleIgnore` not found.

- [ ] **Step 1.3: Update `SaveData`, `ProgressSnapshot`, `parseSave`, `createProgressStore` in `src/lib/progress.ts`**

Replace the entire file with:

```typescript
export interface SaveData {
  schemaVersion: 1
  activeProfile: string
  profiles: Record<string, { checked: Record<string, number>; ignored: Record<string, number> }>
}

export interface ProgressSnapshot {
  activeProfile: string
  profiles: string[]
  checked: Record<string, number>
  ignored: Record<string, number>
  hasBackup: boolean
}

const KEY = 'er-guide-progress-v1'
const BACKUP_KEY = 'er-guide-progress-backup'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function fresh(): SaveData {
  return {
    schemaVersion: 1,
    activeProfile: 'default',
    profiles: { default: { checked: {}, ignored: {} } },
  }
}

function parseSave(text: string): SaveData {
  const parsed = JSON.parse(text) as SaveData
  const valid =
    parsed != null &&
    parsed.schemaVersion === 1 &&
    typeof parsed.activeProfile === 'string' &&
    typeof parsed.profiles === 'object' &&
    parsed.profiles[parsed.activeProfile] != null &&
    typeof parsed.profiles[parsed.activeProfile].checked === 'object'
  if (!valid) throw new Error('Not a valid er-guide save')
  // Backward compat: old saves without `ignored` — default to {}
  for (const profileId of Object.keys(parsed.profiles)) {
    const p = parsed.profiles[profileId]
    if (!p.ignored || typeof p.ignored !== 'object') {
      p.ignored = {}
    }
  }
  return parsed
}

export function createProgressStore(storage: StorageLike) {
  let data: SaveData
  const raw = storage.getItem(KEY)
  if (raw == null) {
    data = fresh()
  } else {
    try {
      data = parseSave(raw)
    } catch {
      storage.setItem(BACKUP_KEY, raw) // never silently wipe (spec §9)
      data = fresh()
    }
  }

  const listeners = new Set<() => void>()
  let snapshot = makeSnapshot()

  function makeSnapshot(): ProgressSnapshot {
    return {
      activeProfile: data.activeProfile,
      profiles: Object.keys(data.profiles),
      checked: { ...data.profiles[data.activeProfile].checked },
      ignored: { ...data.profiles[data.activeProfile].ignored },
      hasBackup: storage.getItem(BACKUP_KEY) != null,
    }
  }

  function persist() {
    try {
      storage.setItem(KEY, JSON.stringify(data))
    } catch {
      // quota exceeded / private mode: keep in-memory state consistent, don't crash
    }
    snapshot = makeSnapshot()
    listeners.forEach((fn) => fn())
  }

  return {
    subscribe(fn: () => void) {
      listeners.add(fn)
      return () => void listeners.delete(fn)
    },
    getSnapshot: () => snapshot,
    isChecked: (id: string) => snapshot.checked[id] != null,
    isIgnored: (id: string) => snapshot.ignored[id] != null,
    toggle(id: string) {
      const profile = data.profiles[data.activeProfile]
      if (profile.checked[id] != null) {
        delete profile.checked[id]
      } else {
        profile.checked[id] = Date.now()
        // Checking un-ignores
        delete profile.ignored[id]
      }
      persist()
    },
    toggleIgnore(id: string) {
      const profile = data.profiles[data.activeProfile]
      if (profile.ignored[id] != null) {
        delete profile.ignored[id]
      } else {
        profile.ignored[id] = Date.now()
        // Ignoring unchecks
        delete profile.checked[id]
      }
      persist()
    },
    switchProfile(name: string) {
      if (!data.profiles[name]) data.profiles[name] = { checked: {}, ignored: {} }
      data.activeProfile = name
      persist()
    },
    exportJson: () => JSON.stringify(data, null, 2),
    importJson(text: string) {
      data = parseSave(text) // throws before mutating on bad input
      persist()
    },
  }
}

export type ProgressStore = ReturnType<typeof createProgressStore>
```

- [ ] **Step 1.4: Run all tests to verify they pass**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm test 2>&1 | tail -15
```

Expected: 64 tests pass (60 existing + 4 new).

- [ ] **Step 1.5: Typecheck**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm run typecheck 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 1.6: Commit**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && git add src/lib/progress.ts src/lib/progress.test.ts && git commit -m "$(cat <<'EOF'
feat(progress): add ignored state with toggleIgnore, mutual-exclusivity with checked, backward-compat load

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Update data.ts — `firstUncheckedId` skips ignored items

**Files:**
- Modify: `src/lib/data.ts`
- Modify: `src/lib/data.test.ts`

- [ ] **Step 2.1: Write failing tests for updated `firstUncheckedId`**

Add to the bottom of the `describe('data helpers', ...)` block in `src/lib/data.test.ts`:

```typescript
  it('firstUncheckedId returns first unchecked id', () => {
    const steps = leg.steps
    expect(firstUncheckedId(steps, {}, {})).toBe('talisman-x')
    expect(firstUncheckedId(steps, { 'talisman-x': 1 }, {})).toBe('boss-y')
  })

  it('firstUncheckedId skips ignored ids', () => {
    const steps = leg.steps
    expect(firstUncheckedId(steps, {}, { 'talisman-x': 1 })).toBe('boss-y')
    expect(firstUncheckedId(steps, {}, { 'talisman-x': 1, 'boss-y': 1 })).toBe('quest-z')
    expect(firstUncheckedId(steps, {}, { 'talisman-x': 1, 'boss-y': 1, 'quest-z': 1 })).toBe(null)
  })
```

Also add the import for `firstUncheckedId` at the top of the test file (it's currently imported from `./data`):

```typescript
import { checkableId, countChecked, firstUncheckedId, legCheckables, regionCheckables } from './data'
```

- [ ] **Step 2.2: Run tests to verify they fail**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm test src/lib/data.test.ts 2>&1 | tail -20
```

Expected: 2 new failures about `firstUncheckedId` signature mismatch.

- [ ] **Step 2.3: Update `firstUncheckedId` in `src/lib/data.ts`**

Replace only the function at the bottom:

```typescript
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
```

- [ ] **Step 2.4: Run all tests to verify they pass**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm test 2>&1 | tail -15
```

Expected: 66 tests pass.

- [ ] **Step 2.5: Typecheck**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm run typecheck 2>&1 | tail -10
```

Expected: no errors (RoutePanel calls will need updating next, but the default `{}` prevents type errors before that).

- [ ] **Step 2.6: Commit**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && git add src/lib/data.ts src/lib/data.test.ts && git commit -m "$(cat <<'EOF'
feat(data): firstUncheckedId skips ignored items (optional second param, backward-compat default {})

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add `er-pin--ignored` CSS + `'ignored'` MarkerVariant

**Files:**
- Modify: `src/index.css`
- Modify: `src/lib/markers.ts`

- [ ] **Step 3.1: Add `er-pin--ignored` CSS rule to `src/index.css`**

Insert after the `er-pin--nextup` block (after line ~84):

```css
/* Ignored: grey ring, reduced opacity, muted glyph — no strikethrough */
.er-pin--ignored {
  filter: saturate(0) opacity(0.35);
  border-color: #666;
}
```

- [ ] **Step 3.2: Add `'ignored'` to `MarkerVariant` in `src/lib/markers.ts`**

Replace this line:

```typescript
export type MarkerVariant = 'normal' | 'checked' | 'nextup'
```

with:

```typescript
export type MarkerVariant = 'normal' | 'checked' | 'nextup' | 'ignored'
```

No other changes needed in markers.ts — `categoryIcon` already uses template literal `er-pin--${variant}` so it will automatically pick up the new class.

- [ ] **Step 3.3: Typecheck**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm run typecheck 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3.4: Commit**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && git add src/index.css src/lib/markers.ts && git commit -m "$(cat <<'EOF'
feat(markers): add ignored MarkerVariant with grey 35% opacity CSS rule

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Update MapView — variant diffing + popup ignore button

**Files:**
- Modify: `src/components/MapView.tsx`

- [ ] **Step 4.1: Update the progress subscriber variant calculation**

In `src/components/MapView.tsx`, find the `progressStore.subscribe(...)` callback. The current variant calculation is:

```typescript
const variant: MarkerVariant =
  itemId === nextUpId ? 'nextup' : snapshot.checked[itemId] != null ? 'checked' : 'normal'
```

Replace it with:

```typescript
const variant: MarkerVariant =
  itemId === nextUpId
    ? 'nextup'
    : snapshot.checked[itemId] != null
      ? 'checked'
      : snapshot.ignored[itemId] != null
        ? 'ignored'
        : 'normal'
```

- [ ] **Step 4.2: Update the `renderItems` function variant calculation**

In `renderItems`, find:

```typescript
const isChecked = snapshot.checked[item.id] != null
const isNextUp = item.id === nextUpId
const variant: MarkerVariant = isNextUp ? 'nextup' : isChecked ? 'checked' : 'normal'
```

Replace with:

```typescript
const isChecked = snapshot.checked[item.id] != null
const isIgnored = snapshot.ignored[item.id] != null
const isNextUp = item.id === nextUpId
const variant: MarkerVariant = isNextUp ? 'nextup' : isChecked ? 'checked' : isIgnored ? 'ignored' : 'normal'
```

- [ ] **Step 4.3: Add "Ignore for now"/"Restore" button in `buildPopup`**

In `buildPopup`, the current HTML for the button at the bottom of `el.innerHTML` is:

```typescript
    <button class="er-popup-check ${isChecked ? 'er-popup-check--done' : ''}">
      ${isChecked ? '✓ Checked — tap to undo' : '✓ Mark done'}
    </button>
```

Replace the entire `el.innerHTML` assignment with the version that includes the ignore button. The full new assignment for the inner HTML section (replace only the template literal string after the backtick through the closing backtick):

```typescript
  const isIgnored = snapshot.ignored != null && snapshot.ignored[itemId] != null

  el.className = 'er-popup-card'
  el.innerHTML = `
    <div class="er-popup-card__name">${escapeText(item.name)}</div>
    <div class="er-popup-card__meta">
      <span class="er-popup-card__chip">${CATEGORY_META[item.category].label}</span>
      ${item.dlc ? '<span class="er-popup-card__chip er-popup-card__chip--dlc">DLC</span>' : ''}
    </div>
    <div class="er-popup-card__body">
      ${item.acquisition ? `<p class="er-popup-card__acq">${escapeText(item.acquisition)}</p>` : ''}
      ${stepNote && stepNote !== item.acquisition ? `<p class="er-popup-card__note">⌖ Route note: ${escapeText(stepNote)}</p>` : ''}
      ${item.quest ? `<p class="er-popup-card__quest">❖ Quest: ${escapeText(item.quest)}</p>` : ''}
    </div>
    ${
      item.missable
        ? `<div class="er-popup-card__missable">⚠ MISSABLE — ${escapeText(item.missable.lockedBy)}<br><span>${escapeText(item.missable.note)}</span></div>`
        : ''
    }
    <div style="display:flex;gap:6px;margin-top:6px;">
      <button class="er-popup-check ${isChecked ? 'er-popup-check--done' : ''}" style="flex:1">
        ${isChecked ? '✓ Checked — tap to undo' : '✓ Mark done'}
      </button>
      <button class="er-popup-ignore ${isIgnored ? 'er-popup-ignore--active' : ''}" aria-label="${isIgnored ? 'Restore' : 'Ignore for now'}" style="flex-shrink:0">
        ${isIgnored ? '↩ Restore' : '⊘ Ignore'}
      </button>
    </div>
  `
```

Then update the event listeners section to also wire the ignore button:

```typescript
  el.querySelector('.er-popup-check')?.addEventListener('click', () => {
    progressStore.toggle(itemId)
    map.closePopup()
  })

  el.querySelector('.er-popup-ignore')?.addEventListener('click', () => {
    progressStore.toggleIgnore(itemId)
    map.closePopup()
  })
```

- [ ] **Step 4.4: Add CSS for the popup ignore button in `src/index.css`**

Find the existing `.er-popup-check` styles (search with `grep -n "er-popup-check" src/index.css`). After those styles, add:

```css
.er-popup-ignore {
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #444;
  background: transparent;
  color: #8f887a;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.er-popup-ignore:hover {
  background: rgba(255,255,255,0.05);
  color: #d8d2c4;
}
.er-popup-ignore--active {
  border-color: #666;
  color: #d8d2c4;
}
```

- [ ] **Step 4.5: Typecheck**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm run typecheck 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4.6: Run all tests**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm test 2>&1 | tail -10
```

Expected: 66 tests pass (no regressions; MapView has no unit tests).

- [ ] **Step 4.7: Commit**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && git add src/components/MapView.tsx src/index.css && git commit -m "$(cat <<'EOF'
feat(MapView): ignored pin variant (grey), popup ignore/restore button, subscriber diffing handles ignored

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Update RoutePanel — ignore toggle button, grey rows, progress counters

**Files:**
- Modify: `src/components/RoutePanel.tsx`

- [ ] **Step 5.1: Add `countIgnored` helper in `data.ts` (or inline in RoutePanel)**

Add to `src/lib/data.ts` after `countChecked`:

```typescript
export function countIgnored(ids: string[], ignored: Record<string, number>): number {
  return ids.reduce((n, id) => (ignored[id] != null ? n + 1 : n), 0)
}
```

Add the corresponding test in `src/lib/data.test.ts`:

```typescript
  it('countIgnored counts only ignored ids', () => {
    expect(countIgnored(['a', 'b', 'c'], { a: 1, d: 99 })).toBe(1)
  })
```

Import `countIgnored` in tests:

```typescript
import { checkableId, countChecked, countIgnored, firstUncheckedId, legCheckables, regionCheckables } from './data'
```

Run tests to confirm 67 tests pass:

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm test 2>&1 | tail -10
```

- [ ] **Step 5.2: Update `PanelStepRow` to accept `onIgnore` prop and render ignore button + grey style**

In `src/components/RoutePanel.tsx`, update the `PanelStepRow` props and component:

```typescript
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
      className={`flex items-start gap-2 rounded px-2 py-1.5 transition-colors hover:bg-panel2 ${
        checked ? 'opacity-40' : ignored ? 'opacity-30' : isNextUp ? 'border border-edge bg-panel2' : ''
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
          className={`${checked ? 'text-ink-dim line-through' : ignored ? 'text-ink-dim' : ''} ${isNextUp && !ignored ? 'font-medium text-gold' : ''}`}
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
          className={`shrink-0 text-sm leading-none transition-colors ${ignored ? 'text-ink hover:text-gold' : 'text-ink-dim/40 hover:text-ink-dim'}`}
          aria-label={ignored ? 'Restore' : 'Ignore for now'}
          title={ignored ? 'Restore' : 'Ignore for now'}
        >
          ⊘
        </button>
      )}
      {item?.map && onLocate && !ignored && (
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
```

- [ ] **Step 5.3: Update progress counters in `RoutePanel` to exclude ignored; update `firstUncheckedId` calls; add "(N ignored)" suffix**

In the `RoutePanel` component body, update these lines:

Import `countIgnored` from data:

```typescript
import {
  regions,
  itemsById,
  legCheckables,
  regionCheckables,
  countChecked,
  countIgnored,
  checkableId,
  displaySteps,
  firstUncheckedId,
} from '../lib/data'
```

Update the `nextUpId` derivation:

```typescript
const nextUpId = firstUncheckedId(steps, snapshot.checked, snapshot.ignored)
```

Update the progress counters section:

```typescript
  // Progress — ignored items excluded from totals
  const regionIds = regionCheckables(region)
  const regionIgnoredCount = countIgnored(regionIds, snapshot.ignored)
  const regionActiveIds = regionIds.filter((id) => snapshot.ignored[id] == null)
  const regionDone = countChecked(regionActiveIds, snapshot.checked)

  const legIds = currentLeg ? legCheckables(currentLeg) : []
  const legIgnoredCount = currentLeg ? countIgnored(legIds, snapshot.ignored) : 0
  const legActiveIds = legIds.filter((id) => snapshot.ignored[id] == null)
  const legDone = currentLeg ? countChecked(legActiveIds, snapshot.checked) : 0
```

Update the `ProgressBar` calls:

```typescript
          {currentLeg && (
            <ProgressBar
              done={legDone}
              total={legActiveIds.length}
              label="Leg"
              ignoredCount={legIgnoredCount}
            />
          )}
          <ProgressBar
            done={regionDone}
            total={regionActiveIds.length}
            label="Region"
            ignoredCount={regionIgnoredCount}
          />
```

Update the `ProgressBar` component to accept and render an `ignoredCount`:

```typescript
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
      <span className="w-10 text-[10px] whitespace-nowrap text-ink-dim">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded bg-edge">
        <span className="block h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[10px] whitespace-nowrap text-ink-dim">
        {done}/{total}
        {ignoredCount > 0 && (
          <span className="ml-1 opacity-60">({ignoredCount} ignored)</span>
        )}
      </span>
    </div>
  )
}
```

Update the `handleCheck` function to pass `ignored` to `firstUncheckedId`:

```typescript
  function handleCheck(id: string) {
    store.toggle(id)
    const newNextUpId = firstUncheckedId(steps, store.getSnapshot().checked, store.getSnapshot().ignored)
    if (newNextUpId == null) return
    const item = itemsById.get(newNextUpId)
    if (item?.map) focus(item.map, item.id)
  }
```

Add `handleIgnore` function:

```typescript
  function handleIgnore(id: string) {
    store.toggleIgnore(id)
  }
```

Update all `PanelStepRow` usages in the `steps.map(...)` to pass `onIgnore`:

```typescript
              <PanelStepRow
                key={id ?? `dir-${i}`}
                step={step}
                isNextUp={id != null && id === nextUpId}
                onCheck={handleCheck}
                onIgnore={handleIgnore}
                onLocate={item?.map ? () => locateStep(step) : undefined}
              />
```

- [ ] **Step 5.4: Typecheck**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm run typecheck 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 5.5: Run all tests**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm test 2>&1 | tail -10
```

Expected: 67 tests pass.

- [ ] **Step 5.6: Commit**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && git add src/components/RoutePanel.tsx src/lib/data.ts src/lib/data.test.ts && git commit -m "$(cat <<'EOF'
feat(RoutePanel): ignore toggle per row, grey ignored rows, progress bars exclude ignored with (N ignored) suffix

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Update ProgressPage — exclude ignored from totals

**Files:**
- Modify: `src/pages/ProgressPage.tsx`

- [ ] **Step 6.1: Update the category + region tables to exclude ignored items**

In `src/pages/ProgressPage.tsx`, update the `byCategory` computation:

```typescript
  const byCategory = new Map<Category, { total: number; done: number }>()
  for (const item of items) {
    if (snapshot.ignored[item.id] != null) continue   // excluded from totals
    const row = byCategory.get(item.category) ?? { total: 0, done: 0 }
    row.total++
    if (snapshot.checked[item.id] != null) row.done++
    byCategory.set(item.category, row)
  }
```

Add a total ignored count variable after `byCategory`:

```typescript
  const totalIgnored = Object.keys(snapshot.ignored).length
```

Update `missablesPending` to exclude ignored items:

```typescript
  const missablesPending = items.filter(
    (i) => i.missable && snapshot.checked[i.id] == null && snapshot.ignored[i.id] == null,
  )
```

Update the region table to exclude ignored from totals. Import `countIgnored` in `src/pages/ProgressPage.tsx`:

```typescript
import { items, regions, regionCheckables, countChecked, countIgnored, itemPosition } from '../lib/data'
```

Inside the region table's `.map(...)`:

```typescript
                {regions.map((region) => {
                  const ids = regionCheckables(region)
                  const activeIds = ids.filter((id) => snapshot.ignored[id] == null)
                  const done = countChecked(activeIds, snapshot.checked)
                  const ignoredCount = countIgnored(ids, snapshot.ignored)
                  return (
                    <tr key={region.id} className="border-b border-edge/50">
                      <td className="py-1">
                        <NavLink to={`/region/${region.id}`} className="hover:text-gold">{region.name}</NavLink>
                      </td>
                      <td className={`py-1 text-right ${done === activeIds.length && activeIds.length > 0 ? 'text-done' : 'text-ink-dim'}`}>
                        {done}/{activeIds.length}
                        {ignoredCount > 0 && <span className="ml-1 text-[9px] opacity-50">({ignoredCount}⊘)</span>}
                      </td>
                    </tr>
                  )
                })}
```

Add a total ignored summary after the two tables, e.g. before the end of `</section>`:

```typescript
        {totalIgnored > 0 && (
          <p className="mt-3 text-xs text-ink-dim">
            {totalIgnored} item{totalIgnored !== 1 ? 's' : ''} ignored (⊘) — excluded from all totals.
          </p>
        )}
```

- [ ] **Step 6.2: Typecheck**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm run typecheck 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 6.3: Run all tests**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm test 2>&1 | tail -10
```

Expected: 67 tests pass.

- [ ] **Step 6.4: Commit**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && git add src/pages/ProgressPage.tsx && git commit -m "$(cat <<'EOF'
feat(ProgressPage): exclude ignored items from category/region totals, show total ignored count

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Add acceptance checks in verify-map.mjs

**Files:**
- Modify: `scripts/verify-map.mjs`

These 3 checks validate the full end-to-end ignore flow in the browser.

- [ ] **Step 7.1: Add the 3 acceptance checks before the `await browser.close()` line**

Find the line `await browser.close()` at the bottom of `scripts/verify-map.mjs` and insert above it:

```javascript
// 14 ── Ignore feature: from panel → row greys + pin greys + next-up skips it
{
  const ignCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const ignPage = await ignCtx.newPage()
  // Navigate to weeping-peninsula in a fresh context (no prior checks)
  await ignPage.goto(`${BASE}#/region/weeping-peninsula/weeping-01`)
  await ignPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await ignPage.waitForTimeout(2000)

  // Read the current "Next up" item name before ignoring
  const nextUpBefore = await ignPage.locator('.er-route-panel .text-gold.font-semibold').first().textContent()

  // Click the ⊘ ignore button on the first checkable row (the next-up item)
  // The first row with an aria-label of "Ignore for now" is the first checkable
  const ignoreBtn = ignPage.getByRole('button', { name: 'Ignore for now' }).first()
  await ignoreBtn.scrollIntoViewIfNeeded()
  await ignoreBtn.click()
  await ignPage.waitForTimeout(800)

  // Next up must have changed (ignored item skipped)
  const nextUpAfter = await ignPage.locator('.er-route-panel .text-gold.font-semibold').first().textContent()
  check('Ignore: next-up advances past ignored item', nextUpBefore !== nextUpAfter,
    `${(nextUpBefore ?? '').slice(0, 40)} → ${(nextUpAfter ?? '').slice(0, 40)}`)

  // The ignored row must have lower opacity (class includes opacity-30)
  const ignoredRowOpacity = await ignPage.locator('.er-route-panel li.opacity-30').count()
  check('Ignore: row is greyed (opacity-30)', ignoredRowOpacity > 0, `${ignoredRowOpacity} greyed rows`)

  // The pin for the ignored item must use er-pin--ignored class
  const ignoredPins = await ignPage.locator('.er-pin--ignored').count()
  check('Ignore: map pin uses er-pin--ignored class', ignoredPins > 0, `${ignoredPins} ignored pins`)

  await ignCtx.close()
}

// 15 ── Ignore restore: ignored count drops, row no longer greyed
{
  const restCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const restPage = await restCtx.newPage()
  await restPage.goto(`${BASE}#/region/weeping-peninsula/weeping-01`)
  await restPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await restPage.waitForTimeout(2000)

  // Ignore the first item
  const ignBtn = restPage.getByRole('button', { name: 'Ignore for now' }).first()
  await ignBtn.scrollIntoViewIfNeeded()
  await ignBtn.click()
  await restPage.waitForTimeout(600)

  // Now restore it (button label changes to "Restore")
  const restoreBtn = restPage.getByRole('button', { name: 'Restore' }).first()
  await restoreBtn.scrollIntoViewIfNeeded()
  await restoreBtn.click()
  await restPage.waitForTimeout(600)

  // The greyed row should be gone
  const greyedRowsAfterRestore = await restPage.locator('.er-route-panel li.opacity-30').count()
  check('Restore: greyed row removed after restore', greyedRowsAfterRestore === 0, `${greyedRowsAfterRestore} greyed rows remaining`)

  // No ignored pins remain
  const ignoredPinsAfterRestore = await restPage.locator('.er-pin--ignored').count()
  check('Restore: er-pin--ignored pins removed', ignoredPinsAfterRestore === 0, `${ignoredPinsAfterRestore} ignored pins remaining`)

  await restCtx.close()
}

// 16 ── Ignored items excluded from leg progress count
{
  const progCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const progPage = await progCtx.newPage()
  await progPage.goto(`${BASE}#/region/weeping-peninsula/weeping-01`)
  await progPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await progPage.waitForTimeout(2000)

  // Read the leg progress "X/Y" before any interaction
  const legProgressBefore = await progPage.locator('.er-route-panel').getByText(/^Leg/).locator('..').textContent()

  // Ignore the first checkable item
  const ignBtn2 = progPage.getByRole('button', { name: 'Ignore for now' }).first()
  await ignBtn2.scrollIntoViewIfNeeded()
  await ignBtn2.click()
  await progPage.waitForTimeout(600)

  // Read leg progress after — denominator should decrease by 1 and "(1 ignored)" appears
  const legProgressAfter = await progPage.locator('.er-route-panel').getByText(/^Leg/).locator('..').textContent()
  const hasIgnoredSuffix = (legProgressAfter ?? '').includes('ignored')
  check('Ignored excluded from leg progress: (N ignored) suffix appears', hasIgnoredSuffix,
    `before="${(legProgressBefore ?? '').trim()}" after="${(legProgressAfter ?? '').trim()}"`)

  await progCtx.close()
}
```

- [ ] **Step 7.2: Build the app for preview**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm run build 2>&1 | tail -15
```

Expected: build succeeds with no errors.

- [ ] **Step 7.3: Start preview server and run acceptance checks**

In one terminal start the preview (it'll stay running), then run verify-map:

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npx vite preview --port 5174 &
sleep 3
node scripts/verify-map.mjs 2>&1 | tail -40
```

Expected: 35/35 checks passed (32 existing + 3 new). If any existing checks fail, do NOT proceed — investigate first.

- [ ] **Step 7.4: Commit**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && git add scripts/verify-map.mjs && git commit -m "$(cat <<'EOF'
feat(verify): 3 acceptance checks for ignore feature (row grey, pin grey, next-up skips, restore, progress)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Final integration commit

- [ ] **Step 8.1: Full gate run**

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm test 2>&1 | tail -10
```

Expected: 67 tests pass.

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm run typecheck 2>&1 | tail -5
```

Expected: no errors.

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && npm run build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 8.2: Create the final feature commit (if needed — all task commits may suffice)**

Only run this step if the instructions require a single `feat: ignore/revisit-later state for items` commit. Otherwise, the task commits from Tasks 1–7 are sufficient.

```bash
cd /Users/arnavmarda/Desktop/Dev/er-guide && git log --oneline -10
```

Review the commit list, then report: SHA, test count (67), acceptance evidence (35/35 verify-map checks).

---

## Self-Review

### Spec coverage check

| Requirement | Task |
|-------------|------|
| `ignored: Record<string, number>` per profile | Task 1 |
| `schemaVersion` stays 1; old saves default to {} | Task 1 |
| `parseSave` accepts saves without `ignored` | Task 1 |
| Export includes `ignored` | Task 1 (exportJson serializes full `data`) |
| `toggleIgnore(id)` mutually exclusive with checked | Task 1 |
| Snapshot exposes `ignored` | Task 1 |
| New tests: round-trip, mutual exclusivity, old-save compat | Task 1 |
| `firstUncheckedId` skips ignored | Task 2 |
| RoutePanel ignore toggle button (⊘) | Task 5 |
| Ignored rows grey (opacity-30, NOT strikethrough) | Task 5 |
| "Next up" callout never shows ignored item | Task 5 (firstUncheckedId skips ignored) |
| Progress bars exclude ignored, show "(N ignored)" | Task 5 |
| Map pin `'ignored'` variant — grey ring, 35% opacity | Tasks 3+4 |
| Subscriber diffing handles `'ignored'` variant | Task 4 |
| Popup "Ignore for now"/"Restore" button | Task 4 |
| ProgressPage excludes ignored from totals | Task 6 |
| ProgressPage shows total ignored count | Task 6 |
| Gist sync tests still pass (no changes to gistSync.ts) | Implicitly — no changes to that file |
| 3 verify-map acceptance checks | Task 7 |
| All 32 existing verify-map checks still green | Task 7, step 7.3 |
| `npm test` gate | Tasks 1, 2, 5, 8 |
| `typecheck` gate | All tasks |
| `build` gate | Task 7.2 |
| Final commit `feat: ignore/revisit-later state for items` | Task 8 |

### Placeholder scan

No TBD/TODO/placeholder patterns found.

### Type consistency

- `ProgressSnapshot.ignored: Record<string, number>` — defined in Task 1, used as `snapshot.ignored` in Tasks 4, 5, 6. Consistent.
- `MarkerVariant` — `'ignored'` added in Task 3, used in Tasks 4. Consistent.
- `firstUncheckedId(steps, checked, ignored)` — signature defined in Task 2, callers updated in Tasks 2 and 5. Consistent.
- `countIgnored` — defined in Task 5 (added to data.ts), imported in Tasks 5 and 6. Consistent.
- `toggleIgnore` — defined in Task 1, called in Tasks 4 and 5. Consistent.
- `isIgnored` — defined in Task 1, used for tests only (MapView and RoutePanel read directly from `snapshot.ignored`). Consistent.
- `PanelStepRow` now requires `onIgnore` prop — Task 5 adds both the prop and the call site. Consistent.
- `ProgressBar` now has optional `ignoredCount` prop — default `0` so existing callsites without it are safe. Consistent.
