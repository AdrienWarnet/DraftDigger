import type { Item } from './types'

/** Filtres proposés dans le sélecteur d'items (catégories de `Item.categories`). */
export const ITEM_CATEGORY_FILTERS = [
  { id: 'armor', label: 'Armure' },
  { id: 'mr', label: 'RM' },
  { id: 'hp', label: 'PV' },
  { id: 'ad', label: 'AD' },
  { id: 'ap', label: 'AP' },
  { id: 'antiheal', label: 'Anti-soin' },
  { id: 'antitank', label: 'Anti-tank' },
  { id: 'boots', label: 'Bottes' },
] as const

/**
 * Item « complet » : ne sert à fabriquer rien d'autre (item final, item de départ), ou ce sont des bottes.
 * Les composants, consommables et balises sont exclus : c'est la liste utile pour composer un build.
 */
export function isCompletedItem(item: Item): boolean {
  if (item.categories.includes('consumable') || item.categories.includes('trinket')) return false
  return item.buildsInto.length === 0 || item.categories.includes('boots')
}

export type ItemFilter = {
  /** `true` : seulement les items complets (par défaut dans le sélecteur). */
  completedOnly: boolean
  /** Catégorie exigée (ex : `antiheal`), ou `null`. */
  category: string | null
}

export function filterItems(items: readonly Item[], filter: ItemFilter): Item[] {
  return items.filter(
    (item) =>
      (!filter.completedOnly || isCompletedItem(item)) &&
      (!filter.category || item.categories.includes(filter.category)),
  )
}
