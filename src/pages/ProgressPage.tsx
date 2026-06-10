import { useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { items, regions, regionCheckables, countChecked, itemPosition } from '../lib/data'
import { CATEGORY_META, type Category } from '../lib/types'
import { useProgress } from '../lib/useProgress'
import TopBar from '../components/TopBar'

export default function ProgressPage() {
  const { snapshot, store } = useProgress()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState('')
  const [newProfile, setNewProfile] = useState('')

  const byCategory = new Map<Category, { total: number; done: number }>()
  for (const item of items) {
    const row = byCategory.get(item.category) ?? { total: 0, done: 0 }
    row.total++
    if (snapshot.checked[item.id] != null) row.done++
    byCategory.set(item.category, row)
  }
  const missablesPending = items.filter((i) => i.missable && snapshot.checked[i.id] == null)

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
                  const ids = regionCheckables(region)
                  const done = countChecked(ids, snapshot.checked)
                  return (
                    <tr key={region.id} className="border-b border-edge/50">
                      <td className="py-1">
                        <NavLink to={`/region/${region.id}`} className="hover:text-gold">{region.name}</NavLink>
                      </td>
                      <td className={`py-1 text-right ${done === ids.length && ids.length > 0 ? 'text-done' : 'text-ink-dim'}`}>
                        {done}/{ids.length}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
