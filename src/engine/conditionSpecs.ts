import type { ConditionOp, Metric } from './types'

/**
 * Valeurs admises pour chaque métrique d'une condition.
 * - `number` : comparaison numérique, tous les opérateurs.
 * - `choice` : valeur parmi une liste, opérateur `==` uniquement.
 */
export type MetricSpec =
  | { kind: 'number'; min: number; max: number }
  | { kind: 'choice'; values: readonly (string | number)[] }

export const METRIC_SPECS: Record<Metric, MetricSpec> = {
  enemyAdShare: { kind: 'number', min: 0, max: 1 },
  enemyApShare: { kind: 'number', min: 0, max: 1 },
  enemyCcCount: { kind: 'number', min: 0, max: 15 },
  enemyHealCount: { kind: 'number', min: 0, max: 15 },
  enemyTankCount: { kind: 'number', min: 0, max: 5 },
  enemyBurstCount: { kind: 'number', min: 0, max: 15 },
  enemyEngageCount: { kind: 'number', min: 0, max: 15 },
  laneOpponentDamage: { kind: 'choice', values: ['ad', 'ap', 'mixed'] },
  laneOpponentIsTank: { kind: 'choice', values: [0, 1] },
  situation: { kind: 'choice', values: ['ahead', 'even', 'behind'] },
}

/** Message d'erreur si `op` / `value` ne conviennent pas à `metric`, sinon `null`. */
export function conditionValueError(
  metric: Metric,
  op: ConditionOp,
  value: number | string,
): { field: 'op' | 'value'; message: string } | null {
  const spec = METRIC_SPECS[metric]
  if (spec.kind === 'choice') {
    if (op !== '==') {
      return { field: 'op', message: `« ${metric} » se compare uniquement avec ==` }
    }
    if (!spec.values.includes(value)) {
      return {
        field: 'value',
        message: `valeur attendue pour « ${metric} » : ${spec.values.join(', ')}`,
      }
    }
    return null
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return { field: 'value', message: `nombre attendu pour « ${metric} »` }
  }
  if (value < spec.min || value > spec.max) {
    return {
      field: 'value',
      message: `valeur entre ${spec.min} et ${spec.max} attendue pour « ${metric} »`,
    }
  }
  return null
}
