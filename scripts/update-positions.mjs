// Met à jour data/defaults/champion-positions.json : taux de jeu par poste de chaque champion.
// Source : Meraki Analytics (championrates.json, indexé par clé numérique) + Data Dragon (clé → id).
// Usage : npm run update-positions
import { writeFile } from 'node:fs/promises'

const MERAKI_URL =
  'https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/championrates.json'
const DDRAGON = 'https://ddragon.leagueoflegends.com'
const OUTPUT = new URL('../data/defaults/champion-positions.json', import.meta.url)
const POSITION_KEYS = {
  TOP: 'top',
  JUNGLE: 'jungle',
  MIDDLE: 'mid',
  BOTTOM: 'bot',
  UTILITY: 'support',
}

async function getJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status} sur ${url}`)
  return response.json()
}

const [meraki, versions] = await Promise.all([
  getJson(MERAKI_URL),
  getJson(`${DDRAGON}/api/versions.json`),
])
const ddragonVersion = versions[0]
const champions = (await getJson(`${DDRAGON}/cdn/${ddragonVersion}/data/en_US/champion.json`)).data
const idByKey = Object.fromEntries(Object.values(champions).map((c) => [c.key, c.id]))

const rates = {}
const unknownKeys = []
for (const [key, byPosition] of Object.entries(meraki.data)) {
  const id = idByKey[key]
  if (!id) {
    unknownKeys.push(key)
    continue
  }
  const entry = {}
  for (const [merakiPosition, stats] of Object.entries(byPosition)) {
    const position = POSITION_KEYS[merakiPosition]
    const rate = Math.round((stats.playRate ?? 0) * 100) / 100
    if (position && rate > 0) entry[position] = rate
  }
  rates[id] = entry
}

const sorted = Object.fromEntries(Object.entries(rates).sort(([a], [b]) => a.localeCompare(b)))
const missing = Object.keys(champions).filter((id) => !(id in rates))
const file = {
  _source: `Meraki Analytics championrates.json (patch ${meraki.patch}), ids Data Dragon ${ddragonVersion}. Généré par npm run update-positions, ne pas modifier à la main.`,
  patch: meraki.patch,
  rates: sorted,
}
await writeFile(OUTPUT, JSON.stringify(file, null, 2) + '\n', 'utf8')

console.log(`Taux de jeu du patch ${meraki.patch} : ${Object.keys(sorted).length} champions.`)
if (missing.length)
  console.log(`Champions sans données (placés sur un poste libre) : ${missing.join(', ')}`)
if (unknownKeys.length)
  console.log(`Clés Meraki ignorées (absentes de Data Dragon) : ${unknownKeys.length}`)
