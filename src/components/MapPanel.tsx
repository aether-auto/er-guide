export default function MapPanel({ src }: { src: string }) {
  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="flex items-center justify-between border-b border-edge px-3 py-1.5 text-xs">
        <span className="text-ink-dim">Interactive map (Fextralife)</span>
        <a className="text-gold hover:underline" href={src} target="_blank" rel="noreferrer">
          open in new tab ↗
        </a>
      </div>
      <iframe src={src} title="Elden Ring interactive map" loading="lazy" className="h-full w-full border-0" />
    </div>
  )
}
