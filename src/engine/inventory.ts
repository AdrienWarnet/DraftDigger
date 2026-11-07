import { INVENTORY } from './config'
import type { Build, Item } from './types'

/**
 * Items achetés pendant la partie (T6.1). Liste d'ids dans l'ordre d'achat, doublons permis
 * (ex : 2 Épées longues). Fonctions pures : chaque modification renvoie une nouvelle liste.
 */

type ItemsById = ReadonlyMap<string, Item>

/**
 * Achète un item. Comme en jeu, ses composants possédés sont consommés (récursivement : un
 * composant manquant peut être remplacé par ses propres composants). Refusé si l'inventaire est plein.
 */
export function buyItem(owned: readonly string[], itemId: string, itemsById: ItemsById): string[] {
  const remaining = [...owned]
  consumeComponents(remaining, itemId, itemsById, new Set())
  if (remaining.length >= INVENTORY.maxItems) return [...owned]
  return [...remaining, itemId]
}

function consumeComponents(
  remaining: string[],
  itemId: string,
  itemsById: ItemsById,
  seen: Set<string>,
) {
  if (seen.has(itemId)) return
  seen.add(itemId)
  for (const componentId of itemsById.get(itemId)?.buildsFrom ?? []) {
    const index = remaining.indexOf(componentId)
    if (index >= 0) remaining.splice(index, 1)
    else consumeComponents(remaining, componentId, itemsById, new Set(seen))
  }
}

/** Retire l'item à cette place (vendu ou saisi par erreur). */
export function removeItem(owned: readonly string[], index: number): string[] {
  return owned.filter((_, i) => i !== index)
}

/** Corrige l'item à cette place (sans consommer de composants : c'est une correction de saisie). */
export function replaceItem(owned: readonly string[], index: number, itemId: string): string[] {
  if (index < 0 || index >= owned.length) return [...owned]
  return owned.map((id, i) => (i === index ? itemId : id))
}

/** `true` si `componentId` entre (à n'importe quelle profondeur) dans la recette de `itemId`. */
export function isInRecipe(componentId: string, itemId: string, itemsById: ItemsById): boolean {
  const seen = new Set<string>()
  const stack = [...(itemsById.get(itemId)?.buildsFrom ?? [])]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (id === componentId) return true
    if (seen.has(id)) continue
    seen.add(id)
    stack.push(...(itemsById.get(id)?.buildsFrom ?? []))
  }
  return false
}

/** Slots du build pas encore couverts (ni le défaut ni une alternative possédés), dans l'ordre. */
function uncoveredSlots(build: Build, owned: readonly string[]) {
  const ownedSet = new Set(owned)
  return [...build.itemOrder]
    .sort((a, b) => a.slot - b.slot)
    .filter((s) => !ownedSet.has(s.default) && !s.alternatives.some((a) => ownedSet.has(a.itemId)))
}

/**
 * Item du build vers lequel progresse un composant possédé : le premier slot non couvert dont le
 * défaut (puis une alternative) le contient dans sa recette. `null` si aucun.
 */
export function componentTarget(
  componentId: string,
  build: Build,
  owned: readonly string[],
  itemsById: ItemsById,
): string | null {
  for (const slot of uncoveredSlots(build, owned)) {
    const target = [slot.default, ...slot.alternatives.map((a) => a.itemId)].find((id) =>
      isInRecipe(componentId, id, itemsById),
    )
    if (target) return target
  }
  return null
}

/**
 * Items du build proposés en premier dans le sélecteur, dans l'ordre où on les achète :
 * 1. les options de premier item, tant qu'aucune n'est possédée et qu'aucun slot n'est couvert ;
 * 2. les composants du prochain item du build (les plus gros d'abord), sauf ceux déjà possédés ;
 * 3. les items des slots non couverts (défaut puis alternatives).
 */
export function buildSuggestions(
  build: Build,
  owned: readonly string[],
  itemsById: ItemsById,
): string[] {
  const ownedSet = new Set(owned)
  const slots = uncoveredSlots(build, owned)
  const started =
    build.firstItemOptions.some((o) => ownedSet.has(o.itemId)) ||
    slots.length < build.itemOrder.length
  const ids: string[] = started ? [] : build.firstItemOptions.map((o) => o.itemId)

  const next = slots[0]
  if (next) {
    // Parcours en largeur : les composants directs d'abord ; un composant possédé cache sa recette.
    const queue = [...(itemsById.get(next.default)?.buildsFrom ?? [])]
    const seen = new Set<string>()
    while (queue.length > 0) {
      const id = queue.shift()!
      if (seen.has(id) || ownedSet.has(id)) continue
      seen.add(id)
      ids.push(id)
      queue.push(...(itemsById.get(id)?.buildsFrom ?? []))
    }
  }
  for (const slot of slots) ids.push(slot.default, ...slot.alternatives.map((a) => a.itemId))

  return [...new Set(ids)].filter((id) => !ownedSet.has(id) && itemsById.has(id))
}

/** Relit une liste d'items sauvegardée ; tout ce qui n'est pas lisible est écarté. */
export function parseOwnedItems(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .slice(0, INVENTORY.maxItems)
}
