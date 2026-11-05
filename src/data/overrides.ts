import championOverridesJson from '../../data/overrides/champions.json'
import itemOverridesJson from '../../data/overrides/items.json'
import { THREAT_KEYS, type Champion, type Item, type Threats } from '../engine/types'

/**
 * Corrections manuelles de ce que Data Dragon ne sait pas dire
 * (data/overrides/champions.json et data/overrides/items.json).
 * Une entrée invalide ou un id inconnu produit un avertissement console, jamais un crash.
 */

export type Warn = (message: string) => void

export type ChampionOverride = {
  /** Remplace la répartition des dégâts ; ramenée à une somme de 1. */
  damage?: Champion['damage']
  /** Complète les menaces (seules les clés données changent). */
  threats?: Partial<Threats>
  /** Remplace les tags. */
  tags?: string[]
}

export type ItemOverride = {
  addCategories?: string[]
  removeCategories?: string[]
}

const defaultWarn: Warn = (message) => console.warn(`[overrides] ${message}`)

export const DEFAULT_CHAMPION_OVERRIDES = parseChampionOverrides(championOverridesJson)
export const DEFAULT_ITEM_OVERRIDES = parseItemOverrides(itemOverridesJson)

// --- Lecture et validation ----------------------------------------------------

export function parseChampionOverrides(
  json: unknown,
  warn: Warn = defaultWarn,
): Record<string, ChampionOverride> {
  const file = 'overrides/champions.json'
  const result: Record<string, ChampionOverride> = {}
  for (const [id, entry] of entries(json, file, warn)) {
    const errors: string[] = []
    const override: ChampionOverride = {}

    if (entry.damage !== undefined) {
      const damage = parseDamage(entry.damage)
      if (damage) override.damage = damage
      else errors.push('« damage » attend { ad, ap, true } entre 0 et 1, de somme non nulle')
    }
    if (entry.threats !== undefined) {
      const threats = parseThreats(entry.threats)
      if (threats) override.threats = threats
      else errors.push(`« threats » attend des clés parmi ${THREAT_KEYS.join(', ')} valant 0 à 3`)
    }
    if (entry.tags !== undefined) {
      if (isStringList(entry.tags)) override.tags = [...entry.tags]
      else errors.push('« tags » attend une liste de textes')
    }

    if (errors.length > 0) warn(`${file} : « ${id} » ignoré (${errors.join(' ; ')}).`)
    else result[id] = override
  }
  return result
}

export function parseItemOverrides(
  json: unknown,
  warn: Warn = defaultWarn,
): Record<string, ItemOverride> {
  const file = 'overrides/items.json'
  const result: Record<string, ItemOverride> = {}
  for (const [id, entry] of entries(json, file, warn)) {
    const { addCategories, removeCategories } = entry
    if (
      (addCategories !== undefined && !isStringList(addCategories)) ||
      (removeCategories !== undefined && !isStringList(removeCategories))
    ) {
      warn(`${file} : « ${id} » ignoré (addCategories / removeCategories attendent des listes).`)
      continue
    }
    result[id] = { addCategories, removeCategories }
  }
  return result
}

// --- Application ----------------------------------------------------------------

export function applyChampionOverrides(
  champions: Champion[],
  overrides: Record<string, ChampionOverride> = DEFAULT_CHAMPION_OVERRIDES,
  warn: Warn = defaultWarn,
): Champion[] {
  warnUnknownIds(overrides, champions, 'overrides/champions.json', warn)
  return champions.map((champion) => {
    const override = overrides[champion.id]
    if (!override) return champion
    return {
      ...champion,
      tags: override.tags ? [...override.tags] : champion.tags,
      damage: override.damage ?? champion.damage,
      threats: { ...champion.threats, ...override.threats },
    }
  })
}

export function applyItemOverrides(
  items: Item[],
  overrides: Record<string, ItemOverride> = DEFAULT_ITEM_OVERRIDES,
  warn: Warn = defaultWarn,
): Item[] {
  warnUnknownIds(overrides, items, 'overrides/items.json', warn)
  return items.map((item) => {
    const override = overrides[item.id]
    if (!override) return item
    const categories = new Set([...item.categories, ...(override.addCategories ?? [])])
    for (const category of override.removeCategories ?? []) categories.delete(category)
    return { ...item, categories: [...categories].sort() }
  })
}

// --- Utilitaires ----------------------------------------------------------------

/** Entrées du fichier, sans les clés de documentation (`_...`) ni les entrées qui ne sont pas des objets. */
function entries(json: unknown, file: string, warn: Warn): [string, Record<string, unknown>][] {
  if (!isRecord(json)) {
    warn(`${file} : un objet { id: correction } est attendu, fichier ignoré.`)
    return []
  }
  const result: [string, Record<string, unknown>][] = []
  for (const [id, entry] of Object.entries(json)) {
    if (id.startsWith('_')) continue
    if (isRecord(entry)) result.push([id, entry])
    else warn(`${file} : « ${id} » ignoré (un objet est attendu).`)
  }
  return result
}

function warnUnknownIds(
  overrides: Record<string, unknown>,
  known: { id: string }[],
  file: string,
  warn: Warn,
) {
  const ids = new Set(known.map((k) => k.id))
  for (const id of Object.keys(overrides)) {
    if (!ids.has(id)) warn(`${file} : id « ${id} » inconnu dans ce patch, correction ignorée.`)
  }
}

function parseDamage(value: unknown): Champion['damage'] | null {
  if (!isRecord(value)) return null
  const parts = { ad: value.ad ?? 0, ap: value.ap ?? 0, true: value.true ?? 0 }
  const numbers = Object.values(parts)
  if (!numbers.every((n) => typeof n === 'number' && n >= 0 && n <= 1)) return null
  const total = (numbers as number[]).reduce((sum, n) => sum + n, 0)
  if (total <= 0) return null
  return {
    ad: (parts.ad as number) / total,
    ap: (parts.ap as number) / total,
    true: (parts.true as number) / total,
  }
}

function parseThreats(value: unknown): Partial<Threats> | null {
  if (!isRecord(value)) return null
  const threats: Partial<Threats> = {}
  for (const [key, level] of Object.entries(value)) {
    if (!(THREAT_KEYS as readonly string[]).includes(key)) return null
    if (level !== 0 && level !== 1 && level !== 2 && level !== 3) return null
    threats[key as keyof Threats] = level
  }
  return threats
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
