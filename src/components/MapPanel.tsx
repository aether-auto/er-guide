import { embedMapUrl, FEXTRALIFE_MAP_URL } from '../lib/maplink'

export default function MapPanel({ dlc }: { dlc: boolean }) {
  const src = embedMapUrl(dlc)
  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-edge px-3 py-1.5 text-xs">
        <span className="min-w-0 truncate text-ink-dim">
          Interactive map (Map Genie) — item pins open in a companion window
        </span>
        {/* target matches the window.open name in showOnMap, so this opens/refocuses
            the same companion window. No rel="noreferrer": noopener would detach the
            named context and break the pin-to-pin window reuse. */}
        <a className="shrink-0 text-gold hover:underline" href={FEXTRALIFE_MAP_URL} target="er-guide-map">
          Fextralife map ↗
        </a>
      </div>
      <iframe src={src} title="Elden Ring interactive map" loading="lazy" className="h-full w-full border-0" />
    </div>
  )
}
