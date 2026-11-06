import { describe, expect, it } from 'vitest'
import { confidence, evaluateCondition, scoreOptions, toRecommendation } from './evaluate'
import { computeMetrics, type Metrics } from './metrics'
import type { Condition, WeightedCondition } from './types'

const metrics: Metrics = {
  enemyAdShare: 0.7,
  enemyApShare: 0.3,
  enemyCcCount: 5,
  enemyHealCount: 3,
  enemyBurstCount: 2,
  enemyEngageCount: 4,
  enemyTankCount: 2,
  laneOpponentDamage: 'ap',
  laneOpponentIsTank: 0,
  knownEnemies: 5,
}
const empty = computeMetrics([], null)
const c = (
  metric: Condition['metric'],
  op: Condition['op'],
  value: number | string,
): Condition => ({
  metric,
  op,
  value,
})
const w = (condition: Condition, weight: number, explain: string): WeightedCondition => ({
  condition,
  weight,
  explain,
})

describe('evaluateCondition', () => {
  it.each([
    ['>=', 0.7, true],
    ['>=', 0.71, false],
    ['>', 0.69, true],
    ['>', 0.7, false],
    ['<=', 0.7, true],
    ['<=', 0.69, false],
    ['<', 0.71, true],
    ['<', 0.7, false],
    ['==', 0.7, true],
    ['==', 0.6, false],
  ] as const)('enemyAdShare (0,7) %s %s → %s', (op, value, expected) => {
    expect(evaluateCondition(c('enemyAdShare', op, value), metrics, 'even')).toBe(expected)
  })

  it('valeurs à choix : vis-à-vis, tank, situation', () => {
    expect(evaluateCondition(c('laneOpponentDamage', '==', 'ap'), metrics, 'even')).toBe(true)
    expect(evaluateCondition(c('laneOpponentDamage', '==', 'ad'), metrics, 'even')).toBe(false)
    expect(evaluateCondition(c('laneOpponentIsTank', '==', 0), metrics, 'even')).toBe(true)
    expect(evaluateCondition(c('situation', '==', 'behind'), metrics, 'behind')).toBe(true)
    expect(evaluateCondition(c('situation', '==', 'behind'), metrics, 'ahead')).toBe(false)
  })

  it('métrique inconnue (vis-à-vis non saisi) : condition fausse, même « tank == 0 »', () => {
    expect(evaluateCondition(c('laneOpponentDamage', '==', 'ap'), empty, 'even')).toBe(false)
    expect(evaluateCondition(c('laneOpponentIsTank', '==', 0), empty, 'even')).toBe(false)
  })

  it('comparaison numérique sur une valeur texte : fausse', () => {
    expect(evaluateCondition(c('laneOpponentDamage', '>=', 1), metrics, 'even')).toBe(false)
  })
})

describe('scoreOptions', () => {
  const options = [
    { choice: 'lame', useWhen: [] },
    {
      choice: 'bouclier',
      useWhen: [
        w(c('laneOpponentDamage', '==', 'ap'), 3, 'Vis-à-vis AP.'),
        w(c('situation', '==', 'behind'), 1, 'En retard.'),
        w(c('enemyHealCount', '>=', 2), 2, 'Ils se soignent.'),
      ],
    },
    { choice: 'anneau', useWhen: [w(c('enemyApShare', '>=', 0.6), 3, 'Compo AP.')] },
  ]

  it('somme des poids des conditions vraies, raisons de la plus lourde à la plus légère', () => {
    const scored = scoreOptions(options, metrics, 'even')
    expect(scored.map((s) => [s.choice, s.score, s.reasons])).toEqual([
      ['bouclier', 5, ['Vis-à-vis AP.', 'Ils se soignent.']],
      ['lame', 0, []],
      ['anneau', 0, []],
    ])
  })

  it('égalité : l’ordre d’entrée est conservé (départage décidé par l’appelant)', () => {
    const scored = scoreOptions(options, empty, 'even')
    expect(scored.map((s) => s.choice)).toEqual(['lame', 'bouclier', 'anneau'])
  })

  it('la situation compte quand elle est vraie', () => {
    expect(scoreOptions(options, empty, 'behind')[0]).toMatchObject({
      choice: 'bouclier',
      score: 1,
    })
  })
})

describe('confidence', () => {
  it('élevée : écart ≥ 3 et ≥ 4 ennemis ; moyenne : écart ≥ 1 et ≥ 2 ennemis ; sinon faible', () => {
    expect(confidence(3, 4)).toBe('high')
    expect(confidence(3, 3)).toBe('medium')
    expect(confidence(1, 2)).toBe('medium')
    expect(confidence(0, 5)).toBe('low')
    expect(confidence(5, 1)).toBe('low')
  })

  it('une seule option : seulement selon les ennemis connus', () => {
    expect(confidence(null, 5)).toBe('high')
    expect(confidence(null, 2)).toBe('medium')
    expect(confidence(null, 0)).toBe('low')
  })
})

describe('toRecommendation', () => {
  it('format de sortie : choix, score, raisons, alternatives, confiance', () => {
    const scored = scoreOptions(
      [
        { choice: 'A', useWhen: [w(c('enemyTankCount', '>=', 2), 3, 'Deux tanks.')] },
        { choice: 'B', useWhen: [] },
      ],
      metrics,
      'even',
    )
    expect(toRecommendation(scored, 5)).toEqual({
      choice: 'A',
      score: 3,
      reasons: ['Deux tanks.'],
      alternatives: [{ choice: 'B', score: 0, reasons: [] }],
      confidence: 'high',
    })
  })

  it('draft vide : pas de plantage, confiance faible', () => {
    const scored = scoreOptions(
      [
        { choice: 'A', useWhen: [] },
        { choice: 'B', useWhen: [] },
      ],
      empty,
      'even',
    )
    expect(toRecommendation(scored, empty.knownEnemies)?.confidence).toBe('low')
    expect(toRecommendation([], 0)).toBeNull()
  })
})
