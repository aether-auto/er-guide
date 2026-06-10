import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')

const REGIONS = [
  {
    id: 'limgrave', name: 'Limgrave', order: 1, kw: [
      'limgrave', 'stranded graveyard', 'fringefolk', 'gatefront', 'stormhill',
      'coastal cave', 'groveside', 'limgrave tunnels', 'murkwater', 'mistwood',
      'summonwater', 'agheel', 'highroad cave', 'third church', 'stormgate',
      'waypoint ruins', 'dragon-burnt', 'stormfoot', 'church of elleh',
      'seaside ruins', 'fort haight', 'mistwood ruins', 'artist\'s shack',
      'stormhill shack', 'church of dragon communion',
      'roundtable hold', 'roundtable',
      'saintsbridge',
    ],
  },
  {
    id: 'weeping-peninsula', name: 'Weeping Peninsula', order: 2, kw: [
      'weeping', 'castle morne', 'tombsward', 'ailing village', 'morne tunnel',
      'earthbore', 'impaler', 'demi-human forest ruins', 'fourth church',
      'castle morne rampart', 'leonine misbegotten', 'church of pilgrimage',
      'forest lookout tower', 'behind the castle',
    ],
  },
  {
    id: 'stormveil', name: 'Stormveil Castle', order: 3, kw: [
      'stormveil', 'godrick', 'rampart tower', 'liftside', 'gateside chamber',
      'castleward tunnel', 'gostoc', 'margit',
    ],
  },
  {
    id: 'liurnia', name: 'Liurnia of the Lakes', order: 4, kw: [
      'liurnia', 'raya lucaria', 'academy', 'caria manor', 'carian',
      'bellum', 'kingsrealm', 'four belfries', 'albinauric village',
      'moonlight altar', 'lakeside crystal', 'cliffbottom', 'stillwater',
      'laskyar', 'purified ruins', 'jarburg', 'rose church', 'boilprawn',
      'black knife catacombs', 'cuckoo', 'gate town', 'ringleader',
      'converted fringe tower', 'mausoleum compound', 'liurnia lake shore',
      'study hall', 'renala', 'full moon', 'lucaria', 'crystalline woods',
      'lord contender', 'ranni\'s rise', 'seluvis\'s rise', 'three sisters',
      'ranni', 'seluvis', 'blaidd', 'lunar princess', 'albinauric',
      'lord of frenzied flame',
    ],
  },
  {
    id: 'siofra-river', name: 'Siofra River', order: 5, kw: [
      'siofra', 'hallowhorn',
    ],
  },
  {
    id: 'caelid', name: 'Caelid', order: 6, kw: [
      'caelid', 'sellia', 'redmane', 'radahn', 'gowry', 'gael tunnel',
      'gaol cave', 'smoldering', 'swamp of aeonia', 'abandoned cave',
      'caelem', 'fort gael', 'war-dead catacombs', 'rotview balcony',
      'impassable greatbridge', 'chair-crypt', 'street of sages',
      'cathedral of dragon communion', 'southern aeonia', 'aeonia swamp',
      'millicent', 'cleanrot', 'stillwater cave',
    ],
  },
  {
    id: 'dragonbarrow', name: 'Dragonbarrow', order: 7, kw: [
      'dragonbarrow', 'greyoll', 'sellia hideaway', 'bestial sanctum',
      'farum greatbridge', 'divine tower of caelid', 'isolated divine tower',
    ],
  },
  {
    id: 'nokron', name: 'Nokron, Eternal City', order: 8, kw: [
      'nokron', 'ancestral woods', 'night\'s sacred ground', 'aqueduct',
      'mimic tear', 'siofra aqueduct', 'valiant gargoyle', 'hidden path',
      'night sacred ground',
    ],
  },
  {
    id: 'ainsel', name: 'Ainsel River, Nokstella & Lake of Rot', order: 9, kw: [
      'ainsel', 'nokstella', 'lake of rot', 'uhl palace', 'grand cloister',
      'astel', 'dragonkin soldier of nokstella', 'underground roadside',
    ],
  },
  {
    id: 'altus', name: 'Altus Plateau', order: 10, kw: [
      'altus', 'ruin-strewn', 'lux ruins', 'mirage rise', 'dominula',
      'shaded castle', 'sainted hero', 'sage\'s cave', 'unsightly',
      'wyndham', 'second church', 'perfumer\'s grotto', 'atlus plateau',
      'minor erdtree catacombs', 'cliffside site', 'highway lookout',
      'erdtree-gazing hill', 'sorcerer\'s isle', 'dominula windmill village',
      'old engravers ruins', 'windmill village', 'windmill pasture',
      'west windmill', 'east windmill', 'battlemage',
      'elemer', 'briar',
      'corhyn', 'goldmask',
    ],
  },
  {
    id: 'mt-gelmir', name: 'Mt. Gelmir', order: 11, kw: [
      'gelmir', 'volcano manor', 'rykard', 'fort laiedd', 'seethewater',
      'hermit village', 'hermit shack', 'volcano cave', 'craftsman\'s shack',
      'ninth mt. gelmir', 'ninth mt gelmir', 'primeval sorcerer azur',
      'cemetary shade', 'lava lake', 'tanith', 'bernahl', 'knight bernahl',
      'patches',
    ],
  },
  {
    id: 'leyndell', name: 'Leyndell, Royal Capital & Sewers', order: 12, kw: [
      'leyndell, royal', 'subterranean shunning', 'shunning-grounds',
      'divine tower of west altus', 'sealed tunnel', 'capital outskirts',
      'auriza', 'hero\'s grave', 'minor erdtree church', 'colosseum',
      'erdtree sanctuary', 'queen\'s bedchamber', 'avenue balcony',
      'capital rampart', 'east capital rampart', 'lower capital church',
      'fortified manor', 'west capital rampart', 'divine bridge',
      'leyndell catacomb', 'royal capital',
      'frenzied flame village', 'frenzied', 'fia', 'dung eater',
    ],
  },
  {
    id: 'deeproot', name: 'Deeproot Depths', order: 13, kw: [
      'deeproot', 'prince of death', 'across the roots', 'nameless eternal city',
    ],
  },
  {
    id: 'mountaintops', name: 'Mountaintops of the Giants', order: 14, kw: [
      'mountaintops', 'sol', 'zamor', 'first church of marika', 'whiteridge',
      'giants\' gravepost', 'giant-conquering', 'fire giant', 'forge of the giants',
      'spiritcaller', 'flame peak', 'castle sol', 'snow valley ruins',
      'foot of the forge', 'giants gravepost', 'frozen', 'frozen lake',
      'frozen river', 'glacier',
    ],
  },
  {
    id: 'consecrated-snowfield', name: 'Consecrated Snowfield', order: 15, kw: [
      'consecrated', 'snowfield', 'ordina', 'yelough', 'cave of the forlorn',
      'apostate derelict', 'inner consecrated', 'haligtree prayerbook',
      'star fissure grave',
    ],
  },
  {
    id: 'mohgwyn', name: 'Mohgwyn Palace', order: 16, kw: [
      'mohgwyn', 'mohg', 'dynasty mausoleum',
    ],
  },
  {
    id: 'haligtree', name: "Miquella's Haligtree & Elphael", order: 17, kw: [
      'haligtree', 'elphael', 'malenia', 'prayer room', 'scarlet aeonia',
      'brace of the haligtree', 'drainage channel', 'haligtree canopy',
    ],
  },
  {
    id: 'dlc-gravesite', name: 'DLC: Gravesite Plain & Belurat', order: 18, dlc: true, kw: [
      'gravesite', 'belurat', 'castle ensis', 'ellac', 'fog rift', 'three-path',
      'scorched ruins', 'fog rift catacombs', 'castle front', 'pillar path',
      'battlefield grave', 'church of consolation', 'ensis', 'rellana',
      'bayle', 'jaime', 'cerulean coast cross', 'three-path cross',
      'great bridge leading', 'sorcerer village', 'dragon\'s wound',
      'blackgaol knight', 'gaping dragon', 'ellac river',
      'prospect town', 'servant of rot', 'church of the crusade',
      'dancing lion', 'divine beast', 'temple town',
    ],
  },
  {
    id: 'dlc-scadu-altus', name: 'DLC: Scadu Altus & Shadow Keep', order: 19, dlc: true, kw: [
      'scadu altus', 'shadow keep', 'moorth', 'bonny', 'castle watering',
      'church district', 'specimen storehouse', 'recluses\'', 'fort of reprimand',
      'scaduview', 'hinterland', 'messmer', 'scadu atlas', 'shadow castle',
      'ruins of hornsent', 'scorpion river', 'fire prelate', 'messmer the impaler',
      'highroad cross', 'shadow fort', 'scadu tree avatar',
      'nameless mausoleum', 'northern nameless', 'southern nameless',
      'eastern nameless', 'dancer of ranah', 'ranah', 'red bear',
      'rakshasa', 'gravebird', 'hornsent', 'thiollier',
      'fire knight', 'dryleaf', 'dane',
      'ymir', 'count ymir', 'high priest',
      'metyr', 'cathedral of manus',
      'gaius', 'golden hippopotamus',
      'crucible knight',
      'dead body hanging',
      'ansbach', 'leda',
    ],
  },
  {
    id: 'dlc-south', name: 'DLC: Cerulean Coast & Southern Shore', order: 20, dlc: true, kw: [
      'cerulean', 'charo', 'stone coffin', 'finger ruins of rhia',
      'south coast', 'ruins by the shore', 'cloud rift', 'shore of the fallen',
    ],
  },
  {
    id: 'dlc-west', name: 'DLC: Rauh, Abyssal Woods & Jagged Peak', order: 21, dlc: true, kw: [
      'rauh', 'abyssal', 'midra', 'manse', 'jagged peak', 'foot of the jagged',
      'dragon\'s pit', 'finger ruins of dheo', 'rauh ancient ruins',
      'ravine north', 'base of the jagged', 'ancient ruins base',
      'ghostflame dragon', 'jori',
    ],
  },
  {
    id: 'dlc-enir-ilim', name: 'DLC: Enir-Ilim', order: 22, dlc: true, kw: [
      'enir-ilim', 'enir ilim', 'divine gate', 'first spiral', 'outer wall',
      'second spiral', 'descending tower', 'promised consort', 'final marika',
    ],
  },
  {
    id: 'farum-azula', name: 'Crumbling Farum Azula', order: 23, kw: [
      'farum azula', 'maliketh', 'dragon temple', 'placidusax',
      'crumbling beast grave', 'godskin duo', 'tempest-facing rampart',
      'belfry chaos',
    ],
  },
  {
    id: 'ashen-capital', name: 'Leyndell, Ashen Capital & Endings', order: 24, kw: [
      'ashen capital', 'capital of ash', 'leyndell, ashen', 'godfrey', 'hoarah',
      'elden beast', 'radagon',
    ],
  },
  { id: 'unsorted', name: 'Unsorted (data triage)', order: 99, kw: [] },
]

