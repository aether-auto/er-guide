import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')
const errors = []
const warnings = []

const CATEGORIES = new Set([
  'weapon', 'shield', 'ammo', 'armor', 'talisman', 'sorcery', 'incantation',
  'ash-of-war', 'spirit-ash', 'key-item', 'golden-seed', 'sacred-tear',
  'crystal-tear', 'memory-stone', 'larval-tear', 'whetblade', 'stonesword-key',
  'bell-bearing', 'cookbook', 'map-fragment', 'great-rune', 'remembrance',
  'scadutree-fragment', 'revered-spirit-ash', 'tool',
])
// 'ashen' added to match map.code values found in items.json (the ashen capital
// / Leyndell post-Maliketh layer uses its own map code distinct from 'overworld').
const MAP_CODES = new Set(['overworld', 'underground', 'dlc', 'ashen'])

// ---- items.json — fail loudly if missing ----
let items
try {
  items = JSON.parse(await readFile(path.join(DATA, 'items.json'), 'utf8'))
} catch (err) {
  console.error(`ERROR: could not read data/items.json — ${err.message}`)
  process.exit(1)
}

const itemIds = new Set()
for (const it of items) {
  const where = `item ${it.id ?? '<no id>'}`
  if (!it.id || typeof it.id !== 'string') errors.push(`${where}: missing id`)
  else if (itemIds.has(it.id)) errors.push(`${where}: duplicate id`)
  else itemIds.add(it.id)
  if (!it.name) errors.push(`${where}: missing name`)
  if (!CATEGORIES.has(it.category)) errors.push(`${where}: bad category "${it.category}"`)
  if (typeof it.dlc !== 'boolean') errors.push(`${where}: dlc must be boolean`)
  if (it.map != null) {
    if (!MAP_CODES.has(it.map.code)) errors.push(`${where}: bad map.code "${it.map.code}"`)
    if (typeof it.map.lat !== 'number' || typeof it.map.lng !== 'number')
      errors.push(`${where}: map.lat/lng must be numbers`)
  }
  if (it.missable != null && (!it.missable.lockedBy || !it.missable.note))
    errors.push(`${where}: missable needs lockedBy and note`)
}

// ---- regions ----
const regionDir = path.join(DATA, 'regions')
let regionFiles = []
try { regionFiles = (await readdir(regionDir)).filter((f) => f.endsWith('.json')).sort() } catch {}
if (regionFiles.length === 0) warnings.push('no region files yet')

const placed = new Map() // checkableId -> location string
const stepIds = new Set()
const orders = new Set()
function place(id, where) {
  if (placed.has(id)) errors.push(`${id} placed twice: ${placed.get(id)} AND ${where}`)
  else placed.set(id, where)
}

for (const file of regionFiles) {
  const region = JSON.parse(await readFile(path.join(regionDir, file), 'utf8'))
  const rw = `region ${file}`
  if (!region.id || !region.name) errors.push(`${rw}: missing id/name`)
  if (typeof region.order !== 'number' || orders.has(region.order))
    errors.push(`${rw}: order missing or duplicated`)
  orders.add(region.order)
  if (!Array.isArray(region.legs) || !Array.isArray(region.cleanup))
    errors.push(`${rw}: legs and cleanup must be arrays`)

  for (const leg of region.legs ?? []) {
    const lw = `${rw} leg ${leg.id}`
    if (!leg.id || !leg.from || !leg.to || typeof leg.summary !== 'string')
      errors.push(`${lw}: missing id/from/to/summary`)
    for (const [i, step] of (leg.steps ?? []).entries()) {
      const sw = `${lw} step ${i}`
      if (step.type === 'item') {
        if (!itemIds.has(step.itemId)) errors.push(`${sw}: unknown itemId "${step.itemId}"`)
        else place(step.itemId, sw)
      } else if (step.type === 'boss' || step.type === 'quest') {
        if (!step.id?.startsWith(`${step.type}-`)) errors.push(`${sw}: ${step.type} id must start with "${step.type}-"`)
        if (stepIds.has(step.id)) errors.push(`${sw}: duplicate step id ${step.id}`)
        stepIds.add(step.id)
        if (itemIds.has(step.id)) errors.push(`${sw}: step id collides with an item id`)
        if (!step.text) errors.push(`${sw}: missing text`)
        if (step.type === 'quest' && !step.questline) errors.push(`${sw}: missing questline`)
      } else if (step.type === 'direction') {
        if (!step.text) errors.push(`${sw}: missing text`)
      } else {
        errors.push(`${sw}: unknown type "${step.type}"`)
      }
    }
  }
  for (const id of region.cleanup ?? []) {
    if (!itemIds.has(id)) errors.push(`${rw} cleanup: unknown itemId "${id}"`)
    else place(id, `${rw} cleanup`)
  }
}

// ---- exact placement: every item exactly once ----
if (regionFiles.length > 0) {
  for (const id of itemIds) {
    if (!placed.has(id)) errors.push(`item ${id} is not placed in any region (step or cleanup)`)
  }
}

// ---- coverage + expected counts (warnings) ----
const byCategory = {}
let noMap = 0
for (const it of items) {
  byCategory[it.category] = (byCategory[it.category] ?? 0) + 1
  if (it.map == null) noMap++
}
const expected = JSON.parse(await readFile(path.join(DATA, 'expected-counts.json'), 'utf8'))
for (const [cat, n] of Object.entries(expected)) {
  if (byCategory[cat] !== n) warnings.push(`expected ${n} ${cat}, items.json has ${byCategory[cat] ?? 0}`)
}
if (noMap > 0) warnings.push(`${noMap}/${items.length} items have no map marker`)

// ---- report ----
console.table(byCategory)
for (const w of warnings) console.warn('WARN:', w)
for (const e of errors) console.error('ERROR:', e)
console.log(`${items.length} items, ${regionFiles.length} regions, ${placed.size} placed, ${errors.length} errors, ${warnings.length} warnings`)
process.exit(errors.length ? 1 : 0)
