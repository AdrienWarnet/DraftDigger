import { NEW_BUILD_DEFAULTS } from './config'
import type { Build, BuildRunes, Position } from './types'

/**
 * Règles de saisie de l'éditeur de builds : chaque fonction renvoie un état toujours cohérent
 * avec la structure du jeu (une combinaison de runes invalide est impossible à saisir).
 * Une valeur vide (`''`) signifie « pas encore choisi ».
 */

/** Ligne d'une rune dans son arbre : 0 = rune clé, 1 à 3 = runes mineures. */
export type RuneLocator = (runeId: string) => { treeId: string; row: number } | undefined

export const EMPTY_RUNES: BuildRunes = {
  primaryTree: '',
  keystone: '',
  primarySlots: ['', '', ''],
  secondaryTree: '',
  secondarySlots: ['', ''],
  shards: ['', '', ''],
}

/** Nouveau build : identité donnée, runes et sorts à choisir, items par défaut. */
export function newBuild(
  id: string,
  championId: string,
  position: Position,
  now = new Date(),
): Build {
  return {
    id,
    name: '',
    championId,
    position,
    order: 0,
    updatedAt: now.toISOString(),
    runes: structuredClone(EMPTY_RUNES),
    summonerSpells: ['', ''],
    useWhen: [],
    firstItemOptions: [{ itemId: NEW_BUILD_DEFAULTS.firstItemId, useWhen: [] }],
    itemOrder: [{ slot: 1, default: NEW_BUILD_DEFAULTS.firstSlotItemId, alternatives: [] }],
  }
}

/** Changer d'arbre principal efface ses runes ; si c'était l'arbre secondaire, celui-ci est vidé. */
export function choosePrimaryTree(runes: BuildRunes, treeId: string): BuildRunes {
  if (runes.primaryTree === treeId) return runes
  const clashes = runes.secondaryTree === treeId
  return {
    ...runes,
    primaryTree: treeId,
    keystone: '',
    primarySlots: ['', '', ''],
    secondaryTree: clashes ? '' : runes.secondaryTree,
    secondarySlots: clashes ? ['', ''] : runes.secondarySlots,
  }
}

/** Rune clé : doit être une rune de la ligne 0 de l'arbre principal. */
export function chooseKeystone(runes: BuildRunes, runeId: string, locate: RuneLocator): BuildRunes {
  const rune = locate(runeId)
  if (!rune || rune.treeId !== runes.primaryTree || rune.row !== 0) return runes
  return { ...runes, keystone: runeId }
}

/** Rune mineure principale : une par ligne (1 à 3) de l'arbre principal. */
export function choosePrimaryRune(
  runes: BuildRunes,
  runeId: string,
  locate: RuneLocator,
): BuildRunes {
  const rune = locate(runeId)
  if (!rune || rune.treeId !== runes.primaryTree || rune.row < 1 || rune.row > 3) return runes
  const primarySlots = [...runes.primarySlots]
  primarySlots[rune.row - 1] = runeId
  return { ...runes, primarySlots }
}

/** Arbre secondaire : différent du principal ; en changer efface ses 2 runes. */
export function chooseSecondaryTree(runes: BuildRunes, treeId: string): BuildRunes {
  if (treeId === runes.primaryTree || treeId === runes.secondaryTree) return runes
  return { ...runes, secondaryTree: treeId, secondarySlots: ['', ''] }
}

/**
 * Runes secondaires : 2 runes de lignes différentes (1 à 3) de l'arbre secondaire, comme en jeu.
 * - Toucher une rune choisie la retire.
 * - Une rune de la même ligne qu'une rune choisie la remplace.
 * - Avec déjà 2 runes, la plus ancienne est remplacée.
 */
export function toggleSecondaryRune(
  runes: BuildRunes,
  runeId: string,
  locate: RuneLocator,
): BuildRunes {
  const rune = locate(runeId)
  if (!rune || rune.treeId !== runes.secondaryTree || rune.row < 1 || rune.row > 3) return runes
  let chosen = runes.secondarySlots.filter(Boolean)
  if (chosen.includes(runeId)) {
    chosen = chosen.filter((id) => id !== runeId)
  } else {
    const sameRow = chosen.find((id) => locate(id)?.row === rune.row)
    if (sameRow) chosen = chosen.map((id) => (id === sameRow ? runeId : id))
    else chosen = [...chosen, runeId].slice(-2)
  }
  return { ...runes, secondarySlots: [chosen[0] ?? '', chosen[1] ?? ''] }
}

/** Fragment de la ligne `row` (0 à 2), parmi les fragments de cette ligne. */
export function chooseShard(
  runes: BuildRunes,
  row: number,
  shardId: string,
  shardRows: readonly (readonly string[])[],
): BuildRunes {
  if (!shardRows[row]?.includes(shardId)) return runes
  const shards = [...runes.shards]
  shards[row] = shardId
  return { ...runes, shards }
}

/**
 * Sorts d'invocateur : 2 sorts différents, choisis en touchant une grille.
 * Toucher un sort choisi le retire ; avec déjà 2 sorts, le plus ancien est remplacé.
 */
export function toggleSpell(spells: [string, string], spellId: string): [string, string] {
  let chosen = spells.filter(Boolean)
  chosen = chosen.includes(spellId)
    ? chosen.filter((id) => id !== spellId)
    : [...chosen, spellId].slice(-2)
  return [chosen[0] ?? '', chosen[1] ?? '']
}

/** Ce qui manque encore pour une page de runes et des sorts complets (vide = complet). */
export function missingChoices(build: Pick<Build, 'runes' | 'summonerSpells' | 'name'>): string[] {
  const { runes } = build
  const missing: string[] = []
  if (!build.name.trim()) missing.push('le nom')
  if (!runes.primaryTree) missing.push("l'arbre principal")
  else if (!runes.keystone) missing.push('la rune clé')
  if (runes.primaryTree && runes.primarySlots.some((id) => !id)) missing.push('3 runes principales')
  if (!runes.secondaryTree) missing.push("l'arbre secondaire")
  else if (runes.secondarySlots.some((id) => !id)) missing.push('2 runes secondaires')
  if (runes.shards.some((id) => !id)) missing.push('3 fragments')
  if (build.summonerSpells.some((id) => !id)) missing.push("2 sorts d'invocateur")
  return missing
}
