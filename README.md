# Elden Ring 100% Route Guide

Open-source, not-for-profit guide site: a grace-to-grace walkthrough of all of
Elden Ring (base game + Shadow of the Erdtree) where every useful unique item is
a persistent checkable step with an interactive map companion.

**Live site:** https://aether-auto.github.io/er-guide/

## How it works

- `data/items.json` — generated item database (~2,500 unique items, 25 categories).
  Built by `npm run fetch` + `npm run build-data` from cached source data (committed
  under `scripts/cache/`). Never hand-edit; fix `data/overrides.json` and regenerate.
- `data/regions/*.json` — hand-authored route: regions → legs (grace → grace) →
  steps. Items are referenced by id. Items not yet woven into a leg sit in the
  region's `cleanup` list and render as a "Region sweep" — the guide is always
  complete, even where the route prose isn't polished yet.
- `npm run validate` — CI gate: schema, unique ids, and the invariant that every
  item is placed exactly once (a leg step or one cleanup list).
- Progress is stored in your browser (localStorage), with export/import and
  NG+ profiles. No accounts, no tracking.

## Map

The guide uses two map sources:

- **Embedded panel (Map Genie):** The in-app map panel embeds
  [Map Genie's](https://mapgenie.io/) Elden Ring interactive maps — the base game
  map (`mapgenie.io/elden-ring/maps/the-lands-between`) and the Shadow of the
  Erdtree map (`mapgenie.io/elden-ring/maps/the-shadow-realm`) — loaded as-is in
  an iframe with attribution. We do not scrape or reproduce their marker dataset.

- **Per-item pin jumps (Fextralife):** Every item with a known marker carries a
  deep link that opens
  [Fextralife's interactive map](https://eldenring.wiki.fextralife.com/Interactive+Map)
  in a persistent companion window (`er-guide-map`) and jumps directly to the
  item's pin. The marker ids and coordinates in our dataset were extracted from
  their public map application, used here with attribution under fair-use /
  non-commercial fan-project grounds.

  **Why a companion window instead of another iframe?** Fextralife sets
  `X-Frame-Options: sameorigin` on all map pages, which prevents cross-origin
  embedding. The companion-window approach gives the same one-click pin-jump
  experience without violating that constraint.

## Contributing

The [/coverage](https://aether-auto.github.io/er-guide/#/coverage) page is the
to-do list: items missing map markers, items not yet routed into a leg. Edit the
relevant `data/regions/*.json`, run `npm run validate`, open a PR.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests
npm run validate   # data gate
```

## Attribution & licenses

This is a fan-made, non-commercial project. Elden Ring is © FromSoftware /
Bandai Namco. Item and location data compiled from:

- [Map Genie](https://mapgenie.io/) — embedded interactive map panel for the base
  game (The Lands Between) and the DLC (The Shadow Realm), embedded as-is with
  attribution; no marker data scraped.
- [Fextralife Elden Ring Wiki](https://eldenring.wiki.fextralife.com/) — per-item
  map deep links open their interactive map in a companion window; marker
  coordinates and ids in our dataset were extracted from their public map
  application, with attribution.
- [eldenring.wiki.gg](https://eldenring.wiki.gg/) — item listings
  (CC BY-NC-SA 3.0).
- [Elden Ring Fan API](https://eldenring.fanapis.com/) — item descriptions (MIT).

Code in this repository is MIT-licensed (see LICENSE).
