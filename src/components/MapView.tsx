import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Category, MapCode, MapRef } from '../lib/types'
import { CATEGORY_META } from '../lib/types'
import {
  CATEGORY_COLOR,
  CATEGORY_GLYPH,
  categoryIcon,
  graceIcon,
  locationIcon,
  smithingStoneIcon,
  type MarkerVariant,
} from '../lib/markers'
import { itemsById, regions, stepNoteByItemId } from '../lib/data'
import { progressStore } from '../lib/useProgress'
import { useUi } from '../App'
import mapExtras from '../../data/map-extras.json'
import { buildDetailsHtml } from '../lib/itemDetails'

// ── Graces + locations + smithing stones (map-display data; never part of checklist) ─────

interface GraceEntry {
  code: string
  markerId: number
  name: string
  lat: number
  lng: number
}
interface LocationEntry extends GraceEntry {
  kind: string
}
interface SmithingStoneEntry {
  code: string
  markerId: number
  name: string
  lat: number
  lng: number
  somber: boolean
  id: string
  level: number | null
  ancient: boolean
  kind: 'somber' | 'regular'
  instructions: string
}
const { graces, locations, smithingStones } = mapExtras as {
  graces: GraceEntry[]
  locations: LocationEntry[]
  smithingStones: SmithingStoneEntry[]
}

// ── Constants ──────────────────────────────────────────────────────────────

const LAYERS: { code: MapCode; label: string }[] = [
  { code: 'overworld', label: 'Overworld' },
  { code: 'underground', label: 'Underground' },
  { code: 'ashen', label: 'Ashen' },
  { code: 'dlc', label: 'DLC' },
]

// All categories in display order (matches CATEGORY_META)
const ALL_CATEGORIES = Object.keys(CATEGORY_META) as Category[]

// CRS.Simple pixel-plane: the z0 tile is 256×256 and every z is a full
// 2^z × 2^z grid (tiles README). The Fextralife marker dataset (lat ≈ -256..0,
// lng ≈ 0..256) is already in this plane — used as-is, no re-projection.
const MAP_BOUNDS: L.LatLngBoundsLiteral = [
  [-256, 0],
  [0, 256],
]
const INITIAL_CENTER: L.LatLngExpression = [-128, 128]
const INITIAL_ZOOM = 3

const BASE_URL = import.meta.env.BASE_URL

function tileUrl(code: MapCode) {
  return `${BASE_URL}tiles/${code}/{z}/{x}/{y}.webp`
}

function storedLayer(): MapCode | null {
  try {
    const v = sessionStorage.getItem('er-map-layer')
    return LAYERS.some((l) => l.code === v) ? (v as MapCode) : null
  } catch {
    return null
  }
}

/** Smithing stones are OFF by default (509 markers clutter the map). */
function storedSmithingToggle(): boolean {
  try {
    return sessionStorage.getItem('er-smithing-show') === 'true'
  } catch {
    return false
  }
}

function storedGracesToggle(): boolean {
  try {
    const v = sessionStorage.getItem('er-graces-show')
    return v === null ? true : v === 'true'
  } catch {
    return true
  }
}

function storedLocationsToggle(): boolean {
  try {
    const v = sessionStorage.getItem('er-locations-show')
    return v === null ? true : v === 'true'
  } catch {
    return true
  }
}

/** Returns set of hidden categories (stored as JSON array). Default: all visible (empty set). */
function storedHiddenCategories(): Set<Category> {
  try {
    const raw = sessionStorage.getItem('er-hidden-categories')
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as Category[]
    return new Set(arr.filter((c) => ALL_CATEGORIES.includes(c)))
  } catch {
    return new Set()
  }
}

function saveHiddenCategories(hidden: Set<Category>) {
  try {
    sessionStorage.setItem('er-hidden-categories', JSON.stringify([...hidden]))
  } catch {
    /* private mode */
  }
}

// ── Smithing filter helpers ────────────────────────────────────────────────

type SmithKindFilter = 'all' | 'somber' | 'regular'

interface SmithFilter {
  kind: SmithKindFilter
  /** Set of active levels — numbers 1-9 plus 'ancient'. All active by default. */
  levels: Set<number | 'ancient'>
}

const ALL_SMITH_LEVELS: (number | 'ancient')[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'ancient']

function defaultSmithFilter(): SmithFilter {
  return { kind: 'all', levels: new Set(ALL_SMITH_LEVELS) }
}

function storedSmithFilter(): SmithFilter {
  try {
    const raw = sessionStorage.getItem('er-smithing-filter')
    if (!raw) return defaultSmithFilter()
    const parsed = JSON.parse(raw) as { kind: SmithKindFilter; levels: (number | 'ancient')[] }
    return {
      kind: parsed.kind ?? 'all',
      levels: new Set(parsed.levels ?? ALL_SMITH_LEVELS),
    }
  } catch {
    return defaultSmithFilter()
  }
}

function saveSmithFilter(f: SmithFilter) {
  try {
    sessionStorage.setItem('er-smithing-filter', JSON.stringify({ kind: f.kind, levels: [...f.levels] }))
  } catch {
    /* private mode */
  }
}

