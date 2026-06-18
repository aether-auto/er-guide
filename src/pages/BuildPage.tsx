import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { DiamondRule } from '../components/ui/DiamondRule'
import { ArBars, CompositionBar, DamageLegend, StatRadar, damageColor, type BarItem } from '../components/ui/Charts'
import { loadWeapons, allDamageTypes, type Weapon, type Attributes, type Attribute, type AttackPowerType } from '../lib/weaponCalc'
import {
  rankWeapons,
  rankByDamageType,
  rankByStatus,
  rankSorceries,
  rankIncantations,
  rankAshesOfWar,
  DAMAGE_TYPE_LABELS,
  STATUS_TYPES,
  STATUS_LABELS,
  type WeaponRanking,
  type StatusRanking,
  type SpellRanking,
  type AowRanking,
} from '../lib/buildOptimizer'
import { talismans } from '../lib/talismans'
import { findBuildLink } from '../lib/buildLinks'

// Lazy-loaded (React.lazy) so the ~1 MB regulation data + engine stay out of the
// main bundle. Default export at the bottom.

type TabKey = 'weapons' | 'damage' | 'status' | 'ashes' | 'sorceries' | 'incantations'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'weapons', label: 'Weapons' },
  { key: 'damage', label: 'By damage type' },
  { key: 'status', label: 'By status' },
  { key: 'ashes', label: 'Ashes of War' },
  { key: 'sorceries', label: 'Sorceries' },
  { key: 'incantations', label: 'Incantations' },
]

const AOW_CATS = [
  'All', 'Projectile', 'AoE', 'Melee/Burst', 'Charge', 'Dash/Evasion', 'Stance/Counter', 'Buff/Utility',
] as const

const ELEM_LABEL: Record<string, string> = {
  physical: 'Physical', magic: 'Magic', fire: 'Fire', lightning: 'Lightning', holy: 'Holy', mixed: 'Mixed', none: '',
}

const STAT_FIELDS: { key: Attribute; label: string }[] = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'int', label: 'INT' },
  { key: 'fai', label: 'FAI' },
  { key: 'arc', label: 'ARC' },
]

const TOP_N = 16
const CHART_N = 10

const fmt = (n: number): string => Math.round(n).toLocaleString()

function reqText(requirements: Partial<Record<Attribute, number>>): string {
  const parts = STAT_FIELDS.map(({ key, label }) =>
    requirements[key] ? `${label} ${requirements[key]}` : null,
  ).filter(Boolean)
  return parts.length ? parts.join(' · ') : 'none'
}

function spellReqText(req: { int?: number; fai?: number; arc?: number }): string {
  const parts: string[] = []
  if (req.int) parts.push(`INT ${req.int}`)
  if (req.fai) parts.push(`FAI ${req.fai}`)
  if (req.arc) parts.push(`ARC ${req.arc}`)
  return parts.length ? parts.join(' · ') : 'none'
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-edge bg-panel2/60 px-1.5 py-0.5 text-[10px] tracking-wide text-ink-dim">
      {children}
    </span>
  )
}

function WhereToFind({ name }: { name: string }) {
  const link = findBuildLink(name)
  if (!link) return null
  return (
    <NavLink to={link.path} className="er-link whitespace-nowrap text-gold">
      where to find →
    </NavLink>
  )
}

/** Section frame: an eyebrow header + result count, used above every chart/table. */
function PanelHead({ title, count, children }: { title: string; count?: number; children?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="er-eyebrow">
        {title}
        {count != null && <span className="ml-2 er-num text-ink-dim">{count}</span>}
      </h3>
      {children}
    </div>
  )
}

// ── Table rows (consistent across every tab) ───────────────────────────────

function weaponBars(list: WeaponRanking[]): BarItem[] {
  return list.slice(0, CHART_N).map((r) => ({
    name: r.name,
    value: r.totalAr,
    dlc: r.dlc,
    dim: !r.meetsRequirements,
    segments: r.breakdown.map((b) => ({ label: b.label, value: b.value })),
  }))
}

