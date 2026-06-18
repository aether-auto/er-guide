# Elden Ring 100% Route Guide

Open-source, not-for-profit guide site: a grace-to-grace walkthrough of all of
Elden Ring (base game + Shadow of the Erdtree) where every useful unique item is
a persistent checkable step with an interactive map companion.

**Live site:** https://aether-auto.github.io/er-guide/

## How it works

- `data/items.json` — generated item database (2,437 unique items, 25 categories).
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

The map IS the guide: each region page is a full-viewport, self-hosted
[Leaflet](https://leafletjs.com/) map with the route list overlaid as a panel
(bottom sheet on mobile).

- **Self-hosted tiles:** four layers (Overworld, Underground, Leyndell Ashen
  Capital, Realm of Shadow) served from `public/tiles/{code}/{z}/{x}/{y}.webp`,
  zoom 0–6 (zoom 7 is client-side upscaled). The pyramids were mirrored once
  from the Fextralife map app and recompressed to webp; no runtime requests
  leave the site. Map imagery is © FromSoftware / Bandai Namco, assembled by
  the Fextralife community — this is a non-commercial fan project and imagery
  will be removed on request.
- **Markers:** our own divIcon styling — category-glyph pins that desaturate
  when checked and pulse for the current "next up" step, soft gold Site of
  Grace dots with name labels, and quiet landmark diamonds for named locations
  (`data/map-extras.json`). Pin popups are self-contained info cards: full
  acquisition/how-to-find text, quest context, missable warnings, and a
  check/uncheck button synced with your progress — no external links.
- **Guidance:** the pulsing next-up pin plus auto-pan to the current step lead
  you through the route; no polylines are drawn on the map.

## Contributing

The [/coverage](https://aether-auto.github.io/er-guide/#/coverage) page is the
to-do list: items missing map markers, items not yet routed into a leg. Edit the
relevant `data/regions/*.json`, run `npm run validate`, open a PR.

## Saving & moving progress

Progress is saved locally in your browser (`localStorage`, key
`er-guide-progress-v1`) — no account, no server, nothing leaves your device by
default. NG+ profiles track multiple playthroughs.

To move a save between devices, the Progress page offers two token-free options:
**export/import** a JSON file, or copy a compact **sync code** (a gzipped,
base64url snapshot of your whole save) — optionally shared as a
`#/progress?code=…` link. Loading a code or file always asks before it
overwrites your current progress; there is no background sync.

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

- [Fextralife Elden Ring Wiki](https://eldenring.wiki.fextralife.com/) — map
  tile pyramids (mirrored once, self-hosted as webp) and marker coordinates/ids
  were extracted from their public map application, with attribution.
  Underlying map imagery © FromSoftware / Bandai Namco; removed on request.
- [eldenring.wiki.gg](https://eldenring.wiki.gg/) — item listings
  (CC BY-NC-SA 3.0).
- [Elden Ring Fan API](https://eldenring.fanapis.com/) — item descriptions (MIT).
- [Elden Ring Weapon Calculator](https://github.com/ThomasJClark/elden-ring-weapon-calculator)
  by Thomas Clark (MIT) — the build optimizer's attack-rating engine and bundled
  regulation data are adapted from this project (see `src/lib/weaponCalc/LICENSE`).

Code in this repository is MIT-licensed (see LICENSE).
