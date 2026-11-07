import { describe, expect, it } from 'vitest'
import { ANTI_MAGE, BRUISER, champion, COMPOS } from './__fixtures__/compos'
import { confidenceExplanation } from './explain'
import { computeMetrics } from './metrics'
import { applyForcedBuild, recommendBuild, recommendFirstItem } from './recommend'

const m = computeMetrics(COMPOS.fullAp.map(champion), champion(COMPOS.fullAp[0]))
const base = recommendBuild([BRUISER, ANTI_MAGE], 'Yorick', 'top', m) // Anti-mage recommandé

describe('applyForcedBuild', () => {
  it('le build choisi à la main devient le choix, la recommandation passe en alternative', () => {
    const forced = applyForcedBuild(base, BRUISER.id)
    expect(forced.forced).toBe(true)
    expect(forced.kind === 'ok' && forced.recommendation.choice.name).toBe('Bruiser')
    expect(
      forced.kind === 'ok' && forced.recommendation.alternatives.map((a) => a.choice.name),
    ).toEqual(['Anti-mage'])
  })

  it('critère du ticket : forcer un autre build change le premier item recommandé', () => {
    expect(base.kind === 'ok' && recommendFirstItem(base.recommendation.choice, m)?.choice).toBe(
      '1054',
    )
    const forced = applyForcedBuild(base, BRUISER.id)
    // Bruiser : Lame de Doran par défaut ; vis-à-vis AP (Mordekaiser) → Bouclier de Doran.
    expect(
      forced.kind === 'ok' && recommendFirstItem(forced.recommendation.choice, m)?.choice,
    ).toBe('1054')
    const vsAd = computeMetrics(COMPOS.fullAd.map(champion), champion(COMPOS.fullAd[0]))
    const forcedVsAd = applyForcedBuild(
      recommendBuild([BRUISER, ANTI_MAGE], 'Yorick', 'top', vsAd),
      ANTI_MAGE.id,
    )
    expect(forcedVsAd.kind === 'ok' && forcedVsAd.recommendation.choice.name).toBe('Anti-mage')
    expect(
      forcedVsAd.kind === 'ok' &&
        recommendFirstItem(forcedVsAd.recommendation.choice, vsAd)?.choice,
    ).toBe(
      '1054', // au lieu de la Lame de Doran du Bruiser
    )
  })

  it('build inconnu, déjà choisi, ou aucun choix : rien ne change', () => {
    expect(applyForcedBuild(base, 'inconnu').forced).toBe(false)
    expect(applyForcedBuild(base, null).forced).toBe(false)
    expect(applyForcedBuild(base, ANTI_MAGE.id).forced).toBe(true)
    expect(applyForcedBuild({ kind: 'noBuild' }, BRUISER.id)).toEqual({
      kind: 'noBuild',
      forced: false,
    })
  })
})

describe('confidenceExplanation', () => {
  it('élevée, moyenne, faible, une seule option, égalité', () => {
    expect(confidenceExplanation('high', 5, 3)).toBe(
      '5/5 ennemis connus, ce choix devance le suivant de 3 points.',
    )
    expect(confidenceExplanation('medium', 3, 1)).toContain('1 point.')
    expect(confidenceExplanation('low', 0, null)).toBe(
      'Aucun ennemi connu, un seul choix possible. Recommandation peu sûre : complète la draft ou compare avec les autres choix.',
    )
    expect(confidenceExplanation('low', 1, 0)).toContain(
      '1/5 ennemi connu, égalité avec le choix suivant',
    )
    expect(confidenceExplanation('low', 5, 0, true)).toContain('départagée par ton favori')
  })
})