function stonePassesFilter(stone: SmithingStoneEntry, f: SmithFilter): boolean {
  // Kind filter
  if (f.kind === 'somber' && !stone.somber) return false
  if (f.kind === 'regular' && stone.somber) return false
  // Level filter
  if (stone.ancient) {
    return f.levels.has('ancient')
  }
  if (stone.level !== null) {
    return f.levels.has(stone.level)
  }
  // level null + not ancient: treat as level null — always show (15 stones)
  return true
}

// ── MapView ────────────────────────────────────────────────────────────────

export interface MapViewProps {
  /** Layer the current region wants shown ('dlc' for DLC regions). */
  initialLayer?: MapCode
  /** Currently routed leg (URL param) — keys the once-per-leg auto-pan. */
  activeLegId?: string | null
  /** First unchecked checkable item — gets the pulsing pin + auto-pan. */
  nextUpId?: string | null
}

export default function MapView({ initialLayer, activeLegId, nextUpId }: MapViewProps) {
  const { registerFocus } = useUi()
  const containerRef = useRef<HTMLDivElement>(null)

  // Leaflet object refs — stable across renders, mutated imperatively.
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<MapCode>(initialLayer ?? storedLayer() ?? 'overworld')
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const gracesGroupRef = useRef<L.LayerGroup | null>(null)
  const locationsGroupRef = useRef<L.LayerGroup | null>(null)
  const smithingGroupRef = useRef<L.LayerGroup | null>(null)
  const itemGroupRef = useRef<L.LayerGroup | null>(null)
  // Per-category LayerGroups for independent toggle
  const categoryGroupsRef = useRef<Map<Category, L.LayerGroup>>(new Map())
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map()) // itemId → marker
  const variantMapRef = useRef<Map<string, MarkerVariant>>(new Map()) // itemId → current icon variant
  const smithingMarkerMapRef = useRef<Map<string, L.Marker>>(new Map()) // stoneId → marker
  const showGracesRef = useRef(storedGracesToggle())
  const showLocationsRef = useRef(storedLocationsToggle())
  const showSmithingRef = useRef(storedSmithingToggle())
  const smithFilterRef = useRef<SmithFilter>(storedSmithFilter())
  // Per-category visibility (hidden = not on map)
  const hiddenCategoriesRef = useRef<Set<Category>>(storedHiddenCategories())
  const smithFilterPanelRef = useRef<HTMLDivElement | null>(null)
  const smithCountEl = useRef<HTMLSpanElement | null>(null)
  const tabContainerRef = useRef<HTMLDivElement | null>(null)
  // Latest route props, readable from imperative callbacks (switchLayer).
  const routeStateRef = useRef<{ activeLegId: string | null; nextUpId: string | null }>({
    activeLegId: activeLegId ?? null,
    nextUpId: nextUpId ?? null,
  })
  routeStateRef.current = { activeLegId: activeLegId ?? null, nextUpId: nextUpId ?? null }

  // Auto-pan guard: resets when activeLegId changes so we fly once per
  // region/leg mount but not on every item check within the same leg.
  const autoPanFiredRef = useRef<string | null>(null)

  // ── Imperative re-draw helpers (use refs only) ───────────────────────────

  function redrawOverlays() {
    const map = mapRef.current
    const itemGroup = itemGroupRef.current
    const gracesGroup = gracesGroupRef.current
    const locationsGroup = locationsGroupRef.current
    const smithingGroup = smithingGroupRef.current
    if (!map || !itemGroup || !gracesGroup || !locationsGroup || !smithingGroup) return
    const code = layerRef.current
    const { nextUpId } = routeStateRef.current

    gracesGroup.clearLayers()
    renderGraces(gracesGroup, code)

    locationsGroup.clearLayers()
    renderLocations(locationsGroup, code)

    smithingGroup.clearLayers()
    smithingMarkerMapRef.current.clear()
    renderSmithingStones(smithingGroup, smithingMarkerMapRef.current, code, smithFilterRef.current, map)
    updateSmithingCounts(smithCountEl.current, code, smithFilterRef.current, progressStore.getSnapshot())

    // Clear and rebuild per-category groups
    categoryGroupsRef.current.forEach((group) => group.clearLayers())
    markerMapRef.current.clear()
    variantMapRef.current.clear()
    renderItems(
      categoryGroupsRef.current,
      markerMapRef.current,
      variantMapRef.current,
      code,
      nextUpId,
      map,
    )
  }

  function switchLayer(code: MapCode) {
    const map = mapRef.current
    if (!map) return
    layerRef.current = code
    tileLayerRef.current?.setUrl(tileUrl(code))
    redrawOverlays()
    // Update tab active state
    tabContainerRef.current
      ?.querySelectorAll<HTMLButtonElement>('.er-layer-tab[data-code]')
      .forEach((btn) => btn.classList.toggle('active', btn.dataset.code === code))
    try {
      sessionStorage.setItem('er-map-layer', code)
    } catch {
      /* private mode */
    }
  }

  // ── Mount: create the map once ───────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      minZoom: 0,
      maxZoom: 7,
      maxBounds: MAP_BOUNDS,
      maxBoundsViscosity: 0.8,
      // Default zoom control sits top-left, underneath the RoutePanel overlay —
      // place it bottom-right instead.
      zoomControl: false,
      attributionControl: true,
    })
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapRef.current = map

    tileLayerRef.current = L.tileLayer(tileUrl(layerRef.current), {
      minZoom: 0,
      maxZoom: 7,
      maxNativeZoom: 6,
      noWrap: true,
      tileSize: 256,
      attribution: '© FromSoftware / Bandai Namco — fan project, tiles via fextralife.com',
    }).addTo(map)

    // Stacking: smithing stones sit deepest (below locations), locations sit
    // UNDER item pins (item pins dominate), graces sit ABOVE them
    // (markerPane is 600; tooltips 650, popups 700).
    map.createPane('er-smithing').style.zIndex = '560'
    map.createPane('er-locations').style.zIndex = '580'
    map.createPane('er-graces').style.zIndex = '620'

    // Zoom-band classes on the container — CSS reveals grace labels at z≥5
    // and location labels at z≥4 without re-rendering any markers.
    const updateZoomClasses = () => {
      const z = map.getZoom()
      const el = map.getContainer()
      el.classList.toggle('er-zoom-ge4', z >= 4)
      el.classList.toggle('er-zoom-ge5', z >= 5)
    }
    map.on('zoomend', updateZoomClasses)
    updateZoomClasses()

    gracesGroupRef.current = showGracesRef.current ? L.layerGroup().addTo(map) : L.layerGroup()
    locationsGroupRef.current = showLocationsRef.current ? L.layerGroup().addTo(map) : L.layerGroup()
    // Smithing stones OFF by default — only add to map if persisted toggle is on
    smithingGroupRef.current = showSmithingRef.current
      ? L.layerGroup().addTo(map)
      : L.layerGroup()

    // Per-category item groups
    const catGroups = new Map<Category, L.LayerGroup>()
    for (const cat of ALL_CATEGORIES) {
      const hidden = hiddenCategoriesRef.current.has(cat)
      const group = hidden ? L.layerGroup() : L.layerGroup().addTo(map)
      catGroups.set(cat, group)
    }
    categoryGroupsRef.current = catGroups

    // itemGroupRef kept as an alias for compatibility (not actually used for rendering)
    itemGroupRef.current = L.layerGroup()

    redrawOverlays()

    // ── Unified "▤ Layers" control (top-right) ───────────────────────────────
    const LayersControl = L.Control.extend({
      onAdd() {
        // Outer container — holds the trigger button + floating panel
        const wrapper = L.DomUtil.create('div', 'er-layers-wrapper') as HTMLDivElement
        wrapper.style.cssText = 'position:relative;'
        L.DomEvent.disableClickPropagation(wrapper)
        L.DomEvent.disableScrollPropagation(wrapper)

        // ── Layer tabs column (map code switcher) ──────────────────────────
        const tabColumn = L.DomUtil.create('div', '', wrapper) as HTMLDivElement
        tabColumn.style.cssText =
          'display:flex;flex-direction:column;gap:4px;padding:4px;background:rgba(14,12,9,0.85);border:1px solid #2c261b;border-radius:6px;margin-bottom:4px;'
        tabContainerRef.current = tabColumn

        for (const { code, label } of LAYERS) {
          const btn = L.DomUtil.create('button', 'er-layer-tab', tabColumn) as HTMLButtonElement
          btn.textContent = label
          btn.dataset.code = code
          if (code === layerRef.current) btn.classList.add('active')
          L.DomEvent.on(btn, 'click', (e) => {
            L.DomEvent.stopPropagation(e)
            switchLayer(code)
          })
        }

        // ── "▤ Layers" toggle button ───────────────────────────────────────
        const triggerBtn = L.DomUtil.create('button', 'er-layers-btn', wrapper) as HTMLButtonElement
        const iconSpan = L.DomUtil.create('span', 'er-layers-btn__icon', triggerBtn)
        iconSpan.textContent = '▤'
        const labelSpan = L.DomUtil.create('span', '', triggerBtn)
        labelSpan.textContent = 'Layers'

        // ── Floating panel ─────────────────────────────────────────────────
        const panel = L.DomUtil.create('div', 'er-layers-panel', wrapper) as HTMLDivElement
        panel.id = 'er-layers-panel'

        // Toggle panel open/close
        let panelOpen = false
        function openPanel() {
          panelOpen = true
          panel.classList.add('open')
          triggerBtn.classList.add('open')
          rebuildPanel()
        }
        function closePanel() {
          panelOpen = false
          panel.classList.remove('open')
          triggerBtn.classList.remove('open')
        }
        L.DomEvent.on(triggerBtn, 'click', (e) => {
          L.DomEvent.stopPropagation(e)
          if (panelOpen) closePanel()
          else openPanel()
        })
        // Close panel when clicking on the map canvas itself (not on controls)
        map.on('click', () => {
          if (panelOpen) closePanel()
        })

        // ── Build panel content ────────────────────────────────────────────
        function rebuildPanel() {
          panel.innerHTML = ''
          const code = layerRef.current

          // ── ITEMS section ────────────────────────────────────────────────
          const itemsSection = buildSection(panel, 'Items', 'items-section')

          // Determine which categories have pins on this map layer
          const catCounts = new Map<Category, number>()
          for (const region of regions) {
            const allSteps = [
              ...region.legs.flatMap((l) => l.steps),
              ...region.cleanup.map((id) => ({ type: 'item' as const, itemId: id })),
            ]
            const seen = new Set<string>()
            for (const step of allSteps) {
              if (step.type !== 'item') continue
              if (seen.has(step.itemId)) continue
              seen.add(step.itemId)
              const item = itemsById.get(step.itemId)
              if (!item?.map || item.map.code !== code) continue
              catCounts.set(item.category, (catCounts.get(item.category) ?? 0) + 1)
            }
          }

          const presentCats = ALL_CATEGORIES.filter((c) => (catCounts.get(c) ?? 0) > 0)

          if (presentCats.length === 0) {
            const empty = L.DomUtil.create('div', 'er-layers-empty', itemsSection.body)
            empty.textContent = 'No item pins on this layer'
          } else {
            // All / None quick actions
            const quickRow = L.DomUtil.create('div', 'er-layers-quick', itemsSection.body)
            const allBtn = L.DomUtil.create('button', 'er-layers-quick__btn', quickRow) as HTMLButtonElement
            allBtn.textContent = 'All'
            allBtn.id = 'er-cat-all-btn'
            const noneBtn = L.DomUtil.create('button', 'er-layers-quick__btn', quickRow) as HTMLButtonElement
            noneBtn.textContent = 'None'
            noneBtn.id = 'er-cat-none-btn'

            L.DomEvent.on(allBtn, 'click', (e) => {
              L.DomEvent.stopPropagation(e)
              hiddenCategoriesRef.current = new Set()
              saveHiddenCategories(hiddenCategoriesRef.current)
              for (const cat of ALL_CATEGORIES) {
                const group = categoryGroupsRef.current.get(cat)
                if (group && !map.hasLayer(group)) group.addTo(map)
              }
              // Update row states
              panel.querySelectorAll<HTMLButtonElement>('.er-layers-row[data-category]').forEach((row) => {
                row.classList.add('er-layers-row--active')
                row.classList.remove('er-layers-row--inactive')
              })
            })
            L.DomEvent.on(noneBtn, 'click', (e) => {
              L.DomEvent.stopPropagation(e)
              hiddenCategoriesRef.current = new Set(ALL_CATEGORIES)
              saveHiddenCategories(hiddenCategoriesRef.current)
              for (const cat of ALL_CATEGORIES) {
                const group = categoryGroupsRef.current.get(cat)
                if (group && map.hasLayer(group)) group.remove()
              }
              panel.querySelectorAll<HTMLButtonElement>('.er-layers-row[data-category]').forEach((row) => {
                row.classList.remove('er-layers-row--active')
                row.classList.add('er-layers-row--inactive')
              })
            })

            for (const cat of presentCats) {
              const count = catCounts.get(cat) ?? 0
              const isActive = !hiddenCategoriesRef.current.has(cat)
              const color = CATEGORY_COLOR[cat]
              const glyph = CATEGORY_GLYPH[cat]
              const label = CATEGORY_META[cat].label

              const row = L.DomUtil.create('button', 'er-layers-row', itemsSection.body) as HTMLButtonElement
              row.dataset.category = cat
              row.classList.add(isActive ? 'er-layers-row--active' : 'er-layers-row--inactive')

              // Color swatch
              const swatch = L.DomUtil.create('span', 'er-layers-swatch', row)
              swatch.style.color = color
              swatch.style.borderColor = color
              swatch.textContent = glyph

              // Label
              const labelEl = L.DomUtil.create('span', 'er-layers-row__label', row)
              labelEl.textContent = label

              // Count
              const countEl = L.DomUtil.create('span', 'er-layers-row__count', row)
              countEl.textContent = String(count)

              // Toggle pill
              L.DomUtil.create('span', 'er-layers-toggle', row)

              L.DomEvent.on(row, 'click', (e) => {
                L.DomEvent.stopPropagation(e)
                const hidden = hiddenCategoriesRef.current
                const group = categoryGroupsRef.current.get(cat)
                if (hidden.has(cat)) {
                  // Show it
                  hidden.delete(cat)
                  if (group && !map.hasLayer(group)) group.addTo(map)
                  row.classList.add('er-layers-row--active')
                  row.classList.remove('er-layers-row--inactive')
                } else {
                  // Hide it
                  hidden.add(cat)
                  if (group && map.hasLayer(group)) group.remove()
                  row.classList.remove('er-layers-row--active')
                  row.classList.add('er-layers-row--inactive')
                }
                saveHiddenCategories(hidden)
              })
            }
          }

          // ── WORLD section ────────────────────────────────────────────────
          const sep1 = L.DomUtil.create('hr', 'er-layers-sep', panel)
          sep1.setAttribute('aria-hidden', 'true')
          const worldSection = buildSection(panel, 'World', 'world-section')

          // Graces toggle
          buildWorldRow(worldSection.body, {
            id: 'er-grace-toggle',
            label: '✦ Sites of Grace',
            active: showGracesRef.current,
            onToggle: () => {
              showGracesRef.current = !showGracesRef.current
              const gracesGroup = gracesGroupRef.current
              if (!gracesGroup) return
              if (showGracesRef.current) gracesGroup.addTo(map)
              else gracesGroup.remove()
              try { sessionStorage.setItem('er-graces-show', showGracesRef.current ? 'true' : 'false') } catch { /* */ }
            },
          })

          // Locations toggle
          buildWorldRow(worldSection.body, {
            id: 'er-location-toggle',
            label: '◆ Locations',
            active: showLocationsRef.current,
            onToggle: () => {
              showLocationsRef.current = !showLocationsRef.current
              const locationsGroup = locationsGroupRef.current
              if (!locationsGroup) return
              if (showLocationsRef.current) locationsGroup.addTo(map)
              else locationsGroup.remove()
              try { sessionStorage.setItem('er-locations-show', showLocationsRef.current ? 'true' : 'false') } catch { /* */ }
            },
          })

          // ── RESOURCES section ────────────────────────────────────────────
          const sep2 = L.DomUtil.create('hr', 'er-layers-sep', panel)
          sep2.setAttribute('aria-hidden', 'true')
          const resSection = buildSection(panel, 'Resources', 'resources-section')

          // Smithing stones toggle + sub-filters
          buildWorldRow(resSection.body, {
            id: 'er-smithing-toggle',
            label: '⛏ Smithing Stones',
            active: showSmithingRef.current,
            onToggle: () => {
              showSmithingRef.current = !showSmithingRef.current
              const smithingGroup = smithingGroupRef.current
              if (!smithingGroup) return
              if (showSmithingRef.current) {
                smithingGroup.addTo(map)
                filterPanel.style.display = 'flex'
              } else {
                smithingGroup.remove()
                filterPanel.style.display = 'none'
              }
              try { sessionStorage.setItem('er-smithing-show', showSmithingRef.current ? 'true' : 'false') } catch { /* */ }
            },
          })

          // Smithing sub-filter panel
          const filterPanel = L.DomUtil.create('div', 'er-smith-filter er-layers-smithing-sub', resSection.body) as HTMLDivElement
          filterPanel.style.display = showSmithingRef.current ? 'flex' : 'none'
          filterPanel.id = 'er-smithing-filter'
          smithFilterPanelRef.current = filterPanel

          // Kind segmented control
          const kindRow = L.DomUtil.create('div', 'er-smith-filter__kind', filterPanel) as HTMLDivElement
          const kindOptions: { value: SmithKindFilter; label: string }[] = [
            { value: 'all', label: 'All' },
            { value: 'somber', label: 'Somber' },
            { value: 'regular', label: 'Regular' },
          ]
          const kindBtns: HTMLButtonElement[] = []
          for (const { value, label } of kindOptions) {
            const kb = L.DomUtil.create('button', 'er-smith-filter__kind-btn', kindRow) as HTMLButtonElement
            kb.dataset.kind = value
            kb.id = `er-smith-kind-${value}`
            kb.textContent = label
            if (value === 'regular') kb.classList.add('regular-active')
            if (smithFilterRef.current.kind === value) kb.classList.add('active')
            L.DomEvent.on(kb, 'click', (e) => {
              L.DomEvent.stopPropagation(e)
              smithFilterRef.current = { ...smithFilterRef.current, kind: value }
              saveSmithFilter(smithFilterRef.current)
              kindBtns.forEach((b) => b.classList.toggle('active', b.dataset.kind === value))
              rerenderSmithing()
            })
            kindBtns.push(kb)
          }

          // Level checkboxes row (1-9 + Ancient)
          const levelsRow = L.DomUtil.create('div', 'er-smith-filter__levels', filterPanel) as HTMLDivElement
          const allLevelEntries: (number | 'ancient')[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'ancient']
          for (const lvl of allLevelEntries) {
            const lb = L.DomUtil.create('button', 'er-smith-filter__lvl-btn', levelsRow) as HTMLButtonElement
            lb.dataset.level = String(lvl)
            lb.id = `er-smith-lvl-${lvl}`
            lb.textContent = lvl === 'ancient' ? 'Anc' : `[${lvl}]`
            if (lvl === 'ancient') lb.classList.add('ancient-btn')
            if (smithFilterRef.current.levels.has(lvl)) lb.classList.add('active')
            L.DomEvent.on(lb, 'click', (e) => {
              L.DomEvent.stopPropagation(e)
              const newLevels = new Set(smithFilterRef.current.levels)
              if (newLevels.has(lvl)) newLevels.delete(lvl)
              else newLevels.add(lvl)
              smithFilterRef.current = { ...smithFilterRef.current, levels: newLevels }
              saveSmithFilter(smithFilterRef.current)
              lb.classList.toggle('active', newLevels.has(lvl))
              rerenderSmithing()
            })
          }

          // Live count display
          const countsSpan = L.DomUtil.create('span', 'er-smith-filter__counts', filterPanel) as HTMLSpanElement
          countsSpan.id = 'er-smithing-counts'
          smithCountEl.current = countsSpan
          updateSmithingCounts(countsSpan, layerRef.current, smithFilterRef.current, progressStore.getSnapshot())
        }

        // Helper to re-render smithing stones with current filter
        function rerenderSmithing() {
          const smithingGroup = smithingGroupRef.current
          if (!smithingGroup) return
          smithingGroup.clearLayers()
          smithingMarkerMapRef.current.clear()
          renderSmithingStones(smithingGroup, smithingMarkerMapRef.current, layerRef.current, smithFilterRef.current, map)
          updateSmithingCounts(smithCountEl.current, layerRef.current, smithFilterRef.current, progressStore.getSnapshot())
        }

        return wrapper
      },
    })
    new LayersControl({ position: 'topright' }).addTo(map)

    // focus(): layer switch → flyTo → open popup. Registered with UiContext so
    // RoutePanel locate buttons drive the map; unregistered on unmount.
    const unregisterFocus = registerFocus((ref: MapRef, itemId?: string) => {
      if (ref.code !== layerRef.current) switchLayer(ref.code)
      map.flyTo([ref.lat, ref.lng], 6, { duration: 0.6 })
      if (itemId) {
        const marker = markerMapRef.current.get(itemId)
        if (marker) setTimeout(() => marker.openPopup(), 650) // after flyTo settles
      }
    })

    // Live pin re-style on progress changes (no React re-render needed).
    // Diffed against variantMapRef so a toggle re-styles only the 1–2 markers
    // whose variant actually changed — not all ~1k markers on the layer.
    const unsubscribe = progressStore.subscribe(() => {
      const snapshot = progressStore.getSnapshot()
      const { nextUpId } = routeStateRef.current
      // Item pin re-style
      markerMapRef.current.forEach((marker, itemId) => {
        const item = itemsById.get(itemId)
        if (!item) return
        const variant: MarkerVariant =
          itemId === nextUpId
            ? 'nextup'
            : snapshot.checked[itemId] != null
              ? 'checked'
              : snapshot.ignored[itemId] != null
                ? 'ignored'
                : 'normal'
        if (variantMapRef.current.get(itemId) === variant) return
        variantMapRef.current.set(itemId, variant)
        marker.setIcon(categoryIcon(item.category, variant))
      })
      // Smithing stone re-style (dim + ✓ badge when checked)
      smithingMarkerMapRef.current.forEach((marker, stoneId) => {
        // stoneId is like "smith-overworld-1234" — find the stone entry
        const stone = smithingStones.find((s) => s.id === stoneId)
        if (!stone) return
        const isChecked = snapshot.checked[stoneId] != null
        const prevChecked = variantMapRef.current.get(stoneId) === 'checked'
        if (isChecked === prevChecked) return
        variantMapRef.current.set(stoneId, isChecked ? 'checked' : 'normal')
        marker.setIcon(smithingStoneIcon(stone.name, stone.somber, isChecked))
      })
      // Update done-count in filter panel
      updateSmithingCounts(smithCountEl.current, layerRef.current, smithFilterRef.current, progressStore.getSnapshot())
    })

    // Expose map center via a DOM data attribute for acceptance tests
    // (avoids leaking the Leaflet instance into window; readable with page.evaluate).
    const updateCenterAttr = () => {
      const c = map.getCenter()
      containerRef.current?.setAttribute('data-map-center', `${c.lat},${c.lng}`)
    }
    map.on('moveend', updateCenterAttr)
    updateCenterAttr()

    // Keep tiles crisp when the layout settles after mount.
    const invalidate = () => map.invalidateSize()
    const t = setTimeout(invalidate, 100)
    window.addEventListener('resize', invalidate)

    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', invalidate)
      map.off('moveend', updateCenterAttr)
      map.off('zoomend', updateZoomClasses)
      unregisterFocus()
      unsubscribe()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Region navigation: a DLC region wants the DLC layer (and vice versa).
  useEffect(() => {
    if (initialLayer && mapRef.current && initialLayer !== layerRef.current) {
      switchLayer(initialLayer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLayer])

  // Route props changed (leg navigation / next-up advanced): redraw overlays.
  useEffect(() => {
    if (mapRef.current) redrawOverlays()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLegId, nextUpId])

  // Auto-pan to next-up pin on region/leg mount.
  // The guard key encodes the active leg so changing legs always triggers a
  // fresh pan, while checking items within the same leg does NOT re-fly
  // (handleCheck→focus() already covers that advance).
  useEffect(() => {
    const legKey = activeLegId ?? '__region__'
    if (autoPanFiredRef.current === legKey) return // already panned for this leg
    if (!mapRef.current) return
    if (!nextUpId) return
    const item = itemsById.get(nextUpId)
    if (!item?.map) return
    autoPanFiredRef.current = legKey
    if (item.map.code !== layerRef.current) {
      switchLayer(item.map.code)
    }
    mapRef.current.flyTo([item.map.lat, item.map.lng], 5, { duration: 0.6 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLegId, nextUpId])

  return <div ref={containerRef} className="h-full w-full" style={{ background: '#0e0c09' }} />
}

// ── Section builder helper ─────────────────────────────────────────────────

interface SectionRefs {
  section: HTMLDivElement
  body: HTMLDivElement
}

function buildSection(parent: HTMLElement, title: string, id: string): SectionRefs {
  const section = L.DomUtil.create('div', 'er-layers-section', parent) as HTMLDivElement
  section.id = id

  const header = L.DomUtil.create('div', 'er-layers-section__header', section) as HTMLDivElement
  const titleEl = L.DomUtil.create('span', 'er-layers-section__title', header)
  titleEl.textContent = title
  const caret = L.DomUtil.create('span', 'er-layers-section__caret', header)
  caret.textContent = '▼'

  const body = L.DomUtil.create('div', 'er-layers-section__body', section) as HTMLDivElement

  // Collapse/expand on header click
  L.DomEvent.on(header, 'click', (e) => {
    L.DomEvent.stopPropagation(e)
    section.classList.toggle('collapsed')
  })

  return { section, body }
}

interface WorldRowOpts {
  id: string
  label: string
  active: boolean
  onToggle: () => void
}

function buildWorldRow(parent: HTMLElement, opts: WorldRowOpts): HTMLButtonElement {
  const row = L.DomUtil.create('button', 'er-layers-row', parent) as HTMLButtonElement
  row.id = opts.id
  row.classList.add(opts.active ? 'er-layers-row--active' : 'er-layers-row--inactive')

  const labelEl = L.DomUtil.create('span', 'er-layers-row__label', row)
  labelEl.textContent = opts.label

  L.DomUtil.create('span', 'er-layers-toggle', row)

  L.DomEvent.on(row, 'click', (e) => {
    L.DomEvent.stopPropagation(e)
    opts.onToggle()
    // Find the current active state from the ref side (opts.onToggle mutated it)
    // We rely on the row class being updated by re-checking the DOM state
    row.classList.toggle('er-layers-row--active')
    row.classList.toggle('er-layers-row--inactive')
  })

  return row
}

// ── Module-level render helpers (no React state) ──────────────────────────

function renderGraces(group: L.LayerGroup, code: MapCode) {
  for (const grace of graces) {
    if (grace.code !== code) continue
    // Pane 'er-graces' (z 620) renders graces ABOVE item pins. The icon carries
    // a permanent name label shown at zoom ≥5; the hover tooltip covers lower
    // zooms (CSS hides .er-grace-tip when the permanent label is visible).
    L.marker([grace.lat, grace.lng], { icon: graceIcon(grace.name), pane: 'er-graces' })
      .bindTooltip(grace.name, { direction: 'top', offset: [0, -12], className: 'er-grace-tip' })
      .addTo(group)
  }
}

function renderLocations(group: L.LayerGroup, code: MapCode) {
  for (const loc of locations) {
    if (loc.code !== code) continue
    // Pane 'er-locations' (z 580) keeps landmarks UNDER item pins; the markers
    // are non-interactive so they never steal clicks from pins. Name labels
    // appear at zoom ≥4 via CSS.
    L.marker([loc.lat, loc.lng], {
      icon: locationIcon(loc.name),
      pane: 'er-locations',
      interactive: false,
      keyboard: false,
    }).addTo(group)
  }
}

function renderSmithingStones(
  group: L.LayerGroup,
  stoneMarkerMap: Map<string, L.Marker>,
  code: MapCode,
  filter: SmithFilter,
  map: L.Map,
) {
  const snapshot = progressStore.getSnapshot()
  for (const stone of smithingStones) {
    if (stone.code !== code) continue
    if (!stonePassesFilter(stone, filter)) continue
    // Pane 'er-smithing' (z 560) sits BELOW locations and item pins so 504
    // smithing-stone markers don't clutter the navigation view. Stones are
    // interactive — clicking opens a popup with name, badge, instructions, and
    // a Mark done button wired to the progress store. Name labels appear at
    // zoom ≥5 via CSS (same band as graces).
    const isChecked = snapshot.checked[stone.id] != null
    const marker = L.marker([stone.lat, stone.lng], {
      icon: smithingStoneIcon(stone.name, stone.somber, isChecked),
      pane: 'er-smithing',
    })
      .bindPopup(() => buildSmithingPopup(stone, map), {
        maxWidth: 260,
        minWidth: 220,
        autoPan: true,
      })
    marker.addTo(group)
    stoneMarkerMap.set(stone.id, marker)
  }
}

function buildSmithingPopup(stone: SmithingStoneEntry, map: L.Map): HTMLElement {
  const el = document.createElement('div')
  el.className = 'er-popup-card'

  const snapshot = progressStore.getSnapshot()
  const isChecked = snapshot.checked[stone.id] != null

  // Level badge text
  let levelBadge = ''
  if (stone.ancient) {
    levelBadge = 'Ancient'
  } else if (stone.level !== null) {
    levelBadge = `[${stone.level}]`
  }
  const kindBadge = stone.somber ? 'Somber' : 'Regular'
  const instructionsHtml = stone.instructions
    ? `<p class="er-popup-card__acq" style="max-height:120px;overflow-y:auto;">${escapeText(stone.instructions)}</p>`
    : '<p class="er-popup-card__note">No location notes.</p>'

  el.innerHTML = `
    <div class="er-popup-card__name">${escapeText(stone.name.replace(/ - .+$/, ''))}</div>
    <div class="er-popup-card__meta">
      <span class="er-popup-card__chip" style="${stone.somber ? 'color:#b08ae0;border-color:#7a5ab0' : 'color:#a0b0c8;border-color:#5a7090'}">${kindBadge}</span>
      ${levelBadge ? `<span class="er-popup-card__chip" style="${stone.ancient ? 'color:#e8b060;border-color:#c08040' : ''}">${levelBadge}</span>` : ''}
    </div>
    <div class="er-popup-card__body">${instructionsHtml}</div>
    <div class="er-popup-actions">
      <button class="er-smith-popup-check er-popup-check ${isChecked ? 'er-popup-check--done' : ''}">
        ${isChecked ? '✓ Done — tap to undo' : '✓ Mark done'}
      </button>
    </div>
  `

  el.querySelector('.er-smith-popup-check')?.addEventListener('click', () => {
    progressStore.toggle(stone.id)
    map.closePopup()
  })

  return el
}

/** Compute and update the live count display in the filter panel. */
function updateSmithingCounts(
  el: HTMLSpanElement | null,
  code: MapCode,
  filter: SmithFilter,
  snapshot: { checked: Record<string, number> },
) {
  if (!el) return
  const layer = smithingStones.filter((s) => s.code === code)
  const showing = layer.filter((s) => stonePassesFilter(s, filter))
  const done = showing.filter((s) => snapshot.checked[s.id] != null)
  el.textContent = `showing ${showing.length} / ${layer.length} — ✓ ${done.length} done`
}

function renderItems(
  catGroups: Map<Category, L.LayerGroup>,
  markerMap: Map<string, L.Marker>,
  variantMap: Map<string, MarkerVariant>,
  code: MapCode,
  nextUpId: string | null,
  map: L.Map,
) {
  const snapshot = progressStore.getSnapshot()

  for (const region of regions) {
    const allSteps = [
      ...region.legs.flatMap((l) => l.steps),
      ...region.cleanup.map((id) => ({ type: 'item' as const, itemId: id })),
    ]
    for (const step of allSteps) {
      if (step.type !== 'item') continue
      if (markerMap.has(step.itemId)) continue // item may appear in several legs
      const item = itemsById.get(step.itemId)
      if (!item?.map || item.map.code !== code) continue

      const group = catGroups.get(item.category)
      if (!group) continue

      const isChecked = snapshot.checked[item.id] != null
      const isIgnored = snapshot.ignored[item.id] != null
      const isNextUp = item.id === nextUpId
      const variant: MarkerVariant = isNextUp
        ? 'nextup'
        : isChecked
          ? 'checked'
          : isIgnored
            ? 'ignored'
            : 'normal'

      const marker = L.marker([item.map.lat, item.map.lng], {
        icon: categoryIcon(item.category, variant),
        zIndexOffset: isNextUp ? 200 : isChecked || isIgnored ? -50 : 0,
      })
      marker.bindPopup(() => buildPopup(item.id, map), {
        maxWidth: 290,
        minWidth: 280,
        autoPan: true,
      })
      marker.addTo(group)
      markerMap.set(item.id, marker)
      variantMap.set(item.id, variant)
    }
  }
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Rich in-app info card — the popup must stand alone, no external links.
function buildPopup(itemId: string, map: L.Map): HTMLElement {
  const item = itemsById.get(itemId)
  const el = document.createElement('div')
  if (!item) {
    el.textContent = 'Item not found'
    return el
  }

  const snapshot = progressStore.getSnapshot()
  const isChecked = snapshot.checked[itemId] != null
  const isIgnored = snapshot.ignored[itemId] != null
  const stepNote = stepNoteByItemId.get(itemId)

  const detailsHtml = item.details ? buildDetailsHtml(item.details, item.category) : ''

  el.className = 'er-popup-card'
  el.innerHTML = `
    <div class="er-popup-card__name">${escapeText(item.name)}</div>
    <div class="er-popup-card__meta">
      <span class="er-popup-card__chip">${CATEGORY_META[item.category].label}</span>
      ${item.dlc ? '<span class="er-popup-card__chip er-popup-card__chip--dlc">DLC</span>' : ''}
    </div>
    <div class="er-popup-card__body">
      ${detailsHtml}
      ${item.acquisition ? `<p class="er-popup-card__acq">${escapeText(item.acquisition)}</p>` : ''}
      ${stepNote && stepNote !== item.acquisition ? `<p class="er-popup-card__note">⌖ Route note: ${escapeText(stepNote)}</p>` : ''}
      ${item.quest ? `<p class="er-popup-card__quest">❖ Quest: ${escapeText(item.quest)}</p>` : ''}
    </div>
    ${
      item.missable
        ? `<div class="er-popup-card__missable">⚠ MISSABLE — ${escapeText(item.missable.lockedBy)}<br><span>${escapeText(item.missable.note)}</span></div>`
        : ''
    }
    <div class="er-popup-actions">
      <button class="er-popup-check ${isChecked ? 'er-popup-check--done' : ''}">
        ${isChecked ? '✓ Checked — tap to undo' : '✓ Mark done'}
      </button>
      <button class="er-popup-ignore ${isIgnored ? 'er-popup-ignore--active' : ''}"
        aria-label="${isIgnored ? 'Restore' : 'Ignore for now'}">
        ${isIgnored ? '↩ Restore' : '⊘ Ignore'}
      </button>
    </div>
  `

  // Two-way sync: toggling from the popup updates the store, which restyles
  // the pin (subscriber in MapView) and re-renders the RoutePanel list. The
  // popup itself closes — its content is a render-time snapshot.
  el.querySelector('.er-popup-check')?.addEventListener('click', () => {
    progressStore.toggle(itemId)
    map.closePopup()
  })
  el.querySelector('.er-popup-ignore')?.addEventListener('click', () => {
    progressStore.toggleIgnore(itemId)
    map.closePopup()
  })

  return el
}
