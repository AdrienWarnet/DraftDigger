import itemCategoriesJson from '../../data/defaults/item-categories.json'
import type { Item, ItemStats } from '../engine/types'
import { ddragonUrls } from './ddragon'
import type { DDragonData, RawItem } from './ddragonTypes'

/** Identifiant de la Faille de l'invocateur dans `RawItem.maps`. */
export const SUMMONERS_RIFT_MAP_ID = '11'

/**
 * Règles de catégorisation (data/defaults/item-categories.json) :
 * - `fromTags` : tag Data Dragon → catégorie ;
 * - `fromDescription` : catégorie → mots-clés cherchés dans la description (fr_FR).
 *   Ex : « Hémorragie » = effet anti-soin.
 */
export type ItemCategoryRules = {
  fromTags: Record<string, string>
  fromDescription: Record<string, string[]>
}

export const DEFAULT_ITEM_CATEGORY_RULES: ItemCategoryRules =
  parseItemCategoryRules(itemCategoriesJson)

/** Stats Data Dragon utilisées par le moteur. */
const STAT_FIELDS: Record<keyof ItemStats, string> = {
  armor: 'FlatArmorMod',
  mr: 'FlatSpellBlockMod',
  hp: 'FlatHPPoolMod',
  ad: 'FlatPhysicalDamageMod',
  ap: 'FlatMagicDamageMod',
}

/** Valide le fichier de catégories ; l'erreur désigne le champ en cause. */
export function parseItemCategoryRules(json: unknown): ItemCategoryRules {
  const file = 'item-categories.json'
  if (!isRecord(json)) throw new Error(`${file} : un objet est attendu.`)
  const { fromTags, fromDescription } = json
  if (!isRecord(fromTags)) throw new Error(`${file} : « fromTags » doit être un objet.`)
  if (!isRecord(fromDescription)) {
    throw new Error(`${file} : « fromDescription » doit être un objet.`)
  }
  for (const [tag, category] of Object.entries(fromTags)) {
    if (typeof category !== 'string' || !category) {
      throw new Error(`${file} : « fromTags.${tag} » doit être un nom de catégorie.`)
    }
  }
  for (const [category, keywords] of Object.entries(fromDescription)) {
    if (!Array.isArray(keywords) || !keywords.every((k) => typeof k === 'string' && k)) {
      throw new Error(`${file} : « fromDescription.${category} » doit être une liste de mots-clés.`)
    }
  }
  return {
    fromTags: fromTags as Record<string, string>,
    fromDescription: fromDescription as Record<string, string[]>,
  }
}

/**
 * Les items de la Faille ont un id à 4 chiffres. Les ids plus longs (22xxxx, 32xxxx, 66xxxx...)
 * sont des variantes de modes ou d'événements, parfois marquées à tort comme disponibles sur la Faille.
 */
const SUMMONERS_RIFT_ITEM_ID = /^\d{4}$/

/** Achetable par un joueur quelconque sur la Faille de l'invocateur. */
export function isSummonersRiftItem(id: string, raw: RawItem): boolean {
  return (
    SUMMONERS_RIFT_ITEM_ID.test(id) &&
    raw.maps[SUMMONERS_RIFT_MAP_ID] === true &&
    raw.gold.purchasable &&
    raw.inStore !== false &&
    !raw.requiredChampion &&
    !raw.requiredAlly
  )
}

export function itemStats(raw: RawItem): ItemStats {
  const stats: ItemStats = {}
  for (const [key, field] of Object.entries(STAT_FIELDS) as [keyof ItemStats, string][]) {
    const value = raw.stats[field]
    if (value) stats[key] = value
  }
  return stats
}

/** Catégories issues des tags, des stats et des mots-clés de la description, triées. */
export function itemCategories(
  raw: RawItem,
  rules: ItemCategoryRules = DEFAULT_ITEM_CATEGORY_RULES,
): string[] {
  const categories = new Set<string>()
  for (const tag of raw.tags ?? []) {
    const category = rules.fromTags[tag]
    if (category) categories.add(category)
  }
  for (const key of Object.keys(itemStats(raw))) categories.add(key)
  const description = raw.description ?? ''
  for (const [category, keywords] of Object.entries(rules.fromDescription)) {
    if (keywords.some((keyword) => description.includes(keyword))) categories.add(category)
  }
  return [...categories].sort()
}

export function toItem(
  id: string,
  raw: RawItem,
  version: string,
  rules: ItemCategoryRules = DEFAULT_ITEM_CATEGORY_RULES,
): Item {
  return {
    id,
    name: raw.name,
    image: ddragonUrls.itemImage(version, raw.image.full),
    cost: raw.gold.total,
    stats: itemStats(raw),
    categories: itemCategories(raw, rules),
    buildsFrom: [...(raw.from ?? [])],
  }
}

/**
 * Items achetables sur la Faille de l'invocateur, triés par nom.
 * Si deux items gardés portent le même nom (ex : familiers de jungle 1101 et 1107),
 * on garde le plus petit id.
 */
export function buildItems(
  data: Pick<DDragonData, 'version' | 'items'>,
  rules: ItemCategoryRules = DEFAULT_ITEM_CATEGORY_RULES,
): Item[] {
  const byName = new Map<string, [string, RawItem]>()
  for (const [id, raw] of Object.entries(data.items)) {
    if (!isSummonersRiftItem(id, raw)) continue
    const kept = byName.get(raw.name)
    if (!kept || isPreferredId(id, kept[0])) byName.set(raw.name, [id, raw])
  }
  return [...byName.values()]
    .map(([id, raw]) => toItem(id, raw, data.version, rules))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

function isPreferredId(candidate: string, current: string): boolean {
  return Number(candidate) < Number(current)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
