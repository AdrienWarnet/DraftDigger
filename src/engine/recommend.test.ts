import { describe, expect, it } from 'vitest'
import {
  ANTI_MAGE,
  BRUISER,
  champion,
  COMPOS,
  itemsById,
  JUNGLE,
  TEST_BUILDS,
} from './__fixtures__/compos'
import { computeMetrics, type Metrics } from './metrics'
import {
  recommendBuild,
  recommendFirstItem,
  recommendNextItem,
  situationalCategories,
} from './recommend'
import type { Build, Situation } from './types'

const context = { itemsById, baseStats: champion('Yorick').baseStats }
const metricsOf = (ids: readonly string[]): Metrics =>
  computeMetrics(ids.map(champion), champion(ids[0]!))
const empty = computeMetrics([], null)

/** Parcours complet : build, premier item, puis les 2 items suivants (achetés dans l'ordre). */
function play(ids: readonly string[], situation: Situation = 'even') {
  const m = metricsOf(ids)
  const result = recommendBuild(TEST_BUILDS, 'Yorick', 'top', m)
  if (result.kind !== 'ok') throw new Error('aucun build')
  const build = result.recommendation.choice
  const first = recommendFirstItem(build, m, situation)
  const next1 = recommendNextItem(build, [], m, situation, context)
  const next2 = recommendNextItem(build, [next1.recommendation!.choice.id], m, situation, context)
  return {
    build: build.name,
    confidence: result.recommendation.confidence,
    first: itemsById.get(first!.choice)?.name,
    next: [next1.recommendation?.choice.name, next2.recommendation?.choice.name],
    reasons: next2.recommendation?.reasons ?? [],
  }
}

describe('de bout en bout sur 5 compos types (Yorick top, builds de test)', () => {
  it('full AD : Bruiser (favori, condition « compo AD »), Lame de Doran, Ciel éventré puis Coques en acier', () => {
    const r = play(COMPOS.fullAd) // AD 87 %, vis-à-vis Darius (AD)
    expect(r).toMatchObject({
      build: 'Bruiser',
      confidence: 'medium', // écart de 2 points seulement
      first: 'Lame de Doran',
      next: ['Ciel éventré', 'Coques en acier'], // pas d'alternative : ni AP, ni « devant »
    })
    expect(r.reasons[0]).toContain('dégâts physiques reçus de 13')
  })

  it('full AP : Anti-mage (5 points, confiance élevée), Bouclier de Doran, Mercure puis Force de la nature', () => {
    expect(play(COMPOS.fullAp)).toMatchObject({
      build: 'Anti-mage',
      confidence: 'high',
      first: 'Bouclier de Doran',
      next: ['Sandales de Mercure', 'Force de la nature'],
    })
  })

  it('mixte : Anti-mage grâce à « beaucoup de CC » (7), pas à la compo AP (56 % < 60 %)', () => {
    expect(play(COMPOS.mixte)).toMatchObject({ build: 'Anti-mage', confidence: 'medium' })
  })

  it('beaucoup de CC : Anti-mage (CC 8)', () => {
    expect(play(COMPOS.beaucoupDeCc)).toMatchObject({
      build: 'Anti-mage',
      next: ['Sandales de Mercure', 'Force de la nature'],
    })
  })

  it('beaucoup de soin : avec le Bruiser, la Cotte épineuse remplace le Gage de Sterak (slot 4)', () => {
    const m = metricsOf(COMPOS.beaucoupDeSoin) // soin 12
    const owned = ['6610', '3047', '3071']
    const next = recommendNextItem(BRUISER, owned, m, 'even', context)
    expect(next.slot).toBe(4)
    expect(next.recommendation?.choice.name).toBe('Cotte épineuse')
    expect(next.recommendation?.reasons[0]).toBe('Ils se soignent : Cotte épineuse.')
    expect(next.recommendation?.alternatives[0]?.choice.name).toBe('Gage de Sterak')
  })

  it('compo AP avec le Bruiser : les alternatives AP l’emportent (Mercure, Visage spirituel)', () => {
    const m = metricsOf(COMPOS.fullAp)
    expect(
      recommendNextItem(BRUISER, ['6610'], m, 'even', context).recommendation?.choice.name,
    ).toBe('Sandales de Mercure')
    expect(
      recommendNextItem(BRUISER, ['6610', '3111'], m, 'even', context).recommendation?.choice.name,
    ).toBe('Visage spirituel')
  })
})

