# How-To / Usage Guide Page

**Date:** 2026-06-18
**Status:** Approved (design)
**Feature:** #3 of a four-feature batch

## Problem

The site has no onboarding. A first-time visitor lands on a full-viewport map
with a route panel and no explanation of the core mental model (grace-to-grace
legs, checkable items, the "next up" pulse, local progress, profiles). The
README explains it but lives on GitHub, not in the app.

## Goal

A single, self-contained in-app page that teaches the mental model and the main
interactions, reachable from the top bar. Pure content — no new logic.

## Design

### Route + nav
- New route `/how-to` in `src/App.tsx` (sits alongside `/questlines`,
  `/progress`, `/coverage`).
- A `How to use` `NavLink` added to `TopBar.tsx`, in the existing right-side
  nav cluster (Questlines / Progress / Coverage). Placed first in that cluster
  since it is the orientation entry point.

### Component
- New `src/pages/HowToPage.tsx`, following the layout pattern of
  `ProgressPage` / `CoveragePage`: `<TopBar />` + a centered
  `max-w-*` scrollable `<main>`, Tailwind tokens consistent with the existing
  palette (`text-gold`, `bg-panel`, `border-edge`, `font-display`, etc.).
- A short table of contents at the top with in-page anchor links to each
  section.

### Sections
1. **What this is** — open-source grace-to-grace 100% route (base game + SotE);
   every useful unique item is a persistent, checkable step; the guide is always
   "complete" via cleanup / "Region sweep" even where prose isn't polished.
2. **Reading the route** — regions → legs (grace → grace) → steps; the step
   types (item / direction / boss / quest); the pulsing "next up" marker and
   auto-pan; what the "Region sweep" cleanup list means.
3. **Using the map** — the map IS the guide; layers
   (Overworld / Underground / Ashen Capital / Realm of Shadow); category-glyph
   markers that desaturate when checked; popup info cards with check/uncheck;
   the granular layers panel; landmark diamonds.
4. **Tracking progress** — saved locally in your browser by default (nothing
   leaves it); NG+ profiles; export/import a save file; the **sync code** for
   moving between devices (cross-references the persistence feature).
5. **Build optimizer** — placeholder section; how to use it. Filled in when the
   build-optimizer feature (#4) ships; until then a brief "coming soon" line so
   the section exists and the page structure is stable.
6. **Coverage & contributing** — what `/coverage` is (the to-do list of items
   missing markers / not yet routed) and the edit-data → validate → PR loop.

### Content source
Content is adapted from `README.md` (which already articulates the model well),
rewritten for an in-app reader rather than a GitHub visitor. No external links
except the existing attribution/source links where relevant.

## Error handling / testing
- No logic; nothing to fail. A lightweight render smoke test (`HowToPage`
  mounts without throwing) is sufficient and optional — match whatever the other
  pages do (they currently have no per-page render tests, so this is optional).

## Files touched
- **Add:** `src/pages/HowToPage.tsx`
- **Edit:** `src/App.tsx` (route), `src/components/TopBar.tsx` (nav link)

## Dependency note
Section 5 references the build optimizer (#4) and section 4 references the sync
code (#2). The page can ship before either lands (with a "coming soon" line for
§5 and generic wording for §4), then get a one-paragraph update when each
feature merges. It does not block on them.
