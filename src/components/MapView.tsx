import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapCode, MapRef } from '../lib/types'
import { CATEGORY_META } from '../lib/types'
import { categoryIcon, graceIcon, type MarkerVariant } from '../lib/markers'
import { nextUpSegment, routePathForLayer } from '../lib/route-path'
import { mapUrl } from '../lib/maplink'
import { itemsById, regions } from '../lib/data'
import { progressStore } from '../lib/useProgress'
import { useUi } from '../App'
import mapExtras from '../../data/map-extras.json'

// ── Graces (map-display data; never part of the checklist) ────────────────

interface GraceEntry {
  code: string
  markerId: number
  name: string
  lat: number
  lng: number
}
const graces = (mapExtras as { graces: GraceEntry[] }).graces

// ── Constants ──────────────────────────────────────────────────────────────

const LAYERS: { code: MapCode; label: string }[] = [
  { code: 'overworld', label: 'Overworld' },
  { code: 'underground', label: 'Underground' },
  { code: 'ashen', label: 'Ashen' },
  { code: 'dlc', label: 'DLC' },
]

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

// ── MapView ────────────────────────────────────────────────────────────────

export interface MapViewProps {
  /** Layer the current region wants shown ('dlc' for DLC regions). */
  initialLayer?: MapCode
  /** Currently routed leg (URL param) — its polyline is highlighted. */
  activeLegId?: string | null
  /** First unchecked checkable item — gets the pulsing pin + dashed segment. */
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
  const itemGroupRef = useRef<L.LayerGroup | null>(null)
  const polyGroupRef = useRef<L.LayerGroup | null>(null)
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map()) // itemId → marker
  const showGracesRef = useRef(true)
  const tabContainerRef = useRef<HTMLDivElement | null>(null)
  // Latest route props, readable from imperative callbacks (switchLayer).
  const routeStateRef = useRef<{ activeLegId: string | null; nextUpId: string | null }>({
    activeLegId: activeLegId ?? null,
    nextUpId: nextUpId ?? null,
  })
  routeStateRef.current = { activeLegId: activeLegId ?? null, nextUpId: nextUpId ?? null }

  // ── Imperative re-draw helpers (use refs only) ───────────────────────────

  function redrawOverlays() {
    const map = mapRef.current
    const itemGroup = itemGroupRef.current
    const polyGroup = polyGroupRef.current
    const gracesGroup = gracesGroupRef.current
    if (!map || !itemGroup || !polyGroup || !gracesGroup) return
    const code = layerRef.current
    const { activeLegId, nextUpId } = routeStateRef.current

    gracesGroup.clearLayers()
    renderGraces(gracesGroup, code)

    itemGroup.clearLayers()
    markerMapRef.current.clear()
    renderItems(itemGroup, markerMapRef.current, code, nextUpId, map)

    polyGroup.clearLayers()
    renderPolylines(polyGroup, code, activeLegId, nextUpId)
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

    gracesGroupRef.current = L.layerGroup().addTo(map)
    itemGroupRef.current = L.layerGroup().addTo(map)
    polyGroupRef.current = L.layerGroup().addTo(map)
    redrawOverlays()

    // Layer tabs + graces toggle (top-right)
    const LayerControl = L.Control.extend({
      onAdd() {
        const div = L.DomUtil.create('div', 'er-layer-controls')
        div.style.cssText =
          'display:flex;flex-direction:column;gap:4px;padding:4px;background:rgba(14,12,9,0.85);border:1px solid #2c261b;border-radius:6px;'
        L.DomEvent.disableClickPropagation(div)
        L.DomEvent.disableScrollPropagation(div)
        tabContainerRef.current = div

        for (const { code, label } of LAYERS) {
          const btn = L.DomUtil.create('button', 'er-layer-tab', div) as HTMLButtonElement
          btn.textContent = label
          btn.dataset.code = code
          if (code === layerRef.current) btn.classList.add('active')
          L.DomEvent.on(btn, 'click', (e) => {
            L.DomEvent.stopPropagation(e)
            switchLayer(code)
          })
        }

        const sep = L.DomUtil.create('div', '', div)
        sep.style.cssText = 'border-top:1px solid #2c261b;margin:2px 0;'
        const graceBtn = L.DomUtil.create('button', 'er-layer-tab', div) as HTMLButtonElement
        graceBtn.id = 'er-grace-toggle'
        graceBtn.textContent = '✦ Graces'
        graceBtn.classList.add('active')
        L.DomEvent.on(graceBtn, 'click', (e) => {
          L.DomEvent.stopPropagation(e)
          showGracesRef.current = !showGracesRef.current
          const gracesGroup = gracesGroupRef.current
          if (!gracesGroup) return
          if (showGracesRef.current) {
            gracesGroup.addTo(map)
            graceBtn.classList.add('active')
          } else {
            gracesGroup.remove()
            graceBtn.classList.remove('active')
          }
        })
        return div
      },
    })
    new LayerControl({ position: 'topright' }).addTo(map)

    // focus(): layer switch → flyTo → open popup. Registered with UiContext so
    // StepRow / RoutePanel locate buttons drive the map.
    registerFocus((ref: MapRef, itemId?: string) => {
      if (ref.code !== layerRef.current) switchLayer(ref.code)
      map.flyTo([ref.lat, ref.lng], 6, { duration: 0.6 })
      if (itemId) {
        const marker = markerMapRef.current.get(itemId)
        if (marker) setTimeout(() => marker.openPopup(), 650) // after flyTo settles
      }
    })

    // Live pin re-style on progress changes (no React re-render needed).
    const unsubscribe = progressStore.subscribe(() => {
      const snapshot = progressStore.getSnapshot()
      const { nextUpId } = routeStateRef.current
      markerMapRef.current.forEach((marker, itemId) => {
        const item = itemsById.get(itemId)
        if (!item) return
        const variant: MarkerVariant =
          itemId === nextUpId ? 'nextup' : snapshot.checked[itemId] != null ? 'checked' : 'normal'
        marker.setIcon(categoryIcon(item.category, variant))
      })
    })

    // Keep tiles crisp when the layout settles after mount.
    const invalidate = () => map.invalidateSize()
    const t = setTimeout(invalidate, 100)
    window.addEventListener('resize', invalidate)

    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', invalidate)
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

  return <div ref={containerRef} className="h-full w-full" style={{ background: '#0e0c09' }} />
}

