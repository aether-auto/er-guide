import { useRef, useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { items, regions, regionCheckables, countChecked, countIgnored, itemPosition } from '../lib/data'
import { CATEGORY_META, type Category } from '../lib/types'
import { useProgress } from '../lib/useProgress'
import { decodeSyncCode, encodeSyncCode } from '../lib/syncCode'
import TopBar from '../components/TopBar'

export default function ProgressPage() {
  const { snapshot, store } = useProgress()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState('')
  const [newProfile, setNewProfile] = useState('')

  // "Move to another device" — sync codes.
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState('')
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // A sync code can ride in the URL (#/progress?code=…). Never auto-import — we
  // surface a confirm banner and strip the param on Load. useSearchParams works
  // inside HashRouter (it reads the hash's query string).
  const [searchParams, setSearchParams] = useSearchParams()
  const sharedCode = searchParams.get('code')
  const [sharedError, setSharedError] = useState('')

  async function doCopyCode() {
    try {
      const code = await encodeSyncCode(store.exportJson())
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
      <main className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-6 py-6">
        <h1 className="font-display mb-4 text-3xl text-gold">Progress</h1>

        {snapshot.hasBackup && (
          <p className="mb-4 rounded border border-missable/50 bg-panel p-3 text-sm text-missable">
            A previous save could not be read and was backed up. Export it from your browser's localStorage key
            <code className="mx-1">er-guide-progress-backup</code> if you need it.
          </p>
        )}

        {sharedCode && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded border border-gold-dim/60 bg-panel p-3 text-sm">
            <span className="text-gold">
              A sync code was shared with this link — load it? This replaces your current progress.
            </span>
            <button
              onClick={() => void doLoadShared()}
              className="rounded border border-gold-dim px-2 py-0.5 text-gold hover:bg-panel2"
            >
              Load
            </button>
            <button
              onClick={dismissShared}
              className="rounded border border-edge px-2 py-0.5 text-ink-dim hover:bg-panel2"
            >
              Dismiss
            </button>
            {sharedError && <span className="text-missable">{sharedError}</span>}
          </div>
        )}

        <section className="mb-6 flex flex-wrap items-center gap-3 rounded border border-edge bg-panel p-3 text-sm">
          <span className="text-ink-dim">Profile:</span>
          <select
            value={snapshot.activeProfile}
            onChange={(e) => store.switchProfile(e.target.value)}
            className="rounded border border-edge bg-bg px-2 py-1"
          >
            {snapshot.profiles.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <input
            value={newProfile}
            onChange={(e) => setNewProfile(e.target.value)}
            placeholder="new profile (e.g. ng-plus)"
            className="rounded border border-edge bg-bg px-2 py-1"
          />
          <button
            onClick={() => { if (newProfile.trim()) { store.switchProfile(newProfile.trim()); setNewProfile('') } }}
            className="rounded border border-gold-dim px-2 py-1 text-gold hover:bg-panel2"
          >
            create
          </button>
          <span className="mx-2 text-edge">|</span>
          <button onClick={doExport} className="rounded border border-gold-dim px-2 py-1 text-gold hover:bg-panel2">
            export save
          </button>
          <button onClick={() => fileRef.current?.click()} className="rounded border border-edge px-2 py-1 hover:bg-panel2">
            import save
          </button>
          <input
            ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
          />
          {importError && <span className="text-missable">{importError}</span>}
        </section>

        <section className="mb-6 rounded border border-edge bg-panel p-3 text-sm">
          <h2 className="font-display mb-3 text-lg text-gold-dim">Move to another device</h2>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void doCopyCode()}
              className="rounded border border-gold-dim px-2 py-1 text-gold hover:bg-panel2"
            >
              {copied ? 'Copied!' : 'Copy sync code'}
            </button>
            <span className="mx-2 text-edge">|</span>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void doLoadCode()}
              placeholder="paste sync code"
              className="w-72 rounded border border-edge bg-bg px-2 py-1 font-mono text-xs"
            />
            <button
              onClick={() => void doLoadCode()}
              disabled={!codeInput.trim()}
              className="rounded border border-edge px-2 py-1 hover:bg-panel2 disabled:opacity-50"
            >
              Load from sync code
            </button>
            {codeError && <span className="text-missable">{codeError}</span>}
          </div>

          <p className="mt-3 text-xs text-ink-dim">
            Your progress lives only in this browser. To move it elsewhere, copy the sync code (or export a
            file above) and load it on the other device. Loading replaces the current progress. Very large
            saves make long codes — use the file export if a shared link gets too long.
          </p>
        </section>

        {missablesPending.length > 0 && (
          <section className="mb-6 rounded border border-missable/40 bg-panel p-3">
            <h2 className="font-display text-lg text-missable">⚠ Unchecked missables ({missablesPending.length})</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {missablesPending.map((item) => {
                const pos = itemPosition.get(item.id)
                return (
                  <li key={item.id}>
                    <NavLink
                      className="text-gold hover:underline"
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

        <section className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h2 className="font-display mb-2 text-lg text-gold-dim">By category</h2>
            <table className="w-full text-sm">
              <thead className="sr-only"><tr><th scope="col">Category</th><th scope="col">Progress</th></tr></thead>
              <tbody>
                {[...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([cat, row]) => (
                  <tr key={cat} className="border-b border-edge/50">
                    <td className="py-1">{CATEGORY_META[cat].plural}</td>
                    <td className={`py-1 text-right ${row.done === row.total ? 'text-done' : 'text-ink-dim'}`}>
                      {row.done}/{row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="font-display mb-2 text-lg text-gold-dim">By region</h2>
            <table className="w-full text-sm">
              <thead className="sr-only"><tr><th scope="col">Region</th><th scope="col">Progress</th></tr></thead>
              <tbody>
                {regions.map((region) => {
                  const allIds = regionCheckables(region)
                  const ids = allIds.filter((id) => snapshot.ignored[id] == null)
                  const done = countChecked(ids, snapshot.checked)
                  const ignoredCount = countIgnored(allIds, snapshot.ignored)
                  return (
                    <tr key={region.id} className="border-b border-edge/50">
                      <td className="py-1">
                        <NavLink to={`/region/${region.id}`} className="hover:text-gold">{region.name}</NavLink>
                      </td>
                      <td className={`py-1 text-right ${done === ids.length && ids.length > 0 ? 'text-done' : 'text-ink-dim'}`}>
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
          <p className="mb-6 text-xs text-ink-dim">
            ⊘ {totalIgnored} item{totalIgnored !== 1 ? 's' : ''} ignored — excluded from all totals.
            Restore them from the route panel or map popups.
          </p>
        )}
      </main>
    </div>
  )
}
