import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { loadWeapons, allDamageTypes, type Weapon, type Attributes, type Attribute } from '../lib/weaponCalc'
import {
  rankWeapons,
  rankByDamageType,
  rankByStatus,
  rankSorceries,
  rankIncantations,
  DAMAGE_TYPE_LABELS,
  STATUS_TYPES,
  STATUS_LABELS,
  type WeaponRanking,
  type StatusRanking,
  type SpellRanking,
} from '../lib/buildOptimizer'
import { talismans } from '../lib/talismans'
import { findBuildLink } from '../lib/buildLinks'

// This page is designed to be React.lazy()-loaded so the ~1 MB regulation data
// and the weapon engine never enter the main bundle. (Default export below.)

type TabKey = 'weapons' | 'damage' | 'status' | 'sorceries' | 'incantations'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'weapons', label: 'Weapons' },
  { key: 'damage', label: 'By damage type' },
  { key: 'status', label: 'By status' },
  { key: 'sorceries', label: 'Sorceries' },
  { key: 'incantations', label: 'Incantations' },
]

const STAT_FIELDS: { key: Attribute; label: string }[] = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'int', label: 'INT' },
  { key: 'fai', label: 'FAI' },
  { key: 'arc', label: 'ARC' },
]

const TOP_N = 15

function fmt(n: number): string {
  return Math.round(n).toLocaleString()
}

function reqText(requirements: Partial<Record<Attribute, number>>): string {
  const parts = STAT_FIELDS.map(({ key, label }) =>
    requirements[key] ? `${label} ${requirements[key]}` : null,
  ).filter(Boolean)
  return parts.length ? parts.join(' · ') : 'No requirements'
}

function spellReqText(req: { int?: number; fai?: number; arc?: number }): string {
  const parts: string[] = []
  if (req.int) parts.push(`INT ${req.int}`)
  if (req.fai) parts.push(`FAI ${req.fai}`)
  if (req.arc) parts.push(`ARC ${req.arc}`)
  return parts.length ? parts.join(' · ') : 'No requirements'
}

/** "Where to find it" link, or nothing if the item isn't in the route data. */
function WhereToFind({ name }: { name: string }) {
  const link = findBuildLink(name)
  if (!link) return null
  return (
    <NavLink to={link.path} className="text-xs text-gold hover:underline whitespace-nowrap">
      where to find →
    </NavLink>
  )
}

function WeaponRow({ r }: { r: WeaponRanking }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-edge/50 py-2">
      <span className="font-display text-gold">{r.name}</span>
      {r.dlc && <span className="rounded bg-panel2 px-1 text-[10px] text-ink-dim">DLC</span>}
      <span className="text-ink-dim text-xs">({r.affinity})</span>
      <span className="ml-auto font-mono text-lg text-ink">{fmt(r.totalAr)} AR</span>
      <span className="basis-full text-xs text-ink-dim">
        {r.breakdown.map((b) => `${b.label} ${fmt(b.value)}`).join('  ·  ')}
        {' — req: '}
        {reqText(r.requirements)}
      </span>
      {!r.meetsRequirements && (
        <span className="basis-full text-xs text-missable">⚠ requirements not met (−40% scaling penalty)</span>
      )}
      <WhereToFind name={r.weaponName} />
    </li>
  )
}

function StatusRow({ r }: { r: StatusRanking }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-edge/50 py-2">
      <span className="font-display text-gold">{r.name}</span>
      {r.dlc && <span className="rounded bg-panel2 px-1 text-[10px] text-ink-dim">DLC</span>}
      <span className="text-ink-dim text-xs">({r.affinity})</span>
      <span className="ml-auto font-mono text-lg text-ink">{fmt(r.buildup)} {r.statusLabel}</span>
      <span className="basis-full text-xs text-ink-dim">
        Weapon AR {fmt(r.totalAr)} — req: {reqText(r.requirements)}
      </span>
      <WhereToFind name={r.weaponName} />
    </li>
  )
}

