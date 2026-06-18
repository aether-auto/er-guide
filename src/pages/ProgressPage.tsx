import { useRef, useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { items, regions, regionCheckables, countChecked, countIgnored, itemPosition } from '../lib/data'
import { CATEGORY_META, type Category } from '../lib/types'
import { useProgress } from '../lib/useProgress'
import { decodeSyncCode, encodeSyncCode } from '../lib/syncCode'
import TopBar from '../components/TopBar'
import { DiamondRule } from '../components/ui/DiamondRule'

const btnGhost =
  'rounded border border-edge px-3 py-1.5 text-xs text-ink-dim transition-colors hover:border-gold-dim hover:text-gold disabled:opacity-50 disabled:hover:border-edge disabled:hover:text-ink-dim'

export default function ProgressPage() {
  const { snapshot, store } = useProgress()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState('')
  const [newProfile, setNewProfile] = useState('')

  // "Move to another device" — sync codes.
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState('')
  const [copied, setCopied] = useState(false)
  const [shownCode, setShownCode] = useState('') // always revealed so it works even if clipboard is blocked
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const shareLink = shownCode
    ? `${location.origin}${location.pathname}#/progress?code=${encodeURIComponent(shownCode)}`
    : ''

  // A sync code can ride in the URL (#/progress?code=…). Never auto-import — we
  // surface a confirm banner and strip the param on Load. useSearchParams works
  // inside HashRouter (it reads the hash's query string).
  const [searchParams, setSearchParams] = useSearchParams()
  const sharedCode = searchParams.get('code')
  const [sharedError, setSharedError] = useState('')

  async function doCopyCode() {
    let code: string
    try {
      code = await encodeSyncCode(store.exportJson())
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Could not generate sync code')
      return
    }
    // Always reveal the code so the feature works even where the clipboard API is
    // unavailable (non-secure origins like a LAN IP). Clipboard is a bonus.
    setShownCode(code)
    setCodeError('')
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  async function doLoadCode() {
    if (!codeInput.trim()) return
    try {
      store.importJson(await decodeSyncCode(codeInput.trim()))
      setCodeInput('')
      setCodeError('')
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Invalid sync code')
    }
  }

  async function doLoadShared() {
    if (!sharedCode) return
    try {
      store.importJson(await decodeSyncCode(sharedCode))
      setSharedError('')
      dismissShared()
    } catch (err) {
      setSharedError(err instanceof Error ? err.message : 'Invalid sync code')
    }
  }

  function dismissShared() {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('code')
        return next
      },
      { replace: true },
    )
  }

  // Ignored items are excluded from all totals (category, region, missables).
  const byCategory = new Map<Category, { total: number; done: number }>()
  for (const item of items) {
    if (snapshot.ignored[item.id] != null) continue
    const row = byCategory.get(item.category) ?? { total: 0, done: 0 }
    row.total++
    if (snapshot.checked[item.id] != null) row.done++
    byCategory.set(item.category, row)
  }
  const totalIgnored = Object.keys(snapshot.ignored).length
  const missablesPending = items.filter(
    (i) => i.missable && snapshot.checked[i.id] == null && snapshot.ignored[i.id] == null,
  )

  // Grand total for the completion hero (ignored items excluded).
  let totalDone = 0
  let totalItems = 0
  for (const { total, done } of byCategory.values()) {
    totalItems += total
    totalDone += done
  }
  const totalPct = totalItems === 0 ? 0 : Math.round((totalDone / totalItems) * 100)

  function doExport() {
    const blob = new Blob([store.exportJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `er-guide-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function doImport(file: File) {
    if (fileRef.current) fileRef.current.value = ''
    try {
      store.importJson(await file.text())
      setImportError('')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-6 py-8">
        <header className="er-reveal mb-7">
          <h1 className="font-display text-3xl tracking-[0.08em] text-gold">Progress</h1>
          <DiamondRule className="mt-3" />
        </header>

        <div className="er-stagger space-y-6">
          {/* Completion hero */}
          <section className="er-card flex items-center gap-5 p-5">
            <div className="flex flex-col">
              <span className="er-num font-display text-4xl leading-none text-gold-bright">{totalPct}%</span>
              <span className="er-eyebrow mt-1.5">Complete</span>
            </div>
            <div className="flex-1">
              <div className="mb-1.5 flex items-baseline justify-between text-xs text-ink-dim">
                <span>Tarnished, your journey</span>
                <span className="er-num text-ink">
                  {totalDone}
                  <span className="text-ink-dim"> / {totalItems}</span>
                </span>
              </div>
              <span className="block h-2 overflow-hidden rounded-full bg-edge">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-gold-dim to-gold-bright transition-[width] duration-700"
                  style={{ width: `${totalPct}%` }}
                />
              </span>
            </div>
          </section>

          {snapshot.hasBackup && (
            <p className="er-card border-missable/50 p-4 text-sm text-missable">
              A previous save could not be read and was backed up. Export it from your browser's localStorage key
              <code className="mx-1 text-missable">er-guide-progress-backup</code> if you need it.
            </p>
          )}

          {sharedCode && (
            <div className="er-card flex flex-wrap items-center gap-3 border-gold-dim/60 p-4 text-sm">
              <span className="text-gold">
                A sync code was shared with this link — load it? This replaces your current progress.
              </span>
              <button onClick={() => void doLoadShared()} className="er-btn-gold rounded px-3 py-1 text-xs">
                Load
              </button>
              <button onClick={dismissShared} className={btnGhost}>
                Dismiss
              </button>
              {sharedError && <span className="text-missable">{sharedError}</span>}
            </div>
          )}

          {/* Profiles + save file */}
          <section className="er-card p-5">
            <h2 className="er-eyebrow mb-3">Profiles &amp; save file</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-ink-dim">Profile</span>
              <select
                value={snapshot.activeProfile}
                onChange={(e) => store.switchProfile(e.target.value)}
                className="rounded border border-edge bg-bg px-2 py-1.5 text-sm transition-colors focus:border-gold-dim focus:outline-none"
              >
                {snapshot.profiles.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <input
                value={newProfile}
                onChange={(e) => setNewProfile(e.target.value)}
                placeholder="new profile (e.g. ng-plus)"
                className="rounded border border-edge bg-bg px-2 py-1.5 text-sm transition-colors focus:border-gold-dim focus:outline-none"
              />
              <button
                onClick={() => { if (newProfile.trim()) { store.switchProfile(newProfile.trim()); setNewProfile('') } }}
                className={btnGhost}
              >
                Create
              </button>
              <span className="h-5 w-px bg-edge" />
              <button onClick={doExport} className="er-btn-gold rounded px-3 py-1.5 text-xs">
                Export save
              </button>
              <button onClick={() => fileRef.current?.click()} className={btnGhost}>
                Import save
              </button>
              <input
                ref={fileRef} type="file" accept="application/json" className="hidden"
                onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
              />
              {importError && <span className="text-missable">{importError}</span>}
            </div>
          </section>

          {/* Sync code */}
          <section className="er-card p-5">
            <h2 className="er-eyebrow mb-3">Move to another device</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <button onClick={() => void doCopyCode()} className="er-btn-gold rounded px-3 py-1.5 text-xs">
                {copied ? '✓ Copied' : 'Copy sync code'}
              </button>
              <span className="h-5 w-px bg-edge" />
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void doLoadCode()}
                placeholder="paste sync code"
                className="w-72 rounded border border-edge bg-bg px-2 py-1.5 font-mono text-xs transition-colors focus:border-gold-dim focus:outline-none"
              />
              <button onClick={() => void doLoadCode()} disabled={!codeInput.trim()} className={btnGhost}>
                Load from sync code
              </button>
              {codeError && <span className="text-missable">{codeError}</span>}
            </div>

            {shownCode && (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] text-ink-dim">
                  {copied ? '✓ Copied to clipboard. ' : 'Select all and copy this code. '}
                  Paste it into “Load from sync code” on your other device:
                </p>
                <textarea
                  readOnly
                  value={shownCode}
                  rows={2}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full resize-none rounded border border-edge bg-bg px-2 py-1.5 font-mono text-[11px] break-all text-ink-dim transition-colors focus:border-gold-dim focus:outline-none"
                />
                {shareLink && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] text-gold-dim hover:text-gold">…or copy a shareable link</summary>
                    <textarea
                      readOnly
                      value={shareLink}
                      rows={2}
                      onFocus={(e) => e.currentTarget.select()}
                      className="mt-1.5 w-full resize-none rounded border border-edge bg-bg px-2 py-1.5 font-mono text-[11px] break-all text-ink-dim transition-colors focus:border-gold-dim focus:outline-none"
                    />
                  </details>
                )}
              </div>
            )}

            <p className="mt-3 text-xs leading-relaxed text-ink-dim">
              Your progress lives only in this browser. To move it elsewhere, generate the sync code above (it’s
              shown so you can copy it even if your browser blocks clipboard access on a non-secure connection),
              or export a file. Loading replaces the current progress.
            </p>
          </section>

          {missablesPending.length > 0 && (
            <section className="er-card border-missable/40 p-5">
              <h2 className="font-display text-lg text-missable">
                ⚠ Unchecked missables <span className="er-num text-base text-missable/80">({missablesPending.length})</span>
              </h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {missablesPending.map((item) => {
                  const pos = itemPosition.get(item.id)
                  return (
                    <li key={item.id} className="leading-relaxed">
                      <NavLink
                        className="er-link text-gold"
                        to={pos ? (pos.legId ? `/region/${pos.regionId}/${pos.legId}` : `/region/${pos.regionId}`) : '/'}
                      >
                        {item.name}
                      </NavLink>
                      <span className="text-ink-dim"> — {item.missable!.lockedBy}: {item.missable!.note}</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* Breakdowns */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="er-card p-5">
              <h2 className="er-eyebrow mb-3">By category</h2>
              <table className="w-full text-sm">
                <thead className="sr-only"><tr><th scope="col">Category</th><th scope="col">Progress</th></tr></thead>
                <tbody>
                  {[...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([cat, row]) => {
                    const pct = row.total === 0 ? 0 : Math.round((row.done / row.total) * 100)
                    return (
                      <tr key={cat} className="border-b border-edge/40 last:border-0">
                        <td className="py-1.5">{CATEGORY_META[cat].plural}</td>
                        <td className="w-20 py-1.5">
                          <span className="block h-1 overflow-hidden rounded-full bg-edge">
                            <span className="block h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                          </span>
                        </td>
                        <td className={`er-num py-1.5 pl-3 text-right ${row.done === row.total ? 'text-done' : 'text-ink-dim'}`}>
                          {row.done}/{row.total}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="er-card p-5">
              <h2 className="er-eyebrow mb-3">By region</h2>
              <table className="w-full text-sm">
                <thead className="sr-only"><tr><th scope="col">Region</th><th scope="col">Progress</th></tr></thead>
                <tbody>
                  {regions.map((region) => {
                    const allIds = regionCheckables(region)
                    const ids = allIds.filter((id) => snapshot.ignored[id] == null)
                    const done = countChecked(ids, snapshot.checked)
                    const ignoredCount = countIgnored(allIds, snapshot.ignored)
                    const pct = ids.length === 0 ? 0 : Math.round((done / ids.length) * 100)
                    return (
                      <tr key={region.id} className="border-b border-edge/40 last:border-0">
                        <td className="py-1.5">
                          <NavLink to={`/region/${region.id}`} className="transition-colors hover:text-gold">{region.name}</NavLink>
                        </td>
                        <td className="w-20 py-1.5">
                          <span className="block h-1 overflow-hidden rounded-full bg-edge">
                            <span className="block h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                          </span>
                        </td>
                        <td className={`er-num py-1.5 pl-3 text-right ${done === ids.length && ids.length > 0 ? 'text-done' : 'text-ink-dim'}`}>
                          {done}/{ids.length}
                          {ignoredCount > 0 && <span className="ml-1 text-[10px] opacity-60">({ignoredCount}⊘)</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {totalIgnored > 0 && (
            <p className="text-xs text-ink-dim">
              ⊘ {totalIgnored} item{totalIgnored !== 1 ? 's' : ''} ignored — excluded from all totals.
              Restore them from the route panel or map popups.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