const items = JSON.parse(await readFile(path.join(DATA, 'items.json'), 'utf8'))
const buckets = new Map(REGIONS.map((r) => [r.id, []]))

// Pass 1: keyword bucketing. Items it places that carry map coordinates become
// labeled points for the geographic fallback in pass 2.
const labeled = [] // { lat, lng, code, dlc, regionId }
const pending = [] // items pass 1 couldn't place

for (const item of items) {
  // Use both acquisition and name as the haystack for matching
  const hay = `${item.acquisition} ${item.name}`.toLowerCase()

  // Items with map.code === 'ashen' strongly prefer the ashen-capital region
  // (base game only — ashen map code is never DLC)
  if (item.map?.code === 'ashen' && !item.dlc) {
    buckets.get('ashen-capital').push(item.id)
    continue
  }

  // DLC items only match DLC regions and vice versa
  const candidates = REGIONS.filter((r) => r.id !== 'unsorted' && Boolean(r.dlc) === item.dlc)
  const hit = candidates.find((r) => r.kw.some((k) => hay.includes(k)))
  if (hit) {
    buckets.get(hit.id).push(item.id)
    if (item.map) labeled.push({ lat: item.map.lat, lng: item.map.lng, code: item.map.code, dlc: item.dlc, regionId: hit.id })
  } else {
    pending.push(item)
  }
}