// ── Module-level render helpers (no React state) ──────────────────────────

function renderGraces(group: L.LayerGroup, code: MapCode) {
  for (const grace of graces) {
    if (grace.code !== code) continue
    L.marker([grace.lat, grace.lng], { icon: graceIcon(), zIndexOffset: -100 })
      .bindTooltip(grace.name, { direction: 'top', offset: [0, -10] })
      .addTo(group)
  }
}

function renderItems(
  group: L.LayerGroup,
  markerMap: Map<string, L.Marker>,
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

      const isChecked = snapshot.checked[item.id] != null
      const isNextUp = item.id === nextUpId
      const variant: MarkerVariant = isNextUp ? 'nextup' : isChecked ? 'checked' : 'normal'

      const marker = L.marker([item.map.lat, item.map.lng], {
        icon: categoryIcon(item.category, variant),
        zIndexOffset: isNextUp ? 200 : isChecked ? -50 : 0,
      })
      marker.bindPopup(() => buildPopup(item.id, map), {
        maxWidth: 290,
        minWidth: 280,
        autoPan: true,
      })
      marker.addTo(group)
      markerMap.set(item.id, marker)
    }
  }
}

function renderPolylines(
  group: L.LayerGroup,
  code: MapCode,
  activeLegId: string | null,
  nextUpId: string | null,
) {
  for (const region of regions) {
    for (const leg of region.legs) {
      const coords = routePathForLayer(leg, itemsById, code)
      if (coords.length >= 2) {
        const active = leg.id === activeLegId
        L.polyline(coords, {
          color: '#c8a55a',
          weight: active ? 3.5 : 2,
          opacity: active ? 0.9 : 0.45,
          className: active ? 'er-route er-route--active' : 'er-route',
        }).addTo(group)
      }

      // Dashed immediate-direction cue: next-up pin → following mapped step.
      // Drawn for the leg that actually contains the next-up item (the active
      // leg when routed, or whichever leg holds it in region-sweep mode).
      if (nextUpId && leg.steps.some((s) => s.type === 'item' && s.itemId === nextUpId)) {
        const segment = nextUpSegment(leg, itemsById, code, nextUpId)
        if (segment) {
          L.polyline(segment, {
            color: '#f5d77a',
            weight: 2.5,
            opacity: 0.9,
            dashArray: '6 6',
            className: 'er-route er-route--nextup',
          }).addTo(group)
        }
      }
    }
  }
}

function buildPopup(itemId: string, map: L.Map): HTMLElement {
  const item = itemsById.get(itemId)
  const el = document.createElement('div')
  if (!item) {
    el.textContent = 'Item not found'
    return el
  }

  const snapshot = progressStore.getSnapshot()
  const isChecked = snapshot.checked[itemId] != null

  el.style.cssText = 'padding:10px 12px;font-size:13px;color:#d8d2c4;'
  el.innerHTML = `
    <div style="font-weight:600;font-size:14px;color:#c8a55a;margin-bottom:4px;padding-right:20px;">${item.name}</div>
    <div style="font-size:11px;color:#8f887a;margin-bottom:6px;">
      ${CATEGORY_META[item.category].label}${item.dlc ? ' · <span style="color:#c8a55a;">DLC</span>' : ''}
    </div>
    ${item.acquisition ? `<div style="margin-bottom:6px;font-size:12px;line-height:1.5;">${item.acquisition}</div>` : ''}
    ${item.quest ? `<div style="margin-bottom:4px;font-size:12px;color:#8a7444;">❖ Quest: ${item.quest}</div>` : ''}
    ${item.missable ? `<div style="margin-bottom:4px;font-size:11px;color:#e0a13c;font-weight:600;">⚠ MISSABLE — ${item.missable.lockedBy}: ${item.missable.note}</div>` : ''}
    <div style="display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap;">
      <button class="er-popup-check" style="padding:4px 10px;border-radius:4px;border:1px solid #2c261b;background:${isChecked ? '#5f7a4e' : '#17140f'};color:${isChecked ? '#d8d2c4' : '#c8a55a'};cursor:pointer;font-size:12px;">
        ${isChecked ? '✓ Checked' : 'Mark done'}
      </button>
      ${item.wikiUrl ? `<a href="${item.wikiUrl}" target="_blank" rel="noreferrer" style="font-size:11px;color:#8f887a;">wiki ↗</a>` : ''}
      ${item.map ? `<a href="${mapUrl(item.map)}" target="er-guide-map" style="font-size:11px;color:#8f887a;">Fextralife ↗</a>` : ''}
    </div>
  `

  // Two-way sync: toggling from the popup updates the store, which restyles
  // the pin (subscriber in MapView) and re-renders the RoutePanel list. The
  // popup itself closes — its content is a render-time snapshot.
  el.querySelector('.er-popup-check')?.addEventListener('click', () => {
    progressStore.toggle(itemId)
    map.closePopup()
  })

  return el
}
