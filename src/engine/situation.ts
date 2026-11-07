import { SITUATION_MODIFIERS } from './config'
import type { ScoredOption } from './evaluate'
import type { Item, Situation } from './types'

/** Item défensif : apporte de l'armure, de la RM ou des PV. */
export function isDefensiveItem(item: Item): boolean {
  return Boolean(item.stats.armor || item.stats.mr || item.stats.hp)
}

/** Item offensif : apporte de l'AD ou de l'AP, sans aucune stat défensive. */
export function isOffensiveItem(item: Item): boolean {
  return Boolean(item.stats.ad || item.stats.ap) && !isDefensiveItem(item)
}

export type SituationAdjustment = {
  /** Points ajoutés (ou retirés) au score du candidat. */
  points: number
  /** Explication à afficher si l'item est favorisé, sinon `null`. */
  reason: string | null
}

/**
 * Modificateurs de la situation pour un ensemble de candidats (le même slot) :
 * - en retard : +1 défensif, +1 le moins cher, −1 le plus cher (seulement si les prix diffèrent) ;
 * - devant : +1 offensif ;
 * - à égalité : rien.
 */
export function situationAdjustments(
  candidates: readonly Item[],
  situation: Situation,
): Map<string, SituationAdjustment> {
  const result = new Map<string, SituationAdjustment>()
  const costs = candidates.map((i) => i.cost)
  const min = Math.min(...costs)
  const max = Math.max(...costs)
  const pricesDiffer = candidates.length >= 2 && min !== max

  for (const item of candidates) {
    let points = 0
    let reason: string | null = null
    if (situation === 'behind') {
      const m = SITUATION_MODIFIERS.behind
      if (isDefensiveItem(item)) points += m.defensive
      if (pricesDiffer && item.cost === min) points += m.cheapest
      if (pricesDiffer && item.cost === max) points += m.mostExpensive
      if (points > 0) reason = m.reason
    } else if (situation === 'ahead') {
      const m = SITUATION_MODIFIERS.ahead
      if (isOffensiveItem(item)) {
        points += m.offensive
        reason = m.reason
      }
    }
    result.set(item.id, { points, reason })
  }
  return result
}

/**
 * Applique la situation à des candidats déjà scorés : points ajoutés, raison ajoutée en dernier
 * si l'item est favorisé, puis nouveau tri (ordre conservé à égalité).
 */
export function withSituation(
  scored: readonly ScoredOption<Item>[],
  situation: Situation,
): ScoredOption<Item>[] {
  const adjustments = situationAdjustments(
    scored.map((s) => s.choice),
    situation,
  )
  return scored
    .map((s) => {
      const adjustment = adjustments.get(s.choice.id)
      if (!adjustment) return s
      return {
        ...s,
        score: s.score + adjustment.points,
        reasons: adjustment.reason ? [...s.reasons, adjustment.reason] : s.reasons,
      }
    })
    .sort((a, b) => b.score - a.score)
}

export const SITUATIONS = ['ahead', 'even', 'behind'] as const satisfies readonly Situation[]

/** Relit une situation sauvegardée ; toute autre valeur donne « à égalité ». */
export function parseSituation(value: unknown): Situation {
  return (SITUATIONS as readonly unknown[]).includes(value) ? (value as Situation) : 'even'
}
