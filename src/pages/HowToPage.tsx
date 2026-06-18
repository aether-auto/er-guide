import TopBar from '../components/TopBar'

const TOC = [
  { id: 'what-this-is', label: 'What this is' },
  { id: 'reading-the-route', label: 'Reading the route' },
  { id: 'using-the-map', label: 'Using the map' },
  { id: 'tracking-progress', label: 'Tracking progress' },
  { id: 'build-optimizer', label: 'Build optimizer' },
  { id: 'coverage-contributing', label: 'Coverage & contributing' },
]

export default function HowToPage() {
  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-6 py-6">
        <h1 className="font-display mb-2 text-3xl text-gold">How to use</h1>
        <p className="mb-6 text-sm text-ink-dim">
          A quick orientation to the guide, the map, and progress tracking.
        </p>

        {/* Table of contents */}
        <nav aria-label="Page contents" className="mb-8 rounded border border-edge bg-panel px-4 py-3 text-sm">
          <p className="font-display mb-2 text-xs uppercase tracking-wider text-gold-dim">Contents</p>
          <ol className="space-y-1">
            {TOC.map((item, i) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-gold hover:underline"
                >
                  {i + 1}. {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* § 1 — What this is */}
        <section id="what-this-is" className="mb-8 scroll-mt-4">
          <h2 className="font-display mb-3 text-xl text-gold">1. What this is</h2>
          <div className="space-y-3 text-sm text-ink">
            <p>
              This is an open-source, non-commercial grace-to-grace 100% route for Elden Ring (base
              game + Shadow of the Erdtree). The goal: collect every useful unique item in a single
              playthrough without backtracking more than necessary.
            </p>
            <p>
              Every item in the route is a <span className="text-gold">persistent, checkable step</span>.
              Checking it saves to your browser — no account needed, nothing leaves your device by
              default. Come back tomorrow and your progress is where you left it.
            </p>
            <p>
              The route is always <em>complete</em> in the sense that every item is accounted for,
              even where the prose directions aren't polished yet. Items not yet woven into the
              step-by-step narrative appear in a <span className="text-gold-dim">Region sweep</span> list
              at the end of each region — a cleanup checklist you can work through at your own pace.
            </p>
          </div>
        </section>

        <hr className="mb-8 border-edge" />

        {/* § 2 — Reading the route */}
        <section id="reading-the-route" className="mb-8 scroll-mt-4">
          <h2 className="font-display mb-3 text-xl text-gold">2. Reading the route</h2>
          <div className="space-y-3 text-sm text-ink">
            <p>The route has three levels of structure:</p>
            <ul className="ml-4 list-disc space-y-1 text-ink-dim">
              <li>
                <span className="text-ink">Region</span> — a major area of the game world (e.g.
                Limgrave, Liurnia).
              </li>
              <li>
                <span className="text-ink">Leg</span> — a segment from one Site of Grace to the
                next, the core unit of the route. Each leg is a self-contained list of steps to
                complete before you move on.
              </li>
              <li>
                <span className="text-ink">Step</span> — a single action: pick up an item, fight a
                boss, follow a quest beat, or take a direction note.
              </li>
            </ul>
            <p>
              Steps come in a few flavours: item pickups, directional waypoints, boss encounters, and
              quest steps. Item and quest steps are checkable; direction notes are informational.
            </p>
            <p>
              The <span className="text-gold">pulsing "next up" marker</span> highlights your current
              unchecked item both in the route panel and on the map. The map auto-pans to that marker
              when you navigate to a region, so you can always see where to head next without hunting
              through the list.
            </p>
            <p>
              The <span className="text-gold-dim">Region sweep</span> at the bottom of a region is
              the cleanup list — items that belong in the region but haven't been placed into a
              specific leg yet. Work through it when you're wrapping up the area to make sure nothing
              is missed.
            </p>
          </div>
        </section>

        <hr className="mb-8 border-edge" />

        {/* § 3 — Using the map */}
        <section id="using-the-map" className="mb-8 scroll-mt-4">
          <h2 className="font-display mb-3 text-xl text-gold">3. Using the map</h2>
          <div className="space-y-3 text-sm text-ink">
            <p>
              The map <em>is</em> the guide. Every region page is a full-viewport interactive map
              with the route panel overlaid alongside it. Checking an item in the panel or on the map
              keeps both in sync instantly.
            </p>
            <p>The map has four layers you can switch between:</p>
            <ul className="ml-4 list-disc space-y-1 text-ink-dim">
              <li><span className="text-ink">Overworld</span> — the main surface map.</li>
              <li><span className="text-ink">Underground</span> — the Siofra / Ainsel / Deeproot Depths layer.</li>
              <li><span className="text-ink">Ashen Capital</span> — post-Maliketh Leyndell.</li>
              <li><span className="text-ink">Realm of Shadow</span> — Shadow of the Erdtree DLC.</li>
            </ul>
            <p>
              Markers use <span className="text-gold">category glyphs</span> — a small symbol that
              identifies the type of item at a glance (weapon, armor, talisman, etc.). When you check
              an item, its marker desaturates so the map stays readable and you can see at a glance
              what's left.
            </p>
            <p>
              Clicking a marker opens a <span className="text-gold-dim">popup info card</span> with
              the item's full acquisition notes, quest context, and any missable warnings — plus a
              check/uncheck button synced with your progress. No external links; everything is
              self-contained.
            </p>
            <p>
              The <span className="text-gold">layers panel</span> (top-right of the map) lets you
              toggle individual item categories on and off, so you can focus the map on just the items
              you care about right now.
            </p>
            <p>
              Quiet <span className="text-gold-dim">landmark diamonds</span> mark named locations
              (ruins, caves, evergaols) for orientation — they're purely for navigation and don't
              represent checkable items.
            </p>
          </div>
        </section>

        <hr className="mb-8 border-edge" />

        {/* § 4 — Tracking progress */}
        <section id="tracking-progress" className="mb-8 scroll-mt-4">
          <h2 className="font-display mb-3 text-xl text-gold">4. Tracking progress</h2>
          <div className="space-y-3 text-sm text-ink">
            <p>
              Progress is saved locally in your browser (<code className="text-gold-dim">localStorage</code>).
              Nothing is sent anywhere by default — no account, no server, no tracking.
            </p>

            <h3 className="font-display text-base text-gold-dim">NG+ profiles</h3>
            <p>
              Each playthrough can have its own profile. On the{' '}
              <span className="text-gold">Progress</span> page, type a name in the "new profile"
              box and hit <em>create</em> to start fresh without losing your previous run. Switch
              between profiles at any time from the same dropdown.
            </p>

            <h3 className="font-display text-base text-gold-dim">Export & import</h3>
            <p>
              You can download a full JSON backup of your progress (all profiles, checked and
              ignored items) with the <em>export save</em> button on the Progress page. To restore
              it — on the same device or another — use <em>import save</em> and pick the file.
              This is the most reliable way to back up or transfer a complete save.
            </p>

            <h3 className="font-display text-base text-gold-dim">Sync code (moving between devices)</h3>
            <p>
              For a quick device-to-device move without handling a file, use the{' '}
              <span className="text-gold">sync code</span>. On the Progress page, copy the code
              on the old device, then paste it into the "Load from sync code" box on the new one.
              The code is a compact, self-contained snapshot of your entire save — no server, no
              account. It's a one-time manual copy; there's no background sync.
            </p>
            <p className="text-xs text-ink-dim">
              Tip: you can also share a sync-code link directly — append{' '}
              <code>?code=&lt;your-code&gt;</code> to the Progress page URL. The receiving device
              will offer a confirm banner before importing anything.
            </p>
          </div>
        </section>

        <hr className="mb-8 border-edge" />

        {/* § 5 — Build optimizer */}
        <section id="build-optimizer" className="mb-8 scroll-mt-4">
          <h2 className="font-display mb-3 text-xl text-gold">5. Build optimizer</h2>
          <div className="space-y-3 text-sm text-ink">
            <p>
              The <span className="text-gold">Build</span> page ranks gear by the damage it does
              for <em>your</em> character. Enter your level and the five damage stats (Strength,
              Dexterity, Intelligence, Faith, Arcane), toggle two-handing, and optionally pick
              talismans.
            </p>
            <p>
              It then lists, sorted by computed{' '}
              <span className="text-gold-dim">Attack Rating</span>: best weapons overall and per
              damage type, best weapons for each status-effect buildup, and best sorceries and
              incantations — each shown at the affinity and upgrade level that's strongest for your
              stats. By default it only shows what you can wield; flip a toggle to see everything.
              Where a recommendation is on the route, a link takes you straight to it.
            </p>
            <p className="text-xs text-ink-dim">
              Rankings are by Attack Rating (the standard calculator metric), not per-swing motion
              values.
            </p>
          </div>
        </section>

        <hr className="mb-8 border-edge" />

        {/* § 6 — Coverage & contributing */}
        <section id="coverage-contributing" className="mb-8 scroll-mt-4">
          <h2 className="font-display mb-3 text-xl text-gold">6. Coverage & contributing</h2>
          <div className="space-y-3 text-sm text-ink">
            <p>
              The <span className="text-gold">Coverage</span> page is the project's to-do list. It
              shows two kinds of gaps:
            </p>
            <ul className="ml-4 list-disc space-y-1 text-ink-dim">
              <li>
                <span className="text-ink">Items without a map marker</span> — the item is in the
                route but hasn't been pinned on the map yet.
              </li>
              <li>
                <span className="text-ink">Items in Region sweep</span> — the item is accounted for
                but hasn't been placed into a specific leg with step-by-step directions.
              </li>
            </ul>
            <p>
              Both categories are checkable in the guide right now — Coverage just surfaces them so
              contributors know where to focus polish.
            </p>
            <p>
              To contribute: edit the relevant file in{' '}
              <code className="text-gold-dim">data/regions/</code>, run{' '}
              <code className="text-gold-dim">npm run validate</code> to confirm the schema and
              item-placement invariant pass, then open a pull request. The validate step is the CI
              gate — if it passes locally it will pass in CI.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
