import type { PositionRates } from '../engine/positions'
import type { Champion, Item } from '../engine/types'
import { buildChampions, DEFAULT_TAG_THREATS, type TagThreats } from './champions'
import type { DDragonData } from './ddragonTypes'
import { DEFAULT_POSITION_RATES } from './positionRates'
import { buildItems, DEFAULT_ITEM_CATEGORY_RULES, type ItemCategoryRules } from './items'
import {
  applyChampionOverrides,
  applyItemOverrides,
  DEFAULT_CHAMPION_OVERRIDES,
  DEFAULT_ITEM_OVERRIDES,
  type ChampionOverride,
  type ItemOverride,
  type Warn,
} from './overrides'

/** Champions et items du patch, enrichis et corrigés : ce que le reste de l'app utilise. */
export type GameCatalog = {
  version: string
  champions: Champion[]
  items: Item[]
  championsById: Map<string, Champion>
  itemsById: Map<string, Item>
  /** Taux de jeu par poste, pour deviner le poste des ennemis. */
  positionRates: PositionRates
}

export type CatalogOptions = {
  tagThreats?: TagThreats
  itemCategoryRules?: ItemCategoryRules
  championOverrides?: Record<string, ChampionOverride>
  itemOverrides?: Record<string, ItemOverride>
  positionRates?: PositionRates
  warn?: Warn
}

export function buildCatalog(data: DDragonData, options: CatalogOptions = {}): GameCatalog {
  const champions = applyChampionOverrides(
    buildChampions(data, options.tagThreats ?? DEFAULT_TAG_THREATS),
    options.championOverrides ?? DEFAULT_CHAMPION_OVERRIDES,
    options.warn,
  )
  const items = applyItemOverrides(
    buildItems(data, options.itemCategoryRules ?? DEFAULT_ITEM_CATEGORY_RULES),
    options.itemOverrides ?? DEFAULT_ITEM_OVERRIDES,
    options.warn,
  )
  return {
    version: data.version,
    champions,
    items,
    championsById: new Map(champions.map((c) => [c.id, c])),
    itemsById: new Map(items.map((i) => [i.id, i])),
    positionRates: options.positionRates ?? DEFAULT_POSITION_RATES,
  }
}
