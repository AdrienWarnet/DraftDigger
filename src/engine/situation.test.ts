import { describe, expect, it } from 'vitest'
import type { ScoredOption } from './evaluate'
import {
  isDefensiveItem,
  isOffensiveItem,
  situationAdjustments,
  withSituation,
  parseSituation,
} from './situation'
import type { Item } from './types'

function item(id: string, cost: number, stats: Item['stats']): Item {
  return {
    id,
    name: id,
    image: '',
    cost,
    stats,
    categories: [],
    buildsFrom: [],
    buildsInto: [],
    aliases: [],
  }
}
// Stats et prix réels (patch 16.22.1).
const cotte = item('Cotte épineuse', 2450, { armor: 75, hp: 150 })
const serylda = item('Rancune de Serylda', 3000, { ad: 45 })
const couperet = item('Couperet noir', 3000, { ad: 45, hp: 400 })
const scored = (items: Item[], score = 0): ScoredOption<Item>[] =>
  items.map((choice) => ({ choice, score, reasons: [] }))

describe('défensif / offensif', () => {
  it('défensif = armure, RM ou PV ; offensif = AD ou AP sans stat défensive', () => {
    expect(isDefensiveItem(cotte)).toBe(true)
    expect(isOffensiveItem(serylda)).toBe(true)
    expect(isDefensiveItem(couperet)).toBe(true) // PV
    expect(isOffensiveItem(couperet)).toBe(false)
  })
})

describe('critère du ticket : même état, item différent selon la situation', () => {
  const candidates = scored([serylda, cotte]) // même score de départ, Serylda en premier

  it('en retard → Cotte épineuse (défensive et moins chère), avec l’explication', () => {
    const [best] = withSituation(candidates, 'behind')
    expect(best?.choice.id).toBe('Cotte épineuse')
    expect(best?.score).toBe(2)
    expect(best?.reasons).toEqual(['En retard, on privilégie un item abordable et défensif.'])
  })

  it('devant → Rancune de Serylda (offensive)', () => {
    const [best] = withSituation(candidates, 'ahead')
    expect(best?.choice.id).toBe('Rancune de Serylda')
    expect(best?.reasons).toEqual(['Devant, on accélère avec un item offensif.'])
  })

  it('à égalité → aucun changement', () => {
    expect(withSituation(candidates, 'even')).toEqual(candidates)
  })
})

describe('situationAdjustments', () => {
  it('en retard : le plus cher perd 1 point, sans explication', () => {
    const adj = situationAdjustments([cotte, serylda], 'behind')
    expect(adj.get('Rancune de Serylda')).toEqual({ points: -1, reason: null })
    expect(adj.get('Cotte épineuse')).toEqual({
      points: 2,
      reason: 'En retard, on privilégie un item abordable et défensif.',
    })
  })

  it('prix identiques ou candidat seul : pas de bonus ni malus de prix', () => {
    expect(situationAdjustments([serylda, couperet], 'behind').get('Couperet noir')?.points).toBe(1)
    expect(
      situationAdjustments([serylda, couperet], 'behind').get('Rancune de Serylda')?.points,
    ).toBe(0)
    expect(situationAdjustments([serylda], 'behind').get('Rancune de Serylda')?.points).toBe(0)
  })

  it('les points s’ajoutent aux scores existants', () => {
    const ranked = withSituation(
      [
        { choice: serylda, score: 3, reasons: ['Deux tanks.'] },
        { choice: cotte, score: 0, reasons: [] },
      ],
      'behind',
    )
    // 3 − 1 = 2 contre 0 + 2 = 2 : égalité, l'ordre d'entrée est conservé (règle de T4.3).
    expect(ranked.map((r) => [r.choice.id, r.score])).toEqual([
      ['Rancune de Serylda', 2],
      ['Cotte épineuse', 2],
    ])
  })
})

describe('parseSituation', () => {
  it('garde une situation valide, sinon « à égalité »', () => {
    expect(parseSituation('ahead')).toBe('ahead')
    expect(parseSituation('behind')).toBe('behind')
    expect(parseSituation('gagnant')).toBe('even')
    expect(parseSituation(undefined)).toBe('even')
  })
})
