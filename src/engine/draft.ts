import { guessEnemyPositions, type EnemyLayout, type PositionRates } from './positions'
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
 * Poste de chaque ennemi : postes fixés par le joueur, les autres devinés d'après les taux de jeu.
 * Sans taux (`{}`), les ennemis non fixés remplissent les postes libres dans l'ordre de saisie.
 */
export function enemyLayout(draft: Draft, rates: PositionRates = {}): EnemyLayout {
  return guessEnemyPositions(draft.enemies, rates)
}

/** Ton vis-à-vis : l'ennemi placé à ton poste, ou `null`. */
export function laneOpponent(draft: Draft, rates: PositionRates = {}): EnemyPick | null {
  const index = enemyLayout(draft, rates)[draft.playerPosition]
  return index === null ? null : (draft.enemies[index] ?? null)
}

/**
 * Corrige un poste : l'ennemi placé à `from` est fixé à `to` ; celui qui était à `to`
 * (s'il y en a un) est fixé à `from`. Les autres ennemis non fixés restent devinés.
 */
export function moveEnemy(
  draft: Draft,
  from: Position,
  to: Position,
  rates: PositionRates = {},
): Draft {
  if (from === to) return draft
  const layout = enemyLayout(draft, rates)
  const moving = layout[from]
  if (moving === null) return draft
  const displaced = layout[to]
  const enemies = draft.enemies.map((enemy, index) => {
    if (index === moving) return { ...enemy, lockedPosition: to }
    if (index === displaced) return { ...enemy, lockedPosition: from }
    return enemy
  })
  return { ...draft, enemies }
}

/** Rend le poste d'un ennemi à nouveau deviné par l'app. */
export function unlockEnemy(draft: Draft, index: number): Draft {
  const enemy = draft.enemies[index]
  if (!enemy || enemy.lockedPosition === null) return draft
  const enemies = draft.enemies.map((e, i) => (i === index ? { ...e, lockedPosition: null } : e))
  return { ...draft, enemies }
}

export function removeEnemy(draft: Draft, index: number): Draft {
  if (!draft.enemies[index]) return draft
  return { ...draft, enemies: draft.enemies.filter((_, i) => i !== index) }
}
