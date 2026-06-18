/**
 * The codex divider — a hairline gold rule with a centered diamond gem,
 * echoing the map's landmark-diamond motif. Decorative; hidden from a11y tree.
 */
export function DiamondRule({ className = '' }: { className?: string }) {
  return (
    <div className={`er-rule ${className}`} aria-hidden="true">
      <span className="er-rule__gem" />
    </div>
  )
}
