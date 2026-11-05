import type { EnemyPick } from './draft'
import { POSITIONS, type Position } from './types'

/** Taux de jeu par poste, par id de champion (ex : Lux → { support: 2.82, mid: 2.03 }). */
export type PositionRates = Record<string, Partial<Record<Position, number>>>

/** Index de l'ennemi placé à chaque poste (`null` = personne). */
export type EnemyLayout = Record<Position, number | null>

function emptyLayout(): EnemyLayout {
  return Object.fromEntries(POSITIONS.map((p) => [p, null])) as EnemyLayout
}

/**
 * Place les ennemis sur des postes distincts.
 * 1. Les postes fixés par le joueur sont respectés (le premier ennemi fixé à un poste l'obtient).
 * 2. Les autres ennemis sont répartis sur les postes libres de façon à maximiser la somme
 *    de leurs taux de jeu (toutes les combinaisons sont essayées : 120 au plus).
 *    Champion absent des données : taux nul partout. À score égal : ordre de saisie et ordre des postes.
 */
export function guessEnemyPositions(enemies: EnemyPick[], rates: PositionRates): EnemyLayout {
  const layout = emptyLayout()
  const toGuess: number[] = []
  enemies.forEach((enemy, index) => {
    if (enemy.lockedPosition && layout[enemy.lockedPosition] === null) {
      layout[enemy.lockedPosition] = index
    } else {
      toGuess.push(index)
    }
  })
  const free = POSITIONS.filter((p) => layout[p] === null)

  const rate = (index: number, position: Position) => {
    const championId = enemies[index]?.championId
    return (championId && rates[championId]?.[position]) || 0
  }

  let best: Position[] = []
  let bestScore = -1
  const current: Position[] = []
  const used = new Set<Position>()
  const explore = (i: number, score: number) => {
    if (i === toGuess.length) {
      if (score > bestScore) {
        bestScore = score
        best = [...current]
      }
      return
    }
    for (const position of free) {
      if (used.has(position)) continue
      used.add(position)
      current.push(position)
      explore(i + 1, score + rate(toGuess[i]!, position))
      current.pop()
      used.delete(position)
    }
  }
  explore(0, 0)

  best.forEach((position, i) => {
    layout[position] = toGuess[i]!
  })
  return layout
}
