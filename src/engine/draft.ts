import { POSITIONS, type Position } from './types'

/**
 * La draft saisie par le joueur. Fonctions pures : chaque modification renvoie une nouvelle draft
 * (ou la même si la modification est refusée).
 */

export type EnemyPick = {
  championId: string
  /** Poste fixé par le joueur ; `null` = poste deviné par l'app (T2.3). */
  lockedPosition: Position | null
}

export type Draft = {
  playerPosition: Position
  /** Alliés par poste (ids Data Dragon) ; le joueur est à `playerPosition`. */
  allies: Record<Position, string | null>
  /** Ennemis dans l'ordre de saisie, 5 au plus. */
  enemies: EnemyPick[]
}

export const MAX_ENEMIES = 5

export function emptyDraft(playerPosition: Position = 'top'): Draft {
  const allies = Object.fromEntries(POSITIONS.map((p) => [p, null])) as Record<Position, null>
  return { playerPosition, allies, enemies: [] }
}

export function playerChampionId(draft: Draft): string | null {
  return draft.allies[draft.playerPosition]
}

/** Tous les champions déjà choisis (alliés et ennemis). */
export function pickedChampionIds(draft: Draft): Set<string> {
  const ids = new Set<string>()
  for (const id of Object.values(draft.allies)) if (id) ids.add(id)
  for (const enemy of draft.enemies) ids.add(enemy.championId)
  return ids
}

export function setPlayerPosition(draft: Draft, position: Position): Draft {
  return draft.playerPosition === position ? draft : { ...draft, playerPosition: position }
}

/** Place un champion allié (ou vide l'emplacement avec `null`). Refusé si le champion est déjà pris ailleurs. */
export function setAlly(draft: Draft, position: Position, championId: string | null): Draft {
  if (draft.allies[position] === championId) return draft
  if (championId && pickedChampionIds(draft).has(championId)) return draft
  return { ...draft, allies: { ...draft.allies, [position]: championId } }
}

/**
 * Ajoute un ennemi, sans poste (deviné ensuite) ou à un poste fixé par le joueur.
 * Refusé si l'équipe est complète ou si le champion est déjà pris.
 * Un autre ennemi fixé au même poste redevient « sans poste ».
 */
export function addEnemy(
  draft: Draft,
  championId: string,
  lockedPosition: Position | null = null,
): Draft {
  if (draft.enemies.length >= MAX_ENEMIES) return draft
  if (pickedChampionIds(draft).has(championId)) return draft
  const others = lockedPosition
    ? draft.enemies.map((e) =>
        e.lockedPosition === lockedPosition ? { ...e, lockedPosition: null } : e,
      )
    : draft.enemies
  return { ...draft, enemies: [...others, { championId, lockedPosition }] }
}

/** Remplace un ennemi en gardant son éventuel poste fixé. */
export function replaceEnemy(draft: Draft, index: number, championId: string): Draft {
  const current = draft.enemies[index]
  if (!current || current.championId === championId) return draft
  if (pickedChampionIds(draft).has(championId)) return draft
  const enemies = draft.enemies.map((e, i) => (i === index ? { ...e, championId } : e))
  return { ...draft, enemies }
}

/**
 * Poste de chaque ennemi pour l'affichage face à face : index de l'ennemi par poste.
 * Les postes fixés par le joueur d'abord ; les autres ennemis remplissent les postes libres
 * dans l'ordre de saisie (T2.3 remplacera ce remplissage par une répartition devinée).
 */
export function enemyLayout(draft: Draft): Record<Position, number | null> {
  const layout = Object.fromEntries(POSITIONS.map((p) => [p, null])) as Record<
    Position,
    number | null
  >
  draft.enemies.forEach((enemy, index) => {
    if (enemy.lockedPosition && layout[enemy.lockedPosition] === null) {
      layout[enemy.lockedPosition] = index
    }
  })
  const placed = new Set(Object.values(layout))
  const freePositions = POSITIONS.filter((p) => layout[p] === null)
  draft.enemies.forEach((_, index) => {
    if (placed.has(index)) return
    const position = freePositions.shift()
    if (position) layout[position] = index
  })
  return layout
}

export function removeEnemy(draft: Draft, index: number): Draft {
  if (!draft.enemies[index]) return draft
  return { ...draft, enemies: draft.enemies.filter((_, i) => i !== index) }
}
