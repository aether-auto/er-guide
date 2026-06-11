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
  when checked and pulse for the current "next up" step, plus gold-glow Site
  of Grace dots (`data/map-extras.json`). Pin popups carry the wiki layer:
  acquisition/how-to-find text, quest context, missable warnings, a
  check/uncheck button synced with your progress, and external wiki +
  Fextralife links.
- **Route paths:** per-leg gold polylines drawn from the routed item markers;
  the active leg renders wider and brighter, and a dashed segment points from
  the next-up pin to the following step.
- **Per-item Fextralife links:** every popup links the item's pin on
  [Fextralife's interactive map](https://eldenring.wiki.fextralife.com/Interactive+Map)
  (opens in a reusable companion window). Marker ids and coordinates in our
  dataset were extracted from their public map application, with attribution.

## Contributing

The [/coverage](https://aether-auto.github.io/er-guide/#/coverage) page is the
to-do list: items missing map markers, items not yet routed into a leg. Edit the
relevant `data/regions/*.json`, run `npm run validate`, open a PR.

## Cloud sync (optional)

Progress can be backed up to a **secret GitHub Gist** and synced across browsers.
No server involved — your browser talks directly to `api.github.com`.

1. Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new)
   with **no repository access** and a single account permission: **Gists → Read and write**.
2. On the Progress page, paste the token into the "Cloud sync (GitHub)" section and Connect.
   A secret gist (`er-guide-progress.json`) is found or created automatically; changes
   auto-push a few seconds after you check items, and a banner offers to load the cloud
   copy if it's newer than the local one (nothing is ever auto-imported).

What's stored where: your progress lives in localStorage (`er-guide-progress-v1`); the
token + gist id live in localStorage (`er-guide-gist-sync`) and are sent only to
`api.github.com`; the cloud copy lives in a secret gist in your GitHub account.
Disconnecting clears the token from your browser but never deletes the gist.

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
  were extracted from their public map application, with attribution; per-item
  popup links open their interactive map in a companion window. Underlying map
  imagery © FromSoftware / Bandai Namco; removed on request.
- [eldenring.wiki.gg](https://eldenring.wiki.gg/) — item listings
  (CC BY-NC-SA 3.0).
- [Elden Ring Fan API](https://eldenring.fanapis.com/) — item descriptions (MIT).

Code in this repository is MIT-licensed (see LICENSE).
