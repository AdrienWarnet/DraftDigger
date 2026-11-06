import { CONFIDENCE_THRESHOLDS } from './config'
import type { Metrics } from './metrics'
import type { Condition, Confidence, Recommendation, Situation, WeightedCondition } from './types'

/** Valeur d'une métrique pour la partie en cours (`null` = inconnue, ex : vis-à-vis non saisi). */
function metricValue(
  condition: Condition,
  metrics: Metrics,
  situation: Situation,
): number | string | null {
  if (condition.metric === 'situation') return situation
  return metrics[condition.metric]
}

/**
 * Une condition est-elle vraie pour cette partie ?
 * Une métrique inconnue rend la condition fausse (on ne recommande pas sur une supposition).
 */
export function evaluateCondition(
  condition: Condition,
  metrics: Metrics,
  situation: Situation,
): boolean {
  const actual = metricValue(condition, metrics, situation)
  if (actual === null) return false
  const expected = condition.value
  if (condition.op === '==') return actual === expected
  if (typeof actual !== 'number' || typeof expected !== 'number') return false
  switch (condition.op) {
    case '>=':
      return actual >= expected
    case '<=':
      return actual <= expected
    case '>':
      return actual > expected
    case '<':
      return actual < expected
  }
}

export type ScoredOption<T> = {
  choice: T
  /** Somme des poids des conditions vraies, en points. */
  score: number
  /** Explications des conditions vraies, de la plus lourde à la plus légère. */
  reasons: string[]
}

/**
 * Score de chaque option : somme des `weight` de ses conditions vraies.
 * Résultat trié du meilleur au moins bon ; à score égal, l'ordre d'entrée est conservé
 * (l'appelant y place son départage, ex : le build favori en premier).
 */
export function scoreOptions<T>(
  options: readonly { choice: T; useWhen: readonly WeightedCondition[] }[],
  metrics: Metrics,
  situation: Situation,
): ScoredOption<T>[] {
  return options
    .map(({ choice, useWhen }) => {
      const satisfied = useWhen
        .filter((w) => evaluateCondition(w.condition, metrics, situation))
        .sort((a, b) => b.weight - a.weight)
      return {
        choice,
        score: satisfied.reduce((total, w) => total + w.weight, 0),
        reasons: satisfied.map((w) => w.explain),
      }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * Confiance selon l'écart de points entre le 1er et le 2e et le nombre d'ennemis connus.
 * `gap` à `null` : une seule option, seul le nombre d'ennemis compte.
 */
export function confidence(gap: number | null, knownEnemies: number): Confidence {
  const { high, medium } = CONFIDENCE_THRESHOLDS
  const enough = (level: { minGap: number; minEnemies: number }) =>
    knownEnemies >= level.minEnemies && (gap === null || gap >= level.minGap)
  if (enough(high)) return 'high'
  if (enough(medium)) return 'medium'
  return 'low'
}

/** Recommandation au format de sortie du moteur, à partir d'options déjà scorées et triées. */
export function toRecommendation<T>(
  scored: readonly ScoredOption<T>[],
  knownEnemies: number,
): Recommendation<T> | null {
  const [best, ...others] = scored
  if (!best) return null
  const second = others[0]
  return {
    choice: best.choice,
    score: best.score,
    reasons: best.reasons,
    alternatives: others.map((o) => ({ choice: o.choice, score: o.score, reasons: o.reasons })),
    confidence: confidence(second ? best.score - second.score : null, knownEnemies),
  }
}