describe('draft vide', () => {
  it('pas de plantage : le favori, la première option, les items par défaut, confiance faible', () => {
    const result = recommendBuild(TEST_BUILDS, 'Yorick', 'top', empty)
    expect(result.kind === 'ok' && result.recommendation.choice.name).toBe('Bruiser')
    expect(result.kind === 'ok' && result.recommendation.confidence).toBe('low')
    expect(recommendFirstItem(BRUISER, empty)?.choice).toBe('1055')
    const next = recommendNextItem(BRUISER, [], empty, 'even', context)
    expect(next.recommendation?.choice.name).toBe('Ciel éventré')
    expect(next.recommendation?.confidence).toBe('low')
  })
})

describe('recommendBuild : départage et cas limites', () => {
  const noCondition = (b: Build): Build => ({ ...b, useWhen: [] })

  it('égalité avec le favori : le favori l’emporte, pas d’ex aequo', () => {
    const builds = [noCondition(ANTI_MAGE), noCondition(BRUISER)]
    const result = recommendBuild(builds, 'Yorick', 'top', metricsOf(COMPOS.fullAd))
    expect(result.kind === 'ok' && result.recommendation.choice.name).toBe('Bruiser')
    expect(result.kind === 'ok' && result.tied).toEqual([])
  })

  it('égalité entre builds non favoris : tous proposés (ex aequo), confiance faible', () => {
    const builds = [noCondition(ANTI_MAGE), { ...noCondition(BRUISER), favorite: false }]
    const result = recommendBuild(builds, 'Yorick', 'top', metricsOf(COMPOS.fullAd))
    expect(result.kind === 'ok' && result.tied.map((b) => b.name)).toEqual(['Bruiser', 'Anti-mage'])
    expect(result.kind === 'ok' && result.recommendation.confidence).toBe('low')
  })

  it('aucun build à ce poste : builds d’un autre poste proposés, confiance faible', () => {
    const result = recommendBuild([JUNGLE], 'Yorick', 'top', metricsOf(COMPOS.fullAd))
    expect(result.kind === 'ok' && result.fallbackPosition).toBe('jungle')
    expect(result.kind === 'ok' && result.recommendation.confidence).toBe('low')
  })

  it('aucun build pour ce champion', () => {
    expect(recommendBuild(TEST_BUILDS, 'Darius', 'top', empty)).toEqual({ kind: 'noBuild' })
  })

  it('un seul build : confiance selon les ennemis connus', () => {
    const result = recommendBuild([BRUISER], 'Yorick', 'top', metricsOf(COMPOS.fullAd))
    expect(result.kind === 'ok' && result.recommendation.confidence).toBe('high')
  })
})

describe('recommendNextItem : situation, progression, build terminé', () => {
  it('devant : l’alternative « devant » du slot 1 (Force de la trinité) passe', () => {
    const m = metricsOf(COMPOS.fullAd)
    expect(recommendNextItem(BRUISER, [], m, 'ahead', context).recommendation?.choice.name).toBe(
      'Force de la trinité',
    )
  })

  it('un composant possédé compte dans la progression, pas comme item acheté', () => {
    const next = recommendNextItem(
      BRUISER,
      ['6610', '1001'],
      metricsOf(COMPOS.fullAd),
      'even',
      context,
    )
    expect(next.slot).toBe(2)
    expect(next.componentsOwned).toEqual(['1001']) // Bottes → Coques en acier
  })

  it('build terminé + soin en face : items anti-soin proposés', () => {
    const owned = BRUISER.itemOrder.map((s) => s.default)
    const next = recommendNextItem(
      BRUISER,
      owned,
      metricsOf(COMPOS.beaucoupDeSoin),
      'even',
      context,
    )
    expect(next.slot).toBeNull()
    const proposed = [
      next.recommendation!.choice,
      ...next.recommendation!.alternatives.map((a) => a.choice),
    ]
    expect(proposed.length).toBeLessThanOrEqual(3)
    expect(proposed.every((i) => i.categories.includes('antiheal'))).toBe(true)
  })

  it('catégories de situation : anti-soin, sinon anti-tank, sinon défensif', () => {
    expect(situationalCategories(metricsOf(COMPOS.beaucoupDeSoin))).toEqual(['antiheal'])
    expect(situationalCategories(metricsOf(COMPOS.mixte))).toEqual(['antitank']) // 3 tanks
    expect(situationalCategories(metricsOf(COMPOS.fullAd))).toEqual(['armor', 'mr', 'hp'])
  })

  it('item inconnu dans le patch : ignoré sans plantage', () => {
    const broken: Build = {
      ...BRUISER,
      itemOrder: [{ slot: 1, default: '9999', alternatives: [] }],
    }
    expect(recommendNextItem(broken, [], empty, 'even', context).recommendation).toBeNull()
  })
})