function SpellRow({ r }: { r: SpellRanking }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-edge/50 py-2">
      <span className="font-display text-gold">{r.name}</span>
      {r.dlc && <span className="rounded bg-panel2 px-1 text-[10px] text-ink-dim">DLC</span>}
      <span className="text-ink-dim text-xs">({r.damageLabel})</span>
      <span className="ml-auto font-mono text-lg text-ink">{fmt(r.effectiveAr)} AR</span>
      <span className="basis-full text-xs text-ink-dim">
        base {r.spellBaseAR} × {fmt(r.catalystScaling)}% scaling via {r.catalyst} · FP {r.fp} · {r.slots} slot
        {r.slots !== 1 ? 's' : ''} — req: {spellReqText(r.requirements)}
      </span>
      {r.confidence && r.confidence !== 'high' && (
        <span className="basis-full text-[11px] text-missable/80">
          base-AR estimate ({r.confidence} confidence){r.note ? ` — ${r.note}` : ''}
        </span>
      )}
      <WhereToFind name={r.name} />
    </li>
  )
}

export default function BuildPage() {
  const [weapons, setWeapons] = useState<Weapon[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Inputs
  const [level, setLevel] = useState(150)
  const [stats, setStats] = useState<Attributes>({ str: 40, dex: 40, int: 9, fai: 9, arc: 9 })
  const [twoHanding, setTwoHanding] = useState(false)
  const [showAll, setShowAll] = useState(false) // "show items I can't use yet" — off by default
  const [selectedTalismans, setSelectedTalismans] = useState<string[]>([])
  const [tab, setTab] = useState<TabKey>('weapons')

  useEffect(() => {
    let cancelled = false
    loadWeapons()
      .then((w) => !cancelled && setWeapons(w))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load data'))
    return () => {
      cancelled = true
    }
  }, [])

  const options = useMemo(
    () => ({ twoHanding, talismans: selectedTalismans, metRequirementsOnly: !showAll }),
    [twoHanding, selectedTalismans, showAll],
  )

  const results = useMemo(() => {
    if (!weapons) return null
    return {
      weapons: rankWeapons(weapons, stats, options).slice(0, TOP_N),
      damage: rankByDamageType(weapons, stats, options),
      status: rankByStatus(weapons, stats, options),
      sorceries: rankSorceries(weapons, stats, options).slice(0, TOP_N),
      incantations: rankIncantations(weapons, stats, options).slice(0, TOP_N),
    }
  }, [weapons, stats, options])

  function setStat(attr: Attribute, value: number) {
    setStats((s) => ({ ...s, [attr]: Math.max(1, Math.min(99, value || 1)) }))
  }

  function toggleTalisman(id: string) {
    setSelectedTalismans((cur) => (cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id]))
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-6 py-6">
        <h1 className="font-display mb-1 text-3xl text-gold">Build Optimizer</h1>
        <p className="mb-5 max-w-3xl text-sm text-ink-dim">
          Enter your stats to see the best weapons and spells for your build, ranked by{' '}
          <span className="text-ink">Attack Rating</span>. Rankings use AR (the standard calculator
          metric), <span className="text-ink">not</span> per-swing motion values, so a high-AR weapon
          isn't always the highest damage-per-hit. Weapon data is the MIT-licensed{' '}
          <a
            href="https://github.com/ThomasJClark/elden-ring-weapon-calculator"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline"
          >
            Elden Ring weapon calculator
          </a>{' '}
          regulation set (patch 1.14, all weapons +25 / somber +10, incl. SotE).
        </p>

        {/* ── Input form ── */}
        <section className="mb-6 rounded border border-edge bg-panel p-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col text-xs text-ink-dim">
              Level
              <input
                type="number"
                value={level}
                min={1}
                max={713}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="mt-1 w-20 rounded border border-edge bg-bg px-2 py-1 text-base text-ink"
              />
            </label>
            {STAT_FIELDS.map(({ key, label }) => (
              <label key={key} className="flex flex-col text-xs text-ink-dim">
                {label}
                <input
                  type="number"
                  value={stats[key]}
                  min={1}
                  max={99}
                  onChange={(e) => setStat(key, Number(e.target.value))}
                  className="mt-1 w-16 rounded border border-edge bg-bg px-2 py-1 text-base text-ink"
                />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-dim">
            Only STR / DEX / INT / FAI / ARC affect Attack Rating. VIG / MIND / END don't — Level is
            collected for reference only.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5 text-ink-dim">
              <input
                type="checkbox"
                checked={twoHanding}
                onChange={(e) => setTwoHanding(e.target.checked)}
                className="accent-gold"
              />
              Two-hand (STR ×1.5)
            </label>
            <label className="flex items-center gap-1.5 text-ink-dim">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                className="accent-gold"
              />
              Show items I can't use yet
            </label>
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-gold-dim hover:text-gold">
              Talismans{selectedTalismans.length ? ` (${selectedTalismans.length})` : ''}
            </summary>
            <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {talismans.map((t) => (
                <label key={t.id} className="flex items-start gap-1.5 text-xs text-ink-dim">
                  <input
                    type="checkbox"
                    checked={selectedTalismans.includes(t.id)}
                    onChange={() => toggleTalisman(t.id)}
                    className="mt-0.5 accent-gold"
                  />
                  <span>
                    <span className="text-ink">{t.name}</span>
                    {t.condition && <span className="block text-[10px] opacity-70">{t.condition}</span>}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink-dim">
              Conditional effects (e.g. "at full HP") are assumed active when selected.
            </p>
          </details>
        </section>

        {/* ── Tabs ── */}
        <div className="mb-4 flex flex-wrap gap-1 border-b border-edge">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-t border border-b-0 px-3 py-1.5 text-sm ${
                tab === t.key
                  ? 'border-edge bg-panel text-gold'
                  : 'border-transparent text-ink-dim hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Results ── */}
        {error && <p className="text-missable">Couldn't load weapon data: {error}</p>}
        {!error && !results && <p className="text-ink-dim">Loading weapon data…</p>}
        {results && (
          <section>
            {tab === 'weapons' && (
              <ul>
                {results.weapons.length === 0 && <EmptyState />}
                {results.weapons.map((r) => (
                  <WeaponRow key={r.name} r={r} />
                ))}
              </ul>
            )}

            {tab === 'damage' && (
              <div className="space-y-6">
                {allDamageTypes.map((dt) => {
                  const list = results.damage[dt]?.slice(0, 10) ?? []
                  if (list.length === 0) return null
                  return (
                    <div key={dt}>
                      <h2 className="font-display mb-1 text-lg text-gold-dim">{DAMAGE_TYPE_LABELS[dt]}</h2>
                      <ul>
                        {list.map((r) => (
                          <li
                            key={r.name}
                            className="flex flex-wrap items-baseline gap-x-3 border-b border-edge/50 py-1.5"
                          >
                            <span className="text-ink">{r.name}</span>
                            <span className="text-ink-dim text-xs">({r.affinity})</span>
                            <span className="ml-auto font-mono text-ink">{fmt(r.totalAr)}</span>
                            <WhereToFind name={r.weaponName} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}

            {tab === 'status' && (
              <div className="space-y-6">
                {STATUS_TYPES.map((st) => {
                  const list = results.status[st]?.slice(0, 10) ?? []
                  if (list.length === 0) return null
                  return (
                    <div key={st}>
                      <h2 className="font-display mb-1 text-lg text-gold-dim">{STATUS_LABELS[st]}</h2>
                      <ul>
                        {list.map((r) => (
                          <StatusRow key={r.name} r={r} />
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}

            {tab === 'sorceries' && (
              <ul>
                {results.sorceries.length === 0 && <EmptyState />}
                {results.sorceries.map((r) => (
                  <SpellRow key={r.name} r={r} />
                ))}
              </ul>
            )}

            {tab === 'incantations' && (
              <ul>
                {results.incantations.length === 0 && <EmptyState />}
                {results.incantations.map((r) => (
                  <SpellRow key={r.name} r={r} />
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <li className="py-6 text-center text-sm text-ink-dim">
      Nothing matches this build yet. Try raising stats or enabling "Show items I can't use yet".
    </li>
  )
}
