import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { items, regions, regionCheckables, countChecked, countIgnored, itemPosition } from '../lib/data'
import { CATEGORY_META, type Category } from '../lib/types'
import { useProgress } from '../lib/useProgress'
import { gistSync, type SyncStatus } from '../lib/gistSync'
import TopBar from '../components/TopBar'

export default function ProgressPage() {
  const { snapshot, store } = useProgress()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState('')
  const [newProfile, setNewProfile] = useState('')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(gistSync.getStatus())
  const [tokenInput, setTokenInput] = useState('')

  // Keep React state in sync with the gistSync module's status.
  useEffect(() => gistSync.subscribe(() => setSyncStatus(gistSync.getStatus())), [])

  // While connected: auto-push (debounced 3s) on store changes, and check once
  // whether the cloud copy is newer than our last sync (never auto-imports).
  const connected =
    syncStatus.type === 'idle' ||
    syncStatus.type === 'syncing' ||
    syncStatus.type === 'cloud-newer' ||
    (syncStatus.type === 'error' && syncStatus.gistId != null)
  useEffect(() => {
    if (!connected) return
    const stopAuto = gistSync.startAutoSync(store)
    void gistSync.checkCloudNewer()
    return stopAuto
  }, [connected, store])

  async function doConnect() {
    if (!tokenInput.trim()) return
    const result = await gistSync.connect(tokenInput.trim())
    if (result.type === 'idle') setTokenInput('')
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
          <h2 className="font-display mb-3 text-lg text-gold-dim">Cloud sync (GitHub)</h2>

          {syncStatus.type === 'cloud-newer' && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-gold-dim/60 bg-panel2 p-2">
              <span className="text-gold">Your cloud copy is newer than this browser's data.</span>
              <button
                onClick={() => void gistSync.pullNow((json) => store.importJson(json))}
                className="rounded border border-gold-dim px-2 py-0.5 text-gold hover:bg-panel"
              >
                Load cloud copy
              </button>
              <button
                onClick={() => void gistSync.pushNow(store.exportJson())}
                className="rounded border border-edge px-2 py-0.5 text-ink-dim hover:bg-panel"
              >
                Overwrite cloud
              </button>
            </div>
          )}

          {syncStatus.type === 'error' && (
            <p className="mb-3 text-missable">Sync error: {syncStatus.message}</p>
          )}

          {!connected ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void doConnect()}
                placeholder="GitHub fine-grained token"
                className="w-72 rounded border border-edge bg-bg px-2 py-1 font-mono text-xs"
              />
              <button
                onClick={() => void doConnect()}
                disabled={syncStatus.type === 'connecting' || !tokenInput.trim()}
                className="rounded border border-gold-dim px-2 py-1 text-gold hover:bg-panel2 disabled:opacity-50"
              >
                {syncStatus.type === 'connecting' ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-ink-dim">
                Gist: <code>{(syncStatus.gistId ?? '').slice(0, 8)}…</code>
              </span>
              <span className="text-ink-dim">
                Last synced: {syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleString() : 'never'}
              </span>
              <button
                onClick={() => void gistSync.pushNow(store.exportJson())}
                disabled={syncStatus.type === 'syncing'}
                className="rounded border border-gold-dim px-2 py-1 text-gold hover:bg-panel2 disabled:opacity-50"
              >
                {syncStatus.type === 'syncing' ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                onClick={() => void gistSync.pullNow((json) => store.importJson(json))}
                disabled={syncStatus.type === 'syncing'}
                className="rounded border border-edge px-2 py-1 hover:bg-panel2 disabled:opacity-50"
              >
                Load from cloud
              </button>
              <button
                onClick={() => gistSync.disconnect()}
                className="rounded border border-edge px-2 py-1 text-ink-dim hover:bg-panel2"
              >
                Disconnect
              </button>
            </div>
          )}

          <p className="mt-3 text-xs text-ink-dim">
            Use a fine-grained token with only the gist permission. The token is stored in your browser.
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