function WeaponTable({ rows }: { rows: WeaponRanking[] }) {
  return (
    <div className="er-card overflow-hidden">
      <ul className="er-stagger">
        {rows.map((r, i) => (
          <li
            key={r.name}
            className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-edge/30 px-3 py-2.5 transition-colors last:border-0 hover:bg-panel2/50"
          >
            <span className="er-num text-right text-[11px] text-ink-dim">{i + 1}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="truncate font-display text-sm text-ink">{r.name}</span>
                <Chip>{r.affinity}</Chip>
                {r.dlc && <Chip>DLC</Chip>}
                {!r.meetsRequirements && <span className="text-[10px] text-missable">⚠ can’t wield (−40%)</span>}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <CompositionBar segments={r.breakdown} total={r.totalAr} className="w-24 shrink-0 sm:w-32" />
                <span className="truncate text-[10px] text-ink-dim">
                  {r.breakdown.map((b) => `${b.label} ${fmt(b.value)}`).join('  ·  ')}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-ink-dim">
                <span><span className="text-gold-dim">req</span> {reqText(r.requirements)}</span>
                <WhereToFind name={r.weaponName} />
              </div>
            </div>
            <div className="text-right">
              <span className="er-num er-fade-in block text-lg text-gold-bright">{fmt(r.totalAr)}</span>
              <span className="text-[9px] uppercase tracking-[0.18em] text-gold-dim">AR</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StatusTable({ rows }: { rows: StatusRanking[] }) {
  return (
    <div className="er-card overflow-hidden">
      <ul className="er-stagger">
        {rows.map((r, i) => (
          <li
            key={r.name}
            className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-edge/30 px-3 py-2.5 transition-colors last:border-0 hover:bg-panel2/50"
          >
            <span className="er-num text-right text-[11px] text-ink-dim">{i + 1}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="truncate font-display text-sm text-ink">{r.name}</span>
                <Chip>{r.affinity}</Chip>
                {r.dlc && <Chip>DLC</Chip>}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-ink-dim">
                <span>weapon AR {fmt(r.totalAr)}</span>
                <span><span className="text-gold-dim">req</span> {reqText(r.requirements)}</span>
                <WhereToFind name={r.weaponName} />
              </div>
            </div>
            <div className="text-right">
              <span className="er-num er-fade-in block text-lg text-gold-bright">{fmt(r.buildup)}</span>
              <span className="text-[9px] uppercase tracking-[0.16em] text-gold-dim">{r.statusLabel}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SpellTable({ rows }: { rows: SpellRanking[] }) {
  return (
    <div className="er-card overflow-hidden">
      <ul className="er-stagger">
        {rows.map((r, i) => (
          <li
            key={r.name}
            className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-edge/30 px-3 py-2.5 transition-colors last:border-0 hover:bg-panel2/50"
          >
            <span className="er-num text-right text-[11px] text-ink-dim">{i + 1}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="truncate font-display text-sm text-ink">{r.name}</span>
                <Chip>{r.damageLabel}</Chip>
                {r.dlc && <Chip>DLC</Chip>}
                {r.confidence && r.confidence !== 'high' && (
                  <span className="text-[10px] italic text-ink-dim" title={r.note}>
                    {r.confidence}-confidence est.
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-ink-dim">
                <span>base {r.spellBaseAR} × {fmt(r.catalystScaling)}% via {r.catalyst}</span>
                <span>FP {r.fp} · {r.slots} slot{r.slots !== 1 ? 's' : ''}</span>
                <span><span className="text-gold-dim">req</span> {spellReqText(r.requirements)}</span>
                <WhereToFind name={r.name} />
              </div>
            </div>
            <div className="text-right">
              <span className="er-num er-fade-in block text-lg text-gold-bright">{fmt(r.effectiveAr)}</span>
              <span className="text-[9px] uppercase tracking-[0.18em] text-gold-dim">AR</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AowTable({ rows }: { rows: AowRanking[] }) {
  return (
    <div className="er-card overflow-hidden">
      <ul className="er-stagger">
        {rows.map((a, i) => {
          const elem = ELEM_LABEL[a.element]
          return (
            <li
              key={a.skill}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-edge/30 px-3 py-2.5 transition-colors last:border-0 hover:bg-panel2/50"
            >
              <span className="er-num text-right text-[11px] text-ink-dim">{i + 1}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="truncate font-display text-sm text-ink">{a.skill}</span>
                  {elem && (
                    <span className="flex items-center gap-1 text-[10px] text-ink-dim">
                      <span className="inline-block size-2 rounded-[1px]" style={{ background: damageColor(elem) }} />
                      {elem}
                    </span>
                  )}
                  <Chip>{a.category}</Chip>
                  {a.dlc && <Chip>DLC</Chip>}
                  {!a.transferable && <span className="text-[10px] text-ink-dim" title="Locked to specific weapon(s)">weapon-locked</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-ink-dim">
                  <span>FP {a.fp}</span>
                  {a.motionValue != null && <span>MV {a.motionValue}%</span>}
                  {a.status && <span className="text-gold-dim">{a.status}</span>}
                  {a.affinity && <span>{a.affinity}</span>}
                  {a.itemName && <WhereToFind name={a.itemName} />}
                </div>
              </div>
              <div className="text-right">
                {a.artDamage != null ? (
                  <>
                    <span className="er-num er-fade-in block text-lg text-gold-bright">{fmt(a.artDamage)}</span>
                    <span className="text-[9px] uppercase tracking-[0.16em] text-gold-dim">art dmg</span>
                  </>
                ) : (
                  <span className="text-[10px] text-ink-dim">
                    {a.scaling === 'flat' ? 'flat dmg' : !a.dealsDamage ? 'buff' : '—'}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Segmented sub-selector (damage type / status) — matches the tab styling. */
function SubSelect<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { key: T; label: string; disabled?: boolean }[]
  value: T
  onChange: (v: T) => void
  label: (o: { key: T; label: string }) => string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.key)}
          disabled={o.disabled}
          onClick={() => onChange(o.key)}
          className={`rounded border px-2.5 py-1 text-xs tracking-wide transition-colors disabled:opacity-30 ${
            value === o.key
              ? 'border-gold-dim bg-gold/10 text-gold'
              : 'border-edge text-ink-dim hover:border-gold-dim hover:text-ink'
          }`}
        >
          {label(o)}
        </button>
      ))}
    </div>
  )
}

export default function BuildPage() {
  const [weapons, setWeapons] = useState<Weapon[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [level, setLevel] = useState(150)
  const [stats, setStats] = useState<Attributes>({ str: 40, dex: 40, int: 9, fai: 9, arc: 9 })
  const [twoHanding, setTwoHanding] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [selectedTalismans, setSelectedTalismans] = useState<string[]>([])
  const [tab, setTab] = useState<TabKey>('weapons')
  const [dmgType, setDmgType] = useState<AttackPowerType>(allDamageTypes[0])
  const [statusType, setStatusType] = useState<number>(STATUS_TYPES[0])
  const [aowCat, setAowCat] = useState<string>('All')

  useEffect(() => {
    let cancelled = false
    loadWeapons()
      .then((w) => !cancelled && setWeapons(w))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load data'))
    return () => { cancelled = true }
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
      ashes: rankAshesOfWar(weapons, stats, options),
    }
  }, [weapons, stats, options])

  function setStat(attr: Attribute, value: number) {
    setStats((s) => ({ ...s, [attr]: Math.max(1, Math.min(99, value || 1)) }))
  }
  function toggleTalisman(id: string) {
    setSelectedTalismans((cur) => (cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id]))
  }

  const inputCls =
    'rounded border border-edge bg-bg px-2 py-1.5 text-base text-ink transition-colors focus:border-gold-dim focus:outline-none'
  const toggleCls = 'flex items-center gap-2 text-sm text-ink-dim transition-colors hover:text-ink'

  // ── Per-tab results (chart + table), keyed so animations replay on switch ──
  function ResultsBody() {
    if (error) return <p className="text-missable">Couldn’t load weapon data: {error}</p>
    if (!results) {
      return (
        <div className="er-card flex items-center gap-3 p-6 text-sm text-ink-dim">
          <span className="inline-block size-2 animate-ping rounded-full bg-gold-dim" />
          Loading weapon data…
        </div>
      )
    }

    if (tab === 'weapons') {
      const list = results.weapons
      if (!list.length) return <EmptyState />
      return (
        <div key="weapons" className="er-reveal space-y-5">
          <section className="er-card p-4">
            <PanelHead title="Top weapons by Attack Rating" count={list.length}>
              <DamageLegend labels={legendLabels(list)} />
            </PanelHead>
            <ArBars items={weaponBars(list)} />
          </section>
          <WeaponTable rows={list} />
        </div>
      )
    }

    if (tab === 'damage') {
      const champions = allDamageTypes
        .map((dt) => ({ name: DAMAGE_TYPE_LABELS[dt], value: results.damage[dt]?.[0]?.totalAr ?? 0 }))
        .filter((b) => b.value > 0)
      const list = (results.damage[dmgType] ?? []).slice(0, TOP_N)
      return (
        <div key={`damage-${dmgType}`} className="er-reveal space-y-5">
          <section className="er-card p-4">
            <PanelHead title="Best weapon per damage type" />
            <ArBars items={champions} />
          </section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SubSelect
              options={allDamageTypes.map((dt) => ({
                key: dt,
                label: DAMAGE_TYPE_LABELS[dt],
                disabled: (results.damage[dt]?.length ?? 0) === 0,
              }))}
              value={dmgType}
              onChange={setDmgType}
              label={(o) => o.label}
            />
          </div>
          {list.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <section className="er-card p-4">
                <PanelHead title={`${DAMAGE_TYPE_LABELS[dmgType]} damage — top weapons`} count={list.length} />
                <ArBars items={weaponBars(list)} />
              </section>
              <WeaponTable rows={list} />
            </>
          )}
        </div>
      )
    }

    if (tab === 'status') {
      const list = (results.status[statusType] ?? []).slice(0, TOP_N)
      return (
        <div key={`status-${statusType}`} className="er-reveal space-y-5">
          <SubSelect
            options={STATUS_TYPES.map((st) => ({
              key: st,
              label: STATUS_LABELS[st],
              disabled: (results.status[st]?.length ?? 0) === 0,
            }))}
            value={statusType}
            onChange={setStatusType}
            label={(o) => o.label}
          />
          {list.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <section className="er-card p-4">
                <PanelHead title={`${STATUS_LABELS[statusType]} buildup — top weapons`} count={list.length} />
                <ArBars items={list.slice(0, CHART_N).map((r) => ({ name: r.name, value: r.buildup, dlc: r.dlc }))} unit={STATUS_LABELS[statusType]} />
              </section>
              <StatusTable rows={list} />
            </>
          )}
        </div>
      )
    }

    if (tab === 'ashes') {
      const r = results.ashes
      const filtered = aowCat === 'All' ? r.list : r.list.filter((a) => a.category === aowCat)
      const chartItems = filtered
        .filter((a) => a.artDamage != null)
        .slice(0, CHART_N)
        .map((a) => ({ name: a.skill, value: a.artDamage as number, dlc: a.dlc }))
      return (
        <div key={`ashes-${aowCat}`} className="er-reveal space-y-5">
          <p className="text-xs leading-relaxed text-ink-dim">
            Weapon-art damage ≈ your best usable weapon
            {r.bestWeaponName ? ` (${r.bestWeaponName}, AR ${fmt(r.bestWeaponAr)})` : ''} × the skill’s main-hit
            motion value. <span className="text-ink">Flat</span> skills (spell-like, e.g. Carian Greatsword)
            don’t scale from weapon AR; <span className="text-ink">buffs</span> deal no direct damage. Motion
            values are datamined main-hit figures — many skills hit several times.
          </p>
          <SubSelect
            options={AOW_CATS.map((c) => ({ key: c as string, label: c }))}
            value={aowCat}
            onChange={setAowCat}
            label={(o) => o.label}
          />
          {chartItems.length > 0 && (
            <section className="er-card p-4">
              <PanelHead title="Top weapon arts by estimated damage" count={chartItems.length} />
              <ArBars items={chartItems} unit="DMG" />
            </section>
          )}
          {filtered.length === 0 ? <EmptyState /> : <AowTable rows={filtered} />}
        </div>
      )
    }

    // sorceries / incantations
    const list = tab === 'sorceries' ? results.sorceries : results.incantations
    if (!list.length) return <EmptyState />
    return (
      <div key={tab} className="er-reveal space-y-5">
        <section className="er-card p-4">
          <PanelHead title={`Top ${tab} by Attack Rating`} count={list.length} />
          <ArBars items={list.slice(0, CHART_N).map((r) => ({ name: r.name, value: r.effectiveAr, dlc: r.dlc }))} />
        </section>
        <SpellTable rows={list} />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-6 py-8">
        <header className="er-reveal mb-6">
          <h1 className="font-display text-3xl tracking-[0.08em] text-gold">Build Optimizer</h1>
          <DiamondRule className="mt-3" />
        </header>

        <p className="er-reveal mb-6 max-w-4xl text-sm leading-relaxed text-ink-dim">
          Enter your stats to rank the best gear for your build by <span className="text-ink">Attack Rating</span>{' '}
          — the standard calculator metric (not per-swing motion values). All figures are{' '}
          <span className="text-ink">intrinsic AR, before Scadutree Blessing</span>; Scadutree boosts every weapon and
          spell uniformly in the DLC, so it never changes the ranking. Weapon data: the MIT-licensed{' '}
          <a
            href="https://github.com/ThomasJClark/elden-ring-weapon-calculator"
            target="_blank"
            rel="noopener noreferrer"
            className="er-link text-gold"
          >
            ER weapon calculator
          </a>{' '}
          set (patch 1.14, +25 / somber +10, incl. SotE).
        </p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ── Build panel ── */}
          <aside className="lg:col-span-4">
            <section className="er-card er-reveal p-5 lg:sticky lg:top-4">
              <h2 className="er-eyebrow mb-4">Your build</h2>

              <div className="flex items-start gap-4">
                <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2.5">
                  <label className="col-span-2 flex flex-col gap-1 text-[10px] uppercase tracking-[0.14em] text-gold-dim">
                    Level
                    <input type="number" value={level} min={1} max={713} onChange={(e) => setLevel(Number(e.target.value))} className={inputCls} />
                  </label>
                  {STAT_FIELDS.map(({ key, label }) => (
                    <label key={key} className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.14em] text-gold-dim">
                      {label}
                      <input type="number" value={stats[key]} min={1} max={99} onChange={(e) => setStat(key, Number(e.target.value))} className={inputCls} />
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex justify-center">
                <StatRadar stats={STAT_FIELDS.map((f) => ({ label: f.label, value: stats[f.key] }))} />
              </div>

              <p className="mt-1 text-[11px] leading-relaxed text-ink-dim">
                Only STR / DEX / INT / FAI / ARC affect AR. VIG / MIND / END don’t — Level is reference only.
              </p>

              <div className="mt-4 flex flex-col gap-2 border-t border-edge/60 pt-4">
                <label className={toggleCls}>
                  <input type="checkbox" checked={twoHanding} onChange={(e) => setTwoHanding(e.target.checked)} className="accent-gold" />
                  Two-hand (STR ×1.5)
                </label>
                <label className={toggleCls}>
                  <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-gold" />
                  Show items I can’t use yet
                </label>
              </div>

              <details className="mt-4 border-t border-edge/60 pt-4">
                <summary className="er-eyebrow cursor-pointer text-gold-dim transition-colors hover:text-gold">
                  Talismans{selectedTalismans.length ? ` (${selectedTalismans.length})` : ''}
                </summary>
                <div className="mt-3 flex flex-col gap-1.5">
                  {talismans.map((t) => (
                    <label key={t.id} className="flex items-start gap-2 text-xs text-ink-dim">
                      <input type="checkbox" checked={selectedTalismans.includes(t.id)} onChange={() => toggleTalisman(t.id)} className="mt-0.5 accent-gold" />
                      <span>
                        <span className="text-ink">{t.name}</span>
                        {t.condition && <span className="block text-[10px] opacity-70">{t.condition}</span>}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-ink-dim">Conditional effects (e.g. “at full HP”) are assumed active.</p>
              </details>
            </section>
          </aside>

          {/* ── Results ── */}
          <div className="lg:col-span-8">
            <div className="mb-5 flex flex-wrap gap-x-5 gap-y-1 border-b border-edge">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`er-link -mb-px border-b-2 border-transparent pb-2 text-sm transition-colors ${
                    tab === t.key ? 'active text-gold' : 'text-ink-dim hover:text-ink'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <ResultsBody />
          </div>
        </div>
      </main>
    </div>
  )
}

/** Damage-type labels actually present in a weapon list (for the legend). */
function legendLabels(list: WeaponRanking[]): string[] {
  const seen = new Set<string>()
  for (const r of list.slice(0, CHART_N)) for (const b of r.breakdown) if (b.value > 0) seen.add(b.label)
  return [...seen]
}

function EmptyState() {
  return (
    <div className="er-card py-10 text-center text-sm text-ink-dim">
      Nothing matches this build yet. Raise your stats, or enable “Show items I can’t use yet”.
    </div>
  )
}
