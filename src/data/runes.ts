import runeShardsJson from '../../data/defaults/rune-shards.json'
import { ddragonUrls } from './ddragon'
import type { DDragonData } from './ddragonTypes'

/** Rune, arbre, fragment ou sort tel que l'UI l'affiche : id, nom, icône. */
export type IconEntry = { id: string; name: string; icon: string }

export type RuneInfo = IconEntry & {
  treeId: string
  /** Ligne dans l'arbre : 0 = rune clé, 1 à 3 = runes mineures. */
  row: number
}

export type RuneTreeInfo = IconEntry & { rows: RuneInfo[][] }

export type ShardRow = { label: string; shards: IconEntry[] }

export type RuneCatalog = {
  trees: RuneTreeInfo[]
  treesById: Map<string, RuneTreeInfo>
  runesById: Map<string, RuneInfo>
  shardRows: ShardRow[]
  shardsById: Map<string, IconEntry>
  /** Sorts d'invocateur disponibles sur la Faille. */
  summonerSpells: IconEntry[]
  summonerSpellsById: Map<string, IconEntry>
}

/** Mode de jeu de la Faille de l'invocateur dans `RawSummonerSpell.modes`. */
const CLASSIC_MODE = 'CLASSIC'

export const DEFAULT_SHARD_ROWS: ShardRow[] = parseShardRows(runeShardsJson)

export function buildRuneCatalog(
  data: Pick<DDragonData, 'version' | 'runeTrees' | 'summonerSpells'>,
  shardRows: ShardRow[] = DEFAULT_SHARD_ROWS,
): RuneCatalog {
  const trees: RuneTreeInfo[] = data.runeTrees.map((tree) => {
    const treeId = String(tree.id)
    return {
      id: treeId,
      name: tree.name,
      icon: ddragonUrls.runeIcon(tree.icon),
      rows: tree.slots.map((slot, row) =>
        slot.runes.map((rune) => ({
          id: String(rune.id),
          name: rune.name,
          icon: ddragonUrls.runeIcon(rune.icon),
          treeId,
          row,
        })),
      ),
    }
  })
  const summonerSpells = Object.values(data.summonerSpells)
    .filter((spell) => spell.modes.includes(CLASSIC_MODE))
    .map((spell) => ({
      id: spell.id,
      name: spell.name,
      icon: ddragonUrls.summonerSpellImage(data.version, spell.image.full),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  return {
    trees,
    treesById: new Map(trees.map((t) => [t.id, t])),
    runesById: new Map(trees.flatMap((t) => t.rows.flat()).map((r) => [r.id, r])),
    shardRows,
    shardsById: new Map(shardRows.flatMap((row) => row.shards).map((s) => [s.id, s])),
    summonerSpells,
    summonerSpellsById: new Map(summonerSpells.map((s) => [s.id, s])),
  }
}

/** Lit data/defaults/rune-shards.json ; une entrée invalide est ignorée avec un avertissement. */
export function parseShardRows(
  json: unknown,
  warn: (message: string) => void = (m) => console.warn(`[fragments] ${m}`),
): ShardRow[] {
  const rows = isRecord(json) && Array.isArray(json.rows) ? json.rows : null
  if (!rows) {
    warn('rune-shards.json : « rows » manquant.')
    return []
  }
  return rows.flatMap((row, i) => {
    if (!isRecord(row) || typeof row.label !== 'string' || !Array.isArray(row.shards)) {
      warn(`rune-shards.json : ligne ${i + 1} ignorée.`)
      return []
    }
    const shards = row.shards.flatMap((shard) =>
      isRecord(shard) &&
      typeof shard.id === 'string' &&
      typeof shard.name === 'string' &&
      typeof shard.icon === 'string'
        ? [{ id: shard.id, name: shard.name, icon: ddragonUrls.runeIcon(shard.icon) }]
        : [],
    )
    return [{ label: row.label, shards }]
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
