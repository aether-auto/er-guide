# Gilded Codex — Design Language

**Date:** 2026-06-18
**Status:** Active foundation (Phase A landed; use this to restyle any surface)

A refined dark-fantasy / illuminated-manuscript aesthetic that elevates the
existing obsidian + gold "Tarnished" identity. **Elevation, not teardown** — keep
the palette and information density; raise typography, atmosphere, and motion.

## Tokens (in `src/index.css` `@theme`)
- Surfaces: `bg` `#0e0c09` → `panel` `#17140f` → `panel2` `#1e1a13`; hairline `edge` `#2c261b`.
- Gold: `gold` `#c8a55a` (accent), `gold-bright` `#e8c766` (hover/peak), `gold-dim` `#8a7444` (labels/rules).
- Ink: `ink` `#d8d2c4` (body), `ink-dim` `#8f887a` (secondary).
- Status: `missable` `#e0a13c`, `done` `#5f7a4e`.
- Use Tailwind tokens (`text-gold`, `bg-panel`, `border-edge`, …). Don't hardcode hexes in TSX.

## Typography
- **Display = Cinzel** (`font-display` / `.font-display`): engraved caps. Use for page
  titles, brand, region names, section headers, eyebrow labels, gilded buttons.
  Tracked (`letter-spacing` ~0.04–0.22em). NEVER for long body copy.
- **Body = Spectral** (`var(--font-body)`, the default `body` font): literary serif.
  Paragraphs, lists, table cells, descriptions.
- Numbers: add `.er-num` (tabular) for stats/AR so columns align.

## Reusable classes (defined in `index.css`) — prefer these over re-inventing
- `.er-card` — hairline-gold framed surface w/ faint inner glow. `.er-card--hover` adds lift+glow on hover (use for interactive rows / result cards).
- `.er-eyebrow` — small-caps tracked Cinzel label (section kickers like “ATTACK RATING”).
- `.er-rule` + `<DiamondRule />` (`src/components/ui/DiamondRule.tsx`) — the diamond divider. Use to separate major sections instead of plain `<hr>`.
- `.er-link` — text/nav link with a gold underline that sweeps in on hover / `aria-current="page"` / `.active`.
- `.er-btn-gold` — primary gilded button with a one-shot gold sheen sweep on hover.
- Motion: wrap a page's main content in `.er-stagger` for a staggered fade-up of its direct children on mount, or add `.er-reveal` to a single element. All motion is killed under `prefers-reduced-motion` automatically — don't add JS motion that ignores it.

## Atmosphere (global, already applied)
- Body has a warm top vignette + dark bottom vignette + a ~2.5% fixed grain overlay (vellum feel). Content sits at `#root { z-index: 1 }` above the grain. Don't fight it with opaque full-bleed fills; let panels read as lit surfaces.

## Motion principles
- Restraint. One well-orchestrated load reveal per page (`.er-stagger`) beats scattered micro-animations.
- Transitions 0.2–0.25s, easing `cubic-bezier(0.22,1,0.36,1)` or `ease`. Gold hover states; subtle translateY(-1px) lifts. No bounce, no spin, nothing loud. "Classy."
- Keep the existing map pin pulse / candlelight glows — they already fit.

## Layout patterns for content pages (Progress / Build / How-to / Coverage / Questline)
- Centered `max-w-*` scrollable `<main>` under `<TopBar />` (existing pattern).
- Page title in Cinzel (`font-display text-gold`), often flanked by a `DiamondRule`.
- Group content into `.er-card` sections with an `.er-eyebrow` kicker + serif body.
- Generous vertical rhythm; hairline `border-edge` separators; gold reserved as a precious accent (rules, active states, key numbers) — not large fills.

## Reference implementations
`src/components/TopBar.tsx` and `src/pages/ProgressPage.tsx` are the canonical
examples — match their structure, class usage, and restraint when restyling other
surfaces. **Do not change behavior or markup semantics; restyle only.**