// Pass 2: geographic k-NN fallback. Regions are geographically contiguous, so an
// unplaced item with marker coordinates almost certainly belongs to the majority
// region of its nearest keyword-placed neighbors (same map layer + dlc flag).
// Require a clear majority; otherwise leave for human triage in 99-unsorted.
const K = 7
const MAJORITY = 4
let knnPlaced = 0
for (const item of pending) {
  let placedId = 'unsorted'
  if (item.map) {
    const peers = labeled.filter((l) => l.code === item.map.code && l.dlc === item.dlc)
    const nearest = peers
      .map((l) => ({ d: (l.lat - item.map.lat) ** 2 + (l.lng - item.map.lng) ** 2, regionId: l.regionId }))
      .sort((a, b) => a.d - b.d)
      .slice(0, K)
    const votes = new Map()
    for (const n of nearest) votes.set(n.regionId, (votes.get(n.regionId) ?? 0) + 1)
    const [topRegion, topVotes] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0]
    if (topVotes >= MAJORITY) {
      placedId = topRegion
      knnPlaced++
    }
  }
  buckets.get(placedId).push(item.id)
}
console.log(`keyword-placed: ${items.length - pending.length}, knn-placed: ${knnPlaced}, unsorted: ${pending.length - knnPlaced}`)

await mkdir(path.join(DATA, 'regions'), { recursive: true })
for (const r of REGIONS) {
  const file = path.join(DATA, 'regions', `${String(r.order).padStart(2, '0')}-${r.id}.json`)
  const exists = await access(file).then(() => true, () => false)
  if (exists) { console.log(`skip existing ${file}`); continue }
  const region = { id: r.id, name: r.name, order: r.order, ...(r.dlc ? { dlc: true } : {}), legs: [], cleanup: buckets.get(r.id).sort() }
  await writeFile(file, JSON.stringify(region, null, 2))
  console.log(`wrote ${path.basename(file)} (${region.cleanup.length} items)`)
}
